const redis = require("../config/redis");
const { userKey, toMember } = require("./presence");

const admittedKey = (roomId) => `room:${roomId}:admitted`;
const pendingKey = (roomId) => `room:${roomId}:pending`;
const ADMITTED_TTL_S = 24 * 60 * 60;

// Whether the user may be in the room: host, previously admitted, or holding a valid invite token.
// A valid invite also records the user as admitted so reconnects don't need the token again.
async function canEnter(room, user, invite) {
  if (room.isHostedBy(user)) {
    return true;
  }
  if (await redis.sIsMember(admittedKey(room.id), userKey(user))) {
    return true;
  }
  if (room.hasInviteToken(invite)) {
    await admit(room.id, userKey(user));
    return true;
  }
  return false;
}

// key is a presence userKey ("u:<id>" / "g:<guestId>")
async function admit(roomId, key) {
  await redis.sAdd(admittedKey(roomId), key);
  await redis.expire(admittedKey(roomId), ADMITTED_TTL_S);
}

// Records a knock; the socket id lets the host's answer reach the knocker
async function addPending(roomId, user, socketId) {
  await redis.hSet(pendingKey(roomId), userKey(user), JSON.stringify({ member: toMember(user), socketId }));
}

// Removes and returns the pending knock for a member id (as sent in toMember), or null if there is none
async function takePending(roomId, memberId) {
  for (const field of [`u:${memberId}`, `g:${memberId}`]) {
    const raw = await redis.hGet(pendingKey(roomId), field);
    if (raw) {
      await redis.hDel(pendingKey(roomId), field);
      return { field, ...JSON.parse(raw) };
    }
  }
  return null;
}

async function removePending(roomId, user) {
  return (await redis.hDel(pendingKey(roomId), userKey(user))) > 0;
}

async function getPending(roomId) {
  const all = await redis.hGetAll(pendingKey(roomId));
  return Object.values(all).map((p) => JSON.parse(p).member);
}

async function clearRoom(roomId) {
  await redis.del([admittedKey(roomId), pendingKey(roomId)]);
}

module.exports = { canEnter, admit, addPending, takePending, removePending, getPending, clearRoom };
