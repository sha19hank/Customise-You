import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => res.json({ message: 'Payment routes' }));
export default router;
