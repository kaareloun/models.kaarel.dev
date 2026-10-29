import { Send } from "lucide-react";

interface SiteFooterProps {
  botUsername: string | null;
}

export function SiteFooter({ botUsername }: SiteFooterProps) {
  return (
    <footer className="mt-24 grid gap-10 border-t border-border/70 pt-10 md:grid-cols-[1.4fr_1fr]">
      <div className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
        <p>
          Benchmarks, prices and speed come from the{" "}
          <a
            href="https://artificialanalysis.ai"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Artificial Analysis
          </a>{" "}
          free API, refreshed every two hours. Free models and open-weight flags come from models.dev. Prices are the
          mean of input and output per million tokens, converted to euro.
        </p>
        <p className="mt-3">
          Release replay rebuilds the ranking on each release date with today's scores. AA snapshots compare the
          scores AA actually published at each fetch.
        </p>
      </div>
      {botUsername && (
        <a
          href={`https://t.me/${botUsername}`}
          target="_blank"
          rel="noreferrer"
          className="group flex items-start gap-4 rounded-[18px] border border-border/70 p-5 transition-colors duration-300 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-500 group-hover:-rotate-12">
            <Send className="h-4 w-4" strokeWidth={2} />
          </span>
          <span>
            <span className="block text-sm font-semibold">Get pinged on Telegram</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Send /start to @{botUsername}. You hear about it when a frontier lab model gets benchmarked, joins the
              frontier, or a free model enters the top 20.
            </span>
          </span>
        </a>
      )}
    </footer>
  );
}
