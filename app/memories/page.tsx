import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { PlanContent } from "@/app/explore/plan";
import DeleteButton from "./DeleteButton";

export const metadata: Metadata = { title: "My memories" };

const PER_PAGE = 10;
// How long the private image links work
const LINK_SECONDS = 60 * 60;

const BUTTON = "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition hover:border-black dark:border-zinc-700 dark:hover:border-white";

// Your AI memory images, newest first, 10 per page. Private: only you can open this page
// and the images (RLS on the table, a private bucket, and short-lived links).
export default async function Memories({ searchParams }: PageProps<"/memories">) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/");

  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  const { data: rows, count, error } = await supabase
    .from("memory_images")
    .select("id, created_at, image_path, memories(caption, plans(content))", { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (error) console.error("memories:", error);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  // Short-lived links to the private images: one to show, one to download
  const paths = (rows ?? []).map((row) => row.image_path);
  const storage = supabase.storage.from("memory-images");
  const [{ data: views }, { data: downloads }] = paths.length
    ? await Promise.all([
        storage.createSignedUrls(paths, LINK_SECONDS),
        storage.createSignedUrls(paths, LINK_SECONDS, { download: true }),
      ])
    : [{ data: [] }, { data: [] }];

  const href = (nextPage: number) => (nextPage > 1 ? `/memories?page=${nextPage}` : "/memories");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">My memories</h1>
        <p className="text-zinc-500">Illustrations made from your photos. Only you can see them.</p>
      </header>

      {!rows?.length && (
        <p className="text-center text-zinc-500">
          You haven&apos;t created any memories yet.{" "}
          <Link href="/captions?view=mine" className="underline underline-offset-4 hover:text-black dark:hover:text-white">
            See your photos
          </Link>
        </p>
      )}

      {rows?.map((row, i) => {
        // One photo per image and one plan per photo; the untyped client types the joins as lists
        const memory = [row.memories].flat()[0];
        const plan = memory ? [memory.plans].flat()[0] : null;
        const title = plan ? (JSON.parse(plan.content) as PlanContent).title : null;
        const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const view = views?.[i]?.signedUrl;
        const download = downloads?.[i]?.signedUrl;

        return (
          <article
            key={row.id}
            className="flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
          >
            {view && (
              // Private short-lived link, so it isn't run through the shared image optimizer
              <Image src={view} alt={memory?.caption ?? "Memory"} width={1024} height={1024} unoptimized className="h-auto w-full" />
            )}
            <div className="flex flex-col gap-3 p-5">
              {memory && <p className="text-center font-medium">{memory.caption}</p>}
              <p className="text-center text-xs text-zinc-500">{[title, date].filter(Boolean).join(" · ")}</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {download && (
                  <a href={download} className={BUTTON}>
                    Download
                  </a>
                )}
                <DeleteButton id={row.id} />
              </div>
            </div>
          </article>
        );
      })}

      {pages > 1 && (
        <nav className="flex items-center justify-between">
          {page > 1 ? <Link href={href(page - 1)} className={BUTTON}>← Newer</Link> : <span />}
          <span className="text-sm text-zinc-500">
            Page {Math.min(page, pages)} of {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className={BUTTON}>Older →</Link> : <span />}
        </nav>
      )}
    </main>
  );
}
