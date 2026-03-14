import { icons } from "../../utils/icons.js";
import { t } from "../../utils/i18n.js";

// Functions so t() is evaluated fresh on every call (picks up current language)
const TL_BASE_LINKS = () => [
  { label: t("nav.teamsProjects"), route: "tlDashboard", icon: "edit" },
  { label: t("nav.events"), route: "coderEventSelect", icon: "calendar" },
];

const ADMIN_BASE_LINKS = () => [
  { label: t("nav.events"), route: "events", icon: "calendar" },
  { label: t("nav.newEvent"), route: "events/create", icon: "plus" },
];

const ADMIN_EVENT_LINKS = () => [
  { label: t("nav.backToEvents"), route: "events", icon: "calendar" },
  { label: t("nav.metrics"), route: "dashboard", icon: "metrics" },
  { label: t("nav.projects"), route: "projects", icon: "globe" },
  { label: t("nav.ranking"), route: "ranking", icon: "ranking" },
  { label: t("nav.voting"), route: "qr", icon: "qr" },
  { label: t("nav.finalists"), route: "finalists", icon: "trophy" },
];

const CODER_NO_TEAM_LINKS = () => [
  { label: t("nav.events"), route: "coderEventSelect", icon: "calendar" },
];

const CODER_TEAM_LINKS = () => [
  { label: t("nav.myProject"), route: "coderHome", icon: "globe" },
  { label: t("nav.teamsProjects"), route: "projects", icon: "bulb" },
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
    return eventId ? ADMIN_EVENT_LINKS() : ADMIN_BASE_LINKS();
  }

  if (role === "CODER") {
    if (!hasTeam) {
      console.log("CODER_NO_TEAM_LINKS:", CODER_NO_TEAM_LINKS());
      return CODER_NO_TEAM_LINKS();
    }
    return CODER_TEAM_LINKS();
  }

  if (["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"].includes(role)) {
    return TL_BASE_LINKS();
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
