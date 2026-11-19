// Builds the landing page map from OpenStreetMap data (© OpenStreetMap contributors).
// Run once with `node scripts/build-map.mjs`; the output is committed, so the site
// never calls a map service. Writes:
//   public/map/uws.svg        the map in warm grays
//   public/map/uws-green.svg  the same map in green, shown inside the cursor spotlight
//   app/landing/walk.ts       the walking route's corners, in map pixels

import { writeFileSync, mkdirSync } from "node:fs";

// Upper West Side + Morningside Heights (Columbia), Hudson River on the left
const WEST = -73.9812, EAST = -73.9532;
const W = 1280, H = 1500;
const YOU_Y = 430; // where the route starts, in map pixels from the top
const COS = Math.cos((40.8 * Math.PI) / 180);
const PX_PER_DEG = W / ((EAST - WEST) * COS);

const QUERY = `[out:json][timeout:140];(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|motorway_link|trunk_link|primary_link|secondary_link)$"](40.772,-73.998,40.818,-73.942);
  way["leisure"="park"](40.772,-73.998,40.818,-73.942);
  relation["leisure"="park"](40.772,-73.998,40.818,-73.942);
  way["amenity"="university"](40.772,-73.998,40.818,-73.942);
  relation["amenity"="university"](40.772,-73.998,40.818,-73.942);
  way["natural"="water"](40.772,-73.998,40.818,-73.942);
  relation["natural"="water"](40.772,-73.998,40.818,-73.942);
  way["natural"="coastline"](40.74,-74.03,40.85,-73.93);
);out geom;`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "outnyc-map-build" },
  body: new URLSearchParams({ data: QUERY }),
});
if (!res.ok) throw new Error(`Overpass: ${res.status} ${await res.text()}`);
const { elements } = await res.json();

const CLASS = {
  motorway: "hwy", trunk: "hwy", motorway_link: "hwy", trunk_link: "hwy",
  primary: "major", secondary: "major", primary_link: "major", secondary_link: "major",
  tertiary: "minor", residential: "minor", unclassified: "minor", living_street: "minor",
  pedestrian: "walk",
};

// Route corners first, so the map can be placed around the route
const byName = new Map();
for (const e of elements) {
  const t = e.tags ?? {};
  if (e.type === "way" && CLASS[t.highway] && t.name) byName.set(t.name, [...(byName.get(t.name) ?? []), e]);
}
function corner(a, b) {
  const nodesA = new Map(byName.get(a).flatMap((w) => w.nodes.map((n, i) => [n, w.geometry[i]])));
  for (const w of byName.get(b)) for (const n of w.nodes) if (nodesA.has(n)) return nodesA.get(n);
  throw new Error(`No corner ${a} / ${b}`);
}
const routeLatLon = [
  corner("Broadway", "West 110th Street"), // you
  corner("Broadway", "West 112th Street"), // coffee
  corner("Amsterdam Avenue", "West 112th Street"), // books
  corner("Amsterdam Avenue", "West 116th Street"),
  corner("Morningside Drive", "West 116th Street"), // park
];
const NORTH = routeLatLon[0].lat + YOU_Y / PX_PER_DEG;
const SOUTH = NORTH - H / PX_PER_DEG;

const round = (n) => Math.round(n * 10) / 10;
const xy = (p) => [round((p.lon - WEST) * PX_PER_DEG * COS), round((NORTH - p.lat) * PX_PER_DEG)];
const near = (pts, m = 80) => pts.some(([x, y]) => x > -m && x < W + m && y > -m && y < H + m);
function path(pts, close = false) {
  const out = [];
  let last;
  for (const [x, y] of pts) {
    if (last && Math.abs(x - last[0]) < 0.6 && Math.abs(y - last[1]) < 0.6) continue;
    out.push(`${x} ${y}`);
    last = [x, y];
  }
  return "M" + out.join("L") + (close ? "Z" : "");
}
// Closed rings of a way, or the outer members of a multipolygon
function rings(e) {
  if (e.type === "way") return e.nodes[0] === e.nodes.at(-1) ? [e.geometry.map(xy)] : [];
  return (e.members ?? []).filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry.filter(Boolean).map(xy));
}

const roads = { walk: [], minor: [], major: [], hwy: [] };
const areas = { parks: [], campus: [], water: [] };
const coast = [];
for (const e of elements) {
  const t = e.tags ?? {};
  if (e.type === "way" && CLASS[t.highway] && t.tunnel !== "yes") {
    const pts = e.geometry.map(xy);
    if (near(pts)) roads[CLASS[t.highway]].push(path(pts));
  } else if (t.natural === "coastline") {
    coast.push(e);
  } else {
    const kind = t.leisure === "park" ? "parks" : t.amenity === "university" ? "campus" : t.natural === "water" ? "water" : null;
    if (kind) for (const ring of rings(e)) if (ring.length > 2 && near(ring)) areas[kind].push(path(ring, true));
  }
}

// River: chain the coastline ways (land is on their left) and close the shape far to the west
const byStart = new Map(coast.map((w) => [w.nodes[0], w]));
const ends = new Set(coast.map((w) => w.nodes.at(-1)));
for (const start of [...byStart.keys()].filter((n) => !ends.has(n))) {
  const chain = [], seen = new Set();
  for (let w = byStart.get(start); w && !seen.has(w.id); w = byStart.get(w.nodes.at(-1))) {
    seen.add(w.id);
    chain.push(...w.geometry);
  }
  const run = chain.filter((p) => p.lon < -73.955 && p.lat > SOUTH - 0.01 && p.lat < NORTH + 0.01).map(xy);
  if (run.length > 10) areas.water.push(path([...run, [-600, run.at(-1)[1]], [-600, run[0][1]]], true));
}

function svg(c) {
  const line = (d, color, width) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const j = (list) => list.join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    (c.land ? `<rect width="${W}" height="${H}" fill="${c.land}"/>` : "") +
    `<path d="${j(areas.campus)}" fill="${c.campus}"/>` +
    `<path d="${j(areas.parks)}" fill="${c.park}"/>` +
    `<path d="${j(areas.water)}" fill="${c.water}" stroke="${c.shore}" stroke-width="0.8"/>` +
    line(j(roads.minor), c.casing, 6) + line(j(roads.major), c.casing, 9) + line(j(roads.hwy), c.hwyCasing, 11) +
    (c.road ? line(j(roads.walk), c.road, 2.5) + line(j(roads.minor), c.road, 4.4) + line(j(roads.major), c.road, 7) : "") +
    line(j(roads.hwy), c.hwy, 8.5) +
    `</svg>`;
}

mkdirSync("public/map", { recursive: true });
writeFileSync("public/map/uws.svg", svg({
  land: "#ece6d8", campus: "#e6dfcf", park: "#dfe3cb", water: "#dbe2df", shore: "#cfd6d2",
  casing: "#ddd3c1", road: "#faf7f0", hwy: "#f0e2bd", hwyCasing: "#dcc89a",
}));
writeFileSync("public/map/uws-green.svg", svg({
  campus: "rgba(30,90,67,.08)", park: "rgba(30,90,67,.16)", water: "rgba(30,90,67,.1)", shore: "rgba(30,90,67,.6)",
  casing: "rgba(30,90,67,.7)", hwy: "rgba(30,90,67,.12)", hwyCasing: "rgba(30,90,67,.8)",
}));
writeFileSync("app/landing/walk.ts",
  `// Generated by scripts/build-map.mjs: the map's size and the walking route's corners, in map pixels\n` +
  `export const MAP_SIZE = { width: ${W}, height: ${H} };\n\n` +
  `export const ROUTE: [number, number][] = ${JSON.stringify(routeLatLon.map(xy))};\n`);

console.log("roads", Object.fromEntries(Object.entries(roads).map(([k, v]) => [k, v.length])),
  "areas", Object.fromEntries(Object.entries(areas).map(([k, v]) => [k, v.length])));
