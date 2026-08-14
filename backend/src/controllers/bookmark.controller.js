const Bookmark = require('../models/Bookmark');
const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');

exports.list = async (req, res, next) => {
  try {
    const items = await Bookmark.find({ userId: req.user.id })
      .populate({ path: 'projectId', populate: { path: 'owner', select: 'name username avatar' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, message: 'OK', data: { items } });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const project = await Project.findById(req.body.projectId);
    if (!project) throw new ApiError(404, 'Project not found');
    const existing = await Bookmark.findOne({ userId: req.user.id, projectId: project._id });
    if (existing) return res.status(200).json({ success: true, message: 'Already bookmarked', data: { bookmark: existing } });
    const bookmark = await Bookmark.create({ userId: req.user.id, projectId: project._id });
    await Project.updateOne({ _id: project._id }, { $inc: { bookmarks: 1 } });
    res.status(201).json({ success: true, message: 'Bookmarked', data: { bookmark } });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const bm = await Bookmark.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!bm) throw new ApiError(404, 'Bookmark not found');
    await Project.updateOne({ _id: bm.projectId }, { $inc: { bookmarks: -1 } });
    res.json({ success: true, message: 'Removed', data: {} });
  } catch (e) { next(e); }
};
