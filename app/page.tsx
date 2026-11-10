import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { favoriteMovie: true },
    });
    redirect(user?.favoriteMovie ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 text-center shadow">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Movie Memory</h1>
          <p className="text-sm text-gray-600">
            Save your favorite movie and get fun facts about it.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-lg bg-black px-4 py-2.5 text-white hover:bg-gray-800">
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}