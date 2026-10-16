const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const redisClient = require("../config/redis");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

// Brute-force guard for room lookups: only failed lookups (404) count, so
// normal visitors are never throttled but slug guessing is.
const FAILED_LOOKUP_LIMIT = 20;
const FAILED_LOOKUP_WINDOW_S = 15 * 60;

const roomLookupLimiter = rateLimit({
  windowMs: FAILED_LOOKUP_WINDOW_S * 1000,
  limit: FAILED_LOOKUP_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
  skipSuccessfulRequests: true,
  message: { msg: "Too many failed attempts, try again in a few minutes" },
  store: new RedisStore({
    prefix: "rl:room-lookup:",
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

// Same budget for failed socket joins, so sockets can't be used to bypass the HTTP limit
const socketMissKey = (ip) => `rl:room-socket:${ip}`;

async function isSocketBlocked(ip) {
  return Number(await redisClient.get(socketMissKey(ip))) >= FAILED_LOOKUP_LIMIT;
}

async function recordSocketMiss(ip) {
  const key = socketMissKey(ip);
  if (await redisClient.incr(key) === 1) {
    await redisClient.expire(key, FAILED_LOOKUP_WINDOW_S);
  }
}

module.exports = limiter;
module.exports.roomLookupLimiter = roomLookupLimiter;
module.exports.isSocketBlocked = isSocketBlocked;
module.exports.recordSocketMiss = recordSocketMiss;