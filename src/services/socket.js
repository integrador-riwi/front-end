import { io } from "socket.io-client";
import { getToken } from "../utils/auth.js";
import { toast } from "../components/Toast/index.js";

let socket = null;
let eventHandlers = {};

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "https://back-end-production-7f2c.up.railway.app";

export function initSocket() {
  const token = getToken();
  if (!token) {
    console.warn("[Socket] No token found, skipping connection");
    return null;
  }

  if (socket?.connected) {
    console.log("[Socket] Already connected");
    return socket;
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
    console.log("[Socket] Disconnected:", reason);
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
    console.log("[Socket] New invitation:", data);

    toast.info(
      "New invitation",
      `You have been invited to join "${data.teamName}"`,
      {
        duration: 0,
        action: {
          label: "View",
          onClick: () => {
            window.location.hash = "#/coder";
          },
          keepOpen: true,
        },
      },
    );

    if (eventHandlers["invitation:new"]) {
      eventHandlers["invitation:new"](data);
    }
  });

  socket.on("join_request:new", (data) => {
    console.log("[Socket] New join request:", data);

    toast.info(
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
            if (eventHandlers["join_request:new:accept"]) {
              await eventHandlers["join_request:new:accept"](item);
            }
          },
          onDeny: async (item) => {
            if (eventHandlers["join_request:new:deny"]) {
              await eventHandlers["join_request:new:deny"](item);
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
    console.log("[Socket] Invitation accepted:", data);

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
    console.log("[Socket] Invitation rejected:", data);

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
    console.log("[Socket] Join request accepted:", data);

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
    console.log("[Socket] Join request rejected:", data);

    toast.info(
      "Request declined",
      `Your request to join "${data.teamName}" was declined`,
      {
        duration: 5000,
      },
    );

    if (eventHandlers["join_request:rejected"]) {
      eventHandlers["join_request:rejected"](data);
    }
  });
}

export function on(event, callback) {
  eventHandlers[event] = callback;
}

export function off(event) {
  delete eventHandlers[event];
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export default {
  initSocket,
  on,
  off,
  disconnectSocket,
  getSocket,
};
