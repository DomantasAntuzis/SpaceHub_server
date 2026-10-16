const { Room } = require("../models");
const presence = require("./presence");
const admission = require("./admission");
const { isSocketBlocked, recordSocketMiss } = require("../utils/rateLimiter");

const channel = (roomId) => `room:${roomId}`;
const hostChannel = (roomId) => `host:${roomId}`;

// Socket.io room events.
// In:  room:join {slug, invite}, room:leave, room:knock {slug}, room:admit / room:deny {slug, userId}
// Out: room:members, user:joined, user:left, room:knock-request, room:knock-cancel, room:pending,
//      room:admitted, room:denied
function registerRoomHandlers(io) {
  // Sockets share the express session; reject those without a user
  io.use((socket, next) => {
    const user = socket.request.session?.user;
    if (!user) {
      return next(new Error("unauthorized"));
    }
    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const ip = socket.handshake.address;

    // Finds a room by slug; unknown slugs count against the per-IP guessing budget
    async function findRoom(slug) {
      if (await isSocketBlocked(ip)) {
        return { error: "Too many attempts, try again later" };
      }
      const room = typeof slug === "string" ? await Room.findOne({ where: { slug } }) : null;
      if (!room) {
        await recordSocketMiss(ip);
        return { error: "Room not found" };
      }
      return { room };
    }

    async function leave() {
      const roomId = socket.data.roomId;
      if (!roomId) {
        return;
      }
      socket.data.roomId = null;
      socket.leave(channel(roomId));
      try {
        if (await presence.removeSocket(roomId, user)) {
          io.to(channel(roomId)).emit("user:left", presence.toMember(user));
          io.to(channel(roomId)).emit("room:members", await presence.getMembers(roomId));
        }
      } catch (error) {
        console.error(error);
      }
    }

    // Drops this socket's pending knock and tells the host it was withdrawn
    async function cancelKnock() {
      const roomId = socket.data.knockRoomId;
      if (!roomId) {
        return;
      }
      socket.data.knockRoomId = null;
      try {
        if (await admission.removePending(roomId, user)) {
          io.to(hostChannel(roomId)).emit("room:knock-cancel", presence.toMember(user));
        }
      } catch (error) {
        console.error(error);
      }
    }

    socket.on("room:join", async ({ slug, invite } = {}, ack) => {
      try {
        const { room, error } = await findRoom(slug);
        if (!room) {
          return ack?.({ ok: false, msg: error });
        }
        if (!(await admission.canEnter(room, user, invite))) {
          return ack?.({ ok: false, code: "needs_approval" });
        }
        if (socket.data.roomId === room.id) {
          return ack?.({ ok: true });
        }
        await leave();

        const id = room.id;
        socket.data.roomId = id;
        socket.join(channel(id));
        if (room.isHostedBy(user)) {
          socket.join(hostChannel(id));
          socket.emit("room:pending", await admission.getPending(id));
        }
        const isNew = await presence.addSocket(id, user);

        socket.emit("room:members", await presence.getMembers(id));
        if (isNew) {
          socket.to(channel(id)).emit("user:joined", presence.toMember(user));
          socket.to(channel(id)).emit("room:members", await presence.getMembers(id));
        }
        ack?.({ ok: true });
      } catch (error) {
        console.error(error);
        ack?.({ ok: false, msg: "Failed to join room" });
      }
    });

    // A visitor without access asks the host to let them in
    socket.on("room:knock", async ({ slug } = {}, ack) => {
      try {
        const { room, error } = await findRoom(slug);
        if (!room) {
          return ack?.({ ok: false, msg: error });
        }
        if (await admission.canEnter(room, user)) {
          return ack?.({ ok: true, admitted: true });
        }
        await cancelKnock();
        socket.data.knockRoomId = room.id;
        await admission.addPending(room.id, user, socket.id);
        io.to(hostChannel(room.id)).emit("room:knock-request", presence.toMember(user));
        ack?.({ ok: true });
      } catch (error) {
        console.error(error);
        ack?.({ ok: false, msg: "Failed to request access" });
      }
    });

    // Host answers a knock; `allow` picks admit vs deny
    function answerKnock(event, allow) {
      socket.on(event, async ({ slug, userId } = {}, ack) => {
        try {
          const { room, error } = await findRoom(slug);
          if (!room) {
            return ack?.({ ok: false, msg: error });
          }
          if (!room.isHostedBy(user)) {
            return ack?.({ ok: false, msg: "Only the host can do that" });
          }
          const pending = await admission.takePending(room.id, String(userId));
          if (!pending) {
            return ack?.({ ok: false, msg: "No such request" });
          }
          if (allow) {
            await admission.admit(room.id, pending.field);
          }
          io.to(pending.socketId).emit(allow ? "room:admitted" : "room:denied");
          // Keep every host tab's request list in sync
          io.to(hostChannel(room.id)).emit("room:knock-cancel", pending.member);
          ack?.({ ok: true });
        } catch (error) {
          console.error(error);
          ack?.({ ok: false, msg: "Failed to answer request" });
        }
      });
    }
    answerKnock("room:admit", true);
    answerKnock("room:deny", false);

    socket.on("room:leave", () => Promise.all([leave(), cancelKnock()]));
    socket.on("disconnect", () => Promise.all([leave(), cancelKnock()]));
  });
}

module.exports = { registerRoomHandlers };
