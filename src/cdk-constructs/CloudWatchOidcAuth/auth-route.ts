import { AuthHandler, OidcAdapter } from "sst/node/auth";
import { Issuer } from "openid-client";
import jwt from "jsonwebtoken";

const oidcClientId = process.env.OIDC_CLIENT_ID;
if (!oidcClientId) {
  throw new Error("OIDC_CLIENT_ID not set");
}
const oidcIssuerUrl = process.env.OIDC_ISSUER_URL;
if (!oidcIssuerUrl) {
  throw new Error("OIDC_ISSUER_URL not set");
}
const oidcScope = process.env.OIDC_SCOPE;
if (!oidcScope) {
  throw new Error("OIDC_SCOPE not set");
}
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET not set");
}

const oidcIssuerConfigUrl = new URL(
  `${process.env.OIDC_ISSUER_URL?.replace(/\/$/, "")}/.well-known/openid-configuration`,
);

export const handler = addRequiredContext(
  AuthHandler({
    providers: {
      oidc: OidcAdapter({
        issuer: await Issuer.discover(oidcIssuerConfigUrl.href),
        clientID: oidcClientId,
        scope: oidcScope,
        onSuccess: async (tokenset) => {
          console.log("tokenset", tokenset, tokenset.claims());

          // console.log("Config.jwtSecret:", jwtSecret);

          // Payload to include in the token
          const payload = {
            userID: tokenset.claims().sub,
          };

          // Options (optional)
          const options = {
            algorithm: "HS256",
            expiresIn: "1h",
          } as const;

          // Create the token
          const token = jwt.sign(payload, jwtSecret, options);
          const expires = new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          );
          return {
            statusCode: 302,
            headers: {
              location: "/",
            },
            cookies: [
              `auth-token=${token}; HttpOnly; SameSite=None; Secure; Path=/; Expires=${expires}`,
            ],
          };
        },
      }),
    },
  }),
);

function addRequiredContext(handler: ReturnType<typeof AuthHandler>): ReturnType<typeof AuthHandler> {
  return async function (...args) {
    const [event, context] = args;
    // Used by AuthHandler to create callback url sent to oidc server
    event.requestContext.domainName = event.headers["x-forwarded-host"];
    console.log("🟢 event", event)
    console.log("🔵 context", context)

    return await handler(...args);
  };
}
