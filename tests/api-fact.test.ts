import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    getFactForUser: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/facts", () => ({ getFactForUser: mocks.getFactForUser }));
vi.mock("@/lib/fact-store", () => ({ defaultFactDeps: {} }));

import { GET } from "@/app/api/fact/route";

describe("GET /api/fact authorization", () => {
    beforeEach(() => {
        mocks.auth.mockReset();
        mocks.getFactForUser.mockReset();
    });

    it("returns 401 when not signed in", async () => {
        mocks.auth.mockResolvedValue(null);

        const res = await GET(new Request("http://localhost/api/fact"));

        expect(res.status).toBe(401);
        expect(mocks.getFactForUser).not.toHaveBeenCalled();
    });

    it("uses the session user and ignores a userId in the URL", async () => {
        mocks.auth.mockResolvedValue({ user: { id: "user-a" } });
        mocks.getFactForUser.mockResolvedValue({
            status: "ok",
            source: "cache",
            fact: { content: "A's fact", createdAt: new Date() },
        });

        const res = await GET(new Request("http://localhost/api/fact?userId=user-b"));

        expect(res.status).toBe(200);
        expect(mocks.getFactForUser).toHaveBeenCalledWith("user-a", expect.anything());
        expect(mocks.getFactForUser).not.toHaveBeenCalledWith("user-b", expect.anything());
    });
});