import { redirectSystemPath } from '../src/app/+native-intent';

/**
 * The OAuth callback re-enters the app as a deep link. Without this the router
 * rendered "Unmatched Route" over a sign-in that had actually succeeded.
 */
describe('redirectSystemPath', () => {
  const at = (path: string) => redirectSystemPath({ path, initial: false });

  it('sends the OAuth callback to the screen sign-in started from', () => {
    expect(at('reps://oauthredirect?state=abc&code=4/0AT')).toBe('/me');
  });

  /**
   * Both shapes have been produced by the library in this project: a custom
   * scheme with two slashes and the application-id form with one.
   */
  it('accepts either slash form', () => {
    expect(at('com.reps.app:/oauthredirect?code=x')).toBe('/me');
    expect(at('reps://oauthredirect')).toBe('/me');
    expect(at('/oauthredirect?code=x')).toBe('/me');
  });

  it('leaves ordinary deep links alone', () => {
    expect(at('/technique/tec_1')).toBe('/technique/tec_1');
    expect(at('reps://path')).toBe('reps://path');
    expect(at('/')).toBe('/');
  });

  /** A route that merely starts with the same word is a different screen. */
  it('does not swallow a route that only looks similar', () => {
    expect(at('/oauthredirectory')).toBe('/oauthredirectory');
    expect(at('/settings/oauthredirect')).toBe('/settings/oauthredirect');
  });
});
