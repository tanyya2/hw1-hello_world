import Image from "next/image";

// Real Upper West Side streets behind the whole landing page (built by scripts/build-map.mjs)
export default function MapBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 -z-10 overflow-hidden">
      <Image src="/map/uws.svg" alt="" fill priority className="object-cover object-top" />
    </div>
  );
}
