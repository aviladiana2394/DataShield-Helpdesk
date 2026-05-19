const { query } = require('../config/db');
const bcrypt = require('bcrypt');

const registerUser = async (req, res, next) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || nombre.length < 3) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  const rolesPermitidos = ['usuario', 'tecnico', 'admin'];
  if (rol && !rolesPermitidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido. Los roles permitidos son: usuario, tecnico, admin' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)`;
    await query(sql, [nombre, email, hashedPassword, rol || 'usuario']);
    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }
    next(error);
  }
};

module.exports = { registerUser };