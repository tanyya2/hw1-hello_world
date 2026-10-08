"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

type Props = {
  avatarUrl: string | null;
  initials: string;
};

const ITEM = "block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900";

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
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 ring-offset-2 transition hover:ring-2 hover:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-offset-black dark:hover:ring-zinc-700"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={36} height={36} className="h-9 w-9 object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-black">
          <Link href="/profile" onClick={close} className={ITEM}>
            Profile
          </Link>
          <Link href="/profile/edit" onClick={close} className={ITEM}>
            Edit profile
          </Link>
          <Link href="/plans?view=mine" onClick={close} className={ITEM}>
            My plans
          </Link>
          <form action={signOut} className="border-t border-zinc-200 dark:border-zinc-800">
            <button className={ITEM}>Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
