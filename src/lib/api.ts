import { auth } from "@clerk/nextjs/server";

// Per-user storage budget (also enforced at upload time once Blob lands).
export const MAX_BOOKS = 25;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB

// Resolve the signed-in Clerk user, or null. Returns null (rather than throwing)
// when Clerk isn't configured, so cloud routes degrade to 401 instead of 500
// in the anonymous-first / unprovisioned state.
export async function getUserId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  const { userId } = await auth();
  return userId ?? null;
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
