"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Remembers the current page so Profile can send the user back after saving
export default function ProfileLink() {
  const pathname = usePathname();
  const href = pathname === "/profile" ? "/profile" : `/profile?from=${encodeURIComponent(pathname)}`;

  return (
    <Link href={href} className="hover:underline">
      Profile
    </Link>
  );
}
