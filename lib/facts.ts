import "server-only";
import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/openai";

// Base version: generate a new fact on every request and store it.
// Variant A replaces this with caching, burst protection, and fallback.
export async function createFactForUser(userId: string, movie: string) {
    const content = await generateMovieFact(movie);
    return prisma.fact.create({
        data: { userId, movie, content },
    });
}