// Server-only: reads the API key.
// Turns a photo into an illustration with OpenAI's image model.
export const MEMORY_MODEL = "gpt-image-2";
const QUALITY = "medium";

export const MEMORY_PROMPT = `Redraw this photo as a modern naive illustration with the look of a premium designer poster: minimalist, hand-drawn, uneven outlines, flat contrasting colors from a small palette, decorative strokes. No shadows, no gradients, no 3D, no text or letters. Keep everything from the photo — the same people, poses, objects, setting and composition — so people still recognize themselves and the moment. Make it funny-cute through the drawing style only: playful proportions such as slightly bigger heads and expressive faces, in a warm, friendly way.`;

// OpenAI's prices for gpt-image-2, in dollars per token
const PRICE = { textIn: 5 / 1e6, imageIn: 8 / 1e6, imageOut: 30 / 1e6 };
// What one image costs at most, for the budget check before drawing (tests cost ~$0.065)
export const MAX_IMAGE_COST = 0.1;

// OpenAI said no on purpose (e.g. the photo broke its rules)
export class OpenAIRefusedError extends Error {}

type Usage = {
  input_tokens_details?: { text_tokens?: number; image_tokens?: number };
  output_tokens?: number;
};

// The real cost of one image, from the tokens OpenAI says it used
export function imageCost(usage: Usage | undefined): number {
  if (!usage) return MAX_IMAGE_COST;
  const cost =
    (usage.input_tokens_details?.text_tokens ?? 0) * PRICE.textIn +
    (usage.input_tokens_details?.image_tokens ?? 0) * PRICE.imageIn +
    (usage.output_tokens ?? 0) * PRICE.imageOut;
  return Math.ceil(cost * 10000) / 10000;
}

// Returns the PNG and what it cost
export async function drawMemory(photo: Blob): Promise<{ png: Buffer; cost: number }> {
  const form = new FormData();
  form.append("model", MEMORY_MODEL);
  form.append("prompt", MEMORY_PROMPT);
  form.append("quality", QUALITY);
  form.append("size", "1024x1024");
  form.append("image", photo, "photo.jpg");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    const message = `OpenAI ${res.status}: ${data.error?.code ?? ""} ${data.error?.message ?? ""}`;
    // Refused photos, or out of money / over the spend limit
    if (res.status === 400 && data.error?.code === "moderation_blocked") throw new OpenAIRefusedError(message);
    throw new Error(message);
  }
  return { png: Buffer.from(data.data[0].b64_json, "base64"), cost: imageCost(data.usage) };
}
