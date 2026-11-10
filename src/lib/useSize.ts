import { useEffect, useRef, useState } from "react";

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([entry]) =>
        entry &&
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
