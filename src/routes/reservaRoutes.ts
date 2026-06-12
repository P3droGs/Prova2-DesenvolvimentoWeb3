import { Router } from 'express';
import {
  criarReserva,
  listarReservas,
  obterReserva,
  atualizarReserva,
  cancelarReserva,
  removerReserva,
  sincronizarStatus
} from '../controllers/reservaController';

const router = Router();

router.get('/', listarReservas);
router.post('/', criarReserva);
router.post('/sincronizar', sincronizarStatus);
router.get('/:id', obterReserva);
router.put('/:id', atualizarReserva);
router.patch('/:id/cancelar', cancelarReserva);
router.delete('/:id', removerReserva);

export default router;
