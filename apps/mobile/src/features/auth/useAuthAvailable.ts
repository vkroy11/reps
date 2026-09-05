import { useEffect, useState } from 'react';
import { useApp } from '../../providers/app-provider';

/**
 * Whether the server can complete a sign-in at all.
 *
 * Both sides have to agree: a build with a client id talking to a server with
 * none configured would produce a token the API refuses, so the button only
 * appears where the exchange can actually finish. Null while unknown, so a
 * screen can stay quiet rather than flashing a button it may have to withdraw.
 *
 * A failure is read as unavailable, not retried. The answer only decides
 * whether to offer an optional extra, and pestering an unreachable API to find
 * out is worse than leaving it out.
 */
export function useAuthAvailable(): boolean | null {
  const { api, ready } = useApp();
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready || !api) return;

    let cancelled = false;

    api
      .authAvailable()
      .then((result) => {
        if (!cancelled) setAvailable(result);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, ready]);

  return available;
}
