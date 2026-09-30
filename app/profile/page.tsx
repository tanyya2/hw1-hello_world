import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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
    <main className="flex flex-1 justify-center p-8">
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
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-200 text-3xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {initials}
          </div>
        )}

        <h1 className="text-2xl font-semibold">
          {profile?.first_name} {profile?.last_name}
        </h1>
        <p className="text-sm text-zinc-500">{user.email}</p>

        {profile?.bio && <p className="whitespace-pre-line">{profile.bio}</p>}

        <Link
          href="/profile/edit"
          className="mt-2 rounded-full border border-zinc-300 px-5 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Edit profile
        </Link>
      </div>
    </main>
  );
}
