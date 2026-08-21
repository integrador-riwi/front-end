import { io } from "socket.io-client";
import { getToken, getUser } from "../utils/auth.js";
import { toast } from "../components/Toast/index.js";
import { t } from "../utils/i18n.js";
import {
  acceptInvitation,
  rejectInvitation,
  acceptJoinRequest,
  rejectJoinRequest,
} from "./api.js";
import { normalizeServiceUrl } from "./url.js";

let socket = null;
const eventHandlers = new Map();
let isDegraded = false;

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL;
  if (envUrl) {
    return normalizeServiceUrl(envUrl).replace(/\/api\/?$/, "");
  }
  return "https://backend-production-2nd.up.railway.app";
};

const SOCKET_URL = getSocketUrl();

const emitToHandlers = (event, data) => {
  const handlers = eventHandlers.get(event);
  if (handlers) {
    handlers.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[Socket] Error in handler for event "${event}":`, err);
      }
    });
  }
};

export function initSocket() {
  const token = getToken();
  const user = getUser();

  if (!user || !user.id_user) {
    return null;
  }

  if (socket?.connected || socket?.active) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  isDegraded = false;

  socket = io(SOCKET_URL, {
    ...(token ? { auth: { token } } : {}),
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
    isDegraded = false;
    emitToHandlers("connection:status", { status: "connected", socketId: socket.id });
  });

  socket.on("disconnect", (reason) => {
    console.warn("[Socket] Disconnected:", reason);
    emitToHandlers("connection:status", { status: "disconnected", reason });
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
    emitToHandlers("connection:error", { message: error.message });
  });

  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`[Socket] Reconnection attempt #${attempt}`);
    emitToHandlers("connection:status", { status: "reconnecting", attempt });
  });

  socket.io.on("reconnect_failed", () => {
    console.error("[Socket] Reconnection failed after max attempts. Entering degraded mode.");
    isDegraded = true;
    emitToHandlers("connection:degraded", { degraded: true });
    toast.warn(
      t("common.errorTitle") || "Conexión en Tiempo Real",
      "Actualizaciones por WebSocket no disponibles. Se utilizará polling de respaldo.",
      { duration: 6000 }
    );
  });

  setupEventListeners();
  return socket;
}

function setupEventListeners() {
  if (!socket) return;

  // invitation:new
  socket.on("invitation:new", (data) => {
    let toastId = null;
    toastId = toast.info(
      t("invite.newInvitation"),
      t("invite.newInvitationMsg", {
        name: data.invitedByName,
        team: data.teamName,
      }),
      {
        duration: 0,
        dropdown: {
          items: [
            {
              title: data.teamName,
              subtitle: data.eventName || t("common.event"),
              accept: true,
              deny: true,
              id: data.id,
              teamId: data.teamId,
            },
          ],
          onAccept: async (item) => {
            toast.remove(toastId);
            try {
              await acceptInvitation(item.id);
              toast.success(
                t("invite.invitationAcceptedTitle"),
                t("invite.invitationAcceptedMsg"),
              );
              window.location.hash = "#/coder";
            } catch (err) {
              toast.error(
                t("common.errorTitle"),
                err?.message ?? t("invite.errorAcceptInvitation"),
              );
            }
          },
          onDeny: async (item) => {
            toast.remove(toastId);
            try {
              await rejectInvitation(item.id);
              toast.info(
                t("invite.invitationDeclinedTitle"),
                t("invite.invitationDeclinedMsg"),
              );
            } catch (err) {
              toast.error(
                t("common.errorTitle"),
                err?.message ?? t("invite.errorRejectInvitation"),
              );
            }
          },
        },
      },
    );
    emitToHandlers("invitation:new", data);
  });

  // join_request:new
  socket.on("join_request:new", (data) => {
    let toastId = null;
    toastId = toast.info(
      t("invite.newJoinRequestTitle"),
      t("invite.newJoinRequestMsg", { name: data.coderName }),
      {
        duration: 0,
        dropdown: {
          items: [
            {
              title: data.coderName,
              subtitle: t("invite.joinRequestSubtitle", {
                team: data.teamName,
              }),
              accept: true,
              deny: true,
              id: data.id,
              teamId: data.teamId,
            },
          ],
          onAccept: async (item) => {
            toast.remove(toastId);
            try {
              await acceptJoinRequest(item.id);
              toast.success(
                t("invite.requestAcceptedTitle"),
                t("invite.requestAcceptedMsg"),
              );
            } catch (err) {
              const handlers = eventHandlers.get("join_request:new:accept");
              if (handlers && handlers.size > 0) {
                handlers.forEach((fn) => fn(item));
              } else {
                toast.error(
                  t("common.errorTitle"),
                  err?.message ?? t("invite.errorAcceptRequest"),
                );
              }
            }
          },
          onDeny: async (item) => {
            toast.remove(toastId);
            try {
              await rejectJoinRequest(item.id);
              toast.info(
                t("invite.requestDeclinedTitle"),
                t("invite.requestDeclinedMsg", { team: data.teamName }),
              );
            } catch (err) {
              const handlers = eventHandlers.get("join_request:new:deny");
              if (handlers && handlers.size > 0) {
                handlers.forEach((fn) => fn(item));
              } else {
                toast.error(
                  t("common.errorTitle"),
                  err?.message ?? t("invite.errorRejectRequest"),
                );
              }
            }
          },
        },
      },
    );
    emitToHandlers("join_request:new", data);
  });

  // invitation:accepted
  socket.on("invitation:accepted", (data) => {
    toast.success(
      t("invite.invitationAcceptedByTitle"),
      t("invite.invitationAcceptedByMsg", {
        name: data.userName,
        team: data.teamName,
      }),
      { duration: 5000 },
    );
    emitToHandlers("invitation:accepted", data);
  });

  // invitation:rejected
  socket.on("invitation:rejected", (data) => {
    toast.info(
      t("invite.invitationRejectedByTitle"),
      t("invite.invitationRejectedByMsg", {
        name: data.userName,
        team: data.teamName,
      }),
      { duration: 5000 },
    );
    emitToHandlers("invitation:rejected", data);
  });

  // join_request:accepted
  socket.on("join_request:accepted", (data) => {
    toast.success(
      t("invite.requestAcceptedNotifyTitle"),
      t("invite.requestAcceptedNotifyMsg", { team: data.teamName }),
      {
        duration: 5000,
        action: {
          label: t("invite.viewTeam"),
          onClick: () => {
            window.location.hash = "#/coder";
          },
          keepOpen: true,
        },
      },
    );
    emitToHandlers("join_request:accepted", data);
  });

  // join_request:rejected
  socket.on("join_request:rejected", (data) => {
    toast.info(
      t("invite.requestDeclinedTitle"),
      t("invite.requestDeclinedMsg", { team: data.teamName }),
      { duration: 5000 },
    );
    setTimeout(() => {
      window.location.hash = "#/coderEventSelect";
    }, 2000);
    emitToHandlers("join_request:rejected", data);
  });

  // comment:new
  socket.on("comment:new", (data) => {
    toast.info(
      t("common.newCommentTitle"),
      t("common.newCommentMsg", {
        name: data.author_name || t("common.someone"),
      }),
      { duration: 5000 },
    );
    emitToHandlers("comment:new", data);
  });

  // team:member_removed
  socket.on("team:member_removed", (data) => {
    toast.error(
      t("common.removedFromTeamTitle"),
      t("common.removedFromTeamMsg", { team: data.teamName }),
      { duration: 3000 },
    );
    setTimeout(() => {
      window.location.hash = "#/coderEventSelect";
      setTimeout(() => window.location.reload(), 100);
    }, 2500);
    emitToHandlers("team:member_removed", data);
  });

  // vote:new
  socket.on("vote:new", (data) => {
    console.log("[Socket] vote:new received:", data);
    emitToHandlers("vote:new", data);
  });
}

export function on(event, callback) {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event).add(callback);

  return () => off(event, callback);
}

export function off(event, callback) {
  if (!callback) {
    eventHandlers.delete(event);
  } else if (eventHandlers.has(event)) {
    eventHandlers.get(event).delete(callback);
    if (eventHandlers.get(event).size === 0) {
      eventHandlers.delete(event);
    }
  }
}

export function joinProject(projectId) {
  if (socket?.connected) socket.emit("join_project", projectId);
}

export function leaveProject(projectId) {
  if (socket?.connected) socket.emit("leave_project", projectId);
}

export function joinEvent(eventId) {
  if (socket?.connected) socket.emit("join_event", eventId);
}

export function leaveEvent(eventId) {
  if (socket?.connected) socket.emit("leave_event", eventId);
}

export function retryConnection() {
  if (socket) {
    socket.connect();
  } else {
    initSocket();
  }
}

export function isSocketDegraded() {
  return isDegraded;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  eventHandlers.clear();
  isDegraded = false;
}

export function getSocket() {
  return socket;
}

export default {
  initSocket,
  on,
  off,
  joinProject,
  leaveProject,
  joinEvent,
  leaveEvent,
  retryConnection,
  isSocketDegraded,
  disconnectSocket,
  getSocket,
};
