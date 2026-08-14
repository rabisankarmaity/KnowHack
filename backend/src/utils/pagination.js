function parsePagination(query, { defaultLimit = 12, maxLimit = 60 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
function buildPagination(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
module.exports = { parsePagination, buildPagination };
