import { desc, eq, sql } from "drizzle-orm";

import { getDb } from "../../../db";
import { books } from "../../../db/schema";
import {
  errors,
  getUserId,
  json,
  MAX_BOOKS,
  MAX_TOTAL_BYTES,
} from "../../../lib/api";

// GET /api/books — the signed-in user's cloud shelf, oldest first.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return errors.unauthorized();
  const db = getDb();
  if (!db) return errors.noDb();

  const rows = await db
    .select()
    .from(books)
    .where(eq(books.userId, userId))
    .orderBy(desc(books.addedAt));
  return json(rows);
}

type CreateBody = {
  title?: string;
  spineBg?: string;
  spineInk?: string;
  blobUrl?: string;
  pathname?: string;
  size?: number;
};

// POST /api/books — add a book to the user's shelf (metadata only; the PDF
// bytes are uploaded to Blob separately). Enforces the per-user budget.
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return errors.unauthorized();
  const db = getDb();
  if (!db) return errors.noDb();

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return errors.badRequest("Invalid JSON body.");
  }

  const title = body.title?.trim();
  if (!title) return errors.badRequest("A title is required.");
  const size = Math.max(0, Math.floor(body.size ?? 0));

  // Budget check against the user's current usage.
  const [usage] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${books.size}), 0)::bigint`,
    })
    .from(books)
    .where(eq(books.userId, userId));

  if ((usage?.count ?? 0) >= MAX_BOOKS) {
    return errors.overQuota(`Shelf is full (max ${MAX_BOOKS} books).`);
  }
  if (Number(usage?.total ?? 0) + size > MAX_TOTAL_BYTES) {
    return errors.overQuota("This book would exceed your 100 MB of storage.");
  }

  const [row] = await db
    .insert(books)
    .values({
      userId,
      title,
      spineBg: body.spineBg,
      spineInk: body.spineInk,
      blobUrl: body.blobUrl,
      pathname: body.pathname,
      size,
    })
    .returning();
  return json(row, 201);
}
