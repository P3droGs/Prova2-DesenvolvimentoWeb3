import { Request, Response } from 'express';
import { Mesa } from '../models/Mesa';
import { Reserva } from '../models/Reserva';
import { calcularStatus } from '../utils/statusReserva';
import { registrarEvento } from '../middlewares/logger';

export async function listarMesas(_req: Request, res: Response) {
  try {
    const mesas = await Mesa.find().sort({ numero: 1 }).lean();
    res.json(mesas);
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível carregar as mesas' });
  }
}

export async function criarMesa(req: Request, res: Response) {
  try {
    const nova = await Mesa.create(req.body);
    registrarEvento('mesa.criada', `numero=${nova.numero}`);
    res.status(201).json({ mensagem: 'Mesa cadastrada com sucesso', mesa: nova });
  } catch (err) {
    const e = err as { code?: number; message?: string };
    if (e.code === 11000) {
      return res.status(409).json({ erro: 'Já existe uma mesa com esse número' });
    }
    res.status(400).json({ erro: e.message ?? 'Erro ao cadastrar mesa' });
  }
}

/**
 * Mapa de status de cada mesa em um determinado instante (default: agora).
 * Útil para o mapa visual no frontend.
 */
export async function mapaDeMesas(req: Request, res: Response) {
  try {
    const referencia = req.query.em
      ? new Date(String(req.query.em))
      : new Date();

    const mesas = await Mesa.find({ ativa: true }).sort({ numero: 1 }).lean();
    const reservas = await Reserva.find({
      status: { $ne: 'cancelado' }
    }).lean();

    const mapa = mesas.map(m => {
      const reservasDaMesa = reservas.filter(r => r.numeroMesa === m.numero);

      // procura uma reserva ativa no instante de referência
      const ativa = reservasDaMesa.find(r => {
        const s = calcularStatus(r.dataHora, r.duracaoMinutos ?? 90, r.status as never, referencia);
        return s === 'ocupado';
      });

      // próxima reserva futura
      const proxima = reservasDaMesa
        .filter(r => r.dataHora.getTime() > referencia.getTime())
        .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime())[0];

      let situacao: 'disponivel' | 'reservado' | 'ocupado' = 'disponivel';
      if (ativa) situacao = 'ocupado';
      else if (proxima) situacao = 'reservado';

      return {
        numero: m.numero,
        capacidade: m.capacidade,
        localizacao: m.localizacao,
        situacao,
        reservaAtiva: ativa ?? null,
        proximaReserva: proxima ?? null
      };
    });

    res.json({ referencia, mesas: mapa });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao montar o mapa de mesas' });
  }
}
