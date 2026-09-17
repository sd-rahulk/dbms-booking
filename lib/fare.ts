export const CHENNAI_FALLBACK_KM = 8.4;

// SQLite has no native NUMERIC type. We calculate in paise and persist two-decimal values.
export function calculateFare(baseFare: number | string, perKmRate: number | string, distanceKm: number) {
  const basePaise = Math.round(Number(baseFare) * 100);
  const ratePaise = Math.round(Number(perKmRate) * 100);
  return Math.round(basePaise + ratePaise * distanceKm) / 100;
}

export async function resolveRouteDistance(pickup: string, drop: string) {
  if (!pickup.trim() || !drop.trim()) return CHENNAI_FALLBACK_KM;
  const key = `${pickup.toLowerCase()}|${drop.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return Number((5.2 + (hash % 920) / 100).toFixed(2));
}

export function money(value: number | string | null | undefined) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
