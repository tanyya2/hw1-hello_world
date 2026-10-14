import Image from "next/image";

type Props = {
  photoUrl: string;
  caption: string;
  // e.g. "Coffee crawl in the East Village · by Sam K. · Oct 14"
  meta?: React.ReactNode;
  // e.g. vote buttons
  children?: React.ReactNode;
};

export default function MemoryCard({ photoUrl, caption, meta, children }: Props) {
  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <Image
        src={photoUrl}
        alt={caption}
        width={800}
        height={800}
        className="h-auto max-h-[32rem] w-full bg-zinc-100 object-contain dark:bg-zinc-900"
      />
      <div className="flex flex-col gap-2 p-5">
        <p className="text-center text-lg font-medium">{caption}</p>
        {meta && <p className="text-center text-xs text-zinc-500">{meta}</p>}
        {children}
      </div>
    </article>
  );
}
