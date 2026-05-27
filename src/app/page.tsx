"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The reader is WebGL + pdf.js (browser-only) — never render it on the server.
const Reader = dynamic(() => import("../reader/Reader"), { ssr: false });

const FACES = [
  "400 1em 'EB Garamond'",
  "500 1em 'EB Garamond'",
  "700 1em 'EB Garamond'",
  "italic 400 1em 'EB Garamond'",
];

export default function Home() {
  // Pages/spines are drawn to <canvas>, which needs the book serif loaded first.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setReady(true);
    };
    if ("fonts" in document) {
      const loaded = Promise.allSettled(FACES.map((f) => document.fonts.load(f)));
      const timeout = new Promise((r) => setTimeout(r, 1500));
      Promise.race([loaded, timeout]).finally(reveal);
    } else {
      reveal();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? <Reader /> : null;
}
