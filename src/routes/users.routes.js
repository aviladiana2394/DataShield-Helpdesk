const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { query } = require('../config/db');
const { registerUser } = require('../controllers/users.controller');

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Registrar usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nombre: Juan Pérez
 *             email: usuario@correo.com
 *             password: 123456
 *             rol: usuario
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Error en los datos
 */
router.post('/register', registerUser);

// Ruta para listar usuarios (solo admin)
router.get('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const users = await query('SELECT id_usuario, nombre, email, rol FROM usuarios');
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Ruta para actualizar el rol de un usuario (solo admin)
router.put('/:id/role', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;
        const rolesPermitidos = ['usuario', 'tecnico', 'admin'];
        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).json({ success: false, message: 'Rol no válido. Debe ser: usuario, tecnico o admin' });
        }
        const result = await query('UPDATE usuarios SET rol = ? WHERE id_usuario = ?', [rol, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        res.json({ success: true, message: 'Rol actualizado correctamente' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;