import { t } from "../../utils/i18n.js";

const HEADER_LINKS_BY_VIEW = () => ({
  dashboard: [
    { label: t("nav.events"), route: "events" },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
  ],
  "events/create": [
    { label: t("nav.events"), route: "events" },
    { label: t("nav.createNew"), route: "events/create" },
  ],
  tlDashboard: [
    { label: t("nav.events"), route: "coderEventSelect" },
    {
      label: (() => {
        try {
          const stored = sessionStorage.getItem("selectedEvent");
          if (stored) return JSON.parse(stored).title || t("nav.teams");
        } catch (_) { }
        return t("nav.teams");
      })(),
      route: null,
    },
  ],
  projects: [
    { label: t("nav.dashboard"), route: "dashboard" },
    { label: t("nav.teamsProjects"), route: "projects" },
  ],
  browseProjects: [
    { label: t("nav.events"), route: "coderEventSelect" },
    { label: t("nav.browseProjects"), route: "browseProjects" },
  ],
  teamDetail: [
    { label: t("nav.events"), route: "events" },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
    { label: t("nav.teamDetails"), route: null },
  ],
  qr: [
    { label: t("nav.events"), route: "events" },
    { label: t("nav.qrVoting"), route: null },
  ],
  coderHome: [
    { label: t("nav.events"), route: "events" },
    { label: localStorage.getItem("currentEventName"), route: "dashboard" },
    { label: t("nav.teamDetails"), route: null },
  ],
  ranking: [
    { label: t("nav.events"), route: "events" },
    { label: t("nav.ranking"), route: "ranking" },
  ],
  finalists: [
    { label: t("nav.events"), route: "events" },
    { label: t("nav.finalists"), route: null },
  ],
});

const HEADER_LAYOUT_BY_ROUTE = () => ({
  dashboard: {
    variant: "details",
    title: t("nav.dashboard"),
  },
  coderHome: {
    variant: "details",
    title: t("nav.teamDetails"),
  },
  "events/create": {
    variant: "create-event",
    title: t("nav.createNewEvent"),
  },
  tlDashboard: {
    variant: "details",
    title: t("nav.teams"),
  },
  qr: {
    variant: "details",
    title: t("nav.qrVoting"),
  },
  projects: {
    variant: "teams",
    title: t("nav.projectsOverview"),
  },
  browseProjects: {
    variant: "teams",
    title: t("nav.browseProjects"),
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
  finalists: {
    variant: "finalists",
    title: t("nav.finalists"),
  },
});

export const getHeaderLinks = (view) => {
  return HEADER_LINKS_BY_VIEW()[view] ?? [];
};

export const getHeaderLayout = (route) => {
  return HEADER_LAYOUT_BY_ROUTE()[route] ?? null;
};
