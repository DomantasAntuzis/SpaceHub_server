const { createClient } = require("redis");

const redisClient = createClient();
redisClient.on("error", err => console.log('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('✅ Redis Connected');
    } catch (error) {
        console.error('❌ Redis Connection Failed', error);
    }
})();

module.exports = redisClient;