const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');

const getArticles = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM articulos ORDER BY fecha_creacion DESC');
    return ok(res, rows, 'Artículos obtenidos');
  } catch (err) {
    next(err);
  }
};

const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await query('SELECT * FROM articulos WHERE id_articulo = ?', [id]);
    if (rows.length === 0) return fail(res, 'Artículo no encontrado', 404);
    return ok(res, rows[0], 'Artículo obtenido');
  } catch (err) {
    next(err);
  }
};

const createArticle = async (req, res, next) => {
  try {
    // Verificar rol (seguridad extra)
    if (!['tecnico', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado. Solo técnicos o administradores pueden crear artículos.' });
    }
    const { title, content, category } = req.body;
    if (!title || !content) {
      return fail(res, 'Faltan campos obligatorios (title, content)', 400);
    }
    const autorId = req.user.id;
    const sql = 'INSERT INTO articulos (titulo, contenido, categoria, autor_id) VALUES (?, ?, ?, ?)';
    const result = await query(sql, [title, content, category || 'general', autorId]);
    return ok(res, { id: result.insertId }, 'Artículo creado', 201);
  } catch (err) {
    next(err);
  }
};

const updateArticle = async (req, res, next) => {
  try {
    if (!['tecnico', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado.' });
    }
    const { id } = req.params;
    const { title, content, category } = req.body;
    const updates = [];
    const values = [];
    if (title) { updates.push('titulo = ?'); values.push(title); }
    if (content) { updates.push('contenido = ?'); values.push(content); }
    if (category) { updates.push('categoria = ?'); values.push(category); }
    if (updates.length === 0) return fail(res, 'No hay datos para actualizar', 400);
    values.push(id);
    const sql = `UPDATE articulos SET ${updates.join(', ')} WHERE id_articulo = ?`;
    const result = await query(sql, values);
    if (result.affectedRows === 0) return fail(res, 'Artículo no encontrado', 404);
    return ok(res, null, 'Artículo actualizado');
  } catch (err) {
    next(err);
  }
};

const deleteArticle = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No autorizado. Solo administradores pueden eliminar artículos.' });
    }
    const { id } = req.params;
    const result = await query('DELETE FROM articulos WHERE id_articulo = ?', [id]);
    if (result.affectedRows === 0) return fail(res, 'Artículo no encontrado', 404);
    return ok(res, null, 'Artículo eliminado');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle
};