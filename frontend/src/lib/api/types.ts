// Shared API types matching the Express/MongoDB backend.

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserDTO {
  id: string;
  _id?: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  college?: string;
  degree?: string;
  skills?: string[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  role: "guest" | "student" | "creator" | "admin";
  contributionScore?: number;
  badges?: string[];
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileRef {
  url: string;
  publicId?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

export type Visibility =
  | "public"
  | "private"
  | "unlisted"
  | "learning-only"
  | "documentation-only"
  | "campus-only"
  | "team-only"
  | "scheduled";

export type ProjectStatus = "draft" | "published" | "archived";
export type License =
  "all-rights-reserved" | "mit" | "apache-2.0" | "creative-commons" | "learning-only";

export interface TeamMemberDTO {
  _id?: string;
  name: string;
  role?: string;
  university?: string;
  department?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  contribution?: number;
}

export interface ExistingSolutionDTO {
  _id?: string;
  name: string;
  website?: string;
  description?: string;
  strengths?: string;
  limitations?: string;
  difference?: string;
  whyNeeded?: string;
}

export interface FeatureDTO {
  _id?: string;
  name: string;
  description?: string;
  problemSolved?: string;
  priority?: "must-have" | "should-have" | "could-have" | "future";
  status?: "planned" | "in-development" | "completed" | "future";
  futureImprovement?: string;
}

export interface ApiIntegrationDTO {
  _id?: string;
  name?: string;
  purpose?: string;
  provider?: string;
  documentationUrl?: string;
  authType?: string;
}

export interface DevelopmentJourneyDTO {
  _id?: string;
  phase?: string;
  title?: string;
  description?: string;
  period?: string;
  problemsEncountered?: string;
  solutionImplemented?: string;
  files?: FileRef[];
}

export interface JudgeFeedbackDTO {
  _id?: string;
  judgeName?: string;
  question?: string;
  answer?: string;
  comment?: string;
  score?: string;
  strengths?: string;
  weaknesses?: string;
  suggestions?: string;
  overallFeedback?: string;
}

export interface FutureScopeDTO {
  _id?: string;
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  timeline?: string;
}

export interface ProjectFileDTO {
  file: FileRef;
  category?:
    | "cover"
    | "architecture"
    | "database"
    | "ui"
    | "presentation"
    | "documentation"
    | "source"
    | "demo"
    | "research"
    | "other";
  uploadedAt?: string;
}

export interface AiReviewDTO {
  status: "ok" | "attention" | "incomplete";
  completeness: number;
  completeSections: number;
  totalSections: number;
  warnings: string[];
  suggestions: string[];
  generatedAt?: string;
}

export interface ProjectDTO {
  _id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  oneLineDescription?: string;
  coverImage?: string;
  thumbnail?: string;
  hackathonName?: string;
  organizer?: string;
  year?: number;
  category?: string;
  domain?: string;
  sdgAlignment?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  teamSize?: number;
  teamName?: string;
  projectStatus?: "prototype" | "in-progress" | "completed" | "deployed";
  license?: License;
  ownershipConfirmed?: boolean;
  copyrightConfirmed?: boolean;
  contributorAttribution?: boolean;
  scheduledReleaseDate?: string;
  team?: TeamMemberDTO[];
  problem?: {
    overview?: string;
    targetUsers?: string;
    whyImportant?: string;
    challenges?: string[];
    realWorldExamples?: string;
    expectedImpact?: string;
    severity?: "" | "low" | "medium" | "high" | "critical";
    workaround?: string;
    affected?: string;
    frequency?: string;
    painPoints?: string[];
    existingSolutions?: string[];
    limitations?: string[];
  };
  research?: {
    summary?: string;
    methods?: string[];
    findings?: string;
    validation?: string;
    intervieweeCount?: number;
    surveyResults?: string;
    insights?: string[];
    marketObservations?: string;
    statistics?: string;
    academicReferences?: string[];
    researchLinks?: string[];
    files?: FileRef[];
    survey?: string;
    competitorAnalysis?: string;
    marketResearch?: string;
    references?: string[];
    researchPdf?: FileRef;
  };
  existingSolutions?: ExistingSolutionDTO[];
  solution?: {
    overview?: string;
    description?: string;
    usp?: string;
    innovation?: string;
    architectureSummary?: string;
    workflow?: string;
    coreWorkflow?: string;
    expectedBenefits?: string[];
    successCriteria?: string[];
  };
  features?: FeatureDTO[];
  architecture?: {
    description?: string;
    diagram?: FileRef;
    dataFlow?: { description?: string; diagram?: FileRef };
    database?: {
      type?: string;
      description?: string;
      erDiagram?: FileRef;
      collections?: string[];
      relationships?: string[];
      indexes?: string[];
      scalabilityNotes?: string;
    };
    apiIntegrations?: ApiIntegrationDTO[];
    uiUx?: {
      figmaUrl?: string;
      designSystem?: string;
      userFlow?: string;
      accessibilityNotes?: string;
      screenshots?: FileRef[];
    };
  };
  techStack?: {
    languages?: string[];
    frameworks?: string[];
    libraries?: string[];
    database?: string[];
    cloud?: string[];
    apis?: string[];
    tools?: string[];
    developmentDuration?: string;
    categories?: Record<
      | "frontend"
      | "backend"
      | "database"
      | "aiMl"
      | "cloud"
      | "storage"
      | "authentication"
      | "deployment"
      | "apis"
      | "other",
      string[]
    >;
    infrastructure?: {
      hosting?: string;
      storage?: string;
      cdn?: string;
      ciCd?: string;
      monitoring?: string;
    };
  };
  implementation?: {
    folderStructure?: string;
    modules?: string[];
    screenshots?: FileRef[];
    architectureDiagram?: FileRef;
    flowDiagram?: FileRef;
    githubRepository?: string;
  };
  resources?: {
    ppt?: FileRef;
    documentation?: FileRef;
    researchPapers?: FileRef[];
    demoVideo?: FileRef;
    driveLinks?: string[];
    additionalFiles?: FileRef[];
  };
  presentation?: {
    pitchDeck?: FileRef;
    notes?: string;
    businessModel?: string;
    demoInstructions?: string;
    liveDemoUrl?: string;
    demoVideoUrl?: string;
    demoCredentials?: string;
    demoNotes?: string;
  };
  developmentJourney?: DevelopmentJourneyDTO[];
  judgeFeedback?: JudgeFeedbackDTO[];
  lessonsLearned?: {
    challenges?: string[];
    mistakes?: string[];
    solutions?: string[];
    futureImprovements?: string[];
    beginnerAdvice?: string;
    wentWell?: string[];
    failed?: string[];
    doDifferently?: string[];
    biggestMistake?: string;
    biggestAchievement?: string;
    featuresRemoved?: string[];
    technicalLessons?: string[];
    productLessons?: string[];
    teamLessons?: string[];
    businessLessons?: string[];
  };
  futureScope?: FutureScopeDTO[];
  files?: ProjectFileDTO[];
  aiReview?: AiReviewDTO;
  visibility?: Visibility;
  status?: ProjectStatus;
  ai?: AiInsights;
  owner: string | UserDTO;
  views?: number;
  likes?: number;
  bookmarks?: number;
  downloads?: number;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookmarkDTO {
  _id: string;
  userId: string;
  projectId: ProjectDTO | string;
  createdAt?: string;
}

export interface HackathonDTO {
  _id: string;
  name: string;
  organizer?: string;
  date?: string;
  location?: string;
  prize?: string;
  description?: string;
  websiteUrl?: string;
}

// ---- AI layer (served by the backend, produced by the FastAPI AI service) ----

export type AiStatus = "idle" | "processing" | "ready" | "failed";

export interface WeaknessItemDTO {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  evidence: string;
  why_it_matters: string;
  recommended_action: string;
  priority: "low" | "medium" | "high";
}

export interface WeaknessReportDTO {
  overall_score: number;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  strengths: string[];
  weaknesses: WeaknessItemDTO[];
  missing_sections: string[];
  scope_risks: string[];
  technical_risks: string[];
  security_risks: string[];
  business_risks: string[];
  quick_fixes: string[];
  before_submission: string[];
}

export interface WeaknessState {
  status: AiStatus;
  stale?: boolean;
  model?: string;
  engine?: string;
  report?: WeaknessReportDTO;
  error?: string | null;
  processedAt?: string;
}

export interface MentorEvidenceDTO {
  project_id: string;
  title?: string;
  section?: string;
  text?: string;
}

export interface MentorAlternativeDTO {
  option: string;
  trade_off?: string;
}

export interface MentorAnswerDTO {
  project_id?: string | null;
  question: string;
  understanding: string;
  decision: string;
  considerations: string[];
  evidence: MentorEvidenceDTO[];
  alternatives: MentorAlternativeDTO[];
  tradeoffs: string[];
  recommendation: string;
  next_actions: string[];
  follow_up_question: string;
  response: string;
  grounded: boolean;
  sources: MentorEvidenceDTO[];
  model: string;
  engine: "llm" | "fallback";
}

export interface AiCaseFile {
  problem?: string;
  target_users?: string;
  research?: string;
  solution?: string;
  innovation?: string;
  architecture?: string;
  challenges?: string[];
  lessons?: string[];
  future_scope?: string[];
  team?: string;
  existing_solutions?: string;
  features?: string;
  database?: string;
  api_integrations?: string;
  ui_ux?: string;
  development_journey?: string;
  judge_feedback?: string;
}

export interface AiInsights {
  status: AiStatus;
  engine?: "llm" | "fallback";
  model?: string;
  summary?: string;
  highlights?: string[];
  caseFile?: AiCaseFile;
  metadata?: {
    keywords?: string[];
    sector?: string;
    difficulty?: string;
    project_type?: string;
    tags?: string[];
    learningResources?: string[];
    recommendedMentors?: string[];
    recommendedResearchPapers?: string[];
  };
  techStack?: {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    cloud?: string[];
    tools?: string[];
  };
  sector?: string;
  embeddingRef?: string;
  similarProjects?: {
    projectId: string;
    title?: string;
    score: number;
    similarityScore?: number;
    relationship?: string;
    signals?: Record<string, number>;
    overlappingSections?: string[];
    differences?: string[];
    risk?: string;
  }[];
  weakness?: WeaknessState;
  warnings?: string[];
  error?: string | null;
  processedAt?: string;
  attempts?: number;
}

export interface SimilarProjectDTO {
  _id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
  thumbnail?: string;
  category?: string;
  hackathonName?: string;
  year?: number;
  views?: number;
  score: number;
  similarityScore?: number;
  relationship?: string;
  signals?: Record<string, number>;
  overlappingSections?: string[];
  differences?: string[];
  risk?: string;
}
