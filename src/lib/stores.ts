import { prisma } from "@/lib/db";

export type StoreDTO = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
  mapsUrl: string;
  embedUrl: string;
};

export const embedUrlFor = (s: { address: string; name: string }) =>
  `https://www.google.com/maps?q=${encodeURIComponent(`${s.name}, ${s.address}`)}&output=embed`;

export async function getStores(): Promise<StoreDTO[]> {
  const rows = await prisma.store.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    phone: s.phone,
    hours: s.hours,
    mapsUrl: s.mapsUrl,
    embedUrl: s.embedUrl ?? embedUrlFor(s),
  }));
}
