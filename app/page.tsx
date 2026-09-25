import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: jokes } = await supabase.from("jokes").select("*");

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-5xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Jokes
        </h1>

        <ul className="mt-12 w-full">
          {jokes?.map((joke) => (
            <li key={joke.id} className="border-b border-zinc-200 py-3 dark:border-zinc-800">
              <span className="text-black dark:text-zinc-50">{joke.name}</span>
              <span className="text-zinc-500 dark:text-zinc-400"> — {joke.mood}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}