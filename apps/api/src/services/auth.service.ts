import type { GoogleVerifier } from '../providers/auth/types';
import type { Repositories, User } from '../repositories/types';
import { signSession } from '../lib/session';

export interface SignInResult {
  token: string;
  expiresAt: string;
  user: User;
  /** True when this sign-in moved a device's anonymous work into the account. */
  claimed: boolean;
}

export function createAuthService(deps: {
  google: GoogleVerifier;
  repositories: Repositories;
}) {
  return {
    /** False when the server has no OAuth client id, so the app can say so. */
    get available(): boolean {
      return deps.google.configured;
    },

    /**
     * Signs in with a Google ID token and claims the calling device.
     *
     * Order matters. The account is resolved first, then the device is claimed
     * into it - so a first-ever sign-in on a device that already has paths
     * *keeps* those paths, because the anonymous user they belong to is the one
     * being merged rather than replaced.
     */
    async signInWithGoogle(input: { idToken: string; deviceId: string }): Promise<SignInResult> {
      const identity = await deps.google.verify(input.idToken);

      const existing = await deps.repositories.users.findByGoogleId(identity.googleId);
      const anonymous = await deps.repositories.users.findOrCreateByDeviceId(input.deviceId);

      /*
        A device signing in for the first time, with an account that does not
        exist yet: promote this very user rather than creating a second one and
        moving rows between them. Cheaper, and it means the common case does no
        re-keying at all.
      */
      if (!existing) {
        const account = await deps.repositories.users.linkGoogle({
          userId: anonymous.id,
          ...identity,
        });
        const session = await signSession(account.id);

        return { ...session, user: account, claimed: false };
      }

      const claimed = existing.id !== anonymous.id;
      const account = await deps.repositories.users.claimDevice({
        deviceId: input.deviceId,
        accountUserId: existing.id,
      });
      const session = await signSession(account.id);

      return { ...session, user: account, claimed };
    },

    /**
     * Unlinks this device from the account.
     *
     * The device gets a fresh empty identity rather than keeping a read-only
     * view of the account: leaving it pointed at the account after sign-out
     * would mean a shared phone still shows someone else's practice.
     *
     * The account itself is untouched, so signing in again on this device
     * brings everything back.
     */
    async signOut(deviceId: string): Promise<User> {
      return deps.repositories.users.detachDevice(deviceId);
    },

    async me(userId: string): Promise<User | null> {
      return deps.repositories.users.findById(userId);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
