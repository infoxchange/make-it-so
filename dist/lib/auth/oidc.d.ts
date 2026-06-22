import { JWTPayload } from "jose";
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
export declare function verifyAccessToken<SafeVerify extends boolean = false>({ token, issuerUrl, audience, safeVerify, }: VerifyAccessTokenParams<SafeVerify>): Promise<SafeVerify extends true ? {
    error: Error | unknown;
    payload: null;
} | {
    error: null;
    payload: JWTPayload;
} : JWTPayload>;
export {};
//# sourceMappingURL=oidc.d.ts.map