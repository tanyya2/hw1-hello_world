// Photos people can upload, and the file extension each is saved with
export const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Each user can add 1 photo per hour (also enforced by RLS)
export const COOLDOWN_MS = 60 * 60 * 1000;

// Minutes until a user who last added a photo at `last` can add another (0 = now)
export function minutesUntilNext(last: string | null, now = Date.now()) {
  if (!last) return 0;
  return Math.max(0, Math.ceil((new Date(last).getTime() + COOLDOWN_MS - now) / 60000));
}

// Gemini notes what's specific in the photo and drafts 5 captions before
// picking one, so the caption is about this photo rather than a generic joke.
export function buildCaptionPrompt() {
  return `You write the caption for a photo someone uploaded to a meme site. One caption, and it has to make people actually laugh, not just nod.

Work in three steps:
1. "details": list 3 to 5 specific, concrete things in this photo: a facial expression, a posture, something in the background, the setting, what someone or something is clearly about to do. Specific beats general.
2. "drafts": write 5 different captions, each built on a different detail and from a different angle: the inner monologue of someone or something in the photo, a deadpan observation, an absurdly dramatic or formal framing, an oddly specific situation that explains the photo, an unexpected comparison. If a draft would still work on a different photo, throw it out and write a more specific one.
3. "caption": pick the draft that is most surprising and specific to this photo, not the most relatable. You may tighten it.

Rules for the caption:
- At most 15 words. Shorter is usually funnier.
- Dry and confident. Never explain the joke.
- Avoid stock meme phrasing ("me when", "that look when", "hits different", "in this economy") and stock topics (8 AM classes, finals, Mondays, tuition, rent) unless the photo is literally about them.
- Plain text: no hashtags, no emojis, no *asterisks* or other formatting, no puns just for the sake of a pun.
- Punch at the situation, never at people's looks, bodies or identity.

Reply with only JSON, no other text:
{"details": string[], "drafts": string[], "caption": string}`;
}

// Pull the caption out of Gemini's reply (it sometimes wraps it in ```json fences).
// Returns null when there's no usable caption.
export function parseCaption(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const raw = JSON.parse(text.slice(start, end + 1));
    // Drop *emphasis* marks and quotes Gemini sometimes puts around the caption itself
    const caption = String(raw.caption ?? "")
      .replace(/[*_]/g, "")
      .trim()
      .replace(/^["“]|["”]$/g, "")
      .trim();
    return caption || null;
  } catch {
    return null;
  }
}
