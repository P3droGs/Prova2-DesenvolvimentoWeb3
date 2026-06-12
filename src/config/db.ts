import mongoose from 'mongoose';

export async function conectarBanco(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    console.log('[db] conexão estabelecida com o MongoDB');
  } catch (err) {
    console.error('[db] falha ao conectar:', (err as Error).message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] conexão perdida');
  });
}
