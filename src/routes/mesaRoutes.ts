import { Router } from 'express';
import { listarMesas, criarMesa, mapaDeMesas } from '../controllers/mesaController';

const router = Router();

router.get('/', listarMesas);
router.post('/', criarMesa);
router.get('/mapa', mapaDeMesas);

export default router;
