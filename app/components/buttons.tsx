// The main call-to-action look, shared by links and the sign-in button:
// a green pill with a cream arrow badge that tilts along the street grid on hover
export const PRIMARY_BUTTON =
  "group inline-flex items-center gap-3 rounded-full bg-accent py-1.5 pr-1.5 pl-5 text-[15px] font-semibold text-white " +
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_5px_14px_-7px_rgb(30_90_67/0.7)] transition " +
  "hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_8px_18px_-7px_rgb(30_90_67/0.75)]";

export function ArrowBadge() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-paper text-accent">
      <svg
        viewBox="0 0 18 18"
        className="h-[15px] w-[15px] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-rotate-[29deg]"
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
