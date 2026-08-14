/**
 * AI orchestration lives in the backend: it decides *what* to send, persists the
 * results and owns retries. The FastAPI service only owns AI logic.
 *
 * Visibility is enforced HERE. The backend computes the set of project ids the
 * caller may see and passes that allow-list to the AI service, so private /
 * team-only / unreleased projects can never leak through RAG or similarity.
 */
const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const aiClient = require('./ai.client');
const { aiConfig } = require('../config/ai');
const { canView, isAnonymouslyVisible, isViewerProject } = require('../utils/visibility');

// ---------------------------------------------------------------------------
// Case File -> AI input.
// ---------------------------------------------------------------------------
function fileRef(f) {
  return f && f.url ? { url: f.url, name: f.name, mimeType: f.mimeType } : null;
}

function collectFiles(project) {
  const r = project.resources || {};
  const arch = project.architecture || {};
  const pres = project.presentation || {};
  const research = project.research || {};
  const candidates = [
    fileRef(r.ppt) && { ...r.ppt, kind: 'ppt' },
    fileRef(r.documentation) && { ...r.documentation, kind: 'pdf' },
    fileRef(pres.pitchDeck) && { ...pres.pitchDeck, kind: 'ppt' },
    fileRef(research.researchPdf) && { ...research.researchPdf, kind: 'pdf' },
    ...(r.researchPapers || []).map((f) => ({ ...f, kind: 'pdf' })),
    ...(research.files || []).map((f) => ({ ...f, kind: 'pdf' })),
    ...(r.additionalFiles || []).map((f) => ({ ...f, kind: 'auto' })),
    fileRef(arch.diagram) && null,
  ].filter(Boolean);

  return candidates
    .filter((f) => f && f.url)
    .slice(0, 6)
    .map((f) => ({ url: f.url, name: f.name, mimeType: f.mimeType, kind: f.kind || 'auto' }));
}

function relate(arr) {
  return (arr || [])
    .map(
      (x) =>
        `${x.name || ''} ${x.title || ''}\n${x.description || ''}\n${x.overview || ''}\n${x.strengths || ''}\n${x.limitations || ''}\n${x.difference || ''}`,
    )
    .join('\n');
}

function techList(t) {
  return [...(t.languages || []), ...(t.frameworks || []), ...(t.database || []), ...(t.cloud || []), ...(t.apis || []), ...(t.tools || [])]
    .filter(Boolean)
    .join(', ');
}

/**
 * Build a canonical, section-aware map of the Case File. Every key is a section
 * the AI understands, so embeddings are per-section and weak/missing content is
 * evident to the Weakness Detector.
 */
function collectSections(project) {
  const t = project.techStack || {};
  const arch = project.architecture || {};
  const db = arch.database || {};
  const uiUx = arch.uiUx || {};
  const pres = project.presentation || {};
  const lessons = project.lessonsLearned || {};

  return {
    overview: [
      project.title,
      project.oneLineDescription,
      project.shortDescription,
      `Category: ${project.category || ''}. Domain: ${project.domain || ''}. Difficulty: ${project.difficulty || ''}.`,
    ].filter(Boolean).join('\n'),
    problem: [
      project.problem?.overview,
      project.problem?.whyImportant,
      project.problem?.expectedImpact,
      project.problem?.severity,
      project.problem?.realWorldExamples,
      (project.problem?.painPoints || []).join('. '),
      (project.problem?.challenges || []).join('. '),
    ].filter(Boolean).join('\n'),
    target_users: [
      project.problem?.targetUsers,
      project.problem?.affected,
      project.problem?.frequency,
      project.problem?.workaround,
    ].filter(Boolean).join('\n'),
    research: [
      project.research?.summary,
      project.research?.findings,
      project.research?.marketObservations,
      project.research?.statistics,
      project.research?.competitorAnalysis,
      project.research?.marketResearch,
      `Survey results: ${project.research?.surveyResults || ''}. Interviewees: ${project.research?.intervieweeCount || ''}.`,
      (project.research?.methods || []).join(', '),
      (project.research?.insights || []).join('. '),
      (project.research?.academicReferences || []).join(', '),
    ].filter(Boolean).join('\n'),
    validation: [
      project.research?.validation,
      `Survey: ${project.research?.survey || ''}`,
      (project.research?.insights || []).join('. '),
    ].filter(Boolean).join('\n'),
    existing_solutions: relate(project.existingSolutions),
    solution: [
      project.solution?.overview,
      project.solution?.description,
      project.solution?.usp,
      project.solution?.innovation,
      project.solution?.architectureSummary,
      project.solution?.workflow,
      project.solution?.coreWorkflow,
      (project.solution?.expectedBenefits || []).join('. '),
      (project.solution?.successCriteria || []).join('. '),
    ].filter(Boolean).join('\n'),
    features: relate(project.features),
    architecture: [
      arch.description,
      arch.dataFlow?.description,
      project.solution?.architectureSummary,
    ].filter(Boolean).join('\n'),
    database: [
      `${db.type || ''} ${db.description || ''}`,
      (db.collections || []).join(', '),
      (db.relationships || []).join('. '),
      (db.indexes || []).join(', '),
      `Scalability: ${db.scalabilityNotes || ''}`,
    ].filter(Boolean).join('\n'),
    technology: [
      techList(t),
      Object.values(t.categories || {}).flat().filter(Boolean).join(', '),
      `Hosting: ${t.infrastructure?.hosting || ''}. CI/CD: ${t.infrastructure?.ciCd || ''}. Monitoring: ${t.infrastructure?.monitoring || ''}.`,
    ].filter(Boolean).join('\n'),
    apis: (arch.apiIntegrations || [])
      .map((a) => `${a.name || ''}: ${a.purpose || ''} (${a.provider || ''}, ${a.authType || ''})`)
      .join('\n'),
    uiux: [
      `Design system: ${uiUx.designSystem || ''}`,
      `User flow: ${uiUx.userFlow || ''}`,
      `Accessibility: ${uiUx.accessibilityNotes || ''}`,
      `Figma: ${uiUx.figmaUrl || ''}`,
    ].filter(Boolean).join('\n'),
    journey: relate(project.developmentJourney),
    presentation: [
      pres.notes,
      pres.demoInstructions,
      pres.demoNotes,
      `Live demo: ${pres.liveDemoUrl || ''}`,
      `Repo: ${project.implementation?.githubRepository || ''}`,
    ].filter(Boolean).join('\n'),
    business_model: pres.businessModel || '',
    judge_feedback: relate(project.judgeFeedback),
    lessons: [
      (lessons.challenges || []).join('. '),
      (lessons.mistakes || []).join('. '),
      (lessons.solutions || []).join('. '),
      (lessons.wentWell || []).join('. '),
      (lessons.failed || []).join('. '),
      (lessons.doDifferently || []).join('. '),
      lessons.biggestMistake,
      lessons.biggestAchievement,
      (lessons.technicalLessons || []).join('. '),
      (lessons.productLessons || []).join('. '),
      (lessons.teamLessons || []).join('. '),
      (lessons.businessLessons || []).join('. '),
      (lessons.featuresRemoved || []).join('. '),
      lessons.beginnerAdvice,
      (lessons.futureImprovements || []).join('. '),
    ].filter(Boolean).join('\n'),
    future_scope: relate(project.futureScope),
  };
}

/** Flat text version (legacy /summarize contract still accepts it alongside sections). */
function collectText(project) {
  return Object.values(collectSections(project)).filter(Boolean).join('\n');
}

function collectMetadata(project) {
  const owner = project.owner || {};
  return {
    hackathon: project.hackathonName || null,
    organizer: project.organizer || null,
    domain: project.domain || null,
    technologies: techList(project.techStack || {}).split(/,\s*/).filter(Boolean).slice(0, 40),
    university: owner?.college || null,
    year: project.year || null,
    visibility: project.visibility || 'public',
  };
}

// ---------------------------------------------------------------------------
// Visibility allow-list.
// ---------------------------------------------------------------------------
async function visibleProjectIds(user) {
  const viewerId = user?.id || user?._id;
  const viewerRole = user?.role;
  const projects = await Project.find({ status: 'published' })
    .select('_id owner visibility scheduledReleaseDate')
    .lean();
  return projects
    .filter((p) => canView(p, viewerId, viewerRole))
    .map((p) => String(p._id));
}

async function assertViewable(projectId, user) {
  const project = await Project.findById(projectId).select('owner visibility status scheduledReleaseDate').lean();
  if (!project) throw new ApiError(404, 'Project not found');
  if (!canView(project, user?.id || user?._id, user?.role)) throw new ApiError(404, 'Project not found');
  return project;
}

async function setStatus(projectId, patch) {
  await Project.updateOne({ _id: projectId }, { $set: patch });
}

// ---------------------------------------------------------------------------
// 1. Summarization / indexing pipeline.
// ---------------------------------------------------------------------------
async function analyzeProject(projectId, { force = false } = {}) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  if (!aiConfig.enabled) throw new ApiError(503, 'AI service is not configured');
  if (project.ai?.status === 'processing' && !force) return project.ai;

  await setStatus(project._id, { 'ai.status': 'processing', 'ai.error': null });

  try {
    const data = await aiClient.summarize({
      projectId: String(project._id),
      title: project.title,
      text: collectText(project),
      files: collectFiles(project),
      sections: collectSections(project),
      metadata: collectMetadata(project),
      index: true,
    });

    const similar = (data.similar_projects || []).map((s) => ({
      projectId: s.project_id,
      title: s.title,
      score: s.score,
      similarityScore: s.similarity_score ?? null,
      relationship: s.relationship ?? null,
      signals: s.signals ?? {},
      overlappingSections: s.overlapping_sections ?? [],
      differences: s.differences ?? [],
      risk: s.risk ?? null,
    }));

    const ai = {
      status: 'ready',
      engine: data.engine,
      model: data.model,
      summary: data.summary,
      highlights: data.highlights || [],
      caseFile: data.case_file || {},
      metadata: data.metadata || {},
      techStack: data.tech_stack || {},
      sector: data.sector || data.metadata?.sector || null,
      embeddingRef: data.embedding_ref || null,
      similarProjects: similar,
      warnings: data.warnings || [],
      error: null,
      processedAt: new Date(),
      attempts: (project.ai?.attempts || 0) + 1,
    };

    await setStatus(project._id, { ai });
    logger.info(`AI analysis stored for project ${project._id} (${data.engine})`);
    return ai;
  } catch (err) {
    await setStatus(project._id, {
      'ai.status': 'failed',
      'ai.error': err.message,
      'ai.processedAt': new Date(),
      'ai.attempts': (project.ai?.attempts || 0) + 1,
    });
    logger.error(`AI analysis failed for project ${projectId}: ${err.message}`);
    throw err;
  }
}

/** Fire-and-forget trigger used right after an upload/publish. */
function queueAnalysis(projectId) {
  if (!aiConfig.enabled) return;
  setImmediate(() => {
    analyzeProject(projectId).catch(() => {});
  });
}

// ---------------------------------------------------------------------------
// 2. Weakness / Mistake Detector.
// ---------------------------------------------------------------------------
async function analyzeWeakness(projectId, { force = false } = {}) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  if (!aiConfig.enabled) throw new ApiError(503, 'AI service is not configured');

  const sections = collectSections(project);
  let data;
  try {
    data = await aiClient.weakness({
      projectId: String(project._id),
      title: project.title,
      caseFile: sections,
      metadata: {
        title: project.title,
        teamSize: project.team?.length,
        hackathonName: project.hackathonName,
        hackathonDurationHours: project.hackathonDurationHours || null,
        year: project.year,
      },
    });
  } catch (err) {
    // Stale snapshot fallback: keep the last report if the AI service is down.
    if (project.ai?.weakness?.report) {
      logger.warn(`Weakness analysis unavailable, serving stale snapshot for ${projectId}: ${err.message}`);
      return { stale: true, data: project.ai.weakness };
    }
    throw err;
  }

  const weakness = {
    status: 'ready',
    stale: false,
    report: data,
    model: data.model,
    engine: data.engine,
    processedAt: new Date(),
    error: null,
  };
  await setStatus(project._id, { 'ai.weakness': weakness });
  return { stale: false, data: weakness };
}

// ---------------------------------------------------------------------------
// 3. Right-Way-of-Thinking Mentor (RAG-grounded, visibility-aware).
// ---------------------------------------------------------------------------
async function mentorQuestion({ question, projectId, user }) {
  if (!aiConfig.enabled) throw new ApiError(503, 'AI service is not configured');

  let projectContext = null;
  let exclude = null;
  if (projectId) {
    const project = await assertViewable(projectId, user);
    // Only the sections the project context itself is allowed to share; the AI
    // never receives private implementation or credential fields.
    projectContext = collectSections(project);
    exclude = String(projectId);
  }

  const allow = await visibleProjectIds(user);
  const data = await aiClient.mentor({
    question,
    projectId: projectId ? String(projectId) : null,
    projectContext,
    visibleProjectIds: allow,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Similarity / duplicate detection (visibility-aware allow-list).
// ---------------------------------------------------------------------------
async function getSimilar(projectId, limit = 5, user = null) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new ApiError(404, 'Project not found');
  if (!canView(project, user?.id || user?._id, user?.role)) throw new ApiError(404, 'Project not found');

  const allow = await visibleProjectIds(user);
  let results;
  try {
    const data = await aiClient.similarity({
      projectId: String(projectId),
      limit,
      visibleProjectIds: allow,
      includeAnalysis: true,
    });
    results = data.results || [];
  } catch (err) {
    // Fall back to the last persisted similarity snapshot when the AI service is down.
    if (project.ai?.similarProjects?.length) {
      return { stale: true, items: await hydrate(project.ai.similarProjects, user) };
    }
    throw err;
  }

  const mapped = results.map((r) => ({
    projectId: r.project_id,
    title: r.title,
    score: r.score,
    similarityScore: r.similarity_score ?? null,
    relationship: r.relationship ?? null,
    signals: r.signals || {},
    overlappingSections: r.overlapping_sections || [],
    differences: r.differences || [],
    risk: r.risk ?? null,
  }));
  await setStatus(projectId, { 'ai.similarProjects': mapped });
  return { stale: false, items: await hydrate(mapped, user) };
}

async function similarByText(text, limit = 5, user = null) {
  const allow = await visibleProjectIds(user);
  const data = await aiClient.similarity({
    text,
    limit,
    visibleProjectIds: allow,
    includeAnalysis: true,
  });
  const mapped = (data.results || []).map((r) => ({
    projectId: r.project_id,
    title: r.title,
    score: r.score,
    similarityScore: r.similarity_score ?? null,
    relationship: r.relationship ?? null,
    signals: r.signals || {},
    overlappingSections: r.overlapping_sections || [],
    differences: r.differences || [],
    risk: r.risk ?? null,
  }));
  return { stale: false, items: await hydrate(mapped, user) };
}

async function hydrate(entries, user = null) {
  const ids = entries.map((e) => e.projectId).filter(Boolean);
  if (!ids.length) return [];
  const projects = await Project.find({ _id: { $in: ids }, status: 'published' })
    .select('title slug shortDescription coverImage thumbnail category hackathonName year views owner visibility scheduledReleaseDate')
    .lean();

  const viewerId = user?.id || user?._id;
  const byId = new Map(projects.map((p) => [String(p._id), p]));
  return entries
    .map((e) => {
      const p = byId.get(e.projectId);
      if (!p) return null;
      if (!isAnonymouslyVisible(p) && !canView(p, viewerId, user?.role)) return null;
      return {
        _id: String(p._id),
        slug: p.slug,
        title: p.title,
        shortDescription: p.shortDescription,
        coverImage: p.coverImage,
        thumbnail: p.thumbnail,
        category: p.category,
        hackathonName: p.hackathonName,
        year: p.year,
        views: p.views,
        score: e.score,
        relationship: e.relationship,
        similarityScore: e.similarityScore,
        signals: e.signals,
        overlappingSections: e.overlappingSections,
        differences: e.differences,
        risk: e.risk,
      };
    })
    .filter(Boolean);
}

module.exports = {
  analyzeProject,
  queueAnalysis,
  analyzeWeakness,
  mentorQuestion,
  getSimilar,
  similarByText,
  collectText,
  collectFiles,
  collectSections,
  collectMetadata,
  visibleProjectIds,
  hydrate,
};