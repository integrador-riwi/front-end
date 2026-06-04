import { icons } from "../../utils/icons.js";
import { t } from "../../utils/i18n.js";

// Functions so t() is evaluated fresh on every call (picks up current language)
const TL_BASE_LINKS = () => [
  { label: t("nav.events"), route: "coderEventSelect", icon: "calendar" },
  { label: t("nav.teamsProjects"), route: "tlDashboard", icon: "edit" },
];

const ADMIN_BASE_LINKS = () => [
  { label: t("nav.events"), route: "events", icon: "calendar" },
  { label: t("nav.newEvent"), route: "events/create", icon: "plus" },
  { label: "Usuarios", route: "users", icon: "users" },
];

const ADMIN_EVENT_LINKS = (eventStatus) => {
  const isFinished = eventStatus === "FINISHED";
  const links = [
    { label: t("nav.backToEvents"), route: "events", icon: "calendar" },
    { label: t("nav.metrics"), route: "dashboard", icon: "metrics" },
    { label: t("nav.projects"), route: "projects", icon: "globe" },
    { label: t("nav.ranking"), route: "ranking", icon: "ranking" },
  ];
  if (!isFinished) {
    links.push({ label: t("nav.voting"), route: "qr", icon: "qr" });
    links.push({ label: t("nav.finalists"), route: "finalists", icon: "trophy" });
  }
  return links;
};

const CODER_NO_TEAM_LINKS = () => [
  { label: t("nav.browseProjects"), route: "browseProjects", icon: "bulb" },
  { label: t("nav.events"), route: "coderEventSelect", icon: "calendar" },
];

const CODER_TEAM_LINKS = () => [
  { label: t("nav.myProject"), route: "coderHome", icon: "globe" },
  { label: t("nav.browseProjects"), route: "browseProjects", icon: "bulb" },
  { label: t("nav.events"), route: "coderEventSelect", icon: "calendar" },
];

const STAFF_LINKS = () => [
  { label: t("nav.dashboard"), route: "dashboard", icon: "calendar" },
  { label: t("nav.events"), route: "events", icon: "calendar" },
  { label: t("nav.teamsProjects"), route: "projects", icon: "globe" },
  { label: t("nav.finalResults"), route: "final-results", icon: "trophy" },
];

export const getNavLinks = (role, hasTeam) => {
  console.log("getNavLinks", role, hasTeam);

  if (role === "ADMIN") {
    const eventId = localStorage.getItem("currentEventId");
    const eventStatus = localStorage.getItem("currentEventStatus");
    return eventId ? ADMIN_EVENT_LINKS(eventStatus) : ADMIN_BASE_LINKS();
  }

  if (role === "CODER") {
    if (!hasTeam) {
      console.log("CODER_NO_TEAM_LINKS:", CODER_NO_TEAM_LINKS());
      return CODER_NO_TEAM_LINKS();
    }
    return CODER_TEAM_LINKS();
  }

  if (["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"].includes(role)) {
    const links = TL_BASE_LINKS();
    const eventSelected = sessionStorage.getItem("selectedEvent");

    if (!eventSelected) {
      return links.filter((l) => l.route !== "tlDashboard");
    }
    return links;
  }

  if (role === "STAFF") {
    return STAFF_LINKS();
  }

  return [];
};

export const getRoleLabel = (role) => t(`role.${role}`) || "User";

export const getIcon = (iconName) => {
  return icons[iconName]?.();
};
