import { expect, test } from "vitest";
import jwt from "jsonwebtoken";
import { transformSync } from "esbuild";
import fs from "fs";
import crypto from "crypto";

const defaultJwtSecret = "abcdefghijklmnopqrstuvwxyz123456";
const defaultAuthRoutePrefix = "/auth";
const defaultPayload = {
  userID: "sally smith",
};
// Used as a polyfill for require() which is used in the CloudFront Function code.
const defaultRequireFunction = (moduleName: string) => {
  if (moduleName === "crypto") {
    return crypto;
  } else {
    throw new Error(`Module not found: ${moduleName}`);
  }
};

test("only valid tokens pass", () => {
  const token = generateToken();

  // Check that a valid token passes as expected
  const handler = getAuthCheckHandler();
  expect(handler(getEvent(token))).toBeUndefined();

  // Check that tokens which are not a valid base 64 encoded list of json objects fail as expected
  const tokenWithInvalidEncoding = token + "corrupted";
  expect(handler(getEvent(tokenWithInvalidEncoding))).toMatchObject(
    getRedirectionResponse(),
  );

  // Check that tokens which are syntactically valid but have a signature which do not match the tokens contents fail as
  // expected
  const tokenForDifferentPayload = generateToken({
    payload: {
      userID: "john doe",
    },
  });
  const signatureForDifferentPayload = tokenForDifferentPayload.split(".")?.[2];
  const tokenWithIncorrectSignature = [
    ...token.split(".").slice(0, 2),
    signatureForDifferentPayload,
  ].join(".");
  expect(handler(getEvent(tokenWithIncorrectSignature))).toMatchObject(
    getRedirectionResponse(),
  );
});

test("only pass if jwt secret matches", () => {
  const token = generateToken();

  // Confirm that a valid token with the correct secret passes as expected
  const handler = getAuthCheckHandler();
  expect(handler(getEvent(token))).toBeUndefined();

  // Confirm that a token generated with a secret that does not match results in redirection as expected
  const handlerWithDifferingSecret = getAuthCheckHandler({
    jwtSecret: defaultJwtSecret + "different",
  });
  expect(handlerWithDifferingSecret(getEvent(token))).toMatchObject(
    getRedirectionResponse(),
  );
});

test("redirects uses custom auth route prefix if given", () => {
  const token = "invalid-token";
  const authRoutePrefix = "/custom-auth-prefix";

  // Confirm that the redirection response uses the custom prefix
  const handlerWithCustomPrefix = getAuthCheckHandler({ authRoutePrefix });
  expect(handlerWithCustomPrefix(getEvent(token))).toMatchObject(
    getRedirectionResponse({ authRoutePrefix }),
  );
});

test("uncaught errors throw as expected", () => {
  const token = generateToken();

  // Confirm an unaccounted for error results in that error being thrown for CloudFront to handle
  const handlerWithSimulatedError = getAuthCheckHandler({
    requireFunction: () => {
      throw new Error("Simulated uncaught error");
    },
  });
  expect(() => handlerWithSimulatedError(getEvent(token))).toThrowError(
    /Simulated uncaught error/,
  );
});

// Since the auth check handler code is expected to be inserted into the body of a function before it's run we need to
// that before can use it
function getAuthCheckHandler({
  jwtSecret = defaultJwtSecret,
  authRoutePrefix = defaultAuthRoutePrefix,
  requireFunction = defaultRequireFunction,
} = {}) {
  const source = fs
    .readFileSync(
      "src/cdk-constructs/SiteOidcAuth/auth-check-handler-body.ts",
      "utf8",
    )
    .replaceAll(/const /g, "var ")
    .replaceAll(/let /g, "var ")
    .replace("__placeholder-for-jwt-secret__", jwtSecret)
    .replace("__placeholder-for-auth-route-prefix__", authRoutePrefix);
  const downleveledCode = transformSync(source, {
    loader: "ts",
    target: "es5",
  });

  const handlerWithScopeCreator = new Function(
    "require",
    `return (event) => {
      const { request } = event;
      ${downleveledCode.code};
    }`,
  );
  const handler: (event: {
    request: { cookies: { [key: string]: { value: string } } };
  }) => unknown = handlerWithScopeCreator(requireFunction);
  return handler;
}

// Generate a token in the same way as the auth route does
function generateToken({
  payload = defaultPayload,
  jwtSecret = defaultJwtSecret,
} = {}): string {
  return jwt.sign(payload, jwtSecret, {
    algorithm: "HS256",
    expiresIn: 60 * 60,
  });
}

// Create a mock event to pass to be consumed by the auth check handler
function getEvent(token: string) {
  return {
    request: {
      cookies: {
        "auth-token": { value: token },
      },
    },
  };
}

// Create a mock redirection response to compare against the response from the auth check handler
function getRedirectionResponse({
  authRoutePrefix = defaultAuthRoutePrefix,
} = {}) {
  return {
    statusCode: 302,
    headers: { location: { value: `${authRoutePrefix}/oidc/authorize` } },
  };
}
