import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";

import type { Db } from "../db";
import { books } from "../db/schema";

// Per-user storage budget, enforced both at the upload token route (before the
// blob is created) and at POST /api/books (as a backstop).
export const MAX_BOOKS = 25;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB

// A user's current shelf usage: how many books and how many bytes.
export async function getUsage(
  db: Db,
  userId: string,
): Promise<{ count: number; total: number }> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${books.size}), 0)::bigint`,
    })
    .from(books)
    .where(eq(books.userId, userId));
  return { count: row?.count ?? 0, total: Number(row?.total ?? 0) };
}

// Throws a user-facing message if adding `size` bytes would breach the budget.
// Note: this is a read-then-write check, not transactional (neon-http has no
// interactive transactions), so two simultaneous uploads from the same user
// could both pass and slightly exceed the cap. Acceptable for a personal shelf;
// tighten with a Postgres constraint/trigger if it ever matters.
export function assertWithinBudget(
  usage: { count: number; total: number },
  size: number,
): void {
  if (usage.count >= MAX_BOOKS) {
    throw new Error(`Your shelf is full (max ${MAX_BOOKS} books).`);
  }
  if (usage.total + size > MAX_TOTAL_BYTES) {
    throw new Error("This book would exceed your 100 MB of storage.");
  }
}

// Resolve the signed-in Clerk user, or null. Returns null (rather than throwing)
// when Clerk isn't configured, so cloud routes degrade to 401 instead of 500
// in the anonymous-first / unprovisioned state.
export async function getUserId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    // Misconfigured Clerk (e.g. publishable key set but secret missing) — treat
    // as not-signed-in rather than 500ing the route.
    return null;
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export const errors = {
  unauthorized: () => json({ error: "Sign in to use the cloud shelf." }, 401),
  noDb: () => json({ error: "Cloud storage is not configured." }, 503),
  notFound: () => json({ error: "Not found." }, 404),
  badRequest: (message: string) => json({ error: message }, 400),
  overQuota: (message: string) => json({ error: message }, 413),
};
