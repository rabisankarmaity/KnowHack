const userService = require('../services/user.service');

exports.getProfile = async (req, res) =>
  res.json({ success: true, message: 'OK', data: { user: req.user } });

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, message: 'Profile updated', data: { user } });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.json({ success: true, message: 'OK', data: { user } });
  } catch (e) { next(e); }
};

exports.myProjects = async (req, res, next) => {
  try {
    const items = await userService.listUserProjects(req.user.id, { includeDrafts: true });
    res.json({ success: true, message: 'OK', data: { items } });
  } catch (e) { next(e); }
};
