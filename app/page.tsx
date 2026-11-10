import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return (
      <main className="p-10">
        <form action={async () => { "use server"; await signIn("google"); }}>
          <button className="rounded bg-black px-4 py-2 text-white">Sign in with Google</button>
        </form>
      </main>
    );
  }

  return (
    <main className="p-10 space-y-2">
      <p>Signed in as {session.user.name} ({session.user.email})</p>
      <form action={async () => { "use server"; await signOut(); }}>
        <button className="rounded border px-4 py-2">Sign out</button>
      </form>
    </main>
  );
}