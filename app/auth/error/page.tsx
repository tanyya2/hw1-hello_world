import Link from "next/link";

export default async function AuthError({ searchParams }: PageProps<"/auth/error">) {
  const { message } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign-in failed</h1>
      <p className="text-zinc-500">{message ?? "Something went wrong while signing you in."}</p>
      <Link href="/" className="underline">
        Back to home
      </Link>
    </main>
  );
}
