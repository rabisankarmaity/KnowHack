const projectService = require('../services/project.service');

exports.create = async (req, res, next) => {
  try {
    const project = await projectService.create(req.user.id, req.body);
    res.status(201).json({ success: true, message: 'Project created', data: { project } });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { items, pagination } = await projectService.list(req.query);
    res.json({ success: true, message: 'OK', data: { items }, pagination });
  } catch (e) { next(e); }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const project = await projectService.getBySlug(req.params.slug, req.user?.id, req.user?.role);
    res.json({ success: true, message: 'OK', data: { project } });
  } catch (e) { next(e); }
};

exports.aiReview = async (req, res, next) => {
  try {
    const project = await projectService.getOwnedProject(req.params.id, req.user.id, req.user.role);
    res.json({
      success: true,
      message: 'Case file review generated',
      data: { review: project.aiReview, project },
    });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const project = await projectService.updateById(req.params.id, req.user.id, req.body, req.user.role);
    res.json({ success: true, message: 'Project updated', data: { project } });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await projectService.removeById(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, message: 'Project deleted', data: {} });
  } catch (e) { next(e); }
};

exports.publish = async (req, res, next) => {
  try {
    const project = await projectService.publish(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, message: 'Project published', data: { project } });
  } catch (e) { next(e); }
};

exports.archive = async (req, res, next) => {
  try {
    const project = await projectService.archive(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, message: 'Project archived', data: { project } });
  } catch (e) { next(e); }
};

exports.duplicate = async (req, res, next) => {
  try {
    const project = await projectService.duplicate(req.params.id, req.user.id);
    res.status(201).json({ success: true, message: 'Project duplicated', data: { project } });
  } catch (e) { next(e); }
};

exports.uploadFiles = async (req, res) => {
  const files = (req.files || []).map((f) => ({
    url: f.path, publicId: f.filename, name: f.originalname, size: f.size, mimeType: f.mimetype,
  }));
  res.status(201).json({ success: true, message: 'Uploaded', data: { files } });
};
