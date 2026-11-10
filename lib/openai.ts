import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient() {
    if (!client) {
        client = new OpenAI({ timeout: 10_000, maxRetries: 1 });
    }
    return client;
}

export async function generateMovieFact(movie: string): Promise<string> {
    const res = await getClient().chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content:
                    "You share one short, fun, accurate fact about a movie. Reply with the fact only, in 1 to 2 sentences. If you don't recognize the movie, say so briefly instead of inventing details.",
            },
            { role: "user", content: `Movie title: ${movie}` },
        ],
        max_completion_tokens: 150,
    });

    const text = res.choices[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned an empty response");
    return text;
}