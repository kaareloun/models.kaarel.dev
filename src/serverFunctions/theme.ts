import { createServerFn } from "@tanstack/react-start";
import { getHeader } from "@tanstack/react-start/server";

export type Theme = "dark" | "light";

function asTheme(value: string | undefined): Theme | undefined {
  const theme = value?.replace(/"/g, "");
  return theme === "dark" || theme === "light" ? theme : undefined;
}

export const getTheme = createServerFn({ method: "GET" }).handler(() => {
  const cookieTheme = getHeader("cookie")?.match(
    /(?:^|;\s*)ui-theme=([^;]*)/,
  )?.[1];
  return (
    asTheme(cookieTheme) ??
    asTheme(getHeader("Sec-CH-Prefers-Color-Scheme")) ??
    "dark"
  );
});
