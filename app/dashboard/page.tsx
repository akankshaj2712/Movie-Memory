import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
    const user = await requireUser();
    if (!user.favoriteMovie) redirect("/onboarding");

    const displayName = user.name?.trim() || user.email?.split("@")[0] || "there";
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-xl space-y-6">
                <header className="flex items-center justify-between rounded-2xl bg-white p-5 shadow">
                    <div className="flex items-center gap-4">
                        {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.image}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="h-12 w-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-medium text-gray-700">
                                {initial}
                            </div>
                        )}
                        <div>
                            <p className="font-medium">{displayName}</p>
                            {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
                        </div>
                    </div>
                    <form
                        action={async () => {
                            "use server";
                            await signOut({ redirectTo: "/" });
                        }}
                    >
                        <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100">
                            Log out
                        </button>
                    </form>
                </header>

                <section className="rounded-2xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Your favorite movie</p>
                    <p className="text-xl font-semibold">{user.favoriteMovie}</p>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Fun fact</p>
                    <p className="text-gray-400">Coming in the next step.</p>
                </section>
            </div>
        </main>
    );
}