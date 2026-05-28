import { useEffect, useRef } from "react";

// Shown once after sign-in when the user has books saved locally (anonymous):
// offers to move them into their account so they sync across devices.
export function MigrationPrompt({
  count,
  busy,
  onMigrate,
  onDismiss,
}: {
  count: number;
  busy: boolean;
  onMigrate: () => void;
  onDismiss: () => void;
}) {
  const noun = count === 1 ? "book" : "books";
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog once, on open.
  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  // Escape dismisses it (unless a move is in progress).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.stopPropagation();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onDismiss]);

  return (
    <>
      <div className="migrate-scrim" aria-hidden="true" />
      <div
        className="migrate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="migrate-title"
        aria-describedby="migrate-body"
      >
        <p id="migrate-title" className="migrate__title">
          Move your shelf to your account?
        </p>
        <p id="migrate-body" className="migrate__body">
          You have {count} {noun} saved on this device. Move{" "}
          {count === 1 ? "it" : "them"} to your account to read{" "}
          {count === 1 ? "it" : "them"} on any device.
        </p>
        <div className="migrate__actions">
          <button
            type="button"
            className="migrate__btn migrate__btn--ghost"
            onClick={onDismiss}
            disabled={busy}
          >
            Not now
          </button>
          <button
            ref={primaryRef}
            type="button"
            className="migrate__btn migrate__btn--primary"
            onClick={onMigrate}
            disabled={busy}
          >
            {busy ? "Moving…" : `Move ${count} ${noun}`}
          </button>
        </div>
      </div>
    </>
  );
}
