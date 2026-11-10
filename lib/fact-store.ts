import "server-only";
import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/openai";
import type { FactDeps, FactStore } from "@/lib/facts";

export const prismaFactStore: FactStore = {
    async getUserMovie(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { favoriteMovie: true },
        });
        return user?.favoriteMovie ?? null;
    },

    latestFact(userId, movie) {
        return prisma.fact.findFirst({
            where: { userId, movie },
            orderBy: { createdAt: "desc" },
            select: { content: true, createdAt: true },
        });
    },

    // Atomic "claim the lock" in a single UPDATE.
    // Succeeds only if nobody holds the lock, or the holder's lease has expired.
    async tryAcquireLock(userId, now, leaseMs) {
        const { count } = await prisma.user.updateMany({
            where: {
                id: userId,
                OR: [
                    { factGenStartedAt: null },
                    { factGenStartedAt: { lt: new Date(now.getTime() - leaseMs) } },
                ],
            },
            data: { factGenStartedAt: now },
        });
        return count === 1;
    },

    // Only clears the lock if it is still ours. If our lease expired and another
    // request took over, we must not release their lock.
    async releaseLock(userId, acquiredAt) {
        await prisma.user.updateMany({
            where: { id: userId, factGenStartedAt: acquiredAt },
            data: { factGenStartedAt: null },
        });
    },

    insertFact(userId, movie, content, createdAt) {
        return prisma.fact.create({
            data: { userId, movie, content, createdAt },
            select: { content: true, createdAt: true },
        });
    },
};

export const defaultFactDeps: FactDeps = {
    store: prismaFactStore,
    generate: generateMovieFact,
    now: () => new Date(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};