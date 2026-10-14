"use server";

import { refresh } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { budgetReached, hoursUntilNextMemory } from "./limits";
import { MEMORY_MODEL, MEMORY_PROMPT, OpenAIRefusedError, drawMemory } from "./openai";

// How long the private image links work
const LINK_SECONDS = 60 * 60;

export type CreatedMemory = { view: string; download: string };

export type CreateMemoryResult = { memory: CreatedMemory } | { error: string };

// Turn one of your photos into a private AI illustration.
// Checked before calling OpenAI: it's your photo, 1 per day, and the monthly budget.
export async function createMemoryImage(memoryId: number): Promise<CreateMemoryResult> {
  if (!Number.isInteger(memoryId)) return { error: "Invalid photo." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Sign in to create a memory." };

  const { data: memory } = await supabase
    .from("memories")
    .select("photo_url")
    .eq("id", memoryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!memory) return { error: "You can only create memories from your own photos." };
  // Only photos from the user's own folder in our Storage (RLS checks this too),
  // so the server never downloads from anywhere else
  const folder = supabase.storage.from("memories").getPublicUrl(`${userId}/`).data.publicUrl;
  if (!memory.photo_url.startsWith(folder)) return { error: "This photo can't be used." };

  const wait = await hoursUntilNextMemory(supabase, userId);
  if (wait > 0) return { error: `You can create 1 memory per day. Try again in ${wait} h.` };
  if (await budgetReached(supabase)) return { error: "Memories are paused until next month." };

  try {
    const res = await fetch(memory.photo_url);
    if (!res.ok) throw new Error(`Photo download failed: ${res.status}`);
    const { png, cost } = await drawMemory(await res.blob());

    // RLS: users can only save into their own folder of the private bucket
    const path = `${userId}/${memoryId}-${Date.now()}.png`;
    const storage = supabase.storage.from("memory-images");
    const { error: uploadError } = await storage.upload(path, png, { contentType: "image/png" });
    if (uploadError) throw uploadError;

    // RLS: only for your own photos, 1 per day
    const { error } = await supabase
      .from("memory_images")
      .insert({ memory_id: memoryId, image_path: path, prompt: MEMORY_PROMPT, model: MEMORY_MODEL, cost });
    if (error) {
      // The image was paid for but can't be saved; log it so the cost isn't silently lost
      console.error(`createMemoryImage: saving failed after spending $${cost}`, error);
      await storage.remove([path]);
      return { error: "Couldn't save your memory. Try again." };
    }

    const [{ data: view }, { data: download }] = await Promise.all([
      storage.createSignedUrl(path, LINK_SECONDS),
      storage.createSignedUrl(path, LINK_SECONDS, { download: true }),
    ]);
    // Other photos on the page now show the wait until the next memory
    refresh();
    if (!view || !download) return { error: "Your memory was saved, but couldn't be shown. See My memories." };
    return { memory: { view: view.signedUrl, download: download.signedUrl } };
  } catch (err) {
    console.error("createMemoryImage:", err);
    if (err instanceof OpenAIRefusedError) return { error: "The AI couldn't draw this photo. Try a different one." };
    return { error: "Couldn't create a memory right now. Try again in a moment." };
  }
}

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
