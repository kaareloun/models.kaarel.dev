import { createServerFn } from "@tanstack/react-start";
import type { Theme } from "~/components/ui/theme-provider";
import { getHeader } from "@tanstack/react-start/server";

export const getTheme = createServerFn({ method: "GET" }).handler(() => {
  const cookies = (getHeader("cookie")?.toString() ?? "").split("; ").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.split("=");
      if (!key || !value) {
        return acc;
      }

      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );

  const selectedTheme = cookies["ui-theme"];
  const themeHeader = getHeader("Sec-CH-Prefers-Color-Scheme");
  const theme = (selectedTheme ?? themeHeader ?? "dark") as Theme;

  return theme;
});
