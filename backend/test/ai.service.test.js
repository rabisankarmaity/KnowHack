/**
 * Tests for the pure (DB-free) AI orchestration helpers.
 *
 * Run with: npm test  (Node's built-in test runner)
 */
const test = require("node:test");
const assert = require("node:assert");

const { collectSections, collectMetadata, collectFiles } = require("../src/services/ai.service");

const SAMPLE = {
  title: "Triage",
  oneLineDescription: "Fast triage notes for clinics",
  shortDescription: "Mobile app for nurses",
  category: "health",
  domain: "medtech",
  difficulty: "intermediate",
  problem: {
    overview: "Nurses re-enter triage data into several systems.",
    targetUsers: "Nurses in hospital clinics",
    painPoints: ["Manual re-entry", "Lost time"],
    workaround: "Paper notes",
  },
  research: { summary: "Surveyed 40 student nurses", validation: "38 would use it" },
  existingSolutions: [
    { name: "EPIC", description: "hospital admin tool", limitations: "not for students" },
  ],
  solution: { overview: "Auto-fill triage documentation" },
  features: [{ name: "Auto-fill", priority: "must-have", description: "Fills notes" }],
  architecture: {
    description: "React Native + FastAPI",
    apiIntegrations: [{ name: "EHR API", provider: "X", authType: "key" }],
  },
  techStack: {
    languages: ["react"],
    frameworks: ["fastapi"],
    database: ["postgres"],
    categories: { frontend: ["react"] },
    infrastructure: { hosting: "railway" },
  },
  presentation: { businessModel: "saas", demoNotes: "Demo in 3 steps" },
  lessonsLearned: { challenges: ["learned a lot"] },
  developmentJourney: [{ title: "Phase 1", description: "prototype" }],
  judgeFeedback: [{ questions: "How does this scale?" }],
  futureScope: [{ title: "Multi-language", description: "i18n" }],
  owner: { college: "HackU" },
  hackathonName: "HV 2026",
  year: 2026,
  visibility: "private",
};

test("collectSections returns canonical section-aware chunks", () => {
  const s = collectSections(SAMPLE);
  const keys = Object.keys(s);
  for (const expected of [
    "overview",
    "problem",
    "target_users",
    "research",
    "validation",
    "existing_solutions",
    "solution",
    "features",
    "architecture",
    "database",
    "technology",
    "apis",
    "uiux",
    "journey",
    "presentation",
    "business_model",
    "judge_feedback",
    "lessons",
    "future_scope",
  ]) {
    assert.ok(keys.includes(expected), `missing section: ${expected}`);
  }
  assert.match(s.problem, /Nurses re-enter/);
  assert.match(s.technology, /postgres/);
  assert.match(s.lessons, /learned a lot/);
});

test("collectSections never fabricates content", () => {
  const s = collectSections({ title: "Empty-ish", problem: {}, techStack: {} });
  assert.ok(!s.problem.includes("undefined"));
  assert.ok(!s.technology.includes("undefined"));
  assert.strictEqual(s.business_model, "");
});

test("collectMetadata records provenance for embeddings", () => {
  const m = collectMetadata(SAMPLE);
  assert.strictEqual(m.hackathon, "HV 2026");
  assert.strictEqual(m.domain, "medtech");
  assert.strictEqual(m.university, "HackU");
  assert.strictEqual(m.year, 2026);
  assert.strictEqual(m.visibility, "private");
  assert.ok(m.technologies.includes("postgres"));
});

test("collectFiles collects upload URLs with kinds and caps at 6", () => {
  const project = {
    ...SAMPLE,
    resources: {
      ppt: { url: "https://cdn.example/ppt", name: "pitch.pptx" },
      documentation: { url: "https://cdn.example/doc", name: "doc.pdf" },
      researchPapers: [{ url: "https://cdn.example/r1", name: "r1.pdf" }],
      additionalFiles: [
        { url: "https://cdn.example/a1" },
        { url: "https://cdn.example/a2" },
        { url: "https://cdn.example/a3" },
        { url: "https://cdn.example/a4" },
        { url: "https://cdn.example/a5" },
      ],
    },
    research: { files: [{ url: "https://cdn.example/rf", name: "rf.pdf" }] },
  };
  const files = collectFiles(project);
  assert.strictEqual(files.length, 6);
  assert.strictEqual(files[0].kind, "ppt");
  assert.strictEqual(files[1].kind, "pdf");
  assert.ok(files.every((f) => f.url));
});