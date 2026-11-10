"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { movieSchema } from "@/lib/validation";

export type OnboardingState = { error?: string };

export async function saveFavoriteMovie(
    _prev: OnboardingState,
    formData: FormData
): Promise<OnboardingState> {
    const session = await auth();
    if (!session?.user?.id) redirect("/");

    const parsed = movieSchema.safeParse(String(formData.get("movie") ?? ""));
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid movie title." };
    }

    // Only set it if not already set: onboarding is first-time only.
    await prisma.user.updateMany({
        where: { id: session.user.id, favoriteMovie: null },
        data: { favoriteMovie: parsed.data },
    });

    redirect("/dashboard");
}