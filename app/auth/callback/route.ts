import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Google gives every account a picture. Without an uploaded photo it's a plain
// letter avatar (~1 KB) — a real photo is many times bigger. Returns a 256px URL
// for a real photo, or null.
async function realPhoto(url: string) {
  // Users can edit their own account data, so only ever fetch from Google's image server
  if (!url.startsWith("https://lh3.googleusercontent.com/")) return null;
  const sized = url.replace(/=s\d+-c$/, "=s256-c");
  try {
    const res = await fetch(sized);
    if (!res.ok) return null;
    const bytes = (await res.arrayBuffer()).byteLength;
    return bytes > 5000 ? sized : null;
  } catch {
    return null;
  }
}

// Google → Supabase → here. Swaps the one-time code for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let message = searchParams.get("error_description") ?? "No login code received";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", data.user.id)
        .single();

      // No profile photo yet → use the Google account photo (never replaces an uploaded one)
      const googlePhoto: string | undefined = data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture;
      if (profile && !profile.avatar_url && googlePhoto) {
        const photo = await realPhoto(googlePhoto);
        if (photo) {
          await supabase
            .from("profiles")
            .update({ avatar_url: photo, updated_at: new Date().toISOString() })
            .eq("id", data.user.id);
        }
      }

      // Where the sign-in button asked to go next; only paths on this site
      const cookies = request.headers.get("cookie") ?? "";
      let next = "/";
      try {
        next = decodeURIComponent(cookies.match(/(?:^|;\s*)after_sign_in=([^;]*)/)?.[1] ?? "/");
      } catch {
        // A garbled cookie just means home
      }
      const destination = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";

      // First name or last name missing → ask for them first
      const hasName = profile?.first_name && profile?.last_name;
      const response = NextResponse.redirect(`${origin}${hasName ? destination : "/welcome"}`);
      response.cookies.delete("after_sign_in");
      return response;
    }
    message = error.message;
  }

  return NextResponse.redirect(
    `${origin}/auth/error?message=${encodeURIComponent(message)}`
  );
}
