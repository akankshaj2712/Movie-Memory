import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
    const user = await requireUser();
    if (user.favoriteMovie) redirect("/dashboard");

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow">
                <div className="space-y-1 text-center">
                    <h1 className="text-xl font-semibold">Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}!</h1>
                    <p className="text-sm text-gray-600">One quick question before we start.</p>
                </div>
                <OnboardingForm />
            </div>
        </main>
    );
}