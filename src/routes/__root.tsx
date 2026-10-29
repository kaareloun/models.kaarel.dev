/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import * as React from "react";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import { ThemeProvider, useTheme } from "~/components/ui/theme-provider";
import { getTheme } from "~/serverFunctions/theme";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "The frontier, priced | models.kaarel.dev" },
      { name: "description", content: "Frontier LLM price vs Artificial Analysis benchmarks — Pareto frontier and Opencode Zen free models | models.kaarel.dev" },
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "any",
      },
      {
        rel: "icon",
        href: "/favicon-16x16.png",
        sizes: "16x16",
      },
      {
        rel: "icon",
        href: "/favicon-32x32.png",
        sizes: "32x32",
      },
      {
        rel: "icon",
        href: "/android-chrome-192x192.png",
        sizes: "192x192",
      },
      {
        rel: "icon",
        href: "/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  }),
  beforeLoad: async () => {
    const theme = await getTheme();

    return { theme };
  },
  headers: () => ({
    "Accept-CH": "Sec-CH-Prefers-Color-Scheme",
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  const { theme } = Route.useRouteContext();

  return (
    <ThemeProvider defaultTheme={theme}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <html className={theme} lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-[100dvh] overflow-y-scroll bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
