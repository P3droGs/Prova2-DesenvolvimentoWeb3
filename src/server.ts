import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import { conectarBanco } from './config/db';
import { logger } from './middlewares/logger';
import mesaRoutes from './routes/mesaRoutes';
import reservaRoutes from './routes/reservaRoutes';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/reserva';

app.use(cors());
app.use(express.json());
app.use(logger);

// API
app.use('/api/mesas', mesaRoutes);
app.use('/api/reservas', reservaRoutes);

// Frontend estático
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// Healthcheck
app.get('/api/saude', (_req, res) => {
  res.json({ ok: true, agora: new Date().toISOString() });
});

// Handler genérico (404 da API)
app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

(async () => {
  await conectarBanco(MONGO_URI);
  app.listen(PORT, () => {
    console.log(`\n  Bistrô Reservas rodando em http://localhost:${PORT}\n`);
  });
})();
