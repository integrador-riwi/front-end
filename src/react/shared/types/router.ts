export interface VanillaRouter {
  navigate(route: string, params?: Record<string, unknown>): void;
  back(fallbackRoute?: string | null): void;
  getAppState?(): {
    user: unknown;
    hasTeam: boolean;
  };
}

export interface ReactRouteContext {
  router: VanillaRouter;
  params: Record<string, unknown>;
}
