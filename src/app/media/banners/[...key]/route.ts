import { storage } from "@/lib/storage";

/** Public banner images uploaded via /admin/banners (stored outside /public by the StorageProvider). */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const k = `banners/${key.join("/")}`;
  if (!/^banners\/[a-f0-9]{8}\/[a-f0-9]{32}\.webp$/.test(k)) return new Response("Not found", { status: 404 });
  try {
    const data = await storage().get(k);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "Content-Length": String(data.length) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
