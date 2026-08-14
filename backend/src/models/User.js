const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true,
    minlength: 3, maxlength: 30, match: /^[a-z0-9_.-]+$/ },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  college: { type: String, default: '' },
  degree: { type: String, default: '' },
  skills: [{ type: String, trim: true }],
  github: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  role: { type: String, enum: ['guest','student','creator','admin'], default: 'student' },
  contributionScore: { type: Number, default: 0 },
  badges: [{ type: String }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  createdProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  emailVerified: { type: Boolean, default: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  refreshTokenHash: { type: String, select: false },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.refreshTokenHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
