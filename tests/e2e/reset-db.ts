/** Fresh e2e database: reset schema + seed (with demo orders). Run by the Playwright webServer command. */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env };
const db = (env.DATABASE_URL ?? "file:./e2e.db").replace("file:./", "prisma/");
rmSync(db, { force: true });
rmSync(env.STORAGE_DIR ?? "./storage-e2edb", { recursive: true, force: true });
execSync("npx prisma db push --skip-generate", { env, stdio: "inherit" });
execSync("npx tsx prisma/seed.ts --demo", { env: { ...env, NODE_USE_ENV_PROXY: "1" }, stdio: "inherit" });
