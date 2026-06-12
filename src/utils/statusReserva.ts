import { StatusReserva } from '../models/Reserva';

/**
 * Calcula o status da reserva no instante atual.
 * Cancelado é um estado terminal definido pelo usuário e não muda com o tempo.
 */
export function calcularStatus(
  dataHora: Date,
  duracaoMin: number,
  statusAtual: StatusReserva,
  agora: Date = new Date()
): StatusReserva {
  if (statusAtual === 'cancelado') return 'cancelado';

  const inicio = dataHora.getTime();
  const fim = inicio + duracaoMin * 60_000;
  const t = agora.getTime();

  if (t < inicio) return 'reservado';
  if (t >= inicio && t < fim) return 'ocupado';
  return 'finalizado';
}

export function intervalosSobrepoem(
  inicioA: Date, duracaoA: number,
  inicioB: Date, duracaoB: number
): boolean {
  const fimA = inicioA.getTime() + duracaoA * 60_000;
  const fimB = inicioB.getTime() + duracaoB * 60_000;
  return inicioA.getTime() < fimB && inicioB.getTime() < fimA;
}
