import { t } from "../../utils/i18n.js";

// Arrow functions so t() is evaluated fresh on every call (picks up current language)
const HEADER_LINKS_BY_VIEW = () => ({
  dashboard: [
    { label: t("nav.events"), route: "events" },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
  ],
  "events/create": [
    { label: t("nav.events"), route: "events" },
    { label: t("nav.management"), route: "settings" },
    { label: t("nav.createNew"), route: "events/create" },
  ],
  projects: [
    { label: t("nav.dashboard"), route: "dashboard" },
    { label: t("nav.teamsProjects"), route: "projects" },
  ],
  teamDetail: [
    { label: t("nav.events"), route: "events" },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
    { label: t("nav.teamDetails"), route: null },
  ],
  ranking: [
    { label: t("nav.events"), route: "events" },
    { label: t("nav.ranking"), route: "ranking" },
  ],
});

const HEADER_LAYOUT_BY_ROUTE = () => ({
  dashboard: {
    variant: "details",
    title: t("nav.dashboard"),
  },
  "events/create": {
    variant: "create-event",
    title: t("nav.createNewEvent"),
  },
  projects: {
    variant: "teams",
    title: t("nav.projectsOverview"),
  },
  teamDetail: {
    variant: "details",
    title: t("nav.teamDetails"),
  },
  ranking: {
    variant: "ranking",
    title: t("nav.ranking"),
  },
  details: {
    variant: "details",
    title: t("nav.eventDetails"),
  },
});

export const getHeaderLinks = (view) => {
  return HEADER_LINKS_BY_VIEW()[view] ?? [];
};

export const getHeaderLayout = (route) => {
  return HEADER_LAYOUT_BY_ROUTE()[route] ?? null;
};
