/**
 * Project visibility rules shared by the project service (Case File reads) and
 * the AI service (allow-lists for RAG / similarity). Centralising them here
 * avoids a project.service <-> ai.service import cycle.
 */

function isViewerProject(p, viewerId) {
  return Boolean(viewerId && p && String(p.owner) === String(viewerId));
}

/** Returns true when `p` (already fetched) is readable by `viewerId`. */
function canView(p, viewerId, viewerRole) {
  if (!p) return false;
  const isOwner = isViewerProject(p, viewerId);
  if (p.status !== 'published' && !isOwner) return false;

  switch (p.visibility) {
    case 'public':
    case 'unlisted':
    case 'learning-only':
    case 'documentation-only':
      return true;
    case 'campus-only':
      // No formal university-verification flag yet: only owner/admin may see
      // campus-only Case Files (matches the existing behaviour in project.service).
      return isOwner || viewerRole === 'admin';
    case 'team-only':
      // No collaborator model yet: the owner/contributors are the team.
      return isOwner || viewerRole === 'admin';
    case 'scheduled':
      if (p.scheduledReleaseDate && new Date(p.scheduledReleaseDate) > new Date()) {
        return isOwner || viewerRole === 'admin';
      }
      return true;
    case 'private':
    default:
      return isOwner || viewerRole === 'admin';
  }
}

/**
 * Deterministic filter for "anonymous" visibility. Used by hydrate() when
 * hydrating AI similarity hits for a request that carries no user context.
 */
function isAnonymouslyVisible(p) {
  if (!p || p.status !== 'published') return false;
  if (['public', 'unlisted', 'learning-only', 'documentation-only'].includes(p.visibility)) return true;
  if (p.visibility === 'scheduled') {
    return !p.scheduledReleaseDate || new Date(p.scheduledReleaseDate) <= new Date();
  }
  return false;
}

module.exports = { isViewerProject, canView, isAnonymouslyVisible };