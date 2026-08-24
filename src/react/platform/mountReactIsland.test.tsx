import { act, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountReactIsland } from "./mountReactIsland";

afterEach(() => {
  document.body.innerHTML = "";
});

function ClickProbe({ onClick }: { onClick: () => void }) {
  useEffect(() => {
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
    };
  }, [onClick]);

  return <button type="button">React island ready</button>;
}

describe("mountReactIsland", () => {
  it("mounts into a Vanilla-owned node and cleans listeners on unmount", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onClick = vi.fn();

    let handle: ReturnType<typeof mountReactIsland<{ onClick: () => void }>> | null = null;
    act(() => {
      handle = mountReactIsland(container, ClickProbe, { onClick });
    });

    expect(container.textContent).toContain("React island ready");

    window.dispatchEvent(new MouseEvent("click"));
    expect(onClick).toHaveBeenCalledTimes(1);

    act(() => {
      handle?.unmount();
    });

    window.dispatchEvent(new MouseEvent("click"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("");
  });
});
