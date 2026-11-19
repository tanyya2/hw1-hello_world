type Props = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

// Toggle pill: green when selected, outlined when not
export default function Chip({ selected, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-9 rounded-full border px-3.5 text-sm transition ${
        selected ? "border-accent bg-accent text-white" : "border-line-strong text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
