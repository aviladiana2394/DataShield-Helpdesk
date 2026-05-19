const { query } = require('../config/db');

class TicketHistory {
  static async create({ ticketId, changedBy, field, oldValue, newValue }) {
    const sql = `
      INSERT INTO ticket_historial (ticket_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await query(sql, [ticketId, changedBy, field, oldValue, newValue]);
    return result.insertId;
  }

  static async findByTicket(ticketId) {
    const sql = `
      SELECT th.*, u.nombre as usuario_nombre
      FROM ticket_historial th
      JOIN usuarios u ON th.usuario_id = u.id_usuario
      WHERE th.ticket_id = ?
      ORDER BY th.fecha_cambio ASC
    `;
    const [rows] = await query(sql, [ticketId]);
    return rows;
  }
}

module.exports = TicketHistory;