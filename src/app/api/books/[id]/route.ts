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
  if (typeof body.lastPage !== "number" || body.lastPage < 0) {
    return errors.badRequest("lastPage must be a non-negative number.");
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
// wired in when Blob storage lands; this removes the metadata row.)
export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return errors.unauthorized();
  const db = getDb();
  if (!db) return errors.noDb();
  const { id } = await params;

  const [row] = await db
    .delete(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .returning({ id: books.id });
  if (!row) return errors.notFound();
  return new Response(null, { status: 204 });
}
