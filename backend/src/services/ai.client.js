/**
 * Thin HTTP client for the FastAPI AI service.
 * The AI key never leaves this server — the frontend can never reach Server 3.
 */
const axios = require('axios');
const { aiConfig } = require('../config/ai');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const http = axios.create({
  timeout: aiConfig.timeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err) {
  if (!err.response) return true; // network error / timeout
  const s = err.response.status;
  return s === 408 || s === 429 || s >= 500;
}

async function request(method, path, body, { retries = aiConfig.retries, timeout } = {}) {
  if (!aiConfig.enabled) throw new ApiError(503, 'AI service is not configured');

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await http.request({
        method,
        url: `${aiConfig.baseUrl}${path}`,
        data: body,
        timeout,
        headers: aiConfig.apiKey ? { 'x-api-key': aiConfig.apiKey } : {},
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      if (attempt < retries && isRetryable(err)) {
        const delay = aiConfig.retryDelayMs * 2 ** attempt;
        logger.warn(`AI ${method} ${path} failed (attempt ${attempt + 1}), retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  const status = lastErr?.response?.status;
  const detail = lastErr?.response?.data?.detail;
  if (!status) throw new ApiError(503, 'AI service is unreachable. Please try again shortly.');
  if (status === 401) throw new ApiError(502, 'AI service rejected the backend credentials');
  throw new ApiError(status >= 500 ? 502 : status, detail || 'AI service request failed');
}

module.exports = {
  summarize: (payload) => request('post', '/summarize', payload),
  similarity: (payload) => request('post', '/similarity', payload),
  weakness: (payload) => request('post', '/weakness', payload),
  mentor: (payload) => request('post', '/mentor', payload),
  embeddings: (inputs) => request('post', '/embeddings', { inputs }),
  indexedProjects: () => request('get', '/projects', undefined, { retries: 0 }),
  health: (timeout) => request('get', '/health/detail', undefined, { retries: 0, timeout }),
};
