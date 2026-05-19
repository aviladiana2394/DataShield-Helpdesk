const { query } = require('../config/db');

class Comment {
  static async create({ content, userId, ticketId }) {
    const sql = 'INSERT INTO comentarios (contenido, usuario_id, ticket_id) VALUES (?, ?, ?)';
    const [result] = await query(sql, [content, userId, ticketId]);
    return result.insertId;
  }

  static async findByTicket(ticketId) {
    const sql = `
      SELECT c.*, u.nombre as autor 
      FROM comentarios c
      JOIN usuarios u ON c.usuario_id = u.id_usuario
      WHERE c.ticket_id = ?
      ORDER BY c.fecha_creacion ASC
    `;
    const [rows] = await query(sql, [ticketId]);
    return rows;
  }
}

module.exports = Comment;