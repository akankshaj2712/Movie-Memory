import { auth } from "@/auth";
import { getFactForUser } from "@/lib/facts";
import { defaultFactDeps } from "@/lib/fact-store";

// The user is taken from the session only. Any userId in the URL is ignored,
// so one user can never request another user's facts.
export async function GET(_request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Not signed in" }, { status: 401 });
    }

    const result = await getFactForUser(session.user.id, defaultFactDeps);

    switch (result.status) {
        case "ok":
            return Response.json({
                fact: result.fact.content,
                createdAt: result.fact.createdAt.toISOString(),
                source: result.source,
            });
        case "no_movie":
            return Response.json({ error: "Set a favorite movie first" }, { status: 409 });
        case "error":
            return Response.json({ error: result.message }, { status: 503 });
    }
}