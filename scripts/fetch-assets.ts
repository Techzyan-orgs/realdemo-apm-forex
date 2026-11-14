/**
 * npm run assets:fetch
 *
 * Downloads and optimises third-party images into /public at setup time so the site never
 * hot-links. Every step has an intentional-looking local fallback, so the script always
 * leaves the site in a complete state even fully offline.
 *
 *   public/flags/{iso2}.svg          flagcdn.com SVGs (fallback: neutral tile with the ISO code)
 *   public/banners/banner-{1..4}.webp 1920x1080 hero banners (Unsplash licence) + CREDITS.json
 *   public/currencies/{CODE}.webp     600x400 banknote images from Wikimedia Commons (PD / CC only)
 *                                     or a designed tile (flag + symbol + code + name) + CREDITS.json
 *
 * Flags:  --force  re-download everything   --only=flags|banners|currencies
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { COUNTRIES } from "../src/data/countries";
import { CURRENCY_META, type CurrencyMeta } from "../src/data/currencies";

const PUBLIC = path.resolve(process.cwd(), "public");
const FORCE = process.argv.includes("--force");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const UA = "apm-forex-asset-fetcher/1.0 (setup script)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with polite retry/backoff on 429/5xx (Wikimedia rate limits anonymous API clients). */
async function get(url: string, timeoutMs = 20000, attempts = 3): Promise<Buffer> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status === 429 || res.status >= 500) && i < attempts - 1) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      await sleep(Math.min(15000, Math.max(retryAfter * 1000, 2000 * 2 ** i)));
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
}
async function getJson<T>(url: string): Promise<T> {
  return JSON.parse((await get(url)).toString("utf8")) as T;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ------------------------------------------------------------------ flags */

async function fetchFlags() {
  const dir = path.join(PUBLIC, "flags");
  await mkdir(dir, { recursive: true });
  const codes = [...new Set([...COUNTRIES.map((c) => c.iso2.toLowerCase()), "eu", "np", "bt", ...CURRENCY_META.map((c) => c.flag.toLowerCase())])];
  let ok = 0;
  let fallback = 0;
  const queue = [...codes];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let code = queue.shift(); code; code = queue.shift()) {
        const file = path.join(dir, `${code}.svg`);
        if (existsSync(file) && !FORCE) continue;
        try {
          const svg = await get(`https://flagcdn.com/${code}.svg`);
          if (!svg.toString("utf8", 0, 200).includes("<svg")) throw new Error("not svg");
          await writeFile(file, svg);
          ok++;
        } catch {
          await writeFile(
            file,
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><rect width="640" height="480" fill="#E6F4F1"/><text x="320" y="300" font-family="Arial,sans-serif" font-size="200" font-weight="700" text-anchor="middle" fill="#0F766E">${code.toUpperCase()}</text></svg>`,
          );
          fallback++;
        }
      }
    }),
  );
  console.log(`flags: ${ok} downloaded, ${fallback} fallback tiles, ${codes.length} total`);
}

/* ---------------------------------------------------------------- banners */

/** Unsplash licence: free to use, no attribution required (we record it anyway). */
const BANNERS = [
  {
    file: "banner-1.webp",
    theme: "assorted foreign banknotes flat-lay",
    id: "1580519542036-c47de6196ba5",
    focus: "centre",
  },
  {
    file: "banner-2.webp",
    theme: "traveller at an airport departure lounge",
    id: "1530521954074-e64f6810b32d",
    focus: "centre",
  },
  {
    file: "banner-3.webp",
    theme: "airplane wing above clouds at sunrise",
    id: "1436491865332-7a61a109cc05",
    focus: "centre",
  },
  {
    file: "banner-4.webp",
    theme: "map with travel accessories",
    id: "1488646953014-85cb44e25828",
    focus: "centre",
  },
] as const;

async function bannerFallback(i: number, theme: string) {
  const palettes = [
    ["#0F766E", "#134E4A"],
    ["#0E1726", "#1F3A4D"],
    ["#155E75", "#0F766E"],
    ["#1E293B", "#0F766E"],
  ][i % 4];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palettes[0]}"/><stop offset="1" stop-color="${palettes[1]}"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2">
    ${Array.from({ length: 12 }, (_, k) => `<circle cx="${1400 + (k % 3) * 60}" cy="${540}" r="${120 + k * 55}"/>`).join("")}
  </g>
  <text x="1840" y="1040" font-family="Arial" font-size="22" fill="#ffffff" fill-opacity="0.35" text-anchor="end">${esc(theme)}</text>
</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

async function fetchBanners() {
  const dir = path.join(PUBLIC, "banners");
  await mkdir(dir, { recursive: true });
  const credits: unknown[] = [];
  for (const [i, b] of BANNERS.entries()) {
    const file = path.join(dir, b.file);
    const source = `https://unsplash.com/photos/${b.id}`;
    const url = `https://images.unsplash.com/photo-${b.id}?w=2400&q=85&fm=jpg`;
    if (existsSync(file) && !FORCE) {
      credits.push({ file: `/banners/${b.file}`, theme: b.theme, source, image_url: url, author: "Unsplash contributor (see source page)", licence: "Unsplash License (https://unsplash.com/license)" });
      continue;
    }
    try {
      const raw = await get(url, 40000);
      // centre-crop to exactly 16:9, 1920x1080. Headline text is rendered as HTML, never baked in.
      const out = await sharp(raw).resize(1920, 1080, { fit: "cover", position: "centre" }).webp({ quality: 74 }).toBuffer();
      await writeFile(file, out);
      credits.push({ file: `/banners/${b.file}`, theme: b.theme, source, image_url: url, author: "Unsplash contributor (see source page)", licence: "Unsplash License (https://unsplash.com/license)" });
      console.log(`banner ${b.file}: downloaded (${Math.round(out.length / 1024)} KB)`);
    } catch (e) {
      await writeFile(file, await bannerFallback(i, b.theme));
      credits.push({ file: `/banners/${b.file}`, theme: b.theme, source: "generated", author: "APM Forex", licence: "Original artwork" });
      console.warn(`banner ${b.file}: fallback (${(e as Error).message})`);
    }
  }
  await writeFile(path.join(dir, "CREDITS.json"), JSON.stringify(credits, null, 2) + "\n");
}

/* ------------------------------------------------------------- currencies */

type CommonsSearch = { query?: { search?: { title: string }[] } };
type CommonsInfo = {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        imageinfo?: {
          thumburl?: string;
          url?: string;
          size?: number;
          width: number;
          height: number;
          descriptionurl: string;
          mime: string;
          extmetadata?: Record<string, { value: string }>;
        }[];
      }
    >;
  };
};

/**
 * Commons search terms per currency. Commons file titles vary a lot, so specific
 * phrases beat the generic "{name} banknote". Pinned file titles can be added here
 * if a search picks something unsuitable.
 */
const SEARCH_OVERRIDES: Record<string, string[]> = {};

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const ACCEPTED_LICENCE = /^(public domain|pd|cc0|cc[ -]by(-sa)?([ -]\d(\.\d)?)?|cc by(-sa)? \d\.\d)/i;

async function findCommonsImage(c: CurrencyMeta) {
  const queries = SEARCH_OVERRIDES[c.code] ?? [`${c.name} banknote`, `${c.code} banknote`, `${c.name} note`];
  for (const q of queries) {
    const s = await getJson<CommonsSearch>(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=10&format=json&srsearch=${encodeURIComponent(q)}`,
    );
    const titles = (s.query?.search ?? []).map((r) => r.title).filter((t) => /\.(jpe?g|png|webp)$/i.test(t) && !/coin|\bmap\b|logo|chart|graph|stamp/i.test(t));
    if (!titles.length) continue;
    const info = await getJson<CommonsInfo>(
      `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=900&format=json&titles=${encodeURIComponent(titles.join("|"))}`,
    );
    const pages = Object.values(info.query?.pages ?? {});
    // keep search ranking order
    pages.sort((a, b) => titles.indexOf(a.title) - titles.indexOf(b.title));
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      if (!ii?.url) continue;
      if ((ii.size ?? 0) > 8 * 1024 * 1024) continue; // keep downloads small
      const licence = strip(ii.extmetadata?.LicenseShortName?.value ?? "");
      if (!ACCEPTED_LICENCE.test(licence)) continue;
      const ratio = ii.width / ii.height;
      if (ratio < 1.2 || ratio > 3.2 || ii.width < 500) continue; // landscape note-like images only
      return {
        title: p.title,
        // thumbnails live on thumb.wikimedia.org, which may be blocked; prefer it, fall back to the original
        thumb: ii.thumburl,
        original: ii.url,
        source: ii.descriptionurl,
        licence,
        author: strip(ii.extmetadata?.Artist?.value ?? "Unknown").slice(0, 160),
      };
    }
  }
  return null;
}

async function currencyTile(c: CurrencyMeta) {
  const flagFile = path.join(PUBLIC, "flags", `${c.flag.toLowerCase()}.svg`);
  let flagHref = "";
  if (existsSync(flagFile)) {
    const png = await sharp(await readFile(flagFile), { density: 150 }).resize(96, 72, { fit: "cover" }).png().toBuffer();
    flagHref = `data:image/png;base64,${png.toString("base64")}`;
  }
  const hue = ([...c.code].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},38%,95%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 40) % 360},34%,86%)"/>
    </linearGradient>
    <clipPath id="r"><rect x="40" y="40" width="72" height="54" rx="8"/></clipPath>
  </defs>
  <rect width="600" height="400" fill="url(#g)"/>
  <rect x="18" y="18" width="564" height="364" rx="22" fill="none" stroke="hsl(${hue},30%,40%)" stroke-opacity="0.18" stroke-width="2"/>
  <g fill="none" stroke="hsl(${hue},30%,40%)" stroke-opacity="0.10" stroke-width="2">
    ${Array.from({ length: 7 }, (_, k) => `<circle cx="470" cy="210" r="${40 + k * 26}"/>`).join("")}
  </g>
  ${flagHref ? `<image x="40" y="40" width="72" height="54" clip-path="url(#r)" preserveAspectRatio="xMidYMid slice" xlink:href="${flagHref}" href="${flagHref}"/>` : ""}
  <text x="470" y="250" font-family="Georgia, 'DejaVu Serif', serif" font-size="${c.symbol.length > 2 ? 72 : 128}" font-weight="700" text-anchor="middle" fill="hsl(${hue},35%,30%)" fill-opacity="0.85">${esc(c.symbol)}</text>
  <text x="40" y="300" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="68" font-weight="700" fill="#0E1726">${c.code}</text>
  <text x="42" y="342" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="26" fill="#5B6474">${esc(c.name)}</text>
</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}

async function fetchCurrencies() {
  const dir = path.join(PUBLIC, "currencies");
  await mkdir(dir, { recursive: true });
  const creditsFile = path.join(dir, "CREDITS.json");
  const prev: Record<string, unknown> = existsSync(creditsFile) ? JSON.parse(await readFile(creditsFile, "utf8")) : {};
  const credits: Record<string, unknown> = {};
  // circuit breaker: after 3 rate-limit failures in a row, stop calling Commons this run
  let rateLimited = 0;
  for (const c of CURRENCY_META) {
    const file = path.join(dir, `${c.code}.webp`);
    const prevEntry = prev[c.code] as { type?: string } | undefined;
    // keep photos; retry designed tiles (e.g. after a rate-limited run) unless --force
    if (existsSync(file) && !FORCE && prevEntry?.type === "photo") {
      credits[c.code] = prev[c.code];
      continue;
    }
    try {
      if (rateLimited >= 3) throw new Error("Commons API rate-limited this run; re-run later to retry");
      await sleep(1200); // be polite to the Commons API
      const hit = await findCommonsImage(c);
      rateLimited = 0;
      if (!hit) throw new Error("no suitably licensed image");
      const raw = await get(hit.thumb ?? hit.original, 30000, 1).catch(() => get(hit.original, 60000));
      // low-res, cropped: 600x400 (3:2), never a full flat high-res reproduction
      const out = await sharp(raw).resize(600, 400, { fit: "cover", position: "centre" }).webp({ quality: 72 }).toBuffer();
      await writeFile(file, out);
      credits[c.code] = { type: "photo", file: `/currencies/${c.code}.webp`, title: hit.title, source: hit.source, author: hit.author, licence: hit.licence };
      console.log(`currency ${c.code}: ${hit.title} [${hit.licence}]`);
    } catch (e) {
      if (/HTTP 429/.test((e as Error).message)) rateLimited++;
      await writeFile(file, await currencyTile(c));
      credits[c.code] = { type: "designed-tile", file: `/currencies/${c.code}.webp`, source: "generated", licence: "Original artwork; flag from flagcdn.com (public domain)" };
      console.log(`currency ${c.code}: designed tile (${(e as Error).message})`);
    }
  }
  await writeFile(creditsFile, JSON.stringify(credits, null, 2) + "\n");
}

/* ------------------------------------------------------------------- main */

async function main() {
  if (!ONLY || ONLY === "flags") await fetchFlags();
  if (!ONLY || ONLY === "banners") await fetchBanners();
  if (!ONLY || ONLY === "currencies") await fetchCurrencies();
  console.log("assets: done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
