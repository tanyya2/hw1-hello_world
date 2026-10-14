// Server-only: reads the API key.
// OpenAI's moderation check is free and works on images. It flags sexual,
// violent, hateful, self-harm and similar content.
export async function isPhotoAllowed(image: { mimeType: string; data: string }): Promise<boolean> {
  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } }],
    }),
  });
  // Strict: if the check itself fails, the photo isn't allowed
  if (!res.ok) throw new Error(`Moderation failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.results?.[0]?.flagged === false;
}
