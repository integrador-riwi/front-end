import i18next from "i18next";

const STORAGE_KEY = "teamup_lang";

const resources = {
  es: {
    translation: {
      // ── Navbar ────────────────────────────────────────────
      nav: {
        signOut: "Cerrar sesión",
        langToggle: "EN",
        langLabel: "Cambiar a inglés",
        events: "Eventos",
        newEvent: "Nuevo evento",
        backToEvents: "Volver a Eventos",
        metrics: "Métricas",
        projects: "Proyectos",
        ranking: "Ranking",
        voting: "Votación",
        finalists: "Finalistas",
        myProject: "Mi Proyecto",
        teamsProjects: "Equipos & Proyectos",
        dashboard: "Panel",
        finalResults: "Resultados Finales",
      },

      // ── Roles ─────────────────────────────────────────────
      role: {
        ADMIN: "Admin Manager",
        TL_DEVELOPMENT: "Líder Dev",
        TL_SOFT_SKILLS: "Líder Soft Skills",
        TL_ENGLISH: "Líder Inglés",
        CODER: "Coder",
        STAFF: "Staff",
      },

      // ── Login ─────────────────────────────────────────────
      login: {
        tagline: "Colabora. Crece. Triunfa.",
        collaborate: "Colaborar",
        track: "Seguir Progreso",
        grow: "Crecer Juntos",
        welcome: "Bienvenido de nuevo",
        title: "Inicia sesión en tu cuenta",
        subtitle: "Ingresa tus credenciales para continuar.",
        email: "Correo electrónico",
        password: "Contraseña",
        forgot: "¿Olvidaste tu contraseña?",
        submit: "Iniciar sesión",
      },

      // ── Events ────────────────────────────────────────────
      events: {
        title: "Eventos Próximos",
        subtitle:
          "Descubre y sigue los proyectos integradores y eventos activos.",
        inProgress: "En Progreso",
        past: "Eventos Pasados",
        noEvents: "No hay eventos próximos",
        noEventsMsg: "Vuelve más tarde para ver nuevos eventos.",
        noEventsFound: "No se encontraron eventos.",
        ends: "Termina:",
        details: "Detalles",
        finalists: "Finalistas",
        loading: "Cargando...",
        error: "Error al cargar los eventos. Intenta de nuevo.",
        tbd: "Por definir",
      },

      // ── Dashboard ─────────────────────────────────────────
      dashboard: {
        teams: "Equipos",
        projects: "Proyectos",
        coders: "Coders",
        votes: "Votos",
        evaluated: "Evaluados",
        areas: "Áreas",
        loading: "Cargando métricas...",
      },

      // ── Ranking ───────────────────────────────────────────
      ranking: {
        title: "Ranking Final",
        status: "Estado del ranking",
        calculated: "Calculado:",
        points: "puntos",
        score: "Puntaje",
        areas: "áreas",
        warnPublish: "¿Publicar con evaluaciones incompletas?",
        cancel: "Cancelar",
        noEvent: "No hay evento seleccionado.",
        deadlinePassed: "Plazo de entrega pasado",
        recalculate: "Recalcular ranking",
        publish: "Publicar ranking",
        notPublished: "El ranking aún no ha sido publicado.",
        notAvailable: "El ranking no está disponible aún.",
      },

      // ── Coder Event Select ────────────────────────────────
      ces: {
        title: "Elige tu evento.",
        subtitleTL: "Selecciona el evento que quieres revisar y evaluar.",
        subtitleCoder:
          "Selecciona el evento en el que participas para comenzar.",
        noEvents: "No hay eventos activos en este momento.",
        loading: "Cargando eventos...",
        error: "No se pudieron cargar los eventos. Intenta de nuevo.",
        select: "Seleccionar",
      },

      // ── Coder No-Team ─────────────────────────────────────
      noTeam: {
        heading: "Encuentra tu equipo.",
        createTitle: "Crear un Nuevo Equipo",
        joinTitle: "Unirse a un Equipo",
        teamName: "Nombre del equipo",
        projectDesc: "Descripción del proyecto",
        available: "Disponibles",
        all: "Todos",
        noDesc: "Sin descripción de proyecto aún.",
        ledBy: "Líder: ",
        slotsLeft: "lugar(es) disponible(s)",
      },

      // ── Coder Team ────────────────────────────────────────
      team: {
        dueDate: "Fecha límite",
        repoLink: "Enlace del repositorio",
        noLink: "Sin enlace",
        team: "Equipo",
        activity: "Actividad",
        deliverables: "Entregables",
        submitted: "Proyecto enviado — en revisión",
        postComment: "Publicar comentario",
        settings: "Info & Ajustes del Proyecto",
        evaluate: "Evaluar Equipo",
        open: "Abrir",
      },

      // ── Invitations ───────────────────────────────────────
      invite: {
        accept: "Aceptar",
        reject: "Rechazar",
        cancel: "Cancelar",
      },

      // ── Project Settings ──────────────────────────────────
      settings: {
        title: "Ajustes del Proyecto",
        name: "Nombre del Proyecto",
        nameHint: "El nombre del proyecto no se puede editar.",
        desc: "Descripción",
        repo: "URL del Repositorio",
        dangerZone: "Zona de Peligro",
        deleteHint: "Elimina permanentemente este equipo y todos sus datos.",
        deleteTeam: "Eliminar Equipo",
        members: "Miembros actuales",
        manageMembers: "Gestiona los miembros y sus roles.",
      },

      // ── Profile ───────────────────────────────────────────
      profile: {
        email: "Correo",
        github: "GitHub",
        notConnected: "No conectado",
        githubConnected: "Conectado",
        githubExpired: "Conexión expirada",
        edit: "Editar tu perfil",
        description: "Descripción",
        clan: "Clan",
        clanHint: "El clan es asignado por un administrador.",
        loading: "Cargando...",
        savedOk: "Perfil actualizado correctamente.",
        loadError: "No se pudo cargar el perfil.",
      },

      // ── TL Dashboard ──────────────────────────────────────
      tl: {
        teams: "Equipos",
        withProject: "Con Proyecto",
        coders: "Coders",
        ready: "Listo",
        noProject: "Sin proyecto aún",
        noDeliverables: "Sin entregables",
        noEventSelected: "No hay evento seleccionado.",
        loadError: "No se pudieron cargar los equipos.",
        submittedReview: "Enviado para revisión",
        allDeliverables: "Todos los entregables enviados",
        areaDev: "Desarrollo",
        areaSoft: "Soft Skills",
        areaEnglish: "Inglés",
        areaAdmin: "Admin",
      },

      // ── Teams & Projects ──────────────────────────────────
      teamsProjects: {
        clan: "Clan",
        project: "Proyecto",
        desc: "Descripción",
        team: "Equipo",
      },

      // ── Create Event ──────────────────────────────────────
      createEvent: {
        title: "Detalles del Evento",
        draftMode: "Modo Borrador",
        eventTitle: "Título *",
        desc: "Descripción",
        type: "Tipo",
        capstone: "Capstone / Integrador",
        workshop: "Taller",
        social: "Evento Social",
        route: "Ruta",
        basic: "Básica",
        advanced: "Avanzada",
        cohort: "Cohorte",
        startDate: "Fecha inicio *",
        rubric: "Rúbrica",
        rubricName: "Nombre *",
        rubricWeight: "Peso (0–1) *",
        rubricDesc: "Descripción (opcional)",
        rubricGrades: "Opciones de calificación *",
        noRubrics: "Sin rúbricas. Agrega al menos una.",
      },

      // ── Event Details ─────────────────────────────────────
      eventDetails: {
        completed: "● Completado",
        upcoming: "● Próximo",
        inProgress: "● En Progreso",
        edit: "Editar Evento",
        dateTime: "Fecha y Hora",
        type: "Tipo de Evento",
        cohort: "Cohorte",
        route: "Ruta",
        loading: "Cargando...",
      },

      common: {
        loading: "Cargando...",
        error: "Ocurrió un error. Intenta de nuevo.",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        edit: "Editar",
        back: "Volver",
        home: "Inicio",
        noDescription: "Sin descripción.",
        team: "Equipo",
        event: "Evento",
      },
    },
  },

  en: {
    translation: {
      nav: {
        signOut: "Sign out",
        langToggle: "ES",
        langLabel: "Switch to Spanish",
        events: "Events",
        newEvent: "New Event",
        backToEvents: "Back to Events",
        metrics: "Metrics",
        projects: "Projects",
        ranking: "Ranking",
        voting: "Voting",
        finalists: "Finalists",
        myProject: "My Project",
        teamsProjects: "Teams & Projects",
        dashboard: "Dashboard",
        finalResults: "Final Results",
      },

      role: {
        ADMIN: "Admin Manager",
        TL_DEVELOPMENT: "Dev Team Leader",
        TL_SOFT_SKILLS: "Soft Skills TL",
        TL_ENGLISH: "English TL",
        CODER: "Coder",
        STAFF: "Staff",
      },

      login: {
        tagline: "Collaborate. Grow. Succeed.",
        collaborate: "Collaborate",
        track: "Track Progress",
        grow: "Grow Together",
        welcome: "Welcome back",
        title: "Sign in to your account",
        subtitle: "Enter your credentials to continue.",
        email: "Email Address",
        password: "Password",
        forgot: "Forgot password?",
        submit: "Sign in",
      },

      events: {
        title: "Upcoming Events",
        subtitle:
          "Discover and track ongoing and past project capstones and events.",
        inProgress: "In Progress",
        past: "Past Events",
        noEvents: "No upcoming events",
        noEventsMsg: "Check back later for new events.",
        noEventsFound: "No events found.",
        ends: "Ends:",
        details: "Details",
        finalists: "Finalists",
        loading: "Loading...",
        error: "Error loading events. Please try again later.",
        tbd: "TBD",
      },

      dashboard: {
        teams: "Teams",
        projects: "Projects",
        coders: "Coders",
        votes: "Votes",
        evaluated: "Evaluated",
        areas: "Areas",
        loading: "Loading metrics...",
      },

      ranking: {
        title: "Final Ranking",
        status: "Ranking status",
        calculated: "Calculated:",
        points: "points",
        score: "Score",
        areas: "areas",
        warnPublish: "Publish with incomplete evaluations?",
        cancel: "Cancel",
        noEvent: "No event selected.",
        deadlinePassed: "Delivery deadline passed",
        recalculate: "Recalculate ranking",
        publish: "Publish ranking",
        notPublished: "The ranking has not been published yet.",
        notAvailable: "The ranking is not available yet.",
      },

      ces: {
        title: "Choose your event.",
        subtitleTL: "Select the event you want to review and evaluate.",
        subtitleCoder:
          "Select the event you're participating in to get started.",
        noEvents: "No active events at this time.",
        loading: "Loading events...",
        error: "Could not load events. Please try again.",
        select: "Select",
      },

      noTeam: {
        heading: "Find your squad.",
        createTitle: "Start a New Team",
        joinTitle: "Join an Existing Team",
        teamName: "Team Name",
        projectDesc: "Project Description",
        available: "Available",
        all: "All",
        noDesc: "No project description yet.",
        ledBy: "Led by ",
        slotsLeft: "left",
      },

      team: {
        dueDate: "Due Date",
        repoLink: "Repo Link",
        noLink: "No link",
        team: "Team",
        activity: "Activity",
        deliverables: "Deliverables",
        submitted: "Project submitted — under review",
        postComment: "Post Comment",
        settings: "Project Info & Settings",
        evaluate: "Evaluate Team",
        open: "Open",
      },

      invite: {
        accept: "Accept",
        reject: "Reject",
        cancel: "Cancel",
      },

      settings: {
        title: "Project Settings",
        name: "Project Name",
        nameHint: "The project name cannot be edited.",
        desc: "Description",
        repo: "Repository URL",
        dangerZone: "Danger Zone",
        deleteHint: "Permanently delete this team and all its data.",
        deleteTeam: "Delete Team",
        members: "Current Members",
        manageMembers: "Manage members and roles.",
      },

      profile: {
        email: "Email",
        github: "GitHub",
        notConnected: "Not connected",
        githubConnected: "Connected",
        githubExpired: "Expired connection",
        edit: "Edit your profile",
        description: "Description",
        clan: "Clan",
        clanHint: "The clan is assigned by an administrator.",
        loading: "Loading...",
        savedOk: "Profile updated correctly.",
        loadError: "Profile could not be loaded.",
      },

      tl: {
        teams: "Teams",
        withProject: "With Project",
        coders: "Coders",
        ready: "Ready",
        noProject: "No project yet",
        noDeliverables: "No deliverables",
        noEventSelected: "No event selected.",
        loadError: "Could not load teams.",
        submittedReview: "Submitted for review",
        allDeliverables: "All deliverables submitted",
        areaDev: "Development",
        areaSoft: "Soft Skills",
        areaEnglish: "English",
        areaAdmin: "Admin",
      },

      teamsProjects: {
        clan: "Clan",
        project: "Project",
        desc: "Description",
        team: "Team",
      },

      createEvent: {
        title: "Event Details",
        draftMode: "Draft Mode",
        eventTitle: "Title *",
        desc: "Description",
        type: "Type",
        capstone: "Capstone / Integrator",
        workshop: "Workshop",
        social: "Social Event",
        route: "Route",
        basic: "Basic",
        advanced: "Advanced",
        cohort: "Cohort",
        startDate: "Start date *",
        rubric: "Rubric",
        rubricName: "Name *",
        rubricWeight: "Weight (0–1) *",
        rubricDesc: "Description (optional)",
        rubricGrades: "Grading options *",
        noRubrics: "No rubrics. Add at least one.",
      },

      eventDetails: {
        completed: "● Completed",
        upcoming: "● Upcoming",
        inProgress: "● In Progress",
        edit: "Edit Event",
        dateTime: "Date & Time",
        type: "Event Type",
        cohort: "Cohort",
        route: "Route",
        loading: "Loading...",
      },

      common: {
        loading: "Loading...",
        error: "Something went wrong. Please try again.",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        back: "Back",
        home: "Home",
        noDescription: "No description provided.",
        team: "Team",
        event: "Event",
      },
    },
  },
};

// ── Init i18next ───────────────────────────────────────────────
export const i18nReady = i18next.init({
  lng: localStorage.getItem(STORAGE_KEY) || "en",
  fallbackLng: "en",
  resources,
  interpolation: { escapeValue: false },
});

export const t = (key, opts) => i18next.t(key, opts);

export const getLang = () => i18next.language;

export async function setLang(lang) {
  await i18next.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
}

export function toggleLang() {
  return setLang(i18next.language === "en" ? "es" : "en");
}

export function onLangChange(fn) {
  i18next.on("languageChanged", fn);
  return () => i18next.off("languageChanged", fn);
}

i18nReady.then(() => {
  document.documentElement.lang = i18next.language;
});
