const redis = require("../config/redis");

const membersKey = (roomId) => `room:${roomId}:members`;
const socketsKey = (roomId) => `room:${roomId}:sockets`;

// Stable key for a user across tabs: registered id or guest id
const userKey = (user) => (user.type === 'registered' ? `u:${user.id}` : `g:${user.guestId}`);

const toMember = (user) => ({
  id: user.type === 'registered' ? user.id : user.guestId,
  username: user.username,
  type: user.type
});

// Adds one socket for the user; returns true if the user was not in the room yet
async function addSocket(roomId, user) {
  const key = userKey(user);
  const count = await redis.hIncrBy(socketsKey(roomId), key, 1);
  if (count === 1) {
    await redis.hSet(membersKey(roomId), key, JSON.stringify(toMember(user)));
  }
  return count === 1;
}

// Removes one socket for the user; returns true if that was their last one
async function removeSocket(roomId, user) {
  const key = userKey(user);
  const count = await redis.hIncrBy(socketsKey(roomId), key, -1);
  if (count > 0) {
    return false;
  }
  await redis.hDel(socketsKey(roomId), key);
  await redis.hDel(membersKey(roomId), key);
  return true;
}

async function getMembers(roomId) {
  const all = await redis.hGetAll(membersKey(roomId));
  return Object.values(all).map((m) => JSON.parse(m));
}

module.exports = { toMember, addSocket, removeSocket, getMembers };
