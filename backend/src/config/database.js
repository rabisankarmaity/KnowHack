const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger');

dns.setServers(['1.1.1.1', '8.8.8.8']);
logger.info('Using public DNS servers for MongoDB SRV resolution');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  logger.info('MongoDB connected');
}

module.exports = { connectDatabase };
