"use client";

import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const pin = (color: string) => L.divIcon({ className: "", html: `<div style="width:15px;height:15px;border:3px solid ${color};background:#F7F5F0;border-radius:50%;box-shadow:0 0 0 5px rgba(247,245,240,.75)"></div>`, iconSize: [15, 15], iconAnchor: [7, 7] });
function Fit({ points }: { points: [number, number][] }) { const map = useMap(); useEffect(() => { if (points.length > 1) map.fitBounds(points as any, { padding: [34, 34] }); }, [map, points]); return null; }
export function LeafletMap({ pickup, drop }: { pickup: string; drop: string }) { const points: [number, number][] = [[13.0827, 80.2707], [13.012, 80.228], [12.989, 80.248]]; return <MapContainer center={[13.04, 80.25]} zoom={12} zoomControl={false} scrollWheelZoom={false} className="h-full min-h-[340px]"><TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Polyline positions={points} pathOptions={{ color: "#171717", weight: 3, dashArray: "6 8" }} /><Marker position={points[0]} icon={pin("#171717")} /><Marker position={points[points.length - 1]} icon={pin("#D99A38")} /><Fit points={points} /></MapContainer>; }
