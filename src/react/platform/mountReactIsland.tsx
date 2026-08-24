import type { ComponentType } from "react";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

export interface ReactIslandHandle {
  unmount(): void;
}

export function mountReactIsland<Props extends object>(
  container: HTMLElement,
  Component: ComponentType<Props>,
  props: Props,
): ReactIslandHandle {
  let root: Root | null = createRoot(container);

  root.render(
    <StrictMode>
      <Component {...props} />
    </StrictMode>,
  );

  return {
    unmount() {
      if (!root) return;
      root.unmount();
      root = null;
    },
  };
}
