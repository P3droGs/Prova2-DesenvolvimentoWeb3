import { Schema, model, InferSchemaType } from 'mongoose';

export const STATUS_RESERVA = ['reservado', 'ocupado', 'finalizado', 'cancelado'] as const;
export type StatusReserva = typeof STATUS_RESERVA[number];

const reservaSchema = new Schema(
  {
    nomeCliente: {
      type: String,
      required: [true, 'Nome do cliente é obrigatório'],
      trim: true,
      minlength: [2, 'Nome muito curto']
    },
    contato: {
      type: String,
      required: [true, 'Contato do cliente é obrigatório'],
      trim: true
    },
    numeroMesa: {
      type: Number,
      required: [true, 'Informe o número da mesa']
    },
    quantidadePessoas: {
      type: Number,
      required: true,
      min: [1, 'Reserva precisa ter ao menos 1 pessoa']
    },
    dataHora: {
      type: Date,
      required: [true, 'Data e hora da reserva são obrigatórias']
    },
    duracaoMinutos: {
      type: Number,
      default: 90,
      min: [30, 'Duração mínima é de 30 minutos']
    },
    observacoes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: STATUS_RESERVA as unknown as string[],
      default: 'reservado'
    }
  },
  { timestamps: true, collection: 'reservas' }
);

// índice para acelerar verificações de conflito de horário
reservaSchema.index({ numeroMesa: 1, dataHora: 1 });

export type ReservaDoc = InferSchemaType<typeof reservaSchema>;
export const Reserva = model('Reserva', reservaSchema);
