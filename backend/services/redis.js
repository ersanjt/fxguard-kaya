/**
 * اتصال Redis (اختیاری) — در صورت نبودن، یک stub برگردانده می‌شود
 */
let redis;
try {
    redis = require('redis');
} catch (e) {
    redis = null;
}

function createRedisClient(logger) {
    let redisClient = {
        quit: () => Promise.resolve(),
        connect: () => Promise.resolve(),
        get: () => Promise.resolve(null),
        setEx: () => Promise.resolve(),
        del: () => Promise.resolve(),
    };

    if (redis) {
        try {
            redisClient = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });
            redisClient.on('error', (err) => {
                logger.warn('Redis error:', err?.message || err);
            });
            redisClient.connect().catch((err) => {
                logger.warn('⚠️ Redis not available - continuing without cache:', err?.message || err);
            });
        } catch (e) {
            logger.warn('⚠️ Redis init failed:', e.message);
        }
    } else {
        logger.warn('⚠️ Redis module not found - continuing without cache');
    }

    return redisClient;
}

module.exports = { createRedisClient };
