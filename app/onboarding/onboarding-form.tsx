"use client";

import { useActionState } from "react";
import { saveFavoriteMovie, type OnboardingState } from "./actions";
import { MOVIE_MAX_LENGTH } from "@/lib/validation";

const initialState: OnboardingState = {};

export default function OnboardingForm() {
    const [state, formAction, pending] = useActionState(saveFavoriteMovie, initialState);

    return (
        <form action={formAction} className="space-y-3 text-left">
            <label htmlFor="movie" className="block text-sm font-medium text-gray-700">
                What's your favorite movie?
            </label>
            <input
                id="movie"
                name="movie"
                maxLength={MOVIE_MAX_LENGTH}
                placeholder="e.g. Spirited Away"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-black focus:outline-none"
                aria-invalid={!!state.error}
                aria-describedby={state.error ? "movie-error" : undefined}
            />
            {state.error && (
                <p id="movie-error" role="alert" className="text-sm text-red-600">
                    {state.error}
                </p>
            )}
            <button
                disabled={pending}
                className="w-full rounded-lg bg-black px-4 py-2.5 text-white hover:bg-gray-800 disabled:opacity-50"
            >
                {pending ? "Saving..." : "Continue"}
            </button>
        </form>
    );
}