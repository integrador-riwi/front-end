import { t } from "../../utils/i18n.js";

export const getHeaderLinks = (view) => {
  const eventName = localStorage.getItem("currentEventName");

  const map = {
    dashboard: [
      { label: t("nav.events"), route: "events" },
      { label: eventName, route: "dashboard" },
    ],
    "events/create": [
      { label: t("nav.events"), route: "events" },
      { label: t("common.edit"), route: "settings" },
      { label: t("nav.newEvent"), route: "events/create" },
    ],
    projects: [
      { label: t("nav.dashboard"), route: "dashboard" },
      { label: t("nav.teamsProjects"), route: "projects" },
    ],
    ranking: [
      { label: t("nav.events"), route: "events" },
      { label: t("nav.ranking"), route: "ranking" },
    ],
    details: [
      { label: t("nav.events"), route: "events" },
      { label: eventName, route: "dashboard" },
      { label: t("nav.events"), route: "details" },
    ],
  };

  return map[view] ?? [];
};

export const getHeaderLayout = (route) => {
  const map = {
    dashboard: {
      variant: "details",
      title: t("nav.dashboard"),
    },
    "events/create": {
      variant: "create-event",
      title: t("nav.newEvent"),
    },
    projects: {
      variant: "teams",
      title: t("nav.teamsProjects"),
    },
    ranking: {
      variant: "ranking",
      title: t("nav.ranking"),
    },
    details: {
      variant: "details",
      title: t("eventDetails.loading"),
    },
  };

  return map[route] ?? null;
};
