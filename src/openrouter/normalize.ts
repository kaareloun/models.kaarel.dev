export function normalizeModelKey(s: string): string {
  const base = s.split("/").pop() ?? s;
  return base
    .toLowerCase()
    .replace(/[\s:-]free$/, "")
    .replace(/[\s:-]batch$/, "")
    .replace(/[^a-z0-9]/g, "");
}
