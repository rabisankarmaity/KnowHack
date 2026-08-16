const mongoose = require('mongoose');

const FileRef = new mongoose.Schema(
  { url: String, publicId: String, name: String, size: Number, mimeType: String },
  { _id: false }
);

// ---- Case File sub-structures (all additive & optional for backward compatibility) ----

const TeamMemberSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120, required: true },
  role: { type: String, trim: true, maxlength: 120, default: '' },
  university: { type: String, trim: true, maxlength: 160, default: '' },
  department: { type: String, trim: true, maxlength: 120, default: '' },
  github: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  contribution: { type: Number, min: 0, max: 100, default: 0 },
}, { timestamps: false });

const ExistingSolutionSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 200, required: true },
  website: { type: String, default: '' },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  strengths: { type: String, trim: true, maxlength: 4000, default: '' },
  limitations: { type: String, trim: true, maxlength: 4000, default: '' },
  difference: { type: String, trim: true, maxlength: 4000, default: '' },
  whyNeeded: { type: String, trim: true, maxlength: 4000, default: '' },
}, { timestamps: false });

const FeatureSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 200, required: true },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  problemSolved: { type: String, trim: true, maxlength: 4000, default: '' },
  priority: {
    type: String,
    enum: ['must-have', 'should-have', 'could-have', 'future'],
    default: 'should-have',
  },
  status: {
    type: String,
    enum: ['planned', 'in-development', 'completed', 'future'],
    default: 'planned',
  },
  futureImprovement: { type: String, trim: true, maxlength: 4000, default: '' },
}, { timestamps: false });

const ApiIntegrationSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 200, default: '' },
  purpose: { type: String, trim: true, maxlength: 4000, default: '' },
  provider: { type: String, trim: true, maxlength: 200, default: '' },
  documentationUrl: { type: String, default: '' },
  authType: { type: String, trim: true, maxlength: 120, default: '' },
}, { timestamps: false });

const DevelopmentJourneySchema = new mongoose.Schema({
  phase: { type: String, trim: true, maxlength: 120, default: '' },
  title: { type: String, trim: true, maxlength: 200, default: '' },
  description: { type: String, trim: true, maxlength: 8000, default: '' },
  period: { type: String, trim: true, maxlength: 200, default: '' },
  problemsEncountered: { type: String, trim: true, maxlength: 8000, default: '' },
  solutionImplemented: { type: String, trim: true, maxlength: 8000, default: '' },
  files: [FileRef],
}, { timestamps: false });

const JudgeFeedbackSchema = new mongoose.Schema({
  judgeName: { type: String, trim: true, maxlength: 120, default: '' },
  question: { type: String, trim: true, maxlength: 4000, default: '' },
  answer: { type: String, trim: true, maxlength: 8000, default: '' },
  comment: { type: String, trim: true, maxlength: 8000, default: '' },
  score: { type: String, trim: true, maxlength: 40, default: '' },
  strengths: { type: String, trim: true, maxlength: 4000, default: '' },
  weaknesses: { type: String, trim: true, maxlength: 4000, default: '' },
  suggestions: { type: String, trim: true, maxlength: 4000, default: '' },
  overallFeedback: { type: String, trim: true, maxlength: 4000, default: '' },
}, { timestamps: false });

const FutureScopeSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 200, default: '' },
  description: { type: String, trim: true, maxlength: 8000, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  timeline: { type: String, trim: true, maxlength: 200, default: '' },
}, { timestamps: false });

const ProjectFileSchema = new mongoose.Schema({
  file: FileRef,
  category: {
    type: String,
    enum: ['cover', 'architecture', 'database', 'ui', 'presentation', 'documentation', 'source', 'demo', 'research', 'other'],
    default: 'other',
  },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: false });

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, index: true },
  shortDescription: { type: String, default: '', maxlength: 300 },
  oneLineDescription: { type: String, default: '', maxlength: 200 },
  coverImage: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  hackathonName: { type: String, default: '' },
  organizer: { type: String, default: '' },
  year: { type: Number },
  category: { type: String, default: '' },
  domain: { type: String, default: '' },
  sdgAlignment: { type: String, default: '', maxlength: 300 },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
  teamSize: { type: Number, default: 1, min: 1, max: 20 },
  teamName: { type: String, default: '', maxlength: 120 },
  projectStatus: { type: String, enum: ['prototype', 'in-progress', 'completed', 'deployed'], default: 'prototype' },

  // Ownership / licensing
  license: { type: String, default: 'all-rights-reserved' },
  ownershipConfirmed: { type: Boolean, default: false },
  copyrightConfirmed: { type: Boolean, default: false },
  contributorAttribution: { type: Boolean, default: true },
  scheduledReleaseDate: { type: Date },

  // 2. Team Details
  team: { type: [TeamMemberSchema], default: [] },

  // 3. Problem Statement
  problem: {
    overview: String,
    targetUsers: String,
    whyImportant: String,
    challenges: [String],
    realWorldExamples: String,
    expectedImpact: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical', ''], default: '' },
    workaround: String,
    affected: String,
    frequency: String,
    painPoints: [String],
    existingSolutions: [String],
    limitations: [String],
  },

  // 4. Research & Validation
  research: {
    summary: String,
    methods: [String],
    findings: String,
    validation: String,
    intervieweeCount: Number,
    surveyResults: String,
    insights: [String],
    marketObservations: String,
    statistics: String,
    academicReferences: [String],
    researchLinks: [String],
    files: [FileRef],
    survey: String,
    competitorAnalysis: String,
    marketResearch: String,
    references: [String],
    researchPdf: FileRef,
  },

  // 5. Existing Solutions
  existingSolutions: { type: [ExistingSolutionSchema], default: [] },

  // 6. Proposed Solution
  solution: {
    overview: String,
    description: String,
    usp: String,
    innovation: String,
    architectureSummary: String,
    workflow: String,
    coreWorkflow: String,
    expectedBenefits: [String],
    successCriteria: [String],
  },

  // 7. Feature Breakdown
  features: { type: [FeatureSchema], default: [] },

  // 8-12. Architecture, Database, Tech, APIs, UI/UX
  architecture: {
    description: String,
    diagram: FileRef,
    dataFlow: {
      description: String,
      diagram: FileRef,
    },
    database: {
      type: { type: String },
      description: String,
      erDiagram: FileRef,
      collections: [String],
      relationships: [String],
      indexes: [String],
      scalabilityNotes: String,
    },
    apiIntegrations: [ApiIntegrationSchema],
    uiUx: {
      figmaUrl: String,
      designSystem: String,
      userFlow: String,
      accessibilityNotes: String,
      screenshots: [FileRef],
    },
  },

  techStack: {
    languages: [String],
    frameworks: [String],
    libraries: [String],
    database: [String],
    cloud: [String],
    apis: [String],
    tools: [String],
    developmentDuration: String,
    categories: {
      frontend: [String],
      backend: [String],
      database: [String],
      aiMl: [String],
      cloud: [String],
      storage: [String],
      authentication: [String],
      deployment: [String],
      apis: [String],
      other: [String],
    },
    infrastructure: {
      hosting: String,
      storage: String,
      cdn: String,
      ciCd: String,
      monitoring: String,
    },
  },

  implementation: {
    folderStructure: String,
    modules: [String],
    screenshots: [FileRef],
    architectureDiagram: FileRef,
    flowDiagram: FileRef,
    githubRepository: String,
  },

  resources: {
    ppt: FileRef,
    documentation: FileRef,
    researchPapers: [FileRef],
    demoVideo: FileRef,
    driveLinks: [String],
    additionalFiles: [FileRef],
  },

  // 14. Presentation & Demo
  presentation: {
    pitchDeck: FileRef,
    notes: String,
    businessModel: String,
    demoInstructions: String,
    liveDemoUrl: String,
    demoVideoUrl: String,
    demoCredentials: String,
    demoNotes: String,
  },

  // 13. Development Journey + 15. Judge Feedback
  developmentJourney: { type: [DevelopmentJourneySchema], default: [] },
  judgeFeedback: { type: [JudgeFeedbackSchema], default: [] },

  // 16. Lessons Learned
  lessonsLearned: {
    challenges: [String],
    mistakes: [String],
    solutions: [String],
    futureImprovements: [String],
    beginnerAdvice: String,
    wentWell: [String],
    failed: [String],
    doDifferently: [String],
    biggestMistake: String,
    biggestAchievement: String,
    featuresRemoved: [String],
    technicalLessons: [String],
    productLessons: [String],
    teamLessons: [String],
    businessLessons: [String],
  },

  // 17. Future Scope
  futureScope: { type: [FutureScopeSchema], default: [] },

  // Categorized file metadata registry
  files: { type: [ProjectFileSchema], default: [] },

  // Rule-based Case File audit (computed on demand, not fabricated AI scores).
  aiReview: {
    status: { type: String, enum: ['ok', 'attention', 'incomplete'], default: 'incomplete' },
    completeness: { type: Number, min: 0, max: 100, default: 0 },
    completeSections: { type: Number, default: 0 },
    totalSections: { type: Number, default: 18 },
    warnings: [String],
    suggestions: [String],
    generatedAt: Date,
  },

  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted', 'learning-only', 'documentation-only', 'campus-only', 'team-only', 'scheduled'],
    default: 'public',
  },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },

  // AI layer — populated by the FastAPI service through the backend orchestrator.
  // AI-generated values live here and never overwrite user-authored fields above.
  ai: {
    status: { type: String, enum: ['idle', 'processing', 'ready', 'failed'], default: 'idle', index: true },
    engine: String,
    model: String,
    summary: String,
    highlights: [String],
    caseFile: {
      problem: String,
      target_users: String,
      research: String,
      solution: String,
      innovation: String,
      architecture: String,
      challenges: [String],
      lessons: [String],
      future_scope: [String],
      team: String,
      existing_solutions: String,
      features: String,
      database: String,
      api_integrations: String,
      ui_ux: String,
      development_journey: String,
      judge_feedback: String,
    },
    metadata: {
      keywords: [String],
      sector: String,
      difficulty: String,
      project_type: String,
      tags: [String],
      learningResources: [String],
      recommendedMentors: [String],
      recommendedResearchPapers: [String],
    },
    techStack: {
      languages: [String],
      frameworks: [String],
      databases: [String],
      cloud: [String],
      tools: [String],
    },
    sector: String,
    embeddingRef: String,
    similarProjects: [{
      projectId: String,
      title: String,
      score: Number,
      similarityScore: Number,
      relationship: String,
      signals: { type: Map, of: Number },
      overlappingSections: [String],
      differences: [String],
      risk: String,
      _id: false,
    }],
    warnings: [String],
    // System 1 — Weakness / Mistake Detector snapshot (stale-serveable).
    weakness: {
      status: { type: String, enum: ['idle', 'processing', 'ready', 'failed'], default: 'idle' },
      stale: { type: Boolean, default: false },
      model: String,
      engine: String,
      report: { type: mongoose.Schema.Types.Mixed, default: null },
      error: String,
      processedAt: Date,
    },
    error: String,
    processedAt: Date,
    attempts: { type: Number, default: 0 },
  },

  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  publishedAt: { type: Date },
}, { timestamps: true });

ProjectSchema.index({
  title: 'text', shortDescription: 'text', oneLineDescription: 'text', hackathonName: 'text',
  category: 'text', domain: 'text',
  'techStack.languages': 'text', 'techStack.frameworks': 'text', organizer: 'text',
});

module.exports = mongoose.model('Project', ProjectSchema);