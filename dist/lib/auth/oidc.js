import { Issuer } from "openid-client";
import { createRemoteJWKSet, jwtVerify } from "jose";
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
export async function verifyAccessToken({ token, issuerUrl, audience, safeVerify, }) {
    try {
        const issuer = await Issuer.discover(issuerUrl);
        const jwksUri = issuer.metadata.jwks_uri;
        if (!jwksUri) {
            throw new Error("JWKS URI not found in issuer metadata");
        }
        const JWKS = createRemoteJWKSet(new URL(jwksUri));
        // Verify the signature and basic claims
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: issuer.metadata.issuer,
        });
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
            throw new Error(`Token audience does not match expected audience ${audience}`);
        }
        if (safeVerify) {
            return { payload, error: null };
        }
        return payload;
    }
    catch (err) {
        if (safeVerify) {
            return { error: err, payload: null };
        }
        throw err;
    }
}
