import { Router } from 'express';
import { authMiddleware } from './middleware/auth';
import { spacesRouter } from './routes/spaces';
import { tasksRouter } from './routes/tasks';
import { goalsRouter } from './routes/goals';
import { membersRouter } from './routes/members';
import { statsRouter } from './routes/stats';
import { authRouter } from './routes/auth';
import { storiesRouter } from './routes/stories';

export function setupApiRoutes() {
  const router = Router();

  // Auth routes (require authentication)
  router.use('/auth', authMiddleware, authRouter);

  // Protected routes
  router.use(authMiddleware);
  router.use('/spaces', spacesRouter);
  router.use('/tasks', tasksRouter);
  router.use('/goals', goalsRouter);
  router.use('/members', membersRouter);
  router.use('/stats', statsRouter);
  router.use('/stories', storiesRouter);

  return router;
}
