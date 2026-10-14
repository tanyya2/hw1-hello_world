"use server";

import { refresh } from "next/cache";
import { createClient } from "@/utils/supabase/server";

// Delete one of your memories: the image file is removed, but the row stays
// (marked deleted) so its cost still counts toward the daily limit and monthly budget.
export async function deleteMemoryImage(id: number): Promise<{ error: string } | null> {
  if (!Number.isInteger(id)) return { error: "Invalid memory." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Sign in to delete memories." };

  // RLS: users only see and update their own images, and can only change deleted_at
  const { data: image, error } = await supabase
    .from("memory_images")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("image_path")
    .maybeSingle();
  if (error || !image) {
    if (error) console.error("deleteMemoryImage:", error);
    return { error: "Couldn't delete this memory. Try again." };
  }

  const { error: removeError } = await supabase.storage.from("memory-images").remove([image.image_path]);
  if (removeError) console.error("deleteMemoryImage: removing file failed", removeError);

  refresh();
  return null;
}
