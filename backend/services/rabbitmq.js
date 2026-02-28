/**
 * اتصال RabbitMQ و مصرف صف پیام‌های ورودی
 */
const amqp = require('amqplib');
const { processIncomingMessage } = require('./incomingMessage');

let rabbitChannel = null;

async function connectRabbitMQ({ io, redisClient, logger }) {
    try {
        const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('RabbitMQ connect timeout')), ms));
        const connection = await Promise.race([
            amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost'),
            timeout(10000)
        ]);
        rabbitChannel = await connection.createChannel();
        require('./autoMessages').setRabbitChannel(rabbitChannel);

        await rabbitChannel.assertQueue('whatsapp_messages_dead', { durable: true });
        await rabbitChannel.assertQueue('whatsapp_messages', {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': 'whatsapp_messages_dead',
                'x-message-ttl': 60000,
            }
        });
        await rabbitChannel.assertQueue('outgoing_messages', { durable: true });

        logger.info('✅ Connected to RabbitMQ');

        rabbitChannel.consume('whatsapp_messages', async (msg) => {
            if (!msg) return;
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);
            const MAX_RETRIES = 3;
            let messageData;
            try {
                messageData = JSON.parse(msg.content.toString());
            } catch (parseErr) {
                logger.error('RabbitMQ: invalid JSON in message', { error: parseErr?.message });
                rabbitChannel.nack(msg, false, false);
                return;
            }
            try {
                await processIncomingMessage(messageData, { io, rabbitChannel, redisClient, logger });
                rabbitChannel.ack(msg);
            } catch (err) {
                logger.error('processIncomingMessage failed', { error: err?.message, retryCount });
                if (retryCount >= MAX_RETRIES) {
                    logger.error('Message moved to dead-letter queue after max retries', { retryCount });
                    rabbitChannel.nack(msg, false, false);
                } else {
                    rabbitChannel.nack(msg, false, false);
                    setTimeout(() => {
                        rabbitChannel.sendToQueue('whatsapp_messages', msg.content, {
                            persistent: true,
                            headers: { 'x-retry-count': retryCount + 1 }
                        });
                    }, Math.min(1000 * Math.pow(2, retryCount), 30000));
                }
            }
        });
    } catch (error) {
        logger.warn('⚠️ RabbitMQ not available - continuing without queue');
        rabbitChannel = null;
        try { require('./autoMessages').setRabbitChannel(null); } catch (_) {}
        if (!process.env.USE_SQLITE) setTimeout(() => connectRabbitMQ({ io, redisClient, logger }), 5000);
    }
}

function getRabbitChannel() {
    return rabbitChannel;
}

module.exports = { connectRabbitMQ, getRabbitChannel };
