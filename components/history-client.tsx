"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { StatusPill } from "./status-pill";
import { TripActions } from "./trip-actions";
import { money } from "@/lib/fare";

type Trip = { tripId: string; pickupLocation: string; dropLocation: string; status: string; distanceKm?: string; estimatedFare?: string; finalFare?: string; payments?: { paymentId: string; status: string; amount: string | number }[]; assignments?: { driver: { firstName: string; lastName?: string | null } }[] };
export function HistoryClient({ role }: { role: string }) {
  const [trips, setTrips] = useState<Trip[]>([]); const [loading, setLoading] = useState(true);
  const load = () => fetch("/api/trips").then((r) => r.json()).then((d) => setTrips(d.trips || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><header className="border-b border-line pb-8"><p className="eyebrow">The ledger</p><h1 className="display mt-3 text-5xl tracking-[-.05em]">Trip history<span className="text-amber">.</span></h1><p className="mt-3 text-sm text-ash">Move the trip forward from here — acceptance, departure, completion, and payment stay connected.</p></header>{loading ? <div className="mt-8 space-y-3">{[1,2,3].map((x) => <div key={x} className="h-28 animate-pulse bg-paper" />)}</div> : trips.length === 0 ? <div className="py-20 text-center text-sm text-ash">Your completed and upcoming routes will live here.</div> : <div className="mt-8 space-y-3">{trips.map((trip) => <article key={trip.tripId} className="border border-line bg-[#fbfaf7] p-5 sm:p-7"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div><div className="flex items-center gap-3"><span className="eyebrow">{trip.tripId}</span><StatusPill status={trip.status} /></div><div className="mt-5 flex items-start gap-3"><MapPin size={17} className="mt-1 text-amber" /><div><p className="font-semibold">{trip.pickupLocation}</p><p className="mt-1 text-sm text-ash">{trip.dropLocation}</p></div></div></div><div className="text-right"><p className="eyebrow">{trip.finalFare ? "Final fare" : "Quoted fare"}</p><p className="display mt-2 text-3xl">{money(trip.finalFare ?? trip.estimatedFare)}</p></div></div>{trip.assignments?.[0] && <p className="mt-6 border-t border-line pt-4 text-xs text-ash">Driver <strong className="text-charcoal">{trip.assignments[0].driver.firstName} {trip.assignments[0].driver.lastName ?? ""}</strong> · {trip.distanceKm} km</p>}<TripActions tripId={trip.tripId} status={trip.status} role={role} payments={trip.payments} onChanged={load} /></article>)}</div>}</div>;
}
