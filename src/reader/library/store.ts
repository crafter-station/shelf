// A pluggable backend for the user's shelf. The reader talks to this interface
// and never cares whether a book lives in the browser (anonymous) or the cloud
// (signed in) — picking the implementation is the only auth-aware decision.

export type LibraryBook = {
  id: string;
  title: string;
  spineBg: string;
  spineInk: string;
  // Cloud books carry where to fetch their bytes; local books are read from
  // IndexedDB by id, so blobUrl is undefined for them.
  blobUrl?: string;
  size?: number;
  lastPage?: number;
};

export interface LibraryStore {
  readonly kind: "local" | "cloud";
  /** The user's books (excludes the bundled Alice), newest-friendly order. */
  list(): Promise<LibraryBook[]>;
  /** Persist a PDF and return its shelf entry. */
  add(
    file: File,
    onProgress?: (fraction: number) => void,
  ): Promise<LibraryBook>;
  /** Raw PDF bytes for a book, or null if gone. */
  getBytes(book: LibraryBook): Promise<ArrayBuffer | null>;
  /** Remove a book from the shelf (and its bytes). */
  remove(id: string): Promise<void>;
  /** Persist reading progress, if the backend supports it. */
  setProgress?(id: string, lastPage: number): Promise<void>;
}

export function titleFromFile(file: File): string {
  return file.name.replace(/\.pdf$/i, "");
}
