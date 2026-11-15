import { json } from "@/lib/api";
import { getStores } from "@/lib/stores";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ stores: await getStores() });
}
