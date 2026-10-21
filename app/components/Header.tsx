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
    <header className="border-b border-line">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <nav className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="font-serif text-2xl font-semibold tracking-tight sm:text-[28px]">
            OutNYC
          </Link>
          <Link href="/plans" className="text-[15px] hover:text-accent">
            Plans
          </Link>
          {user && (
            <Link href="/plan" className="text-[15px] hover:text-accent">
              Make a plan
            </Link>
          )}
        </nav>

        {user ? <ProfileMenu avatarUrl={profile?.avatar_url ?? null} initials={initials} /> : <SignInButton />}
      </div>
    </header>
  );
}
