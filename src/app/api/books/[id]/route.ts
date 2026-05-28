import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";

import { getDb } from "../../../../db";
import { books } from "../../../../db/schema";
import { errors, getUserId, json } from "../../../../lib/api";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/books/:id — update reading progress (last spread the user reached).
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return errors.unauthorized();
  const db = getDb();
  if (!db) return errors.noDb();
  const { id } = await params;

  let body: { lastPage?: number };
  try {
    body = await req.json();
  } catch {
    return errors.badRequest("Invalid JSON body.");
  }
  if (
    typeof body.lastPage !== "number" ||
    body.lastPage < 0 ||
    body.lastPage > 100_000
  ) {
    return errors.badRequest("lastPage is out of range.");
  }

  const [row] = await db
    .update(books)
    .set({ lastPage: Math.floor(body.lastPage) })
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning();
  if (!row) return errors.notFound();
  return json(row);
}

// DELETE /api/books/:id — remove a book from the user's shelf. (Blob cleanup is
// removes the metadata row and the PDF bytes from Blob.)
export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return errors.unauthorized();
  const db = getDb();
  if (!db) return errors.noDb();
  const { id } = await params;

  const [row] = await db
    .delete(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning({ id: books.id, blobUrl: books.blobUrl });
  if (!row) return errors.notFound();

  // Best-effort blob cleanup — the row is already gone, so a failed/absent
  // delete shouldn't fail the request (e.g. the built-in book has no blob).
  if (row.blobUrl) {
    try {
      await del(row.blobUrl);
    } catch {
      // swallow: orphaned blob is recoverable, a 500 here is not worth it.
    }
  }
  return new Response(null, { status: 204 });
}
