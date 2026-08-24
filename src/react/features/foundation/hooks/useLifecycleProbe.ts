import { useEffect, useState } from "react";

export function useLifecycleProbe(onMount?: () => void, onUnmount?: () => void) {
  const [mountedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    onMount?.();
    return () => {
      onUnmount?.();
    };
  }, [onMount, onUnmount]);

  return { mountedAt };
}
