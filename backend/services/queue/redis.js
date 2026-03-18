/**
 * Redis connection — optional; returns stub when unavailable
 */
let redis;
try {
    redis = require('redis');
} catch (e) {
    redis = null;
}

function createStubRedisClient() {
    return {
        isStub: true,
        quit: () => Promise.resolve(),
        connect: () => Promise.resolve(),
        ping: () => Promise.resolve('PONG'),
        get: () => Promise.resolve(null),
        set: () => Promise.resolve(),
        setEx: () => Promise.resolve(),
        del: () => Promise.resolve(),
        hSet: () => Promise.resolve(),
        hGet: () => Promise.resolve(null),
        hGetAll: () => Promise.resolve({}),
        expire: () => Promise.resolve(),
        exists: () => Promise.resolve(0),
        sendCommand: () => Promise.reject(new Error('Redis not available')),
    };
}

function createRedisClient(logger) {
    /** تست و محیط بدون Redis: بدون اتصال TCP = بدون spam لاگ و سریع‌تر */
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_REDIS === '1') {
        return createStubRedisClient();
    }

    let redisClient = createStubRedisClient();

    if (redis) {
        try {
            const client = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
            });
            client.on('error', (err) => {
                logger.warn('Redis error:', err?.message || err);
            });
            client.connect().catch((err) => {
                logger.warn(
                    '⚠️ Redis not available - continuing without cache:',
                    err?.message || err
                );
            });
            redisClient = client;
        } catch (e) {
            logger.warn('⚠️ Redis init failed:', e.message);
        }
    } else {
        logger.warn('⚠️ Redis module not found - continuing without cache');
    }

    return redisClient;
}

module.exports = { createRedisClient, createStubRedisClient };
