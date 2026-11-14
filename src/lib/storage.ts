/** StorageProvider: KYC files live outside /public and are only served via guarded routes. */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StorageProvider {
  put(data: Buffer, ext: string, prefix?: string): Promise<{ key: string; sha256: string; size: number }>;
  get(key: string): Promise<Buffer>;
}

export class LocalDiskProvider implements StorageProvider {
  constructor(private root = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage")) {}
  private resolve(key: string) {
    if (!/^[a-z0-9/_-]+\.[a-z0-9]+$/i.test(key) || key.includes("..")) throw new Error("bad storage key");
    return path.join(this.root, key);
  }
  async put(data: Buffer, ext: string, prefix = "kyc") {
    const key = `${prefix}/${randomBytes(4).toString("hex")}/${randomBytes(16).toString("hex")}.${ext.replace(/[^a-z0-9]/gi, "")}`;
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data, { mode: 0o600 });
    return { key, sha256: sha256(data), size: data.length };
  }
  async get(key: string) {
    return readFile(this.resolve(key));
  }
}

export const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

let _storage: StorageProvider | undefined;
export const storage = () => (_storage ??= new LocalDiskProvider());

/** Detect file type from magic bytes (never trust the client MIME). */
export function sniffMime(b: Buffer): { mime: string; ext: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  if (b.length >= 5 && b.subarray(0, 5).toString("ascii") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

export const sanitizeFilename = (name: string) =>
  (name.split(/[\\/]/).pop() ?? "file").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
