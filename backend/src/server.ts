import './lib/dns-patch.js';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './lib/env.js';
import { errorHandler } from './lib/errors.js';
import { teamMembersRouter } from './routes/team-members.js';
import { projectsRouter } from './routes/projects.js';
import { callsRouter } from './routes/calls.js';

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, env: env.NODE_ENV });
});

app.use('/api/team-members', teamMembersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', callsRouter);

app.use(errorHandler);

const port = parseInt(env.PORT, 10);
app.listen(port, () => {
  console.log(`🚀 CallSync backend rodando em http://localhost:${port}`);
  console.log(`   Health: http://localhost:${port}/health`);
});
