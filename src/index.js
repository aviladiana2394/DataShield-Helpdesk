require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());

// Importar la conexión a la base de datos
const { query } = require('./config/db');

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Help Center API funcionando');
});

// Ruta de registro (POST /users/register)
app.post('/users/register', async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)';
        await query(sql, [nombre, email, hashedPassword, rol || 'usuario']);
        res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
        }
        res.status(500).json({ error: 'Error interno al registrar usuario' });
    }
});

// Ruta de login (POST /auth/login)
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const sql = 'SELECT * FROM usuarios WHERE email = ?';
        const results = await query(sql, [email]);
        if (results.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        const usuario = results[0];
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ message: 'Login exitoso', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al iniciar sesión' });
    }
});

// Ruta para obtener tickets (GET /tickets) - solo técnico/admin
app.get('/tickets', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token requerido' });
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload.rol !== 'tecnico' && payload.rol !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }
        const tickets = await query(`
            SELECT t.*, u.nombre as creador_nombre, tec.nombre as tecnico_nombre
            FROM tickets t
            LEFT JOIN usuarios u ON t.usuario_id = u.id_usuario
            LEFT JOIN usuarios tec ON t.tecnico_id = tec.id_usuario
        `);
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para crear tickets (POST /tickets)
app.post('/tickets', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token requerido' });
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const { titulo, descripcion, categoria, prioridad } = req.body;
        if (!titulo || !descripcion) {
            return res.status(400).json({ error: 'Título y descripción obligatorios' });
        }
        const sql = `INSERT INTO tickets (titulo, descripcion, categoria, prioridad, estado, usuario_id)
                     VALUES (?, ?, ?, ?, 'abierto', ?)`;
        const result = await query(sql, [titulo, descripcion, categoria || 'otro', prioridad || 'media', payload.id]);
        res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Middleware global de errores
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});