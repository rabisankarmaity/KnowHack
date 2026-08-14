import type {
  DevelopmentJourneyDTO,
  ExistingSolutionDTO,
  FeatureDTO,
  FileRef,
  FutureScopeDTO,
  JudgeFeedbackDTO,
  License,
  ProjectDTO,
  TeamMemberDTO,
  Visibility,
} from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Wizard step definitions (the "KnowHack Case File" wizard).
// Design language preserved: left step nav (desktop) + top progress bar.
// ---------------------------------------------------------------------------
export const steps = [
  { key: "basics", title: "Project details & team", desc: "Name, hackathon, team members." },
  { key: "problem", title: "Problem statement", desc: "What problem does it solve and why it matters?" },
  { key: "research", title: "Research & validation", desc: "How you validated the problem." },
  { key: "existing", title: "Existing solutions", desc: "Competitors and what makes you different." },
  { key: "solution", title: "Solution & features", desc: "Your proposal, USP and feature breakdown." },
  { key: "architecture", title: "Architecture & technical", desc: "System design, database, APIs, UI/UX." },
  { key: "files", title: "Files, presentation & demo", desc: "Cover, files, pitch deck and live demo." },
  { key: "journey", title: "Journey, feedback & lessons", desc: "Development timeline, judge feedback, lessons." },
  { key: "ai", title: "AI review", desc: "Completeness audit of your Case File." },
  { key: "visibility", title: "Visibility", desc: "Who can see your Case File." },
  { key: "publish", title: "Publish", desc: "Review the full Case File and publish." },
] as const;

export const FIELD = {
  required: "Required",
  optional: "Optional",
} as const;

// ---------------------------------------------------------------------------
// Form state.
// ---------------------------------------------------------------------------
export interface FormState {
  title: string;
  shortDescription: string;
  oneLineDescription: string;
  hackathonName: string;
  organizer: string;
  year: string;
  category: string;
  domain: string;
  sdgAlignment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  teamName: string;
  projectStatus: "prototype" | "in-progress" | "completed" | "deployed";

  team: TeamMemberDTO[];

  problem: {
    overview: string;
    targetUsers: string;
    whyImportant: string;
    challenges: string[];
    realWorldExamples: string;
    expectedImpact: string;
    severity: "" | "low" | "medium" | "high" | "critical";
    workaround: string;
    affected: string;
    frequency: string;
  };

  research: {
    summary: string;
    methods: string[];
    findings: string;
    validation: string;
    intervieweeCount: string;
    surveyResults: string;
    insights: string[];
    marketObservations: string;
    statistics: string;
    academicReferences: string[];
    researchLinks: string[];
    references: string[];
    files: FileRef[];
  };

  existingSolutions: ExistingSolutionDTO[];

  solution: {
    overview: string;
    description: string;
    usp: string;
    innovation: string;
    coreWorkflow: string;
    expectedBenefits: string[];
    successCriteria: string[];
  };

  features: FeatureDTO[];

  architecture: {
    description: string;
    diagram: FileRef | null;
    dataFlowDescription: string;
    dataFlowDiagram: FileRef | null;
    databaseType: string;
    databaseDescription: string;
    erDiagram: FileRef | null;
    collections: string[];
    relationships: string[];
    indexes: string[];
    scalabilityNotes: string;
    apiIntegrations: {
      name: string;
      purpose: string;
      provider: string;
      documentationUrl: string;
      authType: string;
    }[];
    figmaUrl: string;
    designSystem: string;
    userFlow: string;
    accessibilityNotes: string;
    screenshots: FileRef[];
  };

  techStack: {
    languages: string[];
    frameworks: string[];
    categories: { key: string; label: string; value: string }[];
    infrastructureHosting: string;
    infrastructureStorage: string;
    infrastructureCdn: string;
    infrastructureCiCd: string;
    infrastructureMonitoring: string;
    githubRepository: string;
  };

  presentation: {
    pitchDeck: FileRef | null;
    notes: string;
    businessModel: string;
    demoInstructions: string;
    liveDemoUrl: string;
    demoVideoUrl: string;
    demoCredentials: string;
    demoNotes: string;
  };
  additionalFiles: FileRef[];

  developmentJourney: DevelopmentJourneyDTO[];
  judgeFeedback: JudgeFeedbackDTO[];

  lessons: {
    challenges: string[];
    futureImprovements: string[];
    wentWell: string[];
    failed: string[];
    doDifferently: string[];
    biggestMistake: string;
    biggestAchievement: string;
    featuresRemoved: string[];
    technicalLessons: string[];
    productLessons: string[];
    teamLessons: string[];
    businessLessons: string[];
  };

  futureScope: FutureScopeDTO[];

  visibility: Visibility;
  license: License;
  ownershipConfirmed: boolean;
  copyrightConfirmed: boolean;
  contributorAttribution: boolean;
  scheduledReleaseDate: string;

  cover: FileRef | null;
}

const CSV2 = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
const LINE2 = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

export const emptyTeamMember = (): TeamMemberDTO => ({
  name: "",
  role: "",
  university: "",
  department: "",
  github: "",
  linkedin: "",
  portfolio: "",
  contribution: 0,
});

export const emptyExistingSolution = (): ExistingSolutionDTO => ({
  name: "",
  website: "",
  description: "",
  strengths: "",
  limitations: "",
  difference: "",
  whyNeeded: "",
});

export const emptyFeature = (): FeatureDTO => ({
  name: "",
  description: "",
  problemSolved: "",
  priority: "must-have",
  status: "planned",
  futureImprovement: "",
});

export const emptyJourney = (): DevelopmentJourneyDTO => ({
  phase: "",
  title: "",
  description: "",
  period: "",
  problemsEncountered: "",
  solutionImplemented: "",
  files: [],
});

export const emptyFeedback = (): JudgeFeedbackDTO => ({
  judgeName: "",
  question: "",
  answer: "",
  comment: "",
  score: "",
  strengths: "",
  weaknesses: "",
  suggestions: "",
  overallFeedback: "",
});

export const emptyFutureScope = (): FutureScopeDTO => ({
  title: "",
  description: "",
  priority: "medium",
  timeline: "",
});

export const TECH_CATEGORIES: { key: string; label: string }[] = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "aiMl", label: "AI/ML" },
  { key: "cloud", label: "Cloud" },
  { key: "storage", label: "Storage" },
  { key: "authentication", label: "Authentication" },
  { key: "deployment", label: "Deployment" },
  { key: "apis", label: "APIs" },
  { key: "other", label: "Other" },
];

export const RESEARCH_METHODS = [
  "Market research",
  "User interviews",
  "Surveys",
  "Competitor analysis",
  "Academic research",
  "Online research",
  "Observation",
  "Other",
];

export const initialForm: FormState = {
  title: "",
  shortDescription: "",
  oneLineDescription: "",
  hackathonName: "",
  organizer: "",
  year: String(new Date().getFullYear()),
  category: "",
  domain: "",
  sdgAlignment: "",
  difficulty: "intermediate",
  teamName: "",
  projectStatus: "prototype",
  team: [emptyTeamMember()],
  problem: {
    overview: "",
    targetUsers: "",
    whyImportant: "",
    challenges: [],
    realWorldExamples: "",
    expectedImpact: "",
    severity: "",
    workaround: "",
    affected: "",
    frequency: "",
  },
  research: {
    summary: "",
    methods: [],
    findings: "",
    validation: "",
    intervieweeCount: "",
    surveyResults: "",
    insights: [],
    marketObservations: "",
    statistics: "",
    academicReferences: [],
    researchLinks: [],
    references: [],
    files: [],
  },
  existingSolutions: [],
  solution: {
    overview: "",
    description: "",
    usp: "",
    innovation: "",
    coreWorkflow: "",
    expectedBenefits: [],
    successCriteria: [],
  },
  features: [],
  architecture: {
    description: "",
    diagram: null,
    dataFlowDescription: "",
    dataFlowDiagram: null,
    databaseType: "",
    databaseDescription: "",
    erDiagram: null,
    collections: [],
    relationships: [],
    indexes: [],
    scalabilityNotes: "",
    apiIntegrations: [],
    figmaUrl: "",
    designSystem: "",
    userFlow: "",
    accessibilityNotes: "",
    screenshots: [],
  },
  techStack: {
    languages: [],
    frameworks: [],
    categories: TECH_CATEGORIES.map((c) => ({ key: c.key, label: c.label, value: "" })),
    infrastructureHosting: "",
    infrastructureStorage: "",
    infrastructureCdn: "",
    infrastructureCiCd: "",
    infrastructureMonitoring: "",
    githubRepository: "",
  },
  presentation: {
    pitchDeck: null,
    notes: "",
    businessModel: "",
    demoInstructions: "",
    liveDemoUrl: "",
    demoVideoUrl: "",
    demoCredentials: "",
    demoNotes: "",
  },
  additionalFiles: [],
  developmentJourney: [],
  judgeFeedback: [],
  lessons: {
    challenges: [],
    futureImprovements: [],
    wentWell: [],
    failed: [],
    doDifferently: [],
    biggestMistake: "",
    biggestAchievement: "",
    featuresRemoved: [],
    technicalLessons: [],
    productLessons: [],
    teamLessons: [],
    businessLessons: [],
  },
  futureScope: [],
  visibility: "public",
  license: "all-rights-reserved",
  ownershipConfirmed: false,
  copyrightConfirmed: false,
  contributorAttribution: true,
  scheduledReleaseDate: "",
  cover: null,
};

// ---------------------------------------------------------------------------
// Serialization: FormState -> API payload.
// ---------------------------------------------------------------------------
export function toPayload(form: FormState): Partial<ProjectDTO> {
  const files: ProjectDTO["files"] = [];
  const add = (category: ProjectDTO["files"][number]["category"], ref?: FileRef | null) => {
    if (ref?.url) files.push({ file: ref, category: category || "other" });
  };
  add("cover", form.cover);
  add("architecture", form.architecture.diagram);
  add("architecture", form.architecture.dataFlowDiagram);
  add("database", form.architecture.erDiagram);
  form.architecture.screenshots.forEach((f) => add("ui", f));
  form.additionalFiles.forEach((f) => add("other", f));
  form.research.files.forEach((f) => add("research", f));
  add("presentation", form.presentation.pitchDeck);
  form.developmentJourney.forEach((d) => (d.files || []).forEach((f) => add("other", f)));

  const categoryMap = Object.fromEntries(
    form.techStack.categories.filter((c) => c.key).map((c) => [c.key, CSV2(c.value)]),
  ) as Record<string, string[]>;

  return {
    title: form.title.trim(),
    shortDescription: form.shortDescription.trim(),
    oneLineDescription: form.oneLineDescription.trim(),
    hackathonName: form.hackathonName.trim(),
    organizer: form.organizer.trim(),
    year: form.year ? Number(form.year) : undefined,
    category: form.category.trim(),
    domain: form.domain.trim(),
    sdgAlignment: form.sdgAlignment.trim(),
    difficulty: form.difficulty,
    teamName: form.teamName.trim(),
    projectStatus: form.projectStatus,
    coverImage: form.cover?.url,
    team: form.team.filter((m) => m.name.trim()).map((m) => ({ ...m, contribution: Number(m.contribution) || 0 })),

    problem: {
      overview: form.problem.overview.trim(),
      targetUsers: form.problem.targetUsers.trim(),
      whyImportant: form.problem.whyImportant.trim(),
      challenges: form.problem.challenges,
      realWorldExamples: form.problem.realWorldExamples.trim(),
      expectedImpact: form.problem.expectedImpact.trim(),
      severity: form.problem.severity,
      workaround: form.problem.workaround.trim(),
      affected: form.problem.affected.trim(),
      frequency: form.problem.frequency.trim(),
    },

    research: {
      summary: form.research.summary.trim(),
      methods: form.research.methods,
      findings: form.research.findings.trim(),
      validation: form.research.validation.trim(),
      intervieweeCount: form.research.intervieweeCount ? Number(form.research.intervieweeCount) : undefined,
      surveyResults: form.research.surveyResults.trim(),
      insights: form.research.insights,
      marketObservations: form.research.marketObservations.trim(),
      statistics: form.research.statistics.trim(),
      academicReferences: form.research.academicReferences,
      researchLinks: form.research.researchLinks,
      references: form.research.references,
      files: form.research.files,
    },

    existingSolutions: form.existingSolutions.filter((e) => e.name.trim()),

    solution: {
      overview: form.solution.overview.trim(),
      description: form.solution.description.trim(),
      usp: form.solution.usp.trim(),
      innovation: form.solution.innovation.trim(),
      coreWorkflow: form.solution.coreWorkflow.trim(),
      expectedBenefits: form.solution.expectedBenefits,
      successCriteria: form.solution.successCriteria,
    },

    features: form.features.filter((f) => f.name.trim()),

    architecture: {
      description: form.architecture.description.trim(),
      diagram: form.architecture.diagram || undefined,
      dataFlow: {
        description: form.architecture.dataFlowDescription.trim(),
        diagram: form.architecture.dataFlowDiagram || undefined,
      },
      database: {
        type: form.architecture.databaseType.trim(),
        description: form.architecture.databaseDescription.trim(),
        erDiagram: form.architecture.erDiagram || undefined,
        collections: form.architecture.collections,
        relationships: form.architecture.relationships,
        indexes: form.architecture.indexes,
        scalabilityNotes: form.architecture.scalabilityNotes.trim(),
      },
      apiIntegrations: form.architecture.apiIntegrations.filter((a) => a.name.trim()),
      uiUx: {
        figmaUrl: form.architecture.figmaUrl.trim(),
        designSystem: form.architecture.designSystem.trim(),
        userFlow: form.architecture.userFlow.trim(),
        accessibilityNotes: form.architecture.accessibilityNotes.trim(),
        screenshots: form.architecture.screenshots,
      },
    },

    techStack: {
      languages: form.techStack.languages,
      frameworks: form.techStack.frameworks,
      categories: categoryMap as ProjectDTO["techStack"]["categories"],
      infrastructure: {
        hosting: form.techStack.infrastructureHosting.trim(),
        storage: form.techStack.infrastructureStorage.trim(),
        cdn: form.techStack.infrastructureCdn.trim(),
        ciCd: form.techStack.infrastructureCiCd.trim(),
        monitoring: form.techStack.infrastructureMonitoring.trim(),
      },
    },

    implementation: { githubRepository: form.techStack.githubRepository.trim() },

    resources: { additionalFiles: form.additionalFiles },

    presentation: {
      pitchDeck: form.presentation.pitchDeck || undefined,
      notes: form.presentation.notes.trim(),
      businessModel: form.presentation.businessModel.trim(),
      demoInstructions: form.presentation.demoInstructions.trim(),
      liveDemoUrl: form.presentation.liveDemoUrl.trim(),
      demoVideoUrl: form.presentation.demoVideoUrl.trim(),
      demoCredentials: form.presentation.demoCredentials.trim(),
      demoNotes: form.presentation.demoNotes.trim(),
    },

    developmentJourney: form.developmentJourney.filter((d) => d.phase.trim() || d.description.trim()),
    judgeFeedback: form.judgeFeedback.filter((f) => f.question.trim() || f.comment.trim()),

    lessonsLearned: {
      challenges: form.lessons.challenges,
      futureImprovements: form.lessons.futureImprovements,
      wentWell: form.lessons.wentWell,
      failed: form.lessons.failed,
      doDifferently: form.lessons.doDifferently,
      biggestMistake: form.lessons.biggestMistake.trim(),
      biggestAchievement: form.lessons.biggestAchievement.trim(),
      featuresRemoved: form.lessons.featuresRemoved,
      technicalLessons: form.lessons.technicalLessons,
      productLessons: form.lessons.productLessons,
      teamLessons: form.lessons.teamLessons,
      businessLessons: form.lessons.businessLessons,
    },

    futureScope: form.futureScope.filter((f) => f.title.trim() || f.description.trim()),

    visibility: form.visibility,
    license: form.license,
    ownershipConfirmed: form.ownershipConfirmed,
    copyrightConfirmed: form.copyrightConfirmed,
    contributorAttribution: form.contributorAttribution,
    scheduledReleaseDate: form.scheduledReleaseDate || undefined,
    files,
  };
}

// ---------------------------------------------------------------------------
// Deserialization: ProjectDTO -> FormState (edit mode).
// ---------------------------------------------------------------------------
export function fromProject(p: ProjectDTO): FormState {
  const f = structuredClone(initialForm);
  f.title = p.title || "";
  f.shortDescription = p.shortDescription || "";
  f.oneLineDescription = p.oneLineDescription || "";
  f.hackathonName = p.hackathonName || "";
  f.organizer = p.organizer || "";
  f.year = p.year ? String(p.year) : String(new Date().getFullYear());
  f.category = p.category || "";
  f.domain = p.domain || "";
  f.sdgAlignment = p.sdgAlignment || "";
  f.difficulty = p.difficulty || "intermediate";
  f.teamName = p.teamName || "";
  f.projectStatus = p.projectStatus || "prototype";
  f.team = p.team?.length ? p.team : [emptyTeamMember()];
  f.cover = p.coverImage ? { url: p.coverImage, name: "Cover image" } : null;

  const problem = p.problem || {};
  f.problem = {
    overview: problem.overview || "",
    targetUsers: problem.targetUsers || "",
    whyImportant: problem.whyImportant || "",
    challenges: problem.challenges || [],
    realWorldExamples: problem.realWorldExamples || "",
    expectedImpact: problem.expectedImpact || "",
    severity: problem.severity || "",
    workaround: problem.workaround || "",
    affected: problem.affected || "",
    frequency: problem.frequency || "",
  };

  const r = p.research || {};
  f.research = {
    summary: r.summary || "",
    methods: r.methods || [],
    findings: r.findings || "",
    validation: r.validation || "",
    intervieweeCount: r.intervieweeCount != null ? String(r.intervieweeCount) : "",
    surveyResults: r.surveyResults || "",
    insights: r.insights || [],
    marketObservations: r.marketObservations || "",
    statistics: r.statistics || "",
    academicReferences: r.academicReferences || [],
    researchLinks: r.researchLinks || [],
    references: r.references || [],
    files: r.files || [],
  };

  f.existingSolutions = p.existingSolutions || [];

  const s = p.solution || {};
  f.solution = {
    overview: s.overview || "",
    description: s.description || "",
    usp: s.usp || "",
    innovation: s.innovation || "",
    coreWorkflow: s.coreWorkflow || "",
    expectedBenefits: s.expectedBenefits || [],
    successCriteria: s.successCriteria || [],
  };

  f.features = p.features || [];

  const a = p.architecture || {};
  const db = a.database || {};
  const ui = a.uiUx || {};
  f.architecture = {
    description: a.description || "",
    diagram: a.diagram || null,
    dataFlowDescription: a.dataFlow?.description || "",
    dataFlowDiagram: a.dataFlow?.diagram || null,
    databaseType: db.type || "",
    databaseDescription: db.description || "",
    erDiagram: db.erDiagram || null,
    collections: db.collections || [],
    relationships: db.relationships || [],
    indexes: db.indexes || [],
    scalabilityNotes: db.scalabilityNotes || "",
    apiIntegrations: (a.apiIntegrations || []).map((x) => ({
      name: x.name || "",
      purpose: x.purpose || "",
      provider: x.provider || "",
      documentationUrl: x.documentationUrl || "",
      authType: x.authType || "",
    })),
    figmaUrl: ui.figmaUrl || "",
    designSystem: ui.designSystem || "",
    userFlow: ui.userFlow || "",
    accessibilityNotes: ui.accessibilityNotes || "",
    screenshots: ui.screenshots || [],
  };

  const tc = p.techStack || {};
  const categories = tc.categories || {};
  const infra = tc.infrastructure || {};
  f.techStack = {
    languages: tc.languages || [],
    frameworks: tc.frameworks || [],
    categories: TECH_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      value: (categories[c.key as keyof typeof categories] || []).join(", "),
    })),
    infrastructureHosting: infra.hosting || "",
    infrastructureStorage: infra.storage || "",
    infrastructureCdn: infra.cdn || "",
    infrastructureCiCd: infra.ciCd || "",
    infrastructureMonitoring: infra.monitoring || "",
    githubRepository: p.implementation?.githubRepository || "",
  };

  const pr = p.presentation || {};
  f.presentation = {
    pitchDeck: pr.pitchDeck || null,
    notes: pr.notes || "",
    businessModel: pr.businessModel || "",
    demoInstructions: pr.demoInstructions || "",
    liveDemoUrl: pr.liveDemoUrl || "",
    demoVideoUrl: pr.demoVideoUrl || "",
    demoCredentials: pr.demoCredentials || "",
    demoNotes: pr.demoNotes || "",
  };
  f.additionalFiles = p.resources?.additionalFiles || [];

  f.developmentJourney = p.developmentJourney || [];
  f.judgeFeedback = p.judgeFeedback || [];

  const l = p.lessonsLearned || {};
  f.lessons = {
    challenges: l.challenges || [],
    futureImprovements: l.futureImprovements || [],
    wentWell: l.wentWell || [],
    failed: l.failed || [],
    doDifferently: l.doDifferently || [],
    biggestMistake: l.biggestMistake || "",
    biggestAchievement: l.biggestAchievement || "",
    featuresRemoved: l.featuresRemoved || [],
    technicalLessons: l.technicalLessons || [],
    productLessons: l.productLessons || [],
    teamLessons: l.teamLessons || [],
    businessLessons: l.businessLessons || [],
  };

  f.futureScope = p.futureScope || [];

  f.visibility = p.visibility || "public";
  f.license = p.license || "all-rights-reserved";
  f.ownershipConfirmed = Boolean(p.ownershipConfirmed);
  f.copyrightConfirmed = Boolean(p.copyrightConfirmed);
  f.contributorAttribution = p.contributorAttribution !== false;
  f.scheduledReleaseDate = p.scheduledReleaseDate || "";
  return f;
}

// ---------------------------------------------------------------------------
// Validation.
// ---------------------------------------------------------------------------
const URL_RE = /^https?:\/\/.+\..+/i;

export type FieldHints = Record<string, string>;

export function validateStep(step: number, form: FormState): FieldHints {
  const errs: FieldHints = {};
  const push = (field: string, msg: string) => {
    if (!errs[field]) errs[field] = msg;
  };

  const isUrl = (v: string, field: string) => {
    if (v && !URL_RE.test(v)) push(field, "Enter a valid URL (e.g. https://github.com/you/repo)");
  };

  if (step === 0) {
    if (form.title.trim().length < 3) errs.title = "Project name must be at least 3 characters";
    if (form.title.trim().length > 160) errs.title = "Project name must be at most 160 characters";
    if (form.year !== "" && (Number.isNaN(Number(form.year)) || Number(form.year) < 1990 || Number(form.year) > 2100)) {
      errs.year = "Year must be between 1990 and 2100";
    }
    form.team.forEach((m, i) => {
      if (m.name.trim() && m.name.trim().length > 120) push(`team.${i}.name`, "Name too long (max 120)");
      const c = Number(m.contribution);
      if (m.contribution != null && (Number.isNaN(c) || c < 0 || c > 100)) {
        push(`team.${i}.contribution`, "Contribution must be between 0 and 100");
      }
      isUrl(m.github, `team.${i}.github`);
      isUrl(m.linkedin, `team.${i}.linkedin`);
      isUrl(m.portfolio, `team.${i}.portfolio`);
    });
    const total = form.team.reduce((sum, m) => sum + (Number(m.contribution) || 0), 0);
    if (form.team.some((m) => m.name.trim()) && total !== 100) {
      // Non-blocking hint surfaced on the publish/AI-review step, not an error here.
      if (total > 0) push("teamContribution", `Contributions total ${total}% — aim for 100%`);
    }
  }

  if (step === 3) {
    form.existingSolutions.forEach((e, i) => isUrl(e.website, `existingSolutions.${i}.website`));
  }

  if (step === 5) {
    isUrl(form.architecture.figmaUrl, "architecture.figmaUrl");
    form.architecture.apiIntegrations.forEach((a, i) => isUrl(a.documentationUrl, `apiIntegrations.${i}.documentationUrl`));
  }

  if (step === 6) {
    isUrl(form.techStack.githubRepository, "techStack.githubRepository");
    isUrl(form.presentation.liveDemoUrl, "presentation.liveDemoUrl");
    isUrl(form.presentation.demoVideoUrl, "presentation.demoVideoUrl");
  }

  return errs;
}

// ---------------------------------------------------------------------------
// Client-side completeness preview (mirror of the backend audit).
// ---------------------------------------------------------------------------
export function previewReview(form: FormState): {
  completeness: number;
  warnings: string[];
  suggestions: string[];
} {
  const set = (v?: string | number | null | FileRef | FileRef[]) =>
    Array.isArray(v) ? v.length > 0 : Boolean(typeof v === "string" ? v.trim() : v);
  const checks = [
    set(form.title) && (set(form.shortDescription) || set(form.oneLineDescription)),
    set(form.teamName) || form.team.some((m) => m.name.trim()),
    set(form.problem.overview),
    set(form.research.summary) || set(form.research.findings) || set(form.research.validation) || form.research.methods.length > 0,
    form.existingSolutions.length > 0,
    set(form.solution.overview) || set(form.solution.description),
    form.features.length > 0,
    set(form.architecture.description) || set(form.architecture.dataFlowDescription) || !!form.architecture.diagram,
    set(form.architecture.databaseType) || set(form.architecture.databaseDescription) || set(form.techStack.categories.find((c) => c.key === "database")?.value),
    form.techStack.languages.length > 0 || form.techStack.frameworks.length > 0 || form.techStack.categories.some((c) => c.value.trim()),
    form.architecture.apiIntegrations.length > 0 || false,
    set(form.architecture.figmaUrl) || set(form.architecture.designSystem) || form.architecture.screenshots.length > 0,
    form.developmentJourney.length > 0,
    set(form.presentation.liveDemoUrl) || set(form.presentation.demoVideoUrl) || !!form.presentation.pitchDeck || set(form.presentation.notes),
    form.judgeFeedback.length > 0,
    form.lessons.challenges.length > 0 || form.lessons.wentWell.length > 0 || set(form.lessons.biggestMistake),
    form.futureScope.length > 0 || form.lessons.futureImprovements.length > 0,
    false, // AI Generated Metadata — confirmed by the backend service.
  ];
  const complete = checks.filter(Boolean).length;
  const completeness = Math.round((complete / checks.length) * 100);

  const warnings: string[] = [];
  const suggestions: string[] = [];
  if (!set(form.problem.overview)) { warnings.push("No problem statement"); suggestions.push("Describe the problem your project solves"); }
  if (!set(form.research.validation) && !form.research.methods.length) { warnings.push("No user validation"); suggestions.push("Add user research and validation evidence"); }
  if (form.existingSolutions.length === 0) { warnings.push("No competitor analysis"); suggestions.push("Add a competitor / existing-solutions analysis"); }
  if (!form.architecture.diagram) { warnings.push("No architecture diagram"); suggestions.push("Upload an architecture diagram"); }
  if (form.judgeFeedback.length === 0) { warnings.push("No judge feedback"); suggestions.push("Add judge questions and feedback"); }
  if (form.team.every((m) => !m.name.trim())) { warnings.push("No team members"); suggestions.push("Add your team members"); }
  if (!set(form.presentation.liveDemoUrl) && !set(form.presentation.demoVideoUrl)) { warnings.push("No live demo"); suggestions.push("Add a live demo link or demo video"); }
  if (form.additionalFiles.length === 0 && !form.cover) { warnings.push("No files uploaded"); suggestions.push("Upload a pitch deck or PDF"); }
  if (!set(form.cover)) { warnings.push("No cover image"); suggestions.push("Add a cover image"); }
  if (form.futureScope.length === 0 && form.lessons.futureImprovements.length === 0) { warnings.push("No future scope"); suggestions.push("Describe what comes next"); }
  if (form.lessons.challenges.length === 0 && form.lessons.wentWell.length === 0) { warnings.push("No lessons learned"); suggestions.push("Reflect on challenges and wins"); }
  return { completeness, warnings, suggestions };
}

export function fmtBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const join = (arr: string[], v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
const unjoin = (arr: string[]) => arr.join("\n");

export const lineHelpers = { join, unjoin };
export const csvHelpers = { split: CSV2, unjoin: (arr: string[]) => arr.join(", ") };