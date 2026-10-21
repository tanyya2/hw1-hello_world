"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  // "outline" for the header, "primary" for big calls to action
  variant?: "outline" | "primary";
  // Where to go after signing in, e.g. "/plan" (default: home)
  next?: string;
  children?: React.ReactNode;
};

const STYLES = {
  outline: "gap-2.5 border border-ink px-4 py-2 text-[15px] hover:bg-card",
  primary: "bg-accent px-7 py-4 font-semibold text-white hover:bg-[#174634]",
};

// Google sign-in; Supabase sends the user back to /auth/callback
export default function SignInButton({ variant = "outline", next, children }: Props) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    // Read by /auth/callback; a cookie keeps the return address Supabase checks unchanged
    document.cookie = `after_sign_in=${encodeURIComponent(next ?? "/")}; path=/; max-age=600; samesite=lax`;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setLoading(false);
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className={`flex items-center justify-center rounded-full transition disabled:cursor-wait disabled:opacity-60 ${STYLES[variant]}`}
    >
      {variant === "outline" && (
        <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
      )}
      {loading ? "Redirecting…" : (children ?? "Sign in")}
    </button>
  );
}
