"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function saveName(formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/");

  if (!firstName || !lastName) redirect("/welcome");

  await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.sub);

  redirect("/");
}
