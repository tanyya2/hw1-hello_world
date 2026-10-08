import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/auth/actions";
import SignInButton from "./SignInButton";

export default async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <nav className="flex items-center gap-4">
        <Link href="/" className="font-semibold">
          Home
        </Link>
        <Link href="/plans" className="text-sm hover:underline">
          Plans
        </Link>
      </nav>

      {user ? (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">{user.email}</span>
          <Link href="/profile" className="hover:underline">
            Profile
          </Link>
          <form action={signOut}>
            <button className="rounded-full border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <SignInButton />
      )}
    </header>
  );
}
