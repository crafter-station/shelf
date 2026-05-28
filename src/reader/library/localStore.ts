import { addPdf, getPdfBytes, listPdfs, removePdf } from "./db";
import { spineColors } from "./spineColors";
import { type LibraryBook, type LibraryStore, titleFromFile } from "./store";

// Anonymous backend: books live in the browser's IndexedDB. Spine colours are
// derived deterministically from the id (no server to remember them).
export const localStore: LibraryStore = {
  kind: "local",

  async list() {
    const metas = await listPdfs();
    return metas.map((m) => {
      const c = spineColors(m.id);
      return { id: m.id, title: m.name, spineBg: c.bg, spineInk: c.ink };
    });
  },

  async add(file) {
    const title = titleFromFile(file);
    const bytes = await file.arrayBuffer();
    const meta = await addPdf(title, bytes);
    const c = spineColors(meta.id);
    return { id: meta.id, title, spineBg: c.bg, spineInk: c.ink };
  },

  getBytes(book: LibraryBook) {
    return getPdfBytes(book.id);
  },

  remove(id: string) {
    return removePdf(id);
  },
};
