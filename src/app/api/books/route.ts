import { head } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { books } from "../../../db/schema";
import {
  assertWithinBudget,
  errors,
  getUsage,
  getUserId,
  json,
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

  // Trust the committed blob's real size for the budget, not the client's claim
  // (clientPayload sizes are spoofable). Fall back to the reported size only if
  // head() is unavailable.
  let size = Math.max(0, Math.floor(body.size ?? 0));
  if (body.blobUrl) {
    try {
      size = (await head(body.blobUrl)).size;
    } catch {}
  }

  // Budget backstop (the upload route already checked before creating the blob).
  try {
    assertWithinBudget(await getUsage(db, userId), size);
  } catch (e) {
    return errors.overQuota((e as Error).message);
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
