import { AuthHandler, OidcAdapter, Session } from "sst/node/auth";
import { Issuer } from "openid-client";

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

const oidcIssuerConfigUrl = new URL(
  `${process.env.OIDC_ISSUER_URL?.replace(/\/$/, "")}/.well-known/openid-configuration`,
);

declare module "sst/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string;
    };
  }
}

export const handler = AuthHandler({
  providers: {
    oidc: OidcAdapter({
      issuer: await Issuer.discover(oidcIssuerConfigUrl.href),
      clientID: oidcClientId,
      scope: oidcScope,
      onSuccess: async (tokenset) => {
        return Session.cookie({
          redirect: "/",
          type: "user",
          properties: {
            userID: tokenset.claims().sub,
          },
        });
      },
    }),
  },
});
