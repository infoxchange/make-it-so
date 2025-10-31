import * as SST from "sst/constructs";
import path from "node:path";

type ConstructScope = ConstructorParameters<typeof SST.Auth>[0];
type ConstructId = ConstructorParameters<typeof SST.Auth>[1];

type Props = Omit<SST.AuthProps, "authenticator"> & {
  oidcIssuerUrl: string;
  oidcClientId: string;
  oidcScope: string;
};

export class ApiGatewayOidcAuth extends SST.Auth {
  constructor(scope: ConstructScope, id: ConstructId, props: Props) {
    super(scope, id, {
      ...props,
      authenticator: {
        handler: path.join(import.meta.dirname, "auth-route.handler"),
        environment: {
          OIDC_ISSUER_URL: props.oidcIssuerUrl,
          OIDC_CLIENT_ID: props.oidcClientId,
          OIDC_SCOPE: props.oidcScope,
        },
      },
    });
  }
}
