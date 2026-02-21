export const HEADER_LINKS_BY_VIEW = {
  "events/create": [
    { label: "Events",            route: "events"           },
    { label: "Management",        route: "projects"         },
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
};

export const HEADER_LAYOUT_BY_ROUTE = {
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
};

export const getHeaderLinks = (view) => {
  return HEADER_LINKS_BY_VIEW[view] ?? [];
};

export const getHeaderLayout = (route) => {
  return HEADER_LAYOUT_BY_ROUTE[route] ?? null;
};
