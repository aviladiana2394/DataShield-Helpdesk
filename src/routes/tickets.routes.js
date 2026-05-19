const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const upload = require('../middleware/upload');

const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  asignarTecnico,
  cambiarEstado,
  addComment,
  getHistory,
  getComments
} = require('../controllers/tickets.controller');

// Listar todos los tickets (solo técnicos y admin)
router.get('/', authMiddleware, roleMiddleware('tecnico', 'admin'), getTickets);

// Crear ticket (cualquier usuario autenticado)
router.post('/', authMiddleware, roleMiddleware('usuario', 'tecnico', 'admin'), upload.array('adjuntos'), createTicket);

// Asignar técnico (solo admin)
router.put('/:id/asignar', authMiddleware, roleMiddleware('admin'), asignarTecnico);

// Cambiar estado (técnico y admin)
router.put('/:id/estado', authMiddleware, roleMiddleware('tecnico', 'admin'), cambiarEstado);

// Historial (cualquier usuario autenticado)
router.get('/:id/historial', authMiddleware, roleMiddleware('usuario', 'tecnico', 'admin'), getHistory);

// Comentarios (listar y crear)
router.get('/:id/comentarios', authMiddleware, roleMiddleware('usuario', 'tecnico', 'admin'), getComments);
router.post('/:id/comentarios', authMiddleware, roleMiddleware('usuario', 'tecnico', 'admin'), addComment);

// Obtener un ticket por ID (cualquier usuario autenticado)
router.get('/:id', authMiddleware, roleMiddleware('usuario', 'tecnico', 'admin'), getTicketById);

// Actualizar ticket (técnico y admin)
router.put('/:id', authMiddleware, roleMiddleware('tecnico', 'admin'), updateTicket);

// Eliminar ticket (solo admin)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteTicket);

module.exports = router;