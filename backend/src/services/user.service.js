const User = require('../models/User');
const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');

async function getById(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function updateProfile(userId, payload) {
  const allowed = ['name','bio','avatar','college','degree','skills','github','linkedin','portfolio'];
  const update = {};
  for (const k of allowed) if (payload[k] !== undefined) update[k] = payload[k];
  const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function listUserProjects(userId, { includeDrafts = false } = {}) {
  const q = { owner: userId };
  if (!includeDrafts) q.status = 'published';
  return Project.find(q).sort({ updatedAt: -1 });
}

module.exports = { getById, updateProfile, listUserProjects };
