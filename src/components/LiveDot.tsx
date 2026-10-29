import { memo } from "react";

export const LiveDot = memo(function LiveDot() {
  return (
    <span className="relative inline-flex h-2 w-2" aria-hidden="true">
      <span
        className="motion-ripple absolute inset-0 rounded-full bg-primary"
        style={{ animation: "ripple 2.4s var(--ease-out-expo) infinite" }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full bg-primary"
        style={{ animation: "pulse-dot 2.4s ease-in-out infinite" }}
      />
    </span>
  );
});
