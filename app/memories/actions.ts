"use server";

import { createClient } from "@/utils/supabase/server";
import { GeminiBusyError, askGemini } from "@/app/explore/gemini";
import { lastMemoryAt } from "./limit";
import { isPhotoAllowed } from "./moderation";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, buildCaptionPrompt, minutesUntilNext, parseCaption } from "./prompt";

export type Memory = { id: number; photoUrl: string; caption: string };

export type MemoryResult = { memory: Memory } | { error: string };

// Photos older than this with no memory row were left by a failed attempt
const UNFINISHED_MS = 5 * 60 * 1000;

// Delete the user's photos that never got a caption (e.g. the server crashed
// halfway), so they don't use up the user's 1 upload per hour.
// Called before each upload.
export async function clearUnfinished(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;

  // RLS: users can only list and delete files in their own folder
  const { data: files } = await supabase.storage.from("memories").list(userId, { limit: 100 });
  const { data: memories } = await supabase.from("memories").select("photo_url").eq("user_id", userId);
  const used = new Set((memories ?? []).map((memory) => memory.photo_url));

  const unfinished = (files ?? [])
    .flatMap((file) => (file.created_at ? [{ path: `${userId}/${file.name}`, createdAt: file.created_at }] : []))
    .filter(
      ({ path, createdAt }) =>
        !used.has(supabase.storage.from("memories").getPublicUrl(path).data.publicUrl) &&
        Date.now() - new Date(createdAt).getTime() > UNFINISHED_MS
    )
    .map(({ path }) => path);
  if (unfinished.length === 0) return;

  const { error } = await supabase.storage.from("memories").remove(unfinished);
  if (error) console.error("clearUnfinished:", error);
}

// The browser uploads the photo to Storage first (Server Actions only take small
// requests), then sends its path here. We read the photo back from Storage,
// check it's appropriate, ask Gemini for a caption, and save the memory.
// If anything fails, the photo is deleted again so there are no photos without captions.
export async function makeMemory(planId: number, path: string): Promise<MemoryResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Sign in to add a photo." };

  // Only photos from the user's own folder, e.g. "<user id>/1760450000000.jpg"
  const exts = Object.values(PHOTO_TYPES).join("|");
  if (!Number.isInteger(planId) || typeof path !== "string" || !new RegExp(`^${userId}/\\d+\\.(${exts})$`).test(path)) {
    return { error: "Invalid photo." };
  }

  const fail = async (error: string): Promise<MemoryResult> => {
    // RLS: users can only delete photos in their own folder
    const { error: removeError } = await supabase.storage.from("memories").remove([path]);
    if (removeError) console.error("makeMemory: deleting photo failed", removeError);
    return { error };
  };

  try {
    // RLS also enforces both of these; checking first avoids wasting an AI request
    const { data: plan } = await supabase.from("plans").select("id").eq("id", planId).eq("user_id", userId).maybeSingle();
    if (!plan) return fail("You can only add photos to your own plans.");
    const wait = minutesUntilNext(await lastMemoryAt(supabase, userId));
    if (wait > 0) return fail(`You can add 1 photo per hour. Try again in ${wait} min.`);

    // The bucket is public, so the photo can be read straight from its URL
    const photoUrl = supabase.storage.from("memories").getPublicUrl(path).data.publicUrl;
    const res = await fetch(photoUrl);
    if (!res.ok) {
      console.error("makeMemory: download failed", res.status);
      return fail("Couldn't read your photo. Try uploading it again.");
    }
    const photo = await res.blob();
    if (!PHOTO_TYPES[photo.type] || photo.size > MAX_PHOTO_BYTES) {
      return fail("Photos must be JPG, PNG or WebP, up to 5 MB.");
    }
    const image = { mimeType: photo.type, data: Buffer.from(await photo.arrayBuffer()).toString("base64") };

    if (!(await isPhotoAllowed(image))) {
      return fail("This photo can't be posted. Please pick a different one.");
    }

    const reply = await askGemini(buildCaptionPrompt, { search: false, thinking: true, image });
    const caption = parseCaption(reply.text);
    if (!caption) {
      console.error("makeMemory: no caption in reply", reply.text);
      return fail("Couldn't write a caption for this one. Try another photo.");
    }

    // RLS: user_id defaults to the logged-in user; users can only add memories
    // to their own plans, 1 per hour
    const { data: saved, error } = await supabase
      .from("memories")
      .insert({ plan_id: planId, photo_url: photoUrl, caption, prompt: reply.prompt, model: reply.model })
      .select("id")
      .single();
    if (error) {
      console.error("makeMemory: saving failed", error);
      return fail("Couldn't save your photo. Try again.");
    }

    return { memory: { id: saved.id, photoUrl, caption } };
  } catch (err) {
    console.error("makeMemory:", err);
    if (err instanceof GeminiBusyError) return fail("The AI is out of free requests for today. Try again tomorrow.");
    return fail("Couldn't add your photo right now. Try again in a moment.");
  }
}
