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
  return (
    <>
      <div className="migrate-scrim" aria-hidden="true" />
      <div
        className="migrate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="migrate-title"
      >
        <p id="migrate-title" className="migrate__title">
          Move your shelf to your account?
        </p>
        <p className="migrate__body">
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
