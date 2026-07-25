// The scholarship catalog now lives in the Supabase `scholarships` table
// (single source of truth, read via fetchScholarships() in api/workspace.js).
// Only the filter labels remain here as a static UI constant.

export const SCHOLARSHIP_TYPES = ['All', 'Full Ride', 'Merit', 'Need-Based', 'Fellowship', 'Country-Specific'];
