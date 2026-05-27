import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

// Cloud storage is optional (anonymous-first). The DB client only exists when
// DATABASE_URL is configured; callers use this to gate the cloud paths and
// return a clear 503 instead of crashing when it isn't set yet.
export function getDb(): Db | null {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  cached = drizzle(neon(url), { schema });
  return cached;
}

export { schema };
