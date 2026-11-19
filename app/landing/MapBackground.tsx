"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { MAP_SIZE, ROUTE } from "./walk";

// Real Upper West Side streets behind the whole landing page (built by scripts/build-map.mjs),
// with a walking route that draws itself in and a green spotlight that follows the mouse.
export default function MapBackground() {
  const { width, height } = MAP_SIZE;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 -z-10 overflow-hidden">
      <MapScene viewBox={`0 0 ${width} ${height}`} spotlight className="hidden h-full w-full sm:block" />
      {/* Phones: zoomed in on the route; no spotlight without a mouse */}
      <MapScene viewBox={`520 0 640 ${height}`} className="h-full w-full sm:hidden" />
    </div>
  );
}

const DRAW_SECONDS = 2;
const DRAW_DELAY = 0.3;
const SPOTLIGHT_RADIUS = 170;
const SPRING = { stiffness: 110, damping: 20, mass: 1 };

// Stops along the route: which corner, its label, and which side the label sits on
const STOPS = [
  { at: 1, label: "coffee", side: "end" },
  { at: 2, label: "books", side: "start" },
  { at: 4, label: "park", side: "start" },
] as const;

const LABEL = { font: "500 13px var(--font-inter), sans-serif", paintOrder: "stroke", stroke: "var(--color-paper)", strokeWidth: 4 };

// Seconds until the drawing line reaches corner i
function arrival(i: number) {
  const lengths = ROUTE.slice(1).map(([x, y], k) => Math.hypot(x - ROUTE[k][0], y - ROUTE[k][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  const sofar = lengths.slice(0, i).reduce((a, b) => a + b, 0);
  return DRAW_DELAY + (DRAW_SECONDS * sofar) / total;
}

function MapScene({ viewBox, spotlight = false, className }: { viewBox: string; spotlight?: boolean; className: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const still = useReducedMotion() ?? false;
  const id = spotlight ? "map-wide" : "map-narrow";

  // Spotlight position and size, in map pixels; springs make it trail the mouse gently.
  // Motion values update the SVG directly, so React doesn't re-render as the mouse moves.
  const x = useMotionValue(0), y = useMotionValue(0), r = useMotionValue(0);
  const sx = useSpring(x, SPRING), sy = useSpring(y, SPRING), sr = useSpring(r, SPRING);

  useEffect(() => {
    if (!spotlight || still || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let shown = false;
    function move(e: PointerEvent) {
      const matrix = svg.current?.getScreenCTM();
      if (!matrix) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      x.set(p.x);
      y.set(p.y);
      // Coming back onto the page: start where the mouse is instead of gliding in from the old spot
      if (!shown) {
        sx.jump(p.x);
        sy.jump(p.y);
        shown = true;
      }
      r.set(SPOTLIGHT_RADIUS);
    }
    function leave(e: PointerEvent) {
      if (e.relatedTarget) return;
      shown = false;
      r.set(0);
    }
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", leave);
    };
  }, [spotlight, still, x, y, r, sx, sy]);

  const d = "M" + ROUTE.map(([px, py]) => `${px} ${py}`).join("L");
  const [youX, youY] = ROUTE[0];
  const [endX, endY] = ROUTE[ROUTE.length - 1];
  const draw = still ? undefined : { pathLength: 0 };

  return (
    <svg ref={svg} viewBox={viewBox} preserveAspectRatio="xMidYMin slice" className={className}>
      <defs>
        {spotlight && (
          <>
            <radialGradient id={`${id}-fade`}>
              <stop offset="0%" stopColor="#fff" />
              <stop offset="55%" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id={`${id}-spot`} maskUnits="userSpaceOnUse">
              <motion.circle cx={sx} cy={sy} r={sr} fill={`url(#${id}-fade)`} />
            </mask>
          </>
        )}
        {/* The route appears as this line grows along it */}
        <mask id={`${id}-reveal`} maskUnits="userSpaceOnUse">
          <motion.path
            d={d}
            fill="none"
            stroke="#fff"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={draw}
            animate={{ pathLength: 1 }}
            transition={{ duration: DRAW_SECONDS, delay: DRAW_DELAY, ease: [0.45, 0, 0.25, 1] }}
          />
        </mask>
      </defs>

      <image href="/map/uws.svg" width={MAP_SIZE.width} height={MAP_SIZE.height} />
      {spotlight && <image href="/map/uws-green.svg" width={MAP_SIZE.width} height={MAP_SIZE.height} mask={`url(#${id}-spot)`} />}

      {/* Walking route: a soft green band along the streets, dots on top */}
      <g mask={`url(#${id}-reveal)`} fill="none" stroke="var(--color-accent)" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} strokeOpacity={0.18} strokeWidth={14} />
        <path d={d} strokeWidth={3.5} strokeDasharray="0 9" />
      </g>

      {/* You are here: a dot with a slowly pulsing halo */}
      <motion.circle
        cx={youX}
        cy={youY}
        r={20}
        fill="var(--color-accent)"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={{ scale: 0.6, opacity: still ? 0.18 : 0.3 }}
        animate={still ? undefined : { scale: 1.6, opacity: 0 }}
        transition={{ duration: 2.4, ease: "easeOut", repeat: Infinity }}
      />
      <circle cx={youX} cy={youY} r={7.5} fill="var(--color-accent)" stroke="#fff" strokeWidth={3} />
      <text x={youX - 14} y={youY + 4} textAnchor="end" fill="var(--color-ink)" style={{ ...LABEL, fontWeight: 600 }}>
        you
      </text>

      {STOPS.map((stop) => {
        const [px, py] = ROUTE[stop.at];
        return (
          <motion.g
            key={stop.label}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={still ? undefined : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: arrival(stop.at) }}
          >
            <circle cx={px} cy={py} r={7} fill="var(--color-accent)" stroke="var(--color-paper)" strokeWidth={3} />
            <text x={stop.side === "start" ? px + 14 : px - 14} y={py + 4} textAnchor={stop.side} fill="var(--color-ink)" style={LABEL}>
              {stop.label}
            </text>
          </motion.g>
        );
      })}

      <motion.text
        x={endX + 14}
        y={endY + 24}
        fill="var(--color-ink-soft)"
        style={LABEL}
        initial={still ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: DRAW_DELAY + DRAW_SECONDS + 0.1 }}
      >
        3 stops · ~2 h · $$
      </motion.text>
    </svg>
  );
}
