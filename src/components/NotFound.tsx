import { Link } from "@tanstack/react-router";

const ACTION =
  "rounded-md px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NotFound() {
  return (
    <div className="mx-auto max-w-[60ch] px-4 py-16">
      <p className="text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          className={ACTION}
        >
          Go back
        </button>
        <Link to="/" className={ACTION}>
          Home
        </Link>
      </div>
    </div>
  );
}
