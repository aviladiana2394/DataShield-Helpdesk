const { query } = require('../config/db');

class Article {
  static async findAll() {
    const sql = 'SELECT * FROM articulos ORDER BY fecha_creacion DESC';
    const [rows] = await query(sql);
    return rows;
  }

  static async findById(id) {
    const sql = 'SELECT * FROM articulos WHERE id_articulo = ?';
    const [rows] = await query(sql, [id]);
    return rows[0];
  }

  static async create({ title, content, category, authorId }) {
    const sql = 'INSERT INTO articulos (titulo, contenido, categoria, autor_id) VALUES (?, ?, ?, ?)';
    const [result] = await query(sql, [title, content, category, authorId]);
    return result.insertId;
  }

  static async update(id, { title, content, category }) {
    const sql = 'UPDATE articulos SET titulo = ?, contenido = ?, categoria = ? WHERE id_articulo = ?';
    const [result] = await query(sql, [title, content, category, id]);
    return result.affectedRows;
  }

  static async delete(id) {
    const sql = 'DELETE FROM articulos WHERE id_articulo = ?';
    const [result] = await query(sql, [id]);
    return result.affectedRows;
  }
}

module.exports = Article;