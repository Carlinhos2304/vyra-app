/**
 * DEPRECATED — moved to lib/services/notificationService.ts on 2026-08-04
 * (Planner audit: every other service already lived in lib/services/, this
 * was the one outlier). Kept as a thin re-export so nothing that still
 * imports from this path breaks; every first-party call site in the app has
 * already been updated to import from the new path directly. Safe to delete
 * this file once you've confirmed nothing external references it.
 */
export * from '../lib/services/notificationService';
