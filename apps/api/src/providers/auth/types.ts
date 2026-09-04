/** What a verified Google ID token tells us about the person holding it. */
export interface GoogleIdentity {
  /** Google's stable subject id. The thing an account is keyed by. */
  googleId: string;
  email: string | null;
  name: string | null;
}

/**
 * Verifies a Google ID token.
 *
 * A port rather than a direct call, for the same reason AiProvider is one: the
 * real implementation needs network access and a configured client id, and
 * every test of the claim logic would otherwise need both. The fake lets the
 * interesting half - what happens to a learner's data when they sign in - be
 * tested exhaustively.
 */
export interface GoogleVerifier {
  /** Returns the identity, or throws UnauthorizedError if the token is not good. */
  verify(idToken: string): Promise<GoogleIdentity>;
  /** False when no client id is configured, so the API can say so up front. */
  readonly configured: boolean;
}
