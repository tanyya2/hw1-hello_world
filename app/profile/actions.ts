"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Error message to show under the form, or null
export type SaveState = string | null;

export async function updateProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/");

  if (!firstName || !lastName) return "First and last name are required.";

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.sub);

  if (error) return error.message;

  redirect("/profile");
}
