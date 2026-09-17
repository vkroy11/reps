import type { PrismaClient } from '@prisma/client';
import { newId } from '../../lib/ids';
import type { User, UserRepository } from '../types';

interface UserRow {
  id: string;
  googleId: string | null;
  email: string | null;
  name: string | null;
  createdAt: Date;
}

function toDomainUser(row: UserRow): User {
  return {
    id: row.id,
    googleId: row.googleId,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Devices, Google accounts, and the claim that merges one into the other. */
export function createUserRepository(prisma: PrismaClient): UserRepository {
  return {
    async findOrCreateByDeviceId(deviceId) {
      // Upsert on the device, not the user: the same device must always land
      // on the same learner, and a device that has been claimed already
      // points at an account rather than at a fresh anonymous row.
      const device = await prisma.device.upsert({
        where: { id: deviceId },
        create: { id: deviceId, user: { create: { id: newId('usr') } } },
        update: {},
        include: { user: true },
      });

      return toDomainUser(device.user);
    },

    async findById(userId) {
      const row = await prisma.user.findUnique({ where: { id: userId } });

      return row ? toDomainUser(row) : null;
    },

    async findByGoogleId(googleId) {
      const row = await prisma.user.findUnique({ where: { googleId } });

      return row ? toDomainUser(row) : null;
    },

    async createWithGoogle(identity) {
      const row = await prisma.user.create({
        data: {
          id: newId('usr'),
          googleId: identity.googleId,
          email: identity.email,
          name: identity.name,
        },
      });

      return toDomainUser(row);
    },

    async linkGoogle({ userId, googleId, email, name }) {
      const row = await prisma.user.update({
        where: { id: userId },
        data: { googleId, email, name },
      });

      return toDomainUser(row);
    },

    async detachDevice(deviceId) {
      return prisma.$transaction(async (tx) => {
        const fresh = await tx.user.create({ data: { id: newId('usr') } });
        await tx.device.upsert({
          where: { id: deviceId },
          create: { id: deviceId, userId: fresh.id },
          update: { userId: fresh.id },
        });

        return toDomainUser(fresh);
      });
    },

    async claimDevice({ deviceId, accountUserId }) {
      return prisma.$transaction(async (tx) => {
        const device = await tx.device.findUnique({
          where: { id: deviceId },
          select: { userId: true },
        });
        const account = await tx.user.findUniqueOrThrow({ where: { id: accountUserId } });

        // Already this account's device: nothing to move.
        if (!device || device.userId === accountUserId) {
          await tx.device.upsert({
            where: { id: deviceId },
            create: { id: deviceId, userId: accountUserId },
            update: { userId: accountUserId },
          });

          return toDomainUser(account);
        }

        const anonymousId = device.userId;

        /*
        Re-key rather than copy. Every one of these tables is keyed by
        userId, so moving ownership is an UPDATE and the ids the client
        already holds stay valid - a copy would change them and break any
        note or session the app has in memory.
      */
        await tx.learningPath.updateMany({
          where: { userId: anonymousId },
          data: { userId: accountUserId },
        });
        await tx.note.updateMany({
          where: { userId: anonymousId },
          data: { userId: accountUserId },
        });
        await tx.practiceSession.updateMany({
          where: { userId: anonymousId },
          data: { userId: accountUserId },
        });
        await tx.badge.updateMany({
          where: { userId: anonymousId },
          data: { userId: accountUserId },
        });
        await tx.device.update({
          where: { id: deviceId },
          data: { userId: accountUserId },
        });

        /*
        Remove the emptied anonymous row only if no other device still
        speaks for it. Deleting it while a second device points there would
        cascade that device's rows away - which is exactly the data loss
        this whole design exists to avoid.
      */
        const remaining = await tx.device.count({ where: { userId: anonymousId } });
        const anonymous = await tx.user.findUnique({
          where: { id: anonymousId },
          select: { googleId: true },
        });
        if (remaining === 0 && anonymous?.googleId === null) {
          await tx.user.delete({ where: { id: anonymousId } });
        }

        return toDomainUser(account);
      });
    },
  };
}
