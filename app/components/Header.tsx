import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import ProfileMenu from "./ProfileMenu";
import SignInButton from "./SignInButton";

export default async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { data: profile } = user
    ? await supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.sub).single()
    : { data: null };
  const initials =
    `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <nav className="flex items-center gap-6">
        <Link href="/" className="font-semibold">
          Home
        </Link>
        <Link href="/plans" className="font-semibold">
          Plans
        </Link>
      </nav>

      {user ? <ProfileMenu avatarUrl={profile?.avatar_url ?? null} initials={initials} /> : <SignInButton />}
    </header>
  );
}
