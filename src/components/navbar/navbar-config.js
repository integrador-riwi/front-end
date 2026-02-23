import { icons } from "../../utils/icons.js";


const TL_BASE_LINKS = [
  { label: "Dashboard",         route: "dashboard",      icon: "calendar" },
  { label: "Projects to Grade", route: "evaluations",    icon: "edit" },
  { label: "My Evaluations",    route: "my-evaluations", icon: "check" },
  { label: "Teams & Projects",  route: "projects",       icon: "globe" },
  { label: "Events",            route: "events",         icon: "calendar" },
];

export const NAV_LINKS_BY_ROLE = {
  ADMIN: [
    { label: "Events",            route: "events",        icon: "calendar" },
    { label: "Create Event",      route: "events/create", icon: "plus" },
    { label: "Teams & Projects",  route: "projects",      icon: "globe" },
    { label: "Rubrics",           route: "rubrics",       icon: "bulb" },
    { label: "Evaluation Rules",  route: "rules",         icon: "settings" },
    { label: "Ranking",           route: "ranking",       icon: "ranking" },
    { label: "QR Voting",         route: "qr",            icon: "qr" },
    { label: "Finalists & Votes", route: "finalists",     icon: "trophy" },
  ],
  TL_DEVELOPMENT: TL_BASE_LINKS,
  TL_SOFT_SKILLS: TL_BASE_LINKS,
  TL_ENGLISH:     TL_BASE_LINKS,
  CODER: [
    { label: "My Project",   route: "coderHome",   icon: "globe" },
    { label: "My Grades",    route: "my-grades",    icon: "bulb" },
    { label: "Events",       route: "events",       icon: "calendar" },
    { label: "Project Settings",  route: "projectSettings",       icon: "calendar" },
  ],
  STAFF: [
    { label: "Dashboard",        route: "dashboard",     icon: "calendar" },
    { label: "Events",           route: "events",        icon: "calendar" },
    { label: "Teams & Projects", route: "projects",      icon: "globe" },
    { label: "Final Results",    route: "final-results", icon: "trophy" },
  ],
};

export const ROLE_LABELS = {
  ADMIN:          "Admin Manager",
  TL_DEVELOPMENT: "Dev Team Leader",
  TL_SOFT_SKILLS: "Soft Skills TL",
  TL_ENGLISH:     "English TL",
  CODER:          "Coder",
  STAFF:          "Staff",
};

export const getNavLinks = (role) => {
  return NAV_LINKS_BY_ROLE[role] ?? [];
};

export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] ?? "User";
};

export const getIcon = (iconName) => {
  return icons[iconName]?.();
};