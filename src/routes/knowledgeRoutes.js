const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const knowledgeController = require('../controllers/knowledge.controller');

// Público: ver artículos
router.get('/', knowledgeController.getArticles);
router.get('/:id', knowledgeController.getArticleById);

// Crear, actualizar, eliminar solo técnico/admin
router.post('/', authMiddleware, roleMiddleware('tecnico', 'admin'), knowledgeController.createArticle);
router.put('/:id', authMiddleware, roleMiddleware('tecnico', 'admin'), knowledgeController.updateArticle);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), knowledgeController.deleteArticle);

module.exports = router;