import { spineColors } from "./spineColors";
import { type LibraryBook, type LibraryStore, titleFromFile } from "./store";

type BookRow = {
  id: string;
  title: string;
  spineBg: string | null;
  spineInk: string | null;
  blobUrl: string | null;
  size: number;
  lastPage: number;
};

function rowToBook(r: BookRow): LibraryBook {
  const fallback = spineColors(r.id);
  return {
    id: r.id,
    title: r.title,
    spineBg: r.spineBg ?? fallback.bg,
    spineInk: r.spineInk ?? fallback.ink,
    blobUrl: r.blobUrl ?? undefined,
    size: r.size,
    lastPage: r.lastPage,
  };
}

async function failureMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

// Cloud backend (signed in): metadata via /api/books, bytes via Vercel Blob.
export const cloudStore: LibraryStore = {
  kind: "cloud",

  async list() {
    const res = await fetch("/api/books");
    // 401 (signed out mid-flight) and 503 (cloud not provisioned) are expected
    // states — treat as an empty shelf. Anything else is a real failure worth
    // surfacing to the reader.
    if (res.status === 401 || res.status === 503) return [];
    if (!res.ok) throw new Error("Couldn't load your shelf.");
    const rows = (await res.json()) as BookRow[];
    return rows.map(rowToBook);
  },

  async add(file, onProgress) {
    const title = titleFromFile(file);
    // Upload the bytes straight to Blob with a token minted by our route.
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
      // Let the token route check the budget against the incoming size before
      // any bytes are uploaded.
      clientPayload: JSON.stringify({ size: file.size }),
      onUploadProgress: onProgress
        ? (e) => onProgress(e.percentage / 100)
        : undefined,
    });
    const colors = spineColors(blob.pathname);
    // Then record the metadata row.
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        size: file.size,
        blobUrl: blob.url,
        pathname: blob.pathname,
        spineBg: colors.bg,
        spineInk: colors.ink,
      }),
    });
    if (!res.ok) {
      throw new Error(await failureMessage(res, "Couldn't save the book."));
    }
    return rowToBook((await res.json()) as BookRow);
  },

  async getBytes(book: LibraryBook) {
    if (!book.blobUrl) return null;
    const res = await fetch(book.blobUrl);
    if (!res.ok) return null;
    return res.arrayBuffer();
  },

  async remove(id: string) {
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      throw new Error(await failureMessage(res, "Couldn't remove that book."));
    }
  },

  async setProgress(id: string, lastPage: number) {
    await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lastPage }),
    }).catch(() => {});
  },
};
