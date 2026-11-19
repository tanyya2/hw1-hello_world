import Link from "next/link";

export default async function AuthError({ searchParams }: PageProps<"/auth/error">) {
  const { message } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="m-0 font-serif text-[32px] font-medium">Sign-in failed</h1>
      <p className="m-0 text-muted">{message ?? "Something went wrong while signing you in."}</p>
      <Link href="/" className="text-sm underline underline-offset-4 hover:text-accent">
        Back to home
      </Link>
    </main>
  );
}
