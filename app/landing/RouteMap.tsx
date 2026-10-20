import styles from "./RouteMap.module.css";

// A drawn street grid (not a real map) with a walking route through 4 stops
const STREETS = Array.from({ length: 15 }, (_, i) => 16 + i * 32);
const AVENUES = [130, 220, 310, 400, 490];
const ROUTE = "M130 400 V336 H220 V208 H400 V80 H310";
const STOPS = [
  { x: 220, y: 336, delay: "0.9s" },
  { x: 220, y: 208, delay: "1.7s" },
  { x: 400, y: 208, delay: "2.6s" },
  { x: 310, y: 80, delay: "3.4s" },
];

export default function RouteMap() {
  return (
    <figure className="flex min-w-0 flex-1 basis-[420px] flex-col gap-3 rounded-[20px] border border-line bg-card p-4">
      <svg
        viewBox="0 0 560 480"
        role="img"
        aria-label="Animated map: a walking route draws itself through four stops near you"
        className="block h-auto w-full rounded-xl bg-map"
      >
        <path d="M0 0 H34 C30 120 40 260 28 480 H0 Z" fill="#c9d3d6" />
        <rect x="320" y="116" width="160" height="140" rx="6" fill="#d3dcc2" />
        <g stroke="#fbf8f2" strokeWidth="2">
          {STREETS.map((y) => (
            <line key={y} x1="40" y1={y} x2="560" y2={y} />
          ))}
        </g>
        <g stroke="#fbf8f2" strokeWidth="6">
          {AVENUES.map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="480" />
          ))}
          <line x1="470" y1="0" x2="90" y2="480" />
        </g>
        <text x="412" y="196" fontSize="12" fill="#5f6b52">
          Park
        </text>
        <path
          className={styles.route}
          d={ROUTE}
          fill="none"
          stroke="#1e5a43"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className={styles.here} cx="130" cy="400" r="10" fill="#1e5a43" />
        <circle cx="130" cy="400" r="8" fill="#1e5a43" stroke="#fbf8f2" strokeWidth="3" />
        {STOPS.map((stop, i) => (
          <g key={i} className={styles.stop} style={{ animationDelay: stop.delay }}>
            <circle cx={stop.x} cy={stop.y} r="15" fill="#1c1b19" />
            <text x={stop.x} y={stop.y + 5} textAnchor="middle" fontSize="15" fontWeight="600" fill="#fbf8f2" className="font-serif">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-2 px-1 text-sm text-ink-soft">
        <span>You are here · 4 stops · 2 h 30 min</span>
        <span className="text-muted">Example route</span>
      </figcaption>
    </figure>
  );
}
