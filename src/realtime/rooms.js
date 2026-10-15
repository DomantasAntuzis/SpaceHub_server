const { Room } = require("../models");
const presence = require("./presence");

const channel = (roomId) => `room:${roomId}`;

// Socket.io room presence: room:join / room:leave in, room:members / user:joined / user:left out
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

    socket.on("room:join", async ({ roomId } = {}, ack) => {
      try {
        const id = Number(roomId);
        if (!Number.isInteger(id) || !(await Room.findByPk(id))) {
          return ack?.({ ok: false, msg: "Room not found" });
        }
        if (socket.data.roomId === id) {
          return ack?.({ ok: true });
        }
        await leave();

        socket.data.roomId = id;
        socket.join(channel(id));
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

    socket.on("room:leave", leave);
    socket.on("disconnect", leave);
  });
}

module.exports = { registerRoomHandlers };
