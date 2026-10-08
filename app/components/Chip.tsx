type Props = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

// Toggle pill: black when selected, outlined when not
export default function Chip({ selected, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        selected
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-zinc-300 text-zinc-700 hover:border-black dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-white"
      }`}
    >
      {children}
    </button>
  );
}
