import { Schema, model, InferSchemaType } from 'mongoose';

const localizacoesValidas = ['salão', 'varanda', 'área interna', 'mezanino'] as const;

const mesaSchema = new Schema(
  {
    numero: {
      type: Number,
      required: [true, 'Informe o número da mesa'],
      unique: true,
      min: [1, 'O número da mesa deve ser positivo']
    },
    capacidade: {
      type: Number,
      required: [true, 'Informe a capacidade da mesa'],
      min: [1, 'A mesa precisa comportar ao menos 1 pessoa'],
      max: [20, 'Capacidade máxima por mesa é 20']
    },
    localizacao: {
      type: String,
      required: true,
      enum: {
        values: localizacoesValidas as unknown as string[],
        message: 'Localização inválida'
      }
    },
    ativa: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'mesas' }
);

export type MesaDoc = InferSchemaType<typeof mesaSchema>;
export const Mesa = model('Mesa', mesaSchema);
