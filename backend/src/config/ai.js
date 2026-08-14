/** AI microservice configuration (Server 3). All values come from env. */
const aiConfig = {
  baseUrl: (process.env.AI_SERVICE_URL || '').replace(/\/$/, ''),
  apiKey: process.env.AI_API_KEY || '',
  timeoutMs: parseInt(process.env.AI_TIMEOUT_MS, 10) || 120000,
  retries: parseInt(process.env.AI_MAX_RETRIES, 10) || 2,
  retryDelayMs: parseInt(process.env.AI_RETRY_DELAY_MS, 10) || 1500,
  enabled: Boolean(process.env.AI_SERVICE_URL),
};

module.exports = { aiConfig };