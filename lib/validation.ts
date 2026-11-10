import { z } from "zod";

export const MOVIE_MAX_LENGTH = 100;

export const movieSchema = z
    .string()
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(
        z
            .string()
            .min(1, "Please enter a movie title.")
            .max(MOVIE_MAX_LENGTH, `Movie title must be ${MOVIE_MAX_LENGTH} characters or fewer.`)
    );