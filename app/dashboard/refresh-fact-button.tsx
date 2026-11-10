"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function RefreshFactButton() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    return (
        <button
            onClick={() => startTransition(() => router.refresh())}
            disabled={pending}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
            {pending ? "Checking..." : "Refresh fact"}
        </button>
    );
}