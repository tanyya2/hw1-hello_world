"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type Props = {
  firstName: string;
  lastName: string;
  bio: string;
  from: string;
};

export default function ProfileForm({ firstName, lastName, bio, from }: Props) {
  const [state, formAction, pending] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      <label className="flex flex-col gap-1 text-sm">
        First name
        <input name="first_name" required defaultValue={firstName} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Last name
        <input name="last_name" required defaultValue={lastName} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Bio <span className="text-zinc-500">(optional)</span>
        <textarea name="bio" rows={3} defaultValue={bio} className={inputClass} />
      </label>

      <button
        disabled={pending}
        className="rounded-full bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : "Save"}
      </button>

      {state && (
        <p className={`text-center text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
