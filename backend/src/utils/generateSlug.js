const { v4: uuidv4 } = require('uuid');
function slugify(text) {
  return String(text || '')
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}
function uniqueSlug(text) {
  const base = slugify(text) || 'project';
  return `${base}-${uuidv4().slice(0, 6)}`;
}
module.exports = { slugify, uniqueSlug };
