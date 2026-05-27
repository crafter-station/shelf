import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// A book in a user's cloud shelf. The built-in Alice book is bundled in the
// app, not stored here — this table only holds user-uploaded PDFs. The PDF
// bytes live in Vercel Blob; here we keep the metadata + where to fetch them.
export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Clerk user id. Every row belongs to exactly one signed-in user.
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  // Deterministic spine look (see reader/library/spineColors). Persisted so a
  // book keeps the same spine across devices regardless of client logic.
  spineBg: text("spine_bg"),
  spineInk: text("spine_ink"),
  // Vercel Blob: public URL + pathname (pathname is what we delete by).
  blobUrl: text("blob_url"),
  pathname: text("pathname"),
  // Bytes, for the per-user storage budget (100MB / 25 books).
  size: integer("size").notNull().default(0),
  // Reading progress — last spread the user was on.
  lastPage: integer("last_page").notNull().default(0),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
