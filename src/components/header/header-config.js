export const HEADER_LINKS_BY_ROLE = {
  ADMIN: [
    { label: "Events",            route: "events"           },
    { label: "Create New",        route: "events/create"    },
    { label: "Management",        route: "projects"         },
  ],
  TL_DEVELOPMENT: [
    { label: "Dashboard",         route: "dashboard",      },
    { label: "Projects to Grade", route: "evaluations",    },
    { label: "My Evaluations",    route: "my-evaluations", },
    { label: "Teams & Projects",  route: "projects",       },
    { label: "Events",            route: "events",         },
  ],
  TL_SOFT_SKILLS: [
    { label: "Dashboard",         route: "dashboard",      },
    { label: "Projects to Grade", route: "evaluations",    },
    { label: "My Evaluations",    route: "my-evaluations", },
    { label: "Teams & Projects",  route: "projects",       },
    { label: "Events",            route: "events",         },
  ],
  TL_ENGLISH: [
    { label: "Dashboard",         route: "dashboard",      },
    { label: "Projects to Grade", route: "evaluations",    },
    { label: "My Evaluations",    route: "my-evaluations", },
    { label: "Teams & Projects",  route: "projects",       },
    { label: "Events",            route: "events",         },
  ],
  CODER: [
    { label: "Dashboard",    route: "dashboard",    },
    { label: "My Project",   route: "my-project",   },
    { label: "Deliverables", route: "deliverables", },
    { label: "My Grades",    route: "my-grades",    },
    { label: "Feedback",     route: "feedback",     },
    { label: "Events",       route: "events",       },
  ],
  STAFF: [
    { label: "Dashboard",        route: "dashboard",     },
    { label: "Events",           route: "events",        },
    { label: "Teams & Projects", route: "projects",      },
    { label: "Final Results",    route: "final-results", },
  ],
};

export const getHeaderLinks = (role) => {
  return HEADER_LINKS_BY_ROLE[role] ?? [];
};

export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] ?? "User";
};