'use strict';

/**
 * Sliding-window rate limiter — shared by HTTP /api/send-message and RabbitMQ outgoing consumer.
 */
class SendRateLimiter {
    constructor(windowMs, max) {
        this.windowMs = Math.max(1000, windowMs || 60000);
        this.max = Math.max(1, max || 60);
        this.events = [];
        this._chain = Promise.resolve();
    }

    acquire() {
        this._chain = this._chain.then(() => this._acquireOnce());
        return this._chain;
    }

    async _acquireOnce() {
        for (;;) {
            const now = Date.now();
            this.events = this.events.filter((t) => now - t < this.windowMs);
            if (this.events.length < this.max) {
                this.events.push(now);
                return;
            }
            const waitMs = this.windowMs - (now - this.events[0]) + 25;
            await new Promise((r) => setTimeout(r, Math.max(waitMs, 50)));
        }
    }
}

function createSendRateLimiter(windowMs, max) {
    return new SendRateLimiter(windowMs, max);
}

module.exports = { SendRateLimiter, createSendRateLimiter };
