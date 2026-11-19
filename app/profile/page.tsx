import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { BUTTON } from "@/app/components/buttons";

export const metadata: Metadata = { title: "Profile" };

// Only for logged-in users
export default async function Profile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, bio, avatar_url")
    .eq("id", user.sub)
    .single();

  const initials =
    `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <main className="flex flex-1 justify-center px-5 pt-4 pb-10 sm:px-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt="Profile photo"
            width={112}
            height={112}
            className="h-28 w-28 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-accent font-serif text-4xl text-white">
            {initials}
          </div>
        )}

        <h1 className="m-0 font-serif text-[32px] leading-tight font-medium">
          {profile?.first_name} {profile?.last_name}
        </h1>
        <p className="m-0 -mt-2 text-sm text-muted">{user.email}</p>

        {profile?.bio && <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">{profile.bio}</p>}

        <Link
          href="/profile/edit"
          className={`${BUTTON.secondary} mt-2`}
        >
          Edit profile
        </Link>
      </div>
    </main>
  );
}
