import { FoundationStatus } from "../features/foundation/components/FoundationStatus";
import { useLifecycleProbe } from "../features/foundation/hooks/useLifecycleProbe";
import { getFoundationReadiness } from "../features/foundation/services/foundationService";
import type { ReactRouteContext } from "../shared/types/router";
import "./react-shell.css";

interface ReactShellProps extends ReactRouteContext {
  onMount?: () => void;
  onUnmount?: () => void;
}

export function ReactShell({ params, onMount, onUnmount }: ReactShellProps) {
  const { mountedAt } = useLifecycleProbe(onMount, onUnmount);
  const readiness = getFoundationReadiness();
  const source = typeof params.source === "string" ? params.source : "vanilla-router";

  return (
    <section className="react-shell" aria-label="React foundation shell">
      <header className="react-shell__header">
        <h1 className="react-shell__title">React + TypeScript foundation</h1>
        <p className="react-shell__subtitle">
          This shell is mounted from the existing Vanilla router, so new features can migrate
          incrementally without rewriting current views.
        </p>
      </header>

      <div className="react-shell__grid">
        <FoundationStatus label="Framework" value={readiness.framework} />
        <FoundationStatus label="Language" value={readiness.language} />
        <FoundationStatus label="Mode" value={readiness.migrationMode} />
        <FoundationStatus label="Mounted at" value={mountedAt} />
        <FoundationStatus label="Source" value={source} />
      </div>
    </section>
  );
}
