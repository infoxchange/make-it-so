// Based off: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_kvs_jwt_verify_section.html
// Note that as a CloudFront Function, this code has limitations compared to a Lambda@Edge function.
// For example, no external libraries can be used, and the runtime is more limited.
import crypto from "crypto";
import cf from "cloudfront";

//Response when JWT is not valid.
const redirectResponse = {
  statusCode: 302,
  headers: {
    location: { value: "/auth/oidc/authorize" },
  },
};

const kvsKey = "__placeholder-for-jwt-secret-key__";
// Set to true to enable console logging
const loggingEnabled = false;

function jwtDecode(token: string, key: string, noVerify?: boolean) {
  // check segments
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Not enough or too many segments");
  }

  // All segment should be base64
  const headerSeg = segments[0];
  const payloadSeg = segments[1];
  const signatureSeg = segments[2];

  // base64 decode and parse JSON
  const payload = JSON.parse(_base64urlDecode(payloadSeg));

  if (noVerify) {
    return payload;
  }

  const signingMethod = "sha256";
  const signingType = "hmac";

  // Verify signature. `sign` will return base64 string.
  const signingInput = [headerSeg, payloadSeg].join(".");

  if (!_verify(signingInput, key, signingMethod, signingType, signatureSeg)) {
    throw new Error("Signature verification failed");
  }

  // Support for nbf and exp claims.
  // According to the RFC, they should be in seconds.
  if (payload.nbf && Date.now() < payload.nbf * 1000) {
    throw new Error("Token not yet active");
  }

  if (payload.exp && Date.now() > payload.exp * 1000) {
    throw new Error("Token expired");
  }

  return payload;
}

// Function to ensure a constant time comparison to prevent timing side channels.
function _constantTimeEquals(a: string, b: string) {
  if (a.length != b.length) {
    return false;
  }

  let xor = 0;
  for (let i = 0; i < a.length; i++) {
    xor |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return 0 === xor;
}

function _verify(
  input: string,
  key: string,
  method: string,
  type: string,
  signature: string,
) {
  if (type === "hmac") {
    return _constantTimeEquals(signature, _sign(input, key, method));
  } else {
    throw new Error("Algorithm type not recognized");
  }
}

function _sign(input: string, key: string, method: string) {
  return crypto.createHmac(method, key).update(input).digest("base64url");
}

function _base64urlDecode(str: string) {
  return Buffer.from(str, "base64url").toString();
}

async function handler(event: AWSCloudFrontFunction.Event) {
  const request = event.request;
  const secret_key = await getSecret();

  if (!secret_key) {
    // It's not possible for us to validate requests without the secret key so we have no choice but to block all requests.
    throw new Error("Error retrieving JWT secret key");
  }

  const jwtToken =
    request.cookies["auth-token"] && request.cookies["auth-token"].value;

  if (!jwtToken) {
    log("Error: No JWT in the cookies");
    return redirectResponse;
  }
  try {
    jwtDecode(jwtToken, secret_key);
  } catch (e) {
    log(e);
    return redirectResponse;
  }

  log("Valid JWT token");
  return request;
}

// Get secret from key value store
async function getSecret() {
  try {
    const kvsHandle = cf.kvs();
    return await kvsHandle.get(kvsKey);
  } catch (err) {
    log(`Error reading value for key: ${kvsKey}, error: ${err}`);
    return null;
  }
}

const log: typeof console.log = function () {
  if (!loggingEnabled) return;

  // CloudFront Function runtime only prints first argument passed to console.log so add other args to the first one if given.
  // eslint-disable-next-line prefer-rest-params -- We can't use spread or rest parameters in CloudFront Functions
  let message = arguments[0];
  if (arguments.length > 1) {
    const otherArgs = [];
    for (let i = 1; i < arguments.length; i++) {
      // eslint-disable-next-line prefer-rest-params
      otherArgs[i - 1] = arguments[i];
    }

    message += " - additional args: " + JSON.stringify(otherArgs);
  }
  console.log(message);
};

// This serves no purpose other than to make TypeScript and eslint happy by showing that that handler is used. We can't
// export handler as an alterative because CloudFront Functions don't support exports.
handler;
