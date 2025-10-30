// Based off: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_kvs_jwt_verify_section.html

import crypto from "crypto";
import cf from "cloudfront";
import { ApiHandler, useCookie } from "sst/node/api";

//Response when JWT is not valid.
const redirectResponse = {
  statusCode: 302,
  headers: {
    location: { value: "/auth/oidc/authorize" },
  },
};

const kvsKey = "__placeholder-for-jwt-secret-key__";
// set to true to enable console logging
const loggingEnabled = true;

function jwtDecode(token: string, key: string, noVerify?: boolean) {
  // check token
  if (!token) {
    throw new Error("No token supplied");
  }
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

//Function to ensure a constant time comparison to prevent
//timing side channels.
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

function _verify(input: string, key: string, method: string, type: string, signature: string) {
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

export const handler = ApiHandler(async (event) => {
  console.log("Auth check event:", event);
  const request = event.request;
  const secret_key = await getSecret();

  if (!secret_key) {
    return redirectResponse;
  }

  // console.log(request);
  // console.log(request.cookies);
  // console.log(request.cookies["auth-token"]);
  // console.log(Object.keys(request.cookies));
  const jwtToken = useCookie("auth-token");
  console.log("jwtToken:", jwtToken);
  // console.log(Object.keys(request.cookies));

  // If no JWT token, then generate HTTP redirect 401 response.
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

  // //Remove the JWT from the query string if valid and return.
  // delete request.querystring.jwt;
  log("Valid JWT token");
  return request;
})

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

const log: typeof console.log = (...args) => {
  if (loggingEnabled) {
    console.log(...args);
  }
}
