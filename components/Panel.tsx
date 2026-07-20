import type { ReactNode } from "react";

/**
 * The ledger's surface: a flat, hairline-bordered panel on the ink canvas.
 * Deliberately not frosted glass — this app is a document, not a window.
 */
export default function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-ink-line bg-ink-raised ${className}`}
    >
      {children}
    </section>
  );
}

/** Uppercase micro-label used for every section heading. */
export function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-faint ${className}`}
    >
      {children}
    </h2>
  );
}
