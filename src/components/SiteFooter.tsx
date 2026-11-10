import { CURSORBENCH_URL, TELEGRAM_BOT_USERNAME } from "~/openrouter/constants";

const LINK =
  "text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border pt-8">
      <div className="max-w-[65ch] space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Benchmarks, prices and speed come from the{" "}
          <a
            href="https://artificialanalysis.ai"
            target="_blank"
            rel="noreferrer"
            className={LINK}
          >
            Artificial Analysis
          </a>{" "}
          free API, refreshed every two hours. Free models and open-weight flags
          come from models.dev. Prices are the mean of input and output per
          million tokens, converted to euro. CursorBench scores come from{" "}
          <a
            href={CURSORBENCH_URL}
            target="_blank"
            rel="noreferrer"
            className={LINK}
          >
            Cursor
          </a>{" "}
          every six hours. Its cost is US dollars per task.
        </p>
        <p>
          Release replay rebuilds the ranking on each release date with today's
          scores. AA snapshots compare the scores AA actually published at each
          fetch.
        </p>
        <p>
          Telegram alerts: send /start to{" "}
          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noreferrer"
            className={LINK}
          >
            @{TELEGRAM_BOT_USERNAME}
          </a>{" "}
          for a message when Anthropic, OpenAI, Google or xAI launch a model, or
          a model joins the price-performance frontier.
        </p>
      </div>
    </footer>
  );
}
