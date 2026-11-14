import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/buy-forex", priority: 0.9 },
    { path: "/sell-forex", priority: 0.9 },
    { path: "/about", priority: 0.5 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
    { path: "/grievance", priority: 0.2 },
  ];
  return pages.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.path ? "monthly" : "daily", priority: p.priority }));
}
