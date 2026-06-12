import { Request, Response } from 'express';
import { Reserva, StatusReserva } from '../models/Reserva';
import { Mesa } from '../models/Mesa';
import { calcularStatus, intervalosSobrepoem } from '../utils/statusReserva';
import { registrarEvento } from '../middlewares/logger';

const DURACAO_PADRAO = Number(process.env.DURACAO_PADRAO_MIN ?? 90);
const ANTECEDENCIA_MIN = Number(process.env.ANTECEDENCIA_MIN_MIN ?? 60);

function projetarStatus(r: any): any {
  const status = calcularStatus(r.dataHora, r.duracaoMinutos ?? 90, r.status);
  return { ...r, status };
}

export async function criarReserva(req: Request, res: Response) {
  try {
    const {
      nomeCliente,
      contato,
      numeroMesa,
      quantidadePessoas,
      dataHora,
      duracaoMinutos,
      observacoes
    } = req.body;

    if (!nomeCliente || !contato || !numeroMesa || !quantidadePessoas || !dataHora) {
      return res.status(400).json({ erro: 'Campos obrigatórios não preenchidos' });
    }

    const inicio = new Date(dataHora);
    if (isNaN(inicio.getTime())) {
      return res.status(400).json({ erro: 'Data e hora inválidas' });
    }

    const duracao = Number(duracaoMinutos) > 0 ? Number(duracaoMinutos) : DURACAO_PADRAO;

    // regra: antecedência mínima (com folga de 1 min p/ absorver latência da rede)
    const minutosAteReserva = (inicio.getTime() - Date.now()) / 60_000;
    if (minutosAteReserva < ANTECEDENCIA_MIN - 1) {
      return res.status(400).json({
        erro: `A reserva precisa ser feita com no mínimo ${ANTECEDENCIA_MIN} minutos de antecedência`
      });
    }

    // regra: mesa existe e comporta o grupo
    const mesa = await Mesa.findOne({ numero: Number(numeroMesa), ativa: true });
    if (!mesa) {
      return res.status(404).json({ erro: `Mesa ${numeroMesa} não encontrada` });
    }
    if (Number(quantidadePessoas) > mesa.capacidade) {
      return res.status(400).json({
        erro: `A mesa ${mesa.numero} comporta no máximo ${mesa.capacidade} pessoas`
      });
    }

    // regra: sem conflito de horário
    const candidatas = await Reserva.find({
      numeroMesa: Number(numeroMesa),
      status: { $nin: ['cancelado', 'finalizado'] }
    });

    const colisao = candidatas.find(r =>
      intervalosSobrepoem(inicio, duracao, r.dataHora, r.duracaoMinutos ?? 90)
    );
    if (colisao) {
      return res.status(409).json({
        erro: 'Já existe uma reserva para esta mesa no horário informado',
        conflito: colisao
      });
    }

    const nova = await Reserva.create({
      nomeCliente,
      contato,
      numeroMesa: Number(numeroMesa),
      quantidadePessoas: Number(quantidadePessoas),
      dataHora: inicio,
      duracaoMinutos: duracao,
      observacoes: observacoes ?? ''
    });

    registrarEvento('reserva.criada', `mesa=${nova.numeroMesa} cliente=${nova.nomeCliente}`);
    res.status(201).json({ mensagem: 'Reserva registrada com sucesso', reserva: nova });
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível registrar a reserva' });
  }
}

export async function listarReservas(req: Request, res: Response) {
  try {
    const { cliente, mesa, data, status } = req.query;
    const filtro: Record<string, unknown> = {};

    if (cliente) filtro.nomeCliente = { $regex: String(cliente), $options: 'i' };
    if (mesa) filtro.numeroMesa = Number(mesa);

    if (data) {
      const d = new Date(String(data));
      if (!isNaN(d.getTime())) {
        const inicio = new Date(d); inicio.setHours(0, 0, 0, 0);
        const fim = new Date(d); fim.setHours(23, 59, 59, 999);
        filtro.dataHora = { $gte: inicio, $lte: fim };
      }
    }

    const reservas = await Reserva.find(filtro).sort({ dataHora: 1 }).lean();
    let projetadas = reservas.map(projetarStatus);
    // status é derivado em tempo real; pós-filtra para não divergir do exibido na UI
    if (status) projetadas = projetadas.filter(r => r.status === status);
    res.json(projetadas);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar reservas' });
  }
}

export async function obterReserva(req: Request, res: Response) {
  try {
    const r = await Reserva.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ erro: 'Reserva não encontrada' });
    res.json(projetarStatus(r));
  } catch (err) {
    res.status(400).json({ erro: 'ID inválido' });
  }
}

export async function atualizarReserva(req: Request, res: Response) {
  try {
    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada' });

    const statusReal = calcularStatus(
      reserva.dataHora,
      reserva.duracaoMinutos ?? DURACAO_PADRAO,
      reserva.status as StatusReserva
    );
    if (statusReal === 'cancelado' || statusReal === 'finalizado') {
      return res.status(409).json({
        erro: `Não é possível editar uma reserva ${statusReal}`
      });
    }

    const {
      nomeCliente,
      contato,
      numeroMesa,
      quantidadePessoas,
      dataHora,
      duracaoMinutos,
      observacoes
    } = req.body;

    const novaMesaNum = numeroMesa != null ? Number(numeroMesa) : reserva.numeroMesa;
    const novaQtd = quantidadePessoas != null ? Number(quantidadePessoas) : reserva.quantidadePessoas;
    const novaData = dataHora ? new Date(dataHora) : reserva.dataHora;
    const novaDuracao = duracaoMinutos != null ? Number(duracaoMinutos) : (reserva.duracaoMinutos ?? DURACAO_PADRAO);

    if (isNaN(novaData.getTime())) {
      return res.status(400).json({ erro: 'Data e hora inválidas' });
    }

    // antecedência só vale quando a data realmente mudou — o form do front
    // reenvia dataHora mesmo em edições só de nome/contato/observação
    const dataMudou = dataHora && novaData.getTime() !== reserva.dataHora.getTime();
    if (dataMudou && (novaData.getTime() - Date.now()) / 60_000 < ANTECEDENCIA_MIN - 1) {
      return res.status(400).json({
        erro: `A reserva precisa ter no mínimo ${ANTECEDENCIA_MIN} minutos de antecedência`
      });
    }

    const mesa = await Mesa.findOne({ numero: novaMesaNum, ativa: true });
    if (!mesa) return res.status(404).json({ erro: `Mesa ${novaMesaNum} não encontrada` });
    if (novaQtd > mesa.capacidade) {
      return res.status(400).json({
        erro: `A mesa ${mesa.numero} comporta no máximo ${mesa.capacidade} pessoas`
      });
    }

    // conflito com outras reservas
    const outras = await Reserva.find({
      _id: { $ne: reserva._id },
      numeroMesa: novaMesaNum,
      status: { $nin: ['cancelado', 'finalizado'] }
    });
    const colisao = outras.find(r =>
      intervalosSobrepoem(novaData, novaDuracao, r.dataHora, r.duracaoMinutos ?? 90)
    );
    if (colisao) {
      return res.status(409).json({ erro: 'Conflito de horário com outra reserva' });
    }

    reserva.nomeCliente = nomeCliente ?? reserva.nomeCliente;
    reserva.contato = contato ?? reserva.contato;
    reserva.numeroMesa = novaMesaNum;
    reserva.quantidadePessoas = novaQtd;
    reserva.dataHora = novaData;
    reserva.duracaoMinutos = novaDuracao;
    reserva.observacoes = observacoes ?? reserva.observacoes;

    await reserva.save();
    registrarEvento('reserva.atualizada', `id=${reserva._id}`);
    res.json({ mensagem: 'Reserva atualizada', reserva });
  } catch (err) {
    res.status(400).json({ erro: (err as Error).message });
  }
}

export async function cancelarReserva(req: Request, res: Response) {
  try {
    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada' });

    const statusReal = calcularStatus(
      reserva.dataHora,
      reserva.duracaoMinutos ?? DURACAO_PADRAO,
      reserva.status as StatusReserva
    );
    if (statusReal === 'finalizado') {
      return res.status(409).json({ erro: 'Reserva já finalizada não pode ser cancelada' });
    }
    if (statusReal === 'cancelado') {
      return res.status(409).json({ erro: 'Reserva já cancelada' });
    }

    reserva.status = 'cancelado';
    await reserva.save();
    registrarEvento('reserva.cancelada', `id=${reserva._id}`);
    res.json({ mensagem: 'Reserva cancelada', reserva });
  } catch (err) {
    res.status(400).json({ erro: 'ID inválido' });
  }
}

export async function removerReserva(req: Request, res: Response) {
  try {
    const r = await Reserva.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ erro: 'Reserva não encontrada' });
    registrarEvento('reserva.removida', `id=${r._id}`);
    res.json({ mensagem: 'Reserva removida' });
  } catch (err) {
    res.status(400).json({ erro: 'ID inválido' });
  }
}

/** Sincroniza o status persistido com o status real (útil para relatórios). */
export async function sincronizarStatus(_req: Request, res: Response) {
  try {
    const todas = await Reserva.find({ status: { $nin: ['cancelado'] } });
    let alteradas = 0;
    for (const r of todas) {
      const novo = calcularStatus(r.dataHora, r.duracaoMinutos ?? 90, r.status as StatusReserva);
      if (novo !== r.status) {
        r.status = novo;
        await r.save();
        alteradas++;
      }
    }
    res.json({ mensagem: 'Status sincronizados', alteradas });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao sincronizar status' });
  }
}
