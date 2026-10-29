import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange, className }: SegmentedControlProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const el = refs.current.get(value);
      if (el) setIndicator({ x: el.offsetLeft, w: el.offsetWidth });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [value, options]);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("relative flex items-center overflow-x-auto [scrollbar-width:none]", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          ref={(el) => {
            if (el) refs.current.set(o.value, el);
            else refs.current.delete(o.value);
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative shrink-0 px-3 h-11 md:h-9 text-sm whitespace-nowrap transition-colors duration-300 rounded-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "active:translate-y-px",
            o.value === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
      {indicator && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-px origin-left bg-primary"
          style={{
            transform: `translateX(${indicator.x}px) scaleX(${indicator.w})`,
            transition: "transform 0.55s var(--ease-out-expo)",
          }}
        />
      )}
    </div>
  );
}
