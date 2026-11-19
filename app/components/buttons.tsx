// One button system for the whole site, in common web sizes:
//   primary         44px  a page's main call to action (Make my plan)
//   primarySmall    36px  the main action inside a page (Start walking)
//   secondary       36px  outlined, for other actions (Cancel, Use my location)
//   secondarySmall  32px  outlined, next to a small primary (Copy link)
// A secondary button is never bigger than the primary next to it.
// The primary pills are padded for an <ArrowBadge /> on the right; the "Plain" one has no badge.
const FILLED =
  "inline-flex items-center justify-center rounded-full bg-accent font-semibold text-white " +
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_5px_14px_-7px_rgb(30_90_67/0.7)] transition " +
  "hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_8px_18px_-7px_rgb(30_90_67/0.75)] " +
  "disabled:cursor-wait disabled:opacity-60";
const OUTLINED =
  "inline-flex items-center justify-center rounded-full border border-line-strong font-medium transition " +
  "hover:border-ink disabled:cursor-default disabled:opacity-40";

export const BUTTON = {
  primary: `group ${FILLED} h-11 gap-3 pr-1.5 pl-5 text-[15px]`,
  primarySmall: `group ${FILLED} h-9 gap-2.5 pr-1 pl-4 text-sm`,
  primarySmallPlain: `${FILLED} h-9 px-4 text-sm`,
  secondary: `${OUTLINED} h-9 px-4 text-sm`,
  secondarySmall: `${OUTLINED} h-8 px-3.5 text-[13px]`,
};

// The cream arrow badge inside a primary pill; it tilts along the street grid on hover
export function ArrowBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`grid place-items-center rounded-full bg-paper text-accent ${small ? "h-7 w-7" : "h-8 w-8"}`}>
      <svg
        viewBox="0 0 18 18"
        className={`transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-rotate-[29deg] ${small ? "h-[13px] w-[13px]" : "h-[15px] w-[15px]"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9h11M10 4.5 14.5 9 10 13.5" />
      </svg>
    </span>
  );
}
