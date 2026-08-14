const { body, param, query } = require('express-validator');

const URL_MSG = 'Must be a valid URL (must start with http:// or https://)';

const isUrl = (field, optional = true) => {
  const rule = optional
    ? body(field).optional({ values: 'falsy' }).isURL({ require_protocol: true })
    : body(field).isURL({ require_protocol: true });
  return rule.withMessage(URL_MSG);
};

const stringArr = (field, maxLen = 4000) =>
  body(field).optional({ values: 'falsy' }).isArray({ max: 200 }).withMessage('Must be an array')
    .custom((arr) => (arr || []).every((v) => typeof v === 'string' && v.length <= maxLen))
    .withMessage(`Each value must be text (max ${maxLen} characters)`);

const VISIBILITIES = [
  'public', 'private', 'unlisted', 'learning-only', 'documentation-only',
  'campus-only', 'team-only', 'scheduled',
];
const LICENSES = [
  'all-rights-reserved', 'mit', 'apache-2.0', 'creative-commons', 'learning-only',
];
const PRIORITIES = ['must-have', 'should-have', 'could-have', 'future'];
const FEATURE_STATUSES = ['planned', 'in-development', 'completed', 'future'];
const SEVERITIES = ['', 'low', 'medium', 'high', 'critical'];
const SCOPE_PRIORITIES = ['low', 'medium', 'high'];
const FILE_CATEGORIES = [
  'cover', 'architecture', 'database', 'ui', 'presentation', 'documentation', 'source', 'demo', 'research', 'other',
];

const commonRules = [
  body('title').optional().isString().trim().isLength({ min: 3, max: 160 })
    .withMessage('Project name must be between 3 and 160 characters')
    .bail(),
  body('shortDescription').optional({ values: 'falsy' }).isString().isLength({ max: 300 })
    .withMessage('Short description must be at most 300 characters'),
  body('oneLineDescription').optional({ values: 'falsy' }).isString().isLength({ max: 200 })
    .withMessage('One-line description must be at most 200 characters'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('visibility').optional().isIn(VISIBILITIES)
    .withMessage('Visibility must be one of: ' + VISIBILITIES.join(', ')),
  body('license').optional().isIn(LICENSES)
    .withMessage('License must be one of: ' + LICENSES.join(', ')),
  body('ownershipConfirmed').optional().isBoolean().withMessage('Must be true or false'),
  body('copyrightConfirmed').optional().isBoolean().withMessage('Must be true or false'),
  body('contributorAttribution').optional().isBoolean().withMessage('Must be true or false'),
  body('status').optional().isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  body('teamSize').optional().isInt({ min: 1, max: 20 })
    .withMessage('Team size must be a whole number between 1 and 20'),
  body('year').optional().isInt({ min: 1990, max: 2100 })
    .withMessage('Year must be between 1990 and 2100'),
  body('scheduledReleaseDate').optional({ values: 'falsy' }).isISO8601()
    .withMessage('Scheduled release date must be a valid date'),

  // ---- Team ----
  body('team').optional().isArray({ max: 50 }).withMessage('Team must be an array (max 50 members)'),
  body('team.*.name').optional({ values: 'falsy' }).isString().trim().isLength({ min: 1, max: 120 })
    .withMessage('Each team member needs a name (max 120 characters)'),
  body('team.*.contribution').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 })
    .withMessage('Contribution must be a percentage between 0 and 100'),
  isUrl('team.*.github'),
  isUrl('team.*.linkedin'),
  isUrl('team.*.portfolio'),

  // ---- Problem ----
  body('problem.severity').optional({ values: 'falsy' }).isIn(SEVERITIES)
    .withMessage('Severity must be low, medium, high, or critical'),
  stringArr('problem.challenges'),
  stringArr('problem.painPoints'),
  stringArr('problem.existingSolutions'),
  stringArr('problem.limitations'),

  // ---- Research ----
  body('research.methods').optional().isArray({ max: 30 }).withMessage('Research methods must be an array'),
  body('research.intervieweeCount').optional({ values: 'falsy' }).isInt({ min: 0, max: 100000 })
    .withMessage('Interviewee count must be a non-negative whole number'),
  stringArr('research.insights'),
  stringArr('research.academicReferences'),
  stringArr('research.researchLinks', 2000),
  stringArr('research.references', 2000),

  // ---- Existing solutions ----
  body('existingSolutions').optional().isArray({ max: 60 }).withMessage('Must be an array (max 60)'),
  body('existingSolutions.*.name').optional({ values: 'falsy' }).isString().trim().isLength({ min: 1, max: 200 })
    .withMessage('Each existing solution needs a name'),
  isUrl('existingSolutions.*.website'),

  // ---- Features ----
  body('features').optional().isArray({ max: 100 }).withMessage('Must be an array (max 100)'),
  body('features.*.name').optional({ values: 'falsy' }).isString().trim().isLength({ min: 1, max: 200 })
    .withMessage('Each feature needs a name'),
  body('features.*.priority').optional({ values: 'falsy' }).isIn(PRIORITIES)
    .withMessage('Priority must be must-have, should-have, could-have, or future'),
  body('features.*.status').optional({ values: 'falsy' }).isIn(FEATURE_STATUSES)
    .withMessage('Status must be planned, in-development, completed, or future'),

  // ---- Solution ----
  stringArr('solution.expectedBenefits'),
  stringArr('solution.successCriteria'),

  // ---- Architecture / Tech ----
  isUrl('architecture.uiUx.figmaUrl'),
  isUrl('architecture.apiIntegrations.*.documentationUrl'),
  stringArr('architecture.database.collections'),
  stringArr('architecture.database.relationships'),
  stringArr('architecture.database.indexes'),
  stringArr('techStack.categories.frontend'),
  stringArr('techStack.categories.backend'),
  stringArr('techStack.categories.database'),
  stringArr('techStack.categories.aiMl'),
  stringArr('techStack.categories.cloud'),
  stringArr('techStack.categories.storage'),
  stringArr('techStack.categories.authentication'),
  stringArr('techStack.categories.deployment'),
  stringArr('techStack.categories.apis'),
  stringArr('techStack.categories.other'),

  isUrl('implementation.githubRepository'),
  isUrl('presentation.liveDemoUrl'),
  isUrl('presentation.demoVideoUrl'),
  isUrl('resources.driveLinks.*'),

  // ---- Development journey / judge feedback / future scope ----
  body('developmentJourney').optional().isArray({ max: 100 }).withMessage('Must be an array (max 100)'),
  body('judgeFeedback').optional().isArray({ max: 100 }).withMessage('Must be an array (max 100)'),
  body('judgeFeedback.*.score').optional({ values: 'falsy' }).isString().isLength({ max: 40 })
    .withMessage('Judge score must be short text (max 40 characters)'),
  body('futureScope').optional().isArray({ max: 60 }).withMessage('Must be an array (max 60)'),
  body('futureScope.*.priority').optional({ values: 'falsy' }).isIn(SCOPE_PRIORITIES)
    .withMessage('Future scope priority must be low, medium, or high'),

  // ---- Lessons learned extras ----
  stringArr('lessonsLearned.wentWell'),
  stringArr('lessonsLearned.failed'),
  stringArr('lessonsLearned.doDifferently'),
  stringArr('lessonsLearned.featuresRemoved'),
  stringArr('lessonsLearned.technicalLessons'),
  stringArr('lessonsLearned.productLessons'),
  stringArr('lessonsLearned.teamLessons'),
  stringArr('lessonsLearned.businessLessons'),

  // ---- Categorized file registry ----
  body('files').optional().isArray({ max: 60 }).withMessage('Must be an array (max 60)'),
  body('files.*.category').optional({ values: 'falsy' }).isIn(FILE_CATEGORIES)
    .withMessage('File category is invalid'),
];

const createRules = [
  body('title').isString().trim().isLength({ min: 3, max: 160 })
    .withMessage('Project name must be between 3 and 160 characters'),
  ...commonRules,
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid project id'),
  ...commonRules,
];

const listRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 60 }),
  query('sort').optional().isIn(['newest', 'oldest', 'views', 'bookmarks']),
];

module.exports = { createRules, updateRules, listRules, VISIBILITIES, LICENSES };