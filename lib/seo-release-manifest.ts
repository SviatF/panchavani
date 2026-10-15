/** Central approved-only sitemap input. NO automatic research/prompt output.
 *
 * This repository does not yet implement the independent astronomical, local
 * ritual and human editorial signoff necessary for a public release. The
 * manifest stays EMPTY until a separately reviewed release mechanism exists.
 * All public HTML also retains global noindex in app/layout.tsx.
 */
export type ApprovedSeoRoute={
  path:string;
  lastModified:string; // real editorial change date, not nightly build time
  astronomyEvidenceHash:string;
  editorialReviewer:string;
  scienceReviewer:string;
  sourceIds:string[];
};
const MANUALLY_APPROVED_ROUTES:ReadonlyArray<ApprovedSeoRoute>=Object.freeze([]);
export function approvedSeoRoutes():ReadonlyArray<ApprovedSeoRoute>{
  // No content-based auto-approval, date permutations, preview entries or
  // noindex routes. Only an explicitly audited list may ever be eligible.
  return MANUALLY_APPROVED_ROUTES;
}
