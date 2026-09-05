/**
 * Rewrites incoming deep links before the router tries to match them.
 *
 * **Why this exists.** Google returns from sign-in by opening a URL back into
 * the app - `…://oauthredirect?code=…`. Two things then listen for it:
 * `expo-web-browser`, which reads the code and resolves the sign-in, and the
 * router, which has no `/oauthredirect` screen and renders "Unmatched Route"
 * on top of a sign-in that actually succeeded. The learner sees a 404 and
 * assumes it failed.
 *
 * Sending it to the Me tab is not arbitrary: that is where sign-in is started
 * from and where the result is displayed, so the redirect lands on the screen
 * that is about to say "Synced".
 *
 * The path is matched rather than the scheme on purpose. Which scheme the
 * library picks depends on the execution environment and on config that has
 * moved more than once - the callback path has not.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return isOAuthCallback(path) ? '/me' : path;
}

/** Both shapes the library has produced: `scheme://oauthredirect` and `scheme:/oauthredirect`. */
function isOAuthCallback(path: string): boolean {
  const withoutScheme = path.replace(/^[a-z0-9.+-]+:\/{0,2}/i, '');

  return withoutScheme.split('?')[0]?.replace(/^\/+/, '') === 'oauthredirect';
}
