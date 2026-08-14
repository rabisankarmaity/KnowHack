const aiService = require('../services/ai.service');
const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');
const { canView } = require('../utils/visibility');

async function assertOwner(id, user) {
  const project = await Project.findById(id).select('owner').lean();
  if (!project) throw new ApiError(404, 'Project not found');
  if (String(project.owner) !== String(user.id) && user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }
}

async function assertVisible(id, user) {
  const project = await Project.findById(id).select('owner visibility status scheduledReleaseDate').lean();
  if (!project) throw new ApiError(404, 'Project not found');
  if (!canView(project, user?.id, user?.role)) throw new ApiError(404, 'Project not found');
  return project;
}

exports.analyze = async (req, res, next) => {
  try {
    await assertOwner(req.params.id, req.user);
    const ai = await aiService.analyzeProject(req.params.id, { force: true });
    res.json({ success: true, message: 'AI analysis complete', data: { ai } });
  } catch (e) { next(e); }
};

exports.status = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).select('ai status visibility owner scheduledReleaseDate').lean();
    if (!project) throw new ApiError(404, 'Project not found');
    if (!canView(project, req.user?.id, req.user?.role)) throw new ApiError(404, 'Project not found');
    res.json({ success: true, message: 'OK', data: { ai: project.ai || { status: 'idle' } } });
  } catch (e) { next(e); }
};

exports.similar = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const { items, stale } = await aiService.getSimilar(req.params.id, limit, req.user || null);
    res.json({ success: true, message: 'OK', data: { items, stale } });
  } catch (e) { next(e); }
};

exports.similarityText = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.body?.limit, 10) || 5, 20);
    const text = String(req.body?.text || '').trim();
    if (!text) throw new ApiError(422, 'text is required');
    const { items, stale } = await aiService.similarByText(text, limit, req.user);
    res.json({ success: true, message: 'OK', data: { items, stale } });
  } catch (e) { next(e); }
};

exports.weakness = async (req, res, next) => {
  try {
    await assertOwner(req.params.id, req.user);
    const { stale, data } = await aiService.analyzeWeakness(req.params.id, { force: true });
    res.json({
      success: true,
      message: stale ? 'Serving the last saved weakness report' : 'Weakness analysis complete',
      data: { weakness: data, stale },
    });
  } catch (e) { next(e); }
};

exports.mentor = async (req, res, next) => {
  try {
    const question = String(req.body?.question || '').trim();
    if (!question) throw new ApiError(422, 'question is required');
    let projectId = null;
    if (req.body?.projectId) {
      // Validate visibility up-front; mentorQuestion re-checks as well.
      await assertVisible(req.body.projectId, req.user);
      projectId = String(req.body.projectId);
    }
    const data = await aiService.mentorQuestion({ question, projectId, user: req.user });
    res.json({ success: true, message: 'OK', data: { mentor: data } });
  } catch (e) { next(e); }
};