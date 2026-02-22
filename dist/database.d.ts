import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
/**
 * Initializes the database.
 * This function runs when the server starts.
 */
export declare function initDatabase(): Promise<void>;
export { prisma as db };
//# sourceMappingURL=database.d.ts.map