import { Router } from 'express';
import { healthRouter } from './health.route';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);

// Feature routers mount here: /paths, /techniques, /notes, /auth, /sync
