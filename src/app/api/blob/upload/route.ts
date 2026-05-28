import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";

import { getDb } from "../../../../db";
import { assertWithinBudget, getUsage, getUserId } from "../../../../lib/api";

const MAX_FILE_BYTES = 60 * 1024 * 1024; // 60 MB per PDF

// POST /api/blob/upload — mints a short-lived client token so the browser can
// upload a PDF straight to Vercel Blob (bypassing the 4.5MB serverless body
// limit). We never see the bytes; we only authorize the upload and constrain
// it to one signed-in user's PDF under the size cap. The book row is created
// afterwards by the client via POST /api/books with the returned blob url.
export async function POST(request: Request): Promise<Response> {
  const userId = await getUserId();
  if (!userId) {
    return Response.json(
      { error: "Sign in to upload books." },
      { status: 401 },
    );
  }
  // handleUpload reads the Blob token eagerly (before onBeforeGenerateToken), so
  // without it configured we degrade to 503 rather than a confusing 400.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Cloud storage is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Enforce the per-user budget here, before any bytes are uploaded, so a
        // quota rejection never leaves an orphaned blob behind.
        let size = 0;
        try {
          size =
            (JSON.parse(clientPayload ?? "{}") as { size?: number }).size ?? 0;
        } catch {}
        // A real client always sends a positive, in-range size; reject anything
        // else before minting a token. (Bytes are still re-checked server-side
        // from the committed blob in POST /api/books — clientPayload is hints.)
        if (size <= 0 || size > MAX_FILE_BYTES) {
          throw new Error("That file looks invalid.");
        }
        const db = getDb();
        if (db) assertWithinBudget(await getUsage(db, userId), size);
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_FILE_BYTES,
          // Random suffix => unguessable public URL (public-by-obscurity).
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      // The client persists the book metadata via POST /api/books once the
      // upload resolves; this callback only fires for publicly-reachable
      // deployments, so we keep it a no-op to avoid divergent write paths.
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
