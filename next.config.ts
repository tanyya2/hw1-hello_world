import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow profile photos from Supabase Storage
    remotePatterns: [new URL("https://stvkpfljyavatafrqcvv.supabase.co/storage/v1/object/public/**")],
  },
};

export default nextConfig;
