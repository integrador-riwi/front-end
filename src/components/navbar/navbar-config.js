import { icons } from "../../utils/icons.js";
import { t } from "../../utils/i18n.js";

const getTLBaseLinks = () => [
  { label: t("nav.teamsProjects"), route: "tlDashboard", icon: "edit" },
  { label: t("nav.events"), route: "coderEventSelect", icon: "calendar" },
];

const getAdminBaseLinks = () => [
  { label: t("nav.events"), route: "events", icon: "calendar" },
  { label: t("nav.newEvent"), route: "events/create", icon: "plus" },
];

const getAdminEventLinks = () => [
  { label: t("nav.backToEvents"), route: "events", icon: "calendar" },
  { label: t("nav.metrics"), route: "dashboard", icon: "metrics" },
  { label: t("nav.projects"), route: "projects", icon: "globe" },
  { label: t("nav.ranking"), route: "ranking", icon: "ranking" },
  { label: t("nav.voting"), route: "qr", icon: "qr" },
  { label: t("nav.finalists"), route: "finalists", icon: "trophy" },
];

export const getNavLinks = (role) => {
  if (role === "ADMIN") {
    const eventId = localStorage.getItem("currentEventId");
    return eventId ? getAdminEventLinks() : getAdminBaseLinks();
  }

  if (["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"].includes(role)) {
    return getTLBaseLinks();
  }

  if (role === "CODER") {
    return [
      { label: t("nav.myProject"), route: "coderHome", icon: "globe" },
      { label: t("nav.teamsProjects"), route: "projects", icon: "bulb" },
    ];
  }

  if (role === "STAFF") {
    return [
      { label: t("nav.dashboard"), route: "dashboard", icon: "calendar" },
      { label: t("nav.events"), route: "events", icon: "calendar" },
      { label: t("nav.teamsProjects"), route: "projects", icon: "globe" },
      { label: t("nav.finalResults"), route: "final-results", icon: "trophy" },
    ];
  }

  return [];
};

export const getRoleLabel = (role) => t(`role.${role}`) || "User";

export const getIcon = (iconName) => {
  return icons[iconName]?.();
};
