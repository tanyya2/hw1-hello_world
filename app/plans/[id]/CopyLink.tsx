"use client";

import { useState } from "react";

// Copies this plan's address so it can be shared
export default function CopyLink() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. not https): the address bar still has the link
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="h-10 rounded-full border border-line-strong px-4 text-sm transition hover:border-ink"
    >
      {copied ? "Link copied ✓" : "Copy link"}
    </button>
  );
}
