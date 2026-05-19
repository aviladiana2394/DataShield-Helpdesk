const express = require('express');
const router = express.Router();

const { login } = require('../controllers/auth.controller');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: usuario@correo.com
 *             password: 123456
 *     responses:
 *       200:
 *         description: Token generado correctamente
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', login);

module.exports = router;