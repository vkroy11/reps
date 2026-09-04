/**
 * The Google OAuth client ids, read from the Expo config.
 *
 * One per platform, because Google issues one per platform and an ID token is
 * only valid for the client that requested it. All three are optional: with
 * none set, sign-in is unavailable and the app says so rather than offering a
 * button that cannot work.
 *
 * These are public values - a client id is not a secret, which is why they
 * live in the app config rather than in .env alongside the API keys. The
 * *server* still verifies every token against its own list, so a wrong id here
 * fails at the API rather than granting anything.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface OAuthConfig {
  web?: string;
  ios?: string;
  android?: string;
}

function configured(): OAuthConfig {
  const extra = Constants.expoConfig?.extra as { googleOAuth?: OAuthConfig } | undefined;

  return extra?.googleOAuth ?? {};
}

/** The client id this platform should authenticate with, if there is one. */
export function googleClientId(): string | null {
  const ids = configured();
  const forPlatform =
    Platform.OS === 'ios' ? ids.ios : Platform.OS === 'android' ? ids.android : ids.web;

  return forPlatform && forPlatform.length > 0 ? forPlatform : null;
}

/**
 * Whether sign-in can be attempted from this build.
 *
 * The server is asked separately, and both have to agree: a client id here
 * with nothing configured server-side would produce a token the API refuses.
 */
export function googleSignInConfigured(): boolean {
  return googleClientId() !== null;
}
