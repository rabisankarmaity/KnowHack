const Hackathon = require('../models/Hackathon');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPagination } = require('../utils/pagination');

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.q) filter.$text = { $search: String(query.q) };
  if (query.mode) filter.mode = query.mode;
  const [items, total] = await Promise.all([
    Hackathon.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit),
    Hackathon.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(total, page, limit) };
}
async function create(payload) { return Hackathon.create(payload); }
async function update(id, payload) {
  const h = await Hackathon.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!h) throw new ApiError(404, 'Hackathon not found');
  return h;
}
async function remove(id) {
  const h = await Hackathon.findByIdAndDelete(id);
  if (!h) throw new ApiError(404, 'Hackathon not found');
}

module.exports = { list, create, update, remove };
