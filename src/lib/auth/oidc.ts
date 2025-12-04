import { Issuer } from "openid-client";
import { createRemoteJWKSet, JWTPayload, jwtVerify } from "jose";

type VerifyAccessTokenParams<SafeVerify extends boolean = false> = {
  token: string;
  issuerUrl: string;
  audience: string;
  safeVerify?: SafeVerify;
};

/**
 * Checks an OIDC access token against the issuer's details to determine if it's valid.
 *
 * @param params - The parameters for verifying the access token.
 * @param params.token - The JWT access token to verify.
 * @param params.issuerUrl - The OIDC issuer URL to discover JWKS and metadata.
 * @param params.audience - The expected audience value to match against the token's claims.
 * @param params.safeVerify - If true, returns a result object with error and payload fields instead of throwing on error.
 * @returns If `safeVerify` is true, returns an object with either the verified payload or an error. Otherwise, returns the verified JWT payload or throws an error.
 */
export async function verifyAccessToken<SafeVerify extends boolean = false>({
  token,
  issuerUrl,
  audience,
  safeVerify,
}: VerifyAccessTokenParams<SafeVerify>): Promise<
  SafeVerify extends true
    ?
        | { error: Error | unknown; payload: null }
        | { error: null; payload: JWTPayload }
    : JWTPayload
> {
  try {
    console.debug("Discovered JWKS URI aa:", issuerUrl);
    const issuer = await Issuer.discover(issuerUrl);
    console.debug("Discovered JWKS URI aa 2");
    const jwksUri = issuer.metadata.jwks_uri;
    if (!jwksUri) {
      throw new Error("JWKS URI not found in issuer metadata");
    }
    console.debug("Discovered JWKS URI:", jwksUri);
    const JWKS = createRemoteJWKSet(new URL(jwksUri));
    console.debug("Discovered JWKS URI 1");

    // Verify the signature and basic claims
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: issuer.metadata.issuer,
    });

    console.debug("Discovered JWKS URI 2");

    const tokenAud = payload.aud ?? payload.client_id;
    let audienceMatches = false;
    for (const aud of Array.isArray(tokenAud) ? tokenAud : [tokenAud]) {
      if (aud === audience) {
        audienceMatches = true;
        break;
      }
    }
    if (!audienceMatches) {
      console.info("Token data:", payload);
      throw new Error(
        `Token audience does not match expected audience ${audience}`,
      );
    }

    if (safeVerify) {
      return { payload, error: null };
    }
    return payload as SafeVerify extends true
      ? { error: null; payload: JWTPayload }
      : JWTPayload;
  } catch (err) {
    if (safeVerify) {
      return { error: err, payload: null };
    }
    throw err;
  }
}
