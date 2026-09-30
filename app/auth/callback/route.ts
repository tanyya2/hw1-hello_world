import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Google → Supabase → here. Swaps the one-time code for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let message = searchParams.get("error_description") ?? "No login code received";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First name or last name missing → ask for them
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", data.user.id)
        .single();

      const hasName = profile?.first_name && profile?.last_name;
      return NextResponse.redirect(`${origin}${hasName ? "/" : "/welcome"}`);
    }
    message = error.message;
  }

  return NextResponse.redirect(
    `${origin}/auth/error?message=${encodeURIComponent(message)}`
  );
}
