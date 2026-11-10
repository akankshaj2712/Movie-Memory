import { getFactForUser, type FactResult } from "@/lib/facts";
import { defaultFactDeps } from "@/lib/fact-store";
import RefreshFactButton from "./refresh-fact-button";

const FALLBACK_ERROR: FactResult = {
    status: "error",
    message: "We couldn't come up with a fun fact right now. Please try again in a moment.",
};

export default async function FactCard({ userId }: { userId: string }) {
    const result = await getFactForUser(userId, defaultFactDeps).catch((err) => {
        console.error("Fact service failed:", err);
        return FALLBACK_ERROR;
    });

    if (result.status !== "ok") {
        const message =
            result.status === "error" ? result.message : "Set a favorite movie to get a fact.";
        return (
            <div className="space-y-3">
                <p className="text-sm text-red-600">{message}</p>
                <RefreshFactButton />
            </div>
        );
    }

    const ageSeconds = Math.max(
        0,
        Math.round((Date.now() - result.fact.createdAt.getTime()) / 1000)
    );
    const label = {
        fresh: "New fact",
        cache: `Cached · generated ${ageSeconds}s ago`,
        fallback: "Showing your last saved fact (live service unavailable)",
    }[result.source];

    return (
        <div className="space-y-3">
            <p className="text-gray-800">{result.fact.content}</p>
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{label}</span>
                <RefreshFactButton />
            </div>
        </div>
    );
}