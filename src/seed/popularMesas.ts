import 'dotenv/config';
import mongoose from 'mongoose';
import { Mesa } from '../models/Mesa';

const mesasIniciais = [
  { numero: 1, capacidade: 2, localizacao: 'salão' },
  { numero: 2, capacidade: 2, localizacao: 'salão' },
  { numero: 3, capacidade: 4, localizacao: 'salão' },
  { numero: 4, capacidade: 4, localizacao: 'salão' },
  { numero: 5, capacidade: 6, localizacao: 'salão' },
  { numero: 6, capacidade: 4, localizacao: 'varanda' },
  { numero: 7, capacidade: 4, localizacao: 'varanda' },
  { numero: 8, capacidade: 2, localizacao: 'varanda' },
  { numero: 9, capacidade: 8, localizacao: 'área interna' },
  { numero: 10, capacidade: 6, localizacao: 'área interna' },
  { numero: 11, capacidade: 4, localizacao: 'mezanino' },
  { numero: 12, capacidade: 10, localizacao: 'mezanino' }
];

(async () => {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/reserva';
  await mongoose.connect(uri);
  console.log('[seed] conectado');

  for (const m of mesasIniciais) {
    await Mesa.updateOne({ numero: m.numero }, { $set: m }, { upsert: true });
  }

  const total = await Mesa.countDocuments();
  console.log(`[seed] mesas cadastradas: ${total}`);
  await mongoose.disconnect();
})();
