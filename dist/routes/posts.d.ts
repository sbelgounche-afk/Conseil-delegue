import express, { Request, Response, NextFunction } from 'express';
declare const router: import("express-serve-static-core").Router;
interface AuthRequest extends Request {
    userId?: number;
}
declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => express.Response<any, Record<string, any>> | undefined;
export default router;
export { authenticate, AuthRequest };
//# sourceMappingURL=posts.d.ts.map