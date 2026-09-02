import Constants from 'expo-constants';

/**
 * Where the API lives.
 *
 * `EXPO_PUBLIC_*` is inlined at build time, so a development build cannot bake
 * in a usable URL: `localhost` means the phone itself, and a LAN address is
 * different on every network. So in development we derive the host from the
 * Metro server the app is already talking to, which makes one dev build work
 * on a simulator and on a physical device without rebuilding.
 *
 * Production reads the baked-in value, which is what we want there.
 */
const DEFAULT_PORT = 4000;

export function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');

  const host = devServerHost();
  if (host) return `http://${host}:${DEFAULT_PORT}`;

  // Last resort: a simulator on the same machine.
  return `http://localhost:${DEFAULT_PORT}`;
}

/** e.g. "192.168.1.24:8081" -> "192.168.1.24" */
function devServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];

  return host && host.length > 0 ? host : null;
}
