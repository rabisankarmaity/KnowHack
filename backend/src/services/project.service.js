const Project = require('../models/Project');
const User = require('../models/User');
const Bookmark = require('../models/Bookmark');
const ApiError = require('../utils/ApiError');
const { uniqueSlug } = require('../utils/generateSlug');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { isViewerProject, canView } = require('../utils/visibility');
const { queueAnalysis } = require('./ai.service');

// ---------------------------------------------------------------------------
// Case File completeness audit (deterministic, rule-based — never fake AI).
// ---------------------------------------------------------------------------
const SECTION_COUNT = 18;

function isSet(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return Boolean(v);
}

function sectionChecks(p) {
  const tc = p.techStack || {};
  const arch = p.architecture || {};
  const res = p.research || {};
  const pres = p.presentation || {};
  const uiUx = arch.uiUx || {};
  const impl = p.implementation || {};
  const lessons = p.lessonsLearned || {};

  return [
    // 1. Project Overview
    isSet(p.title) && (isSet(p.shortDescription) || isSet(p.oneLineDescription)),
    // 2. Team Details
    isSet(p.teamName) || isSet(p.team),
    // 3. Problem Statement
    isSet(p.problem?.overview),
    // 4. Research & Validation
    isSet(res.summary) || isSet(res.methods) || isSet(res.findings) || isSet(res.validation),
    // 5. Existing Solutions
    isSet(p.existingSolutions),
    // 6. Proposed Solution
    isSet(p.solution?.overview) || isSet(p.solution?.description),
    // 7. Feature Breakdown
    isSet(p.features),
    // 8. System Architecture
    isSet(arch.description) || isSet(arch.diagram) || isSet(impl.architectureDiagram) || isSet(p.solution?.architectureSummary),
    // 9. Database Design
    isSet(arch.database?.type) || isSet(arch.database?.description) || isSet(tc.database),
    // 10. Technology Stack
    isSet(tc.languages) || isSet(tc.frameworks) || isSet(tc.categories),
    // 11. API & Integrations
    isSet(arch.apiIntegrations) || isSet(tc.apis),
    // 12. UI/UX Design
    isSet(uiUx.figmaUrl) || isSet(uiUx.designSystem) || isSet(uiUx.userFlow) || isSet(uiUx.screenshots) || isSet(impl.screenshots),
    // 13. Development Journey
    isSet(p.developmentJourney),
    // 14. Presentation & Demo
    isSet(pres.pitchDeck) || isSet(pres.liveDemoUrl) || isSet(pres.demoVideoUrl) || isSet(pres.notes) || isSet(p.resources?.ppt) || isSet(p.resources?.demoVideo),
    // 15. Judge Feedback
    isSet(p.judgeFeedback),
    // 16. Lessons Learned
    isSet(lessons.challenges) || isSet(lessons.wentWell) || isSet(lessons.failed) ||
      isSet(lessons.biggestMistake) || isSet(lessons.biggestAchievement),
    // 17. Future Scope
    isSet(p.futureScope) || isSet(lessons.futureImprovements),
    // 18. AI Generated Metadata
    p.ai?.status === 'ready' && (isSet(p.ai?.summary) || isSet(p.ai?.metadata?.keywords)),
  ];
}

function teamContributionTotal(p) {
  return (p.team || []).reduce((sum, m) => sum + (Number(m.contribution) || 0), 0);
}

function computeAiReview(p) {
  const complete = sectionChecks(p);
  const completeSections = complete.filter(Boolean).length;
  const completeness = Math.round((completeSections / SECTION_COUNT) * 100);

  const warnings = [];
  const suggestions = [];

  if (!isSet(p.problem?.overview)) {
    warnings.push('No problem statement'); suggestions.push('Describe the problem your project solves');
  }
  if (!isSet(p.research?.summary) && !isSet(p.research?.validation) && !isSet(p.research?.intervieweeCount)) {
    warnings.push('No user validation'); suggestions.push('Add user research and validation evidence');
  }
  if (!isSet(p.research?.competitorAnalysis) && !isSet(p.existingSolutions)) {
    warnings.push('No competitor analysis'); suggestions.push('Add a competitor / existing-solutions analysis');
  }
  if (!isSet(p.architecture?.description) && !isSet(p.solution?.architectureSummary)) {
    warnings.push('No architecture overview'); suggestions.push('Document your system architecture');
  }
  if (!isSet(p.architecture?.diagram) && !isSet(p.implementation?.architectureDiagram)) {
    warnings.push('No architecture diagram'); suggestions.push('Upload an architecture diagram');
  }
  if (!isSet(p.architecture?.database?.type) && !isSet(p.techStack?.database)) {
    warnings.push('No database design'); suggestions.push('Document your database type and design');
  }
  if (!isSet(p.judgeFeedback)) {
    warnings.push('No judge feedback'); suggestions.push('Add judge questions and feedback from your hackathon');
  }
  if (!isSet(p.team)) {
    warnings.push('No team members'); suggestions.push('Add your team members with roles and contributions');
  } else {
    const total = teamContributionTotal(p);
    if (total > 0 && total !== 100) {
      warnings.push(`Team contributions total ${total}% (not 100%)`);
      suggestions.push('Adjust contribution percentages to total 100%');
    }
  }
  if (!isSet(p.presentation?.liveDemoUrl) && !isSet(p.presentation?.demoVideoUrl)) {
    warnings.push('No live demo'); suggestions.push('Add a live demo link or demo video URL');
  }
  if (!isSet(p.resources?.additionalFiles) && !isSet(p.files)) {
    warnings.push('No files uploaded'); suggestions.push('Upload your pitch deck, PDF, or source files');
  }
  if (!isSet(p.coverImage)) {
    warnings.push('No cover image'); suggestions.push('Add a cover image to make your case file stand out');
  }
  if (!isSet(p.futureScope) && !isSet(p.lessonsLearned?.futureImprovements)) {
    warnings.push('No future scope'); suggestions.push('Describe what comes next for the project');
  }
  if (!isSet(p.lessonsLearned?.challenges) && !isSet(p.lessonsLearned?.wentWell)) {
    warnings.push('No lessons learned'); suggestions.push('Reflect on challenges and what went well');
  }

  const status = completeness >= 80 ? 'ok' : completeness >= 50 ? 'attention' : 'incomplete';
  return {
    status,
    completeness,
    completeSections,
    totalSections: SECTION_COUNT,
    warnings,
    suggestions,
    generatedAt: new Date(),
  };
}

function withAiReview(p) {
  const review = computeAiReview(p);
  p.aiReview = review;
  return review;
}

// ---------------------------------------------------------------------------
// Shared visibility rules are defined in utils/visibility.js (canView,
// isViewerProject) and imported above to avoid a dependency cycle with the AI
// service.
// ---------------------------------------------------------------------------

/** Strips implementation/credential details for non-owners based on visibility. */
function sanitizeForViewer(p, viewerId, viewerRole) {
  const isOwner = isViewerProject(p, viewerId) || viewerRole === 'admin';
  if (isOwner) return p;
  const obj = p.toObject ? p.toObject({ virtuals: true, versionKey: false }) : { ...p };

  const mode = p.visibility;
  if (mode === 'documentation-only' || mode === 'learning-only') {
    // Hide implementation details (source code, repo, credentials).
    obj.implementation = undefined;
    obj.presentation = { ...(obj.presentation || {}), demoCredentials: undefined, demoVideoUrl: undefined };
  }
  if (mode === 'learning-only') {
    // Philosophy: architecture + lessons visible, implementation & internals hidden.
    obj.solution = undefined;
    obj.features = undefined;
  }
  // Credentials are never exposed to anyone but the owner/admin.
  if (obj.presentation) obj.presentation.demoCredentials = undefined;
  return obj;
}

// ---------------------------------------------------------------------------
// Services.
// ---------------------------------------------------------------------------
async function create(ownerId, payload) {
  const slug = uniqueSlug(payload.title || 'untitled');
  const clean = { ...payload, slug, owner: ownerId, status: payload.status || 'draft' };
  if (Array.isArray(clean.team)) clean.teamSize = Math.min(clean.team.length, 20) || clean.teamSize;

  const project = await Project.create(clean);
  withAiReview(project);
  await project.save();
  await User.findByIdAndUpdate(ownerId, { $addToSet: { createdProjects: project._id } });
  queueAnalysis(project._id);
  return project;
}

async function updateById(id, ownerId, payload, role) {
  const project = await Project.findById(id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (!isViewerProject(project, ownerId) && role !== 'admin') throw new ApiError(403, 'Forbidden');

  delete payload.slug;
  delete payload.owner;
  delete payload._id;
  delete payload.ai;
  delete payload.aiReview;
  delete payload.views;
  delete payload.likes;
  delete payload.bookmarks;
  delete payload.downloads;
  delete payload.publishedAt;

  Object.assign(project, payload);
  if (Array.isArray(payload.team)) project.teamSize = Math.min(payload.team.length, 20) || project.teamSize;
  withAiReview(project);

  await project.save();
  queueAnalysis(project._id);
  return project;
}

async function removeById(id, ownerId, role) {
  const project = await Project.findById(id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (!isViewerProject(project, ownerId) && role !== 'admin') throw new ApiError(403, 'Forbidden');
  await project.deleteOne();
  await User.findByIdAndUpdate(project.owner, { $pull: { createdProjects: project._id } });
  await Bookmark.deleteMany({ projectId: project._id });
  return true;
}

async function publish(id, ownerId, role) {
  const project = await updateById(id, ownerId, { status: 'published', publishedAt: new Date() }, role);
  if (!project.ai || project.ai.status !== 'ready') queueAnalysis(project._id);
  return project;
}

async function archive(id, ownerId, role) {
  return updateById(id, ownerId, { status: 'archived' }, role);
}

async function duplicate(id, ownerId) {
  const src = await Project.findById(id).lean();
  if (!src) throw new ApiError(404, 'Project not found');
  if (String(src.owner) !== String(ownerId)) throw new ApiError(403, 'Forbidden');
  const { _id, createdAt, updatedAt, publishedAt, slug, ...rest } = src;
  return Project.create({
    ...rest,
    title: `${src.title} (Copy)`,
    slug: uniqueSlug(src.title + '-copy'),
    status: 'draft',
    views: 0, likes: 0, bookmarks: 0, downloads: 0,
  });
}

async function getBySlug(slug, viewerId, viewerRole) {
  const p = await Project.findOne({ slug }).populate('owner', 'name username avatar college');
  if (!p) throw new ApiError(404, 'Project not found');
  if (!canView(p, viewerId, viewerRole)) throw new ApiError(404, 'Project not found');
  Project.updateOne({ _id: p._id }, { $inc: { views: 1 } }).catch(() => {});
  return sanitizeForViewer(p, viewerId, viewerRole);
}

async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const now = new Date();
  const filter = {
    status: 'published',
    $or: [
      { visibility: { $in: ['public', 'unlisted', 'learning-only', 'documentation-only'] } },
      { visibility: 'scheduled', scheduledReleaseDate: { $lte: now } },
    ],
  };

  if (query.q) filter.$text = { $search: String(query.q) };
  if (query.category) filter.category = query.category;
  if (query.domain) filter.domain = query.domain;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.hackathon) filter.hackathonName = new RegExp(String(query.hackathon), 'i');
  if (query.organizer) filter.organizer = new RegExp(String(query.organizer), 'i');
  if (query.tech) {
    const tech = String(query.tech).split(',').map((s) => s.trim()).filter(Boolean);
    filter.$or = [
      { 'techStack.languages': { $in: tech } },
      { 'techStack.frameworks': { $in: tech } },
      { 'techStack.libraries': { $in: tech } },
    ];
  }
  if (query.owner) filter.owner = query.owner;

  const sortMap = {
    newest: { publishedAt: -1, createdAt: -1 },
    oldest: { publishedAt: 1, createdAt: 1 },
    views: { views: -1 },
    bookmarks: { bookmarks: -1 },
  };
  const sort = sortMap[query.sort] || sortMap.newest;

  const [items, total] = await Promise.all([
    Project.find(filter).sort(sort).skip(skip).limit(limit).populate('owner', 'name username avatar'),
    Project.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(total, page, limit) };
}

/** Fetch a project, verify ownership, and (re)compute its Case File review fresh. */
async function getOwnedProject(id, ownerId, role) {
  const project = await Project.findById(id);
  if (!project) throw new ApiError(404, 'Project not found');
  if (!isViewerProject(project, ownerId) && role !== 'admin') throw new ApiError(403, 'Forbidden');
  withAiReview(project);
  await project.save().catch(() => {});
  return project;
}

module.exports = {
  create, updateById, removeById, publish, archive, duplicate, getBySlug, list, getOwnedProject,
  computeAiReview, withAiReview, canView, SECTION_COUNT,
};