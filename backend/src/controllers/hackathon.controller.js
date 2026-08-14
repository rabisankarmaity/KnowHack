const hackathonService = require('../services/hackathon.service');

exports.list = async (req, res, next) => {
  try {
    const { items, pagination } = await hackathonService.list(req.query);
    res.json({ success: true, message: 'OK', data: { items }, pagination });
  } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try {
    const item = await hackathonService.create(req.body);
    res.status(201).json({ success: true, message: 'Created', data: { item } });
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    const item = await hackathonService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Updated', data: { item } });
  } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try {
    await hackathonService.remove(req.params.id);
    res.json({ success: true, message: 'Deleted', data: {} });
  } catch (e) { next(e); }
};
