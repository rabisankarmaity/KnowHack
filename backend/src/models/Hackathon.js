const mongoose = require('mongoose');
const HackathonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  organizer: { type: String, required: true, trim: true },
  website: String,
  registrationLink: String,
  description: { type: String, maxlength: 2000 },
  mode: { type: String, enum: ['online','offline','hybrid'], default: 'online' },
  location: String,
  startDate: Date,
  endDate: Date,
  banner: String,
  tags: [String],
}, { timestamps: true });
HackathonSchema.index({ title: 'text', organizer: 'text', description: 'text', tags: 'text' });
module.exports = mongoose.model('Hackathon', HackathonSchema);
