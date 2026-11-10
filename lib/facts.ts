// Pure fact-generation logic for Variant A.
// No Prisma or OpenAI imports here: those are passed in as dependencies,
// so this file can be unit-tested with an in-memory store and a fake clock.

export const CACHE_WINDOW_MS = 60_000; // facts younger than this are reused
export const LOCK_LEASE_MS = 30_000;   // a generation lock auto-expires after this
const WAIT_ATTEMPTS = 6;
const WAIT_INTERVAL_MS = 500;

export type StoredFact = { content: string; createdAt: Date };

export interface FactStore {
    getUserMovie(userId: string): Promise<string | null>;
    latestFact(userId: string, movie: string): Promise<StoredFact | null>;
    tryAcquireLock(userId: string, now: Date, leaseMs: number): Promise<boolean>;
    releaseLock(userId: string, acquiredAt: Date): Promise<void>;
    insertFact(userId: string, movie: string, content: string, createdAt: Date): Promise<StoredFact>;
}

export type FactDeps = {
    store: FactStore;
    generate: (movie: string) => Promise<string>;
    now: () => Date;
    sleep: (ms: number) => Promise<void>;
};

export type FactSource = "cache" | "fresh" | "fallback";

export type FactResult =
    | { status: "ok"; fact: StoredFact; source: FactSource }
    | { status: "no_movie" }
    | { status: "error"; message: string };

const FRIENDLY_ERROR =
    "We couldn't come up with a fun fact right now. Please try again in a moment.";

export function isFresh(fact: StoredFact, now: Date): boolean {
    return now.getTime() - fact.createdAt.getTime() < CACHE_WINDOW_MS;
}

const ok = (fact: StoredFact, source: FactSource): FactResult => ({
    status: "ok",
    fact,
    source,
});

export async function getFactForUser(userId: string, deps: FactDeps): Promise<FactResult> {
    const { store, generate, now, sleep } = deps;

    // 1. The movie always comes from the DB for this user, never from the request.
    const movie = await store.getUserMovie(userId);
    if (!movie) return { status: "no_movie" };

    // 2. Cache window: reuse a fact younger than 60 seconds.
    const latest = await store.latestFact(userId, movie);
    if (latest && isFresh(latest, now())) return ok(latest, "cache");

    // 3. Burst protection: only one request per user may generate at a time.
    const lockTime = now();
    const acquired = await store.tryAcquireLock(userId, lockTime, LOCK_LEASE_MS);

    if (!acquired) {
        // Another tab or refresh is already generating. Wait briefly for its result.
        for (let i = 0; i < WAIT_ATTEMPTS; i++) {
            await sleep(WAIT_INTERVAL_MS);
            const fact = await store.latestFact(userId, movie);
            if (fact && isFresh(fact, now())) return ok(fact, "cache");
        }
        return latest ? ok(latest, "fallback") : { status: "error", message: FRIENDLY_ERROR };
    }

    try {
        // 4. Re-check after getting the lock: a request that held the lock a moment
        //    ago may have just saved a fact.
        const recheck = await store.latestFact(userId, movie);
        if (recheck && isFresh(recheck, now())) return ok(recheck, "cache");

        // 5. Generate and store.
        const content = await generate(movie);
        const fact = await store.insertFact(userId, movie, content, now());
        return ok(fact, "fresh");
    } catch (err) {
        // 6. Failure handling: fall back to the most recent fact, even if stale.
        console.error("Fact generation failed:", err);
        const fallback = await store.latestFact(userId, movie);
        return fallback ? ok(fallback, "fallback") : { status: "error", message: FRIENDLY_ERROR };
    } finally {
        // 7. Always release, but only our own lock (see releaseLock).
        await store.releaseLock(userId, lockTime);
    }
}