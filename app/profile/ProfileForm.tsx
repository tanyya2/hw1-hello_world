"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BUTTON } from "@/app/components/buttons";
import { INPUT } from "@/app/components/fields";
import { updateProfile } from "./actions";

type Props = {
  firstName: string;
  lastName: string;
  bio: string;
};

export default function ProfileForm({ firstName, lastName, bio }: Props) {
  const [error, formAction, pending] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        First name
        <input name="first_name" required defaultValue={firstName} className={INPUT} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Last name
        <input name="last_name" required defaultValue={lastName} className={INPUT} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Bio <span className="text-muted">(optional)</span>
        <textarea name="bio" rows={3} defaultValue={bio} className={INPUT} />
      </label>

      <div className="flex gap-3">
        <Link
          href="/profile"
          className={`${BUTTON.secondary} flex-1`}
        >
          Cancel
        </Link>
        <button
          disabled={pending}
          className={`${BUTTON.primarySmallPlain} flex-1`}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <p role="alert" className="m-0 text-center text-sm text-ink-soft">
          {error}
        </p>
      )}
    </form>
  );
}
