import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AvatarUpload from "./AvatarUpload";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function Profile({ searchParams }: PageProps<"/profile">) {
  const { from } = await searchParams;

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
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-2xl font-semibold">Profile</h1>

        <AvatarUpload
          userId={user.sub}
          avatarUrl={profile?.avatar_url ?? null}
          initials={initials}
        />

        <ProfileForm
          firstName={profile?.first_name ?? ""}
          lastName={profile?.last_name ?? ""}
          bio={profile?.bio ?? ""}
          from={typeof from === "string" ? from : "/"}
        />
      </div>
    </main>
  );
}
