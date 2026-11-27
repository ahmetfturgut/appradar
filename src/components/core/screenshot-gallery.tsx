"use client";
/**
 * App Details screenshot strip with fail-closed image handling and native dialog enlarge.
 * URLs remain external CDN/store hosts; no image binary storage.
 */
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

export function ScreenshotGallery({ appName, urls }: { appName: string; urls: string[] }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [active, setActive] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const visible = urls.filter(url => !failed.has(url));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [active]);

  if (!visible.length) return null;

  return <>
    <div className="product-screenshots" role="list" aria-label={`${appName} screenshots`}>
      {visible.map((url, index) => (
        <button
          key={`${url}:${index}`}
          type="button"
          role="listitem"
          className="product-screenshot-trigger"
          onClick={() => setActive(url)}
          aria-label={`Enlarge ${appName} screenshot ${index + 1}`}
        >
          <img
            src={url}
            alt={`${appName} screenshot ${index + 1}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(current => new Set(current).add(url))}
          />
        </button>
      ))}
    </div>
    <dialog
      ref={dialogRef}
      className="product-screenshot-dialog"
      aria-labelledby={titleId}
      onClose={() => setActive(null)}
      onClick={event => { if (event.target === event.currentTarget) setActive(null); }}
    >
      <div className="product-screenshot-dialog-panel">
        <div className="product-screenshot-dialog-bar">
          <h2 id={titleId} className="product-screenshot-dialog-title">{appName} screenshot</h2>
          <form method="dialog">
            <button type="submit" className="product-screenshot-dialog-close" aria-label="Close screenshot">
              <X size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
        {active ? (
          <img
            src={active}
            alt={`Enlarged screenshot of ${appName}`}
            className="product-screenshot-dialog-image"
            referrerPolicy="no-referrer"
            onError={() => { setFailed(current => new Set(current).add(active)); setActive(null); }}
          />
        ) : null}
      </div>
    </dialog>
  </>;
}
