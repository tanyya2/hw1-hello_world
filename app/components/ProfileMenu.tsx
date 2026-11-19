"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

type Props = {
  avatarUrl: string | null;
  initials: string;
};

const ITEM = "block w-full px-4 py-2 text-left text-sm hover:bg-paper";

export default function ProfileMenu({ avatarUrl, initials }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on a click outside the menu or on Escape
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Profile menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-white ring-offset-2 ring-offset-paper transition hover:ring-2 hover:ring-accent/30"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={36} height={36} className="h-9 w-9 object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-lg">
          <Link href="/profile" onClick={close} className={ITEM}>
            Profile
          </Link>
          <Link href="/profile/edit" onClick={close} className={ITEM}>
            Edit profile
          </Link>
          <Link href="/plans?view=mine" onClick={close} className={ITEM}>
            My plans
          </Link>
          <form action={signOut} className="border-t border-line">
            <button className={ITEM}>Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
