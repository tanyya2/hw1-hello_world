import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow profile photos from Supabase Storage and Google accounts
    remotePatterns: [
      new URL("https://stvkpfljyavatafrqcvv.supabase.co/storage/v1/object/public/**"),
      new URL("https://lh3.googleusercontent.com/**"),
    ],
  },
};

export default nextConfig;
