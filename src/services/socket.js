import { io } from "socket.io-client";
import { getToken, getUser } from "../utils/auth.js";
import { toast } from "../components/Toast/index.js";
import {
  acceptInvitation,
  rejectInvitation,
  acceptJoinRequest,
  rejectJoinRequest,
} from "./api.js";

let socket = null;
let eventHandlers = {};

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "https://back-end-production-7f2c.up.railway.app";

export function initSocket() {
  const token = getToken();
  const user = getUser();
  
  if (!token) {
    return null;
  }

  if (!user || !user.id_user) {
    setTimeout(() => initSocket(), 500);
    return null;
  }

  // Already connected — nothing to do
  if (socket?.connected) {
    return socket;
  }

  // Socket exists and is actively trying to connect — don't create a new one
  if (socket?.active) {
    return socket;
  }

  // Clean up any existing disconnected socket before creating a new one
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    // Silent disconnect
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
  });

  setupEventListeners();

  return socket;
}

function setupEventListeners() {
  if (!socket) return;

  socket.on("invitation:new", (data) => {
    let toastId = null;
    toastId = toast.info(
      "New invitation",
      `${data.invitedByName} invited you to join "${data.teamName}"`,
      {
        duration: 0,
        dropdown: {
          items: [
            {
              title: data.teamName,
              subtitle: data.eventName || "Event",
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
              toast.success("Invitation accepted!", "You joined the team.");
              window.location.hash = "#/coder";
            } catch (err) {
              toast.error("Error", err?.message ?? "Could not accept the invitation.");
            }
          },
          onDeny: async (item) => {
            toast.remove(toastId);
            try {
              await rejectInvitation(item.id);
              toast.info("Invitation declined", "You rejected the invitation.");
            } catch (err) {
              toast.error("Error", err?.message ?? "Could not reject the invitation.");
            }
          },
        },
      },
    );

    if (eventHandlers["invitation:new"]) {
      eventHandlers["invitation:new"](data);
    }
  });

  socket.on("join_request:new", (data) => {
    let toastId = null;
    toastId = toast.info(
      "New join request",
      `${data.coderName} wants to join your team`,
      {
        duration: 0,
        dropdown: {
          items: [
            {
              title: data.coderName,
              subtitle: `Team: ${data.teamName}`,
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
              toast.success("Request accepted!", "The coder is now part of your team.");
            } catch (err) {
              if (eventHandlers["join_request:new:accept"]) {
                await eventHandlers["join_request:new:accept"](item);
              } else {
                toast.error("Error", err?.message ?? "Could not accept the request.");
              }
            }
          },
          onDeny: async (item) => {
            toast.remove(toastId);
            try {
              await rejectJoinRequest(item.id);
              toast.info("Request declined", "The request was rejected.");
            } catch (err) {
              if (eventHandlers["join_request:new:deny"]) {
                await eventHandlers["join_request:new:deny"](item);
              } else {
                toast.error("Error", err?.message ?? "Could not reject the request.");
              }
            }
          },
        },
      },
    );

    if (eventHandlers["join_request:new"]) {
      eventHandlers["join_request:new"](data);
    }
  });

  socket.on("invitation:accepted", (data) => {
    toast.success(
      "Invitation accepted",
      `${data.userName} joined your team "${data.teamName}"`,
      {
        duration: 5000,
      },
    );

    if (eventHandlers["invitation:accepted"]) {
      eventHandlers["invitation:accepted"](data);
    }
  });

  socket.on("invitation:rejected", (data) => {
    toast.info(
      "Invitation declined",
      `${data.userName} declined the invitation to "${data.teamName}"`,
      {
        duration: 5000,
      },
    );

    if (eventHandlers["invitation:rejected"]) {
      eventHandlers["invitation:rejected"](data);
    }
  });

  socket.on("join_request:accepted", (data) => {
    toast.success(
      "Request accepted!",
      `Your request to join "${data.teamName}" has been accepted!`,
      {
        duration: 5000,
        action: {
          label: "View team",
          onClick: () => {
            window.location.hash = "#/coder";
          },
          keepOpen: true,
        },
      },
    );

    if (eventHandlers["join_request:accepted"]) {
      eventHandlers["join_request:accepted"](data);
    }
  });

  socket.on("join_request:rejected", (data) => {
    toast.info(
      "Request declined",
      `Your request to join "${data.teamName}" was declined`,
      {
        duration: 5000,
      },
    );

    // Redirect to event selection after a short delay
    setTimeout(() => {
      window.location.hash = "#/coderEventSelect";
    }, 2000);

    if (eventHandlers["join_request:rejected"]) {
      eventHandlers["join_request:rejected"](data);
    }
  });

  socket.on("comment:new", (data) => {
    toast.info(
      "New comment",
      `${data.author_name || 'Someone'} commented on your project`,
      {
        duration: 5000,
      },
    );

    if (eventHandlers["comment:new"]) {
      eventHandlers["comment:new"](data);
    }
  });

  socket.on("team:member_removed", (data) => {
    toast.error(
      "Removed from team",
      `You have been removed from "${data.teamName}"`,
      {
        duration: 3000,
      },
    );

    // Redirect to event selection after delay
    setTimeout(() => {
      window.location.hash = "#/coderEventSelect";
      // Force reload to refresh team data
      setTimeout(() => window.location.reload(), 100);
    }, 2500);

    if (eventHandlers["team:member_removed"]) {
      eventHandlers["team:member_removed"](data);
    }
  });
}

export function on(event, callback) {
  eventHandlers[event] = callback;
}

export function off(event) {
  delete eventHandlers[event];
}

export function joinProject(projectId) {
  if (socket?.connected) {
    socket.emit("join_project", projectId);
  }
}

export function leaveProject(projectId) {
  if (socket?.connected) {
    socket.emit("leave_project", projectId);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  // Clear all view-level handlers so stale callbacks don't accumulate
  eventHandlers = {};
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
  disconnectSocket,
  getSocket,
};
