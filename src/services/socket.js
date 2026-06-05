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

let socket = null;
let eventHandlers = {};

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "https://backend-production-2nd.up.railway.app";

export function initSocket() {
  const token = getToken();
  const user = getUser();

  if (!token) return null;

  if (!user || !user.id_user) {
    setTimeout(() => initSocket(), 500);
    return null;
  }

  if (socket?.connected) return socket;
  if (socket?.active) return socket;

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

  socket.on("connect", () => console.log("[Socket] Connected:", socket.id));
  socket.on("disconnect", () => {});
  socket.on("connect_error", (error) =>
    console.error("[Socket] Connection error:", error.message),
  );

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
    if (eventHandlers["invitation:new"]) eventHandlers["invitation:new"](data);
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
              if (eventHandlers["join_request:new:accept"]) {
                await eventHandlers["join_request:new:accept"](item);
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
              if (eventHandlers["join_request:new:deny"]) {
                await eventHandlers["join_request:new:deny"](item);
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
    if (eventHandlers["join_request:new"])
      eventHandlers["join_request:new"](data);
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
    if (eventHandlers["invitation:accepted"])
      eventHandlers["invitation:accepted"](data);
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
    if (eventHandlers["invitation:rejected"])
      eventHandlers["invitation:rejected"](data);
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
    if (eventHandlers["join_request:accepted"])
      eventHandlers["join_request:accepted"](data);
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
    if (eventHandlers["join_request:rejected"])
      eventHandlers["join_request:rejected"](data);
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
    if (eventHandlers["comment:new"]) eventHandlers["comment:new"](data);
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
    if (eventHandlers["team:member_removed"])
      eventHandlers["team:member_removed"](data);
  });

  // vote:new
  socket.on("vote:new", (data) => {
    console.log("[Socket] vote:new received:", data);
    if (eventHandlers["vote:new"]) eventHandlers["vote:new"](data);
  });
}

export function on(event, callback) {
  eventHandlers[event] = callback;
}
export function off(event) {
  delete eventHandlers[event];
}
export function joinProject(projectId) {
  if (socket?.connected) socket.emit("join_project", projectId);
}
export function leaveProject(projectId) {
  if (socket?.connected) socket.emit("leave_project", projectId);
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
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
