import type { ReactNode } from "react";

/** Frosted-glass container used for every forecast/detail panel. */
export default function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl bg-white/15 backdrop-blur-xl ring-1 ring-white/20 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}
