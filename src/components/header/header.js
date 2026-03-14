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
  "tlDashboard": [
    { label: "Events", route: "coderEventSelect" },
    { label: "Teams",  route: null               },
  ],
  "projects": [
    { label: "Dashboard",         route: "dashboard",      },
    { label: "Teams & Projects",  route: "projects",       },
  ],
  "teamDetail": [
    { label: "Events",         route: "events",      },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
    { label: "Team Details",       route: null,       },
  ],
  "coderHome": [
    { label: "Events",         route: "events",      },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
    { label: "Team Details",       route: null,       },
  ],
  "ranking": [
    { label: "Event",         route: "events",      },
    { label: "Ranking",       route: "ranking",       },
  ]
};

export const HEADER_LAYOUT_BY_ROUTE = {
  "dashboard": {
    variant: "details",
    title: "Dashboard",
  },
  "coderHome": {
    variant: "details",
    title: "Details",
  },
  "events/create": {
    variant: "create-event",
    title: "Create New Event",
  },
  "tlDashboard": {
    variant: "details",
    title: "Teams",
  },
  "projects": {
    variant: "teams",
    title: "Projects Overview",
  },
  "teamDetail": {
    variant: "details",
    title: "Details",
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
