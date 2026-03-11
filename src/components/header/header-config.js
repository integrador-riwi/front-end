export const HEADER_LINKS_BY_VIEW = {
    "dashboard": [
    { label: "Events", route: "events" },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
  ],
  "events/create": [
    { label: "Events",            route: "events"           },
    { label: "Management",        route: "settings"         },
    { label: "Create New",        route: "events/create"    },
  ],
  "projects": [
    { label: "Dashboard",         route: "dashboard",      },
    { label: "Teams & Projects",  route: "projects",       },
  ],
  "ranking": [
    { label: "Event",         route: "events",      },
    { label: "Ranking",       route: "ranking",       },
  ],
  "details": [
    { label: "Events",         route: "events",      },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
    { label: "Details",       route: "details",       },
  ],
};

export const HEADER_LAYOUT_BY_ROUTE = {
  "dashboard": {
      variant: "details",
      title: "Dashboard",
    },
  "events/create": {
    variant: "create-event",
    title: "Create New Event",
  },
  "projects": {
    variant: "teams",
    title: "Projects Overview",
  },
  "ranking": {
    variant: "ranking",
    title: "Ranking",
  },
  "details": {
    variant: "details",
    title: "Event Details",
  },
};

export const getHeaderLinks = (view) => {
  return HEADER_LINKS_BY_VIEW[view] ?? [];
};

export const getHeaderLayout = (route) => {
  return HEADER_LAYOUT_BY_ROUTE[route] ?? null;
};
