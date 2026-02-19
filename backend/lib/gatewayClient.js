/**
 * HTTP client for WhatsApp Gateway — adds GATEWAY_API_SECRET when set
 */
const axios = require('axios');

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

module.exports = {
  GATEWAY_URL,
  getGatewayHeaders,
  gatewayGet,
  gatewayPost,
};
