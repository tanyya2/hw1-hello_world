import LocationPicker from "./location/LocationPicker";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-4 py-12 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">What&apos;s around me in NYC?</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Find places near you and get a plan
        </p>
      </div>
      <LocationPicker />
    </main>
  );
}
