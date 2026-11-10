import { describe, it, expect, vi } from "vitest";
import { getFactForUser, CACHE_WINDOW_MS, type FactStore, type FactDeps } from "@/lib/facts";

type Row = { userId: string; movie: string; content: string; createdAt: Date };

// In-memory FactStore with the same semantics as the Prisma one.
function memoryStore(users: Record<string, string | null>, initialFacts: Row[] = []) {
    const userRows = new Map(
        Object.entries(users).map(([id, movie]) => [id, { movie, lock: null as Date | null }])
    );
    const facts = [...initialFacts];

    const store: FactStore = {
        async getUserMovie(id) {
            return userRows.get(id)?.movie ?? null;
        },
        async latestFact(userId, movie) {
            const matches = facts
                .filter((f) => f.userId === userId && f.movie === movie)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return matches[0] ?? null;
        },
        async tryAcquireLock(id, now, leaseMs) {
            const u = userRows.get(id);
            if (!u) return false;
            if (u.lock && u.lock.getTime() >= now.getTime() - leaseMs) return false;
            u.lock = now;
            return true;
        },
        async releaseLock(id, acquiredAt) {
            const u = userRows.get(id);
            if (u?.lock?.getTime() === acquiredAt.getTime()) u.lock = null;
        },
        async insertFact(userId, movie, content, createdAt) {
            const row = { userId, movie, content, createdAt };
            facts.push(row);
            return row;
        },
    };

    return { store, facts };
}

const T0 = new Date("2026-01-01T12:00:00Z").getTime();

function deps(store: FactStore, overrides: Partial<FactDeps> = {}): FactDeps {
    return {
        store,
        generate: vi.fn(async () => "A brand new fact"),
        now: () => new Date(T0),
        sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 10))),
        ...overrides,
    };
}

const factAt = (userId: string, movie: string, msAgo: number, content = "Old fact"): Row => ({
    userId,
    movie,
    content,
    createdAt: new Date(T0 - msAgo),
});

describe("60-second cache window", () => {
    it("returns the cached fact when it is less than 60s old", async () => {
        const { store } = memoryStore({ a: "Inception" }, [factAt("a", "Inception", 59_000)]);
        const d = deps(store);

        const result = await getFactForUser("a", d);

        expect(result).toMatchObject({ status: "ok", source: "cache", fact: { content: "Old fact" } });
        expect(d.generate).not.toHaveBeenCalled();
    });

    it("generates a new fact when the latest is exactly 60s old", async () => {
        const { store, facts } = memoryStore({ a: "Inception" }, [
            factAt("a", "Inception", CACHE_WINDOW_MS),
        ]);
        const d = deps(store);

        const result = await getFactForUser("a", d);

        expect(result).toMatchObject({ status: "ok", source: "fresh", fact: { content: "A brand new fact" } });
        expect(d.generate).toHaveBeenCalledOnce();
        expect(facts).toHaveLength(2);
    });

    it("generates a new fact when the latest is older than 60s", async () => {
        const { store } = memoryStore({ a: "Inception" }, [factAt("a", "Inception", 5 * 60_000)]);
        const d = deps(store);

        const result = await getFactForUser("a", d);

        expect(result).toMatchObject({ source: "fresh" });
        expect(d.generate).toHaveBeenCalledWith("Inception");
    });

    it("ignores cached facts for a previous favorite movie", async () => {
        const { store } = memoryStore({ a: "Arrival" }, [factAt("a", "Inception", 1_000)]);
        const d = deps(store);

        const result = await getFactForUser("a", d);

        expect(result).toMatchObject({ source: "fresh" });
        expect(d.generate).toHaveBeenCalledWith("Arrival");
    });
});

describe("burst protection", () => {
    it("generates only once when many requests arrive together", async () => {
        const { store, facts } = memoryStore({ a: "Inception" });
        const generate = vi.fn(
            () => new Promise<string>((r) => setTimeout(() => r("Only fact"), 5))
        );
        const d = deps(store, { generate });

        const results = await Promise.all(
            Array.from({ length: 5 }, () => getFactForUser("a", d))
        );

        expect(generate).toHaveBeenCalledOnce();
        expect(facts).toHaveLength(1);
        for (const r of results) {
            expect(r).toMatchObject({ status: "ok", fact: { content: "Only fact" } });
        }
    });
});

describe("failure handling", () => {
    it("returns the most recent stale fact if OpenAI fails", async () => {
        const { store } = memoryStore({ a: "Inception" }, [factAt("a", "Inception", 10 * 60_000)]);
        const d = deps(store, { generate: vi.fn(async () => { throw new Error("timeout"); }) });

        const result = await getFactForUser("a", d);

        expect(result).toMatchObject({ status: "ok", source: "fallback", fact: { content: "Old fact" } });
    });

    it("returns a friendly error if OpenAI fails and no fact exists", async () => {
        const { store } = memoryStore({ a: "Inception" });
        const d = deps(store, { generate: vi.fn(async () => { throw new Error("500"); }) });

        const result = await getFactForUser("a", d);

        expect(result.status).toBe("error");
    });

    it("releases the lock after a failure so the next request can retry", async () => {
        const { store } = memoryStore({ a: "Inception" });
        const failing = deps(store, { generate: vi.fn(async () => { throw new Error("down"); }) });
        await getFactForUser("a", failing);

        const working = deps(store);
        const result = await getFactForUser("a", working);

        expect(result).toMatchObject({ source: "fresh" });
    });
});

describe("authorization", () => {
    it("never returns another user's fact", async () => {
        const { store, facts } = memoryStore({ a: "Inception", b: "Inception" }, [
            factAt("b", "Inception", 1_000, "Bob's private fact"),
        ]);
        const d = deps(store);

        const result = await getFactForUser("a", d);

        expect(result).toMatchObject({ source: "fresh", fact: { content: "A brand new fact" } });
        expect(facts.filter((f) => f.userId === "a")).toHaveLength(1);
    });

    it("returns no_movie for a user who hasn't onboarded", async () => {
        const { store } = memoryStore({ a: null });
        expect(await getFactForUser("a", deps(store))).toEqual({ status: "no_movie" });
    });
});