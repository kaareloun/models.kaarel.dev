export const CHART_LABS = [
  { creator: "Anthropic", color: "var(--lab-2)" },
  { creator: "OpenAI", color: "var(--lab-3)" },
  { creator: "Google", color: "var(--lab-1)" },
] as const;

export const OTHER_LAB_COLOR = "var(--lab-other)";

export function labColor(creator: string): string {
  return (
    CHART_LABS.find((l) => l.creator === creator)?.color ?? OTHER_LAB_COLOR
  );
}
