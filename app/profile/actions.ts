"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type SaveState = { message: string; ok: boolean } | null;

export async function updateProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/");

  if (!firstName || !lastName) {
    return { ok: false, message: "First and last name are required." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.sub);

  if (error) return { ok: false, message: error.message };

  // Go back to the page the user came from (only paths inside this site)
  const from = String(formData.get("from") ?? "/");
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/");
}
