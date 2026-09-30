"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

type Props = {
  userId: string;
  avatarUrl: string | null;
  initials: string;
};

export default function AvatarUpload({ userId, avatarUrl, initials }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const supabase = createClient();

    // The image file goes to Storage; only its URL is saved in the profiles table
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (saveError) setError(saveError.message);
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile photo"
          width={80}
          height={80}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {initials}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
