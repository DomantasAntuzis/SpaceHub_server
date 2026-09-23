const { RedisStore } = require('connect-redis');
const { rateLimit } = require("express-rate-limit");

const redisClient = require("../config/redis");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
  store: new RedisStore({client: redisClient}),
});

module.exports = limiter;