declare const router: import("express-serve-static-core").Router;
/**
 * Ensures a user belongs to the 3 mandatory default groups:
 * 1. GLOBAL (everyone)
 * 2. SCHOOL (everyone from the same school)
 * 3. LEVEL (everyone from the same grade)
 * Also ensures all admins are in these groups.
 */
export declare function ensureUserInDefaultGroups(userId: number): Promise<void>;
export default router;
//# sourceMappingURL=groups.d.ts.map