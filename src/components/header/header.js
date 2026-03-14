// Returns breadcrumb links for a given view.
// Each entry is a function so localStorage is read at call time,
// not at module-load time — prevents the "null" label bug when the
// module is imported before currentEventName is saved.
const HEADER_LINKS_FACTORIES = {
  dashboard: () => [
    { label: "Events", route: "events" },
    {
      label: localStorage.getItem("currentEventName") || "Event",
      route: "dashboard",
    },
  ],
  "events/create": () => [
    { label: "Events", route: "events" },
    { label: "Management", route: "settings" },
    { label: "Create New", route: "events/create" },
  ],
  tlDashboard: () => [
    { label: "Events", route: "coderEventSelect" },
    { label: "Teams", route: null },
  ],
  projects: () => [
    { label: "Dashboard", route: "dashboard" },
    { label: "Teams & Projects", route: "projects" },
  ],
  teamDetail: () => [
    { label: "Events", route: "events" },
    {
      label: localStorage.getItem("currentEventName") || "Event",
      route: "dashboard",
    },
    { label: "Team Details", route: null },
  ],
  qr: () => [
    { label: "Events", route: "events" },
    { label: "QR Voting", route: null },
  ],
  coderHome: () => [
    { label: "Events", route: "events" },
    {
      label: localStorage.getItem("currentEventName") || "Event",
      route: "dashboard",
    },
    { label: "Team Details", route: null },
  ],
  ranking: () => [
    { label: "Event", route: "events" },
    { label: "Ranking", route: "ranking" },
  ],
};

export const HEADER_LAYOUT_BY_ROUTE = {
  dashboard: {
    variant: "details",
    title: "Dashboard",
  },
  coderHome: {
    variant: "details",
    title: "Details",
  },
  "events/create": {
    variant: "create-event",
    title: "Create New Event",
  },
  tlDashboard: {
    variant: "details",
    title: "Teams",
  },
  qr: {
    variant: "details",
    title: "QR Voting",
  },
  projects: {
    variant: "teams",
    title: "Projects Overview",
  },
  teamDetail: {
    variant: "details",
    title: "Details",
  },
  ranking: {
    variant: "ranking",
    title: "Ranking",
  },
  details: {
    variant: "details",
    title: "Event Details",
  },
};

export const getHeaderLinks = (view) => {
  return HEADER_LINKS_FACTORIES[view]?.() ?? [];
};

export const getHeaderLayout = (route) => {
  return HEADER_LAYOUT_BY_ROUTE[route] ?? null;
};
