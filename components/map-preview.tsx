"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet-map").then((module) => module.LeafletMap), { ssr: false, loading: () => <div className="h-full min-h-[340px] animate-pulse bg-paper" /> });

export function MapPreview({ pickup = "Chennai Central", drop = "Tidel Park" }: { pickup?: string; drop?: string }) {
  return <div className="relative h-full min-h-[340px] overflow-hidden"><LeafletMap pickup={pickup} drop={drop} /><div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500] flex justify-between gap-3 bg-ivory/95 px-4 py-3 text-xs shadow-editorial"><span className="truncate"><strong className="mr-2">FROM</strong>{pickup}</span><span className="truncate text-right"><strong className="mr-2 text-amber">TO</strong>{drop}</span></div></div>;
}
