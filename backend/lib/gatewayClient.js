/**
 * HTTP client for WhatsApp Gateway — adds GATEWAY_API_SECRET when set
 * اگر WhatsApp Cloud API تنظیم شده باشد، ارسال پیام از طریق Meta انجام می‌شود
 */
const axios = require('axios');
const whatsappCloud = require('./whatsappCloudApi');

const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/$/, '');
const GATEWAY_SECRET = typeof process.env.GATEWAY_API_SECRET === 'string'
  ? process.env.GATEWAY_API_SECRET.trim().replace(/^["']|["']$/g, '')
  : '';

function getGatewayHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (GATEWAY_SECRET) headers['X-Gateway-Secret'] = GATEWAY_SECRET;
  return headers;
}

async function gatewayGet(path, options = {}) {
  return axios.get(GATEWAY_URL + path, {
    timeout: options.timeout || 5000,
    headers: getGatewayHeaders(),
    ...options,
  });
}

async function gatewayPost(path, data, options = {}) {
  return axios.post(GATEWAY_URL + path, data, {
    timeout: options.timeout || 10000,
    headers: getGatewayHeaders(),
    ...options,
  });
}

/**
 * ارسال پیام واتساپ — اگر Cloud API تنظیم شده باشد از آن استفاده می‌کند، وگرنه از Gateway
 * @param {object} payload - { to, message, media?, replyTo? }
 * @returns {Promise<{data: {messageId: string}}>}
 */
async function sendWhatsAppMessage(payload, options = {}) {
  if (whatsappCloud.isConfigured()) {
    const res = await whatsappCloud.sendMessage(payload);
    return { data: { messageId: res.messageId } };
  }
  return gatewayPost('/api/send-message', payload, options);
}

function isCloudApiConfigured() {
  return whatsappCloud.isConfigured();
}

module.exports = {
  GATEWAY_URL,
  getGatewayHeaders,
  gatewayGet,
  gatewayPost,
  sendWhatsAppMessage,
  isCloudApiConfigured,
};
