// Based off: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_kvs_jwt_verify_section.html
// Note that as a CloudFront Function, this code has limitations compared to a Lambda@Edge function. For example, no
// external libraries can be used, and the runtime is more limited. Because SST v2's SsrSite construct uses JS v1.0
// runtime for CloudFront Functions, this code must also be compatible with that runtime. Also this is used in the body
// of a function where the variables event and request are already defined.

declare const request: AWSCloudFrontFunction.Request;

// eslint-disable-next-line @typescript-eslint/no-var-requires -- v1 runtime for CloudFront Functions do not support import statements
const crypto: typeof import("crypto") = require("crypto");

const jwtSecret = "__placeholder-for-jwt-secret__";
const authRoutePrefix = "__placeholder-for-auth-route-prefix__";

// Set to true to enable console logging
const loggingEnabled = false;

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

//Response when JWT is not valid.
const redirectResponse = {
  statusCode: 302,
  headers: {
    location: { value: `${authRoutePrefix}/oidc/authorize` },
  },
};

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
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  let bc = 0,
    bs = 0,
    buffer,
    i = 0;
  for (; i < str.length; i++) {
    buffer = chars.indexOf(str.charAt(i));
    if (buffer === -1) continue;

    bs = (bs << 6) | buffer;
    bc += 6;

    if (bc >= 8) {
      bc -= 8;
      output += String.fromCharCode((bs >> bc) & 0xff);
    }
  }

  return output;
}

const jwtToken =
  request.cookies["auth-token"] && request.cookies["auth-token"].value;

if (!jwtToken) {
  log("Error: No JWT in the cookies");
  // @ts-expect-error -- This code is added to a function body so we can use return here but typescript doesn't know that.
  return redirectResponse;
}
try {
  jwtDecode(jwtToken, jwtSecret);
} catch (e) {
  log(e);
  // @ts-expect-error -- This code is added to a function body so we can use return here but typescript doesn't know that.
  return redirectResponse;
}

log("Valid JWT token");
