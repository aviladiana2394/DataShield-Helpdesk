const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');

const getMetrics = async (req, res, next) => {
  try {
    if (!['tecnico', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado. Solo técnicos o administradores pueden ver métricas.' });
    }

    // Ejecutar consultas en paralelo para mejorar rendimiento
    const [totalResult, estados, categorias, avgResult, porTecnico] = await Promise.all([
      query('SELECT COUNT(*) as total FROM tickets'),
      query('SELECT estado, COUNT(*) as count FROM tickets GROUP BY estado'),
      query('SELECT categoria, COUNT(*) as count FROM tickets GROUP BY categoria'),
      query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, fecha_creacion, fecha_actualizacion)) as avg_hours
        FROM tickets
        WHERE estado IN ('resuelto', 'cerrado')
      `),
      query(`
        SELECT u.nombre as tecnico, COUNT(t.id_ticket) as count
        FROM tickets t
        LEFT JOIN usuarios u ON t.tecnico_id = u.id_usuario
        WHERE t.tecnico_id IS NOT NULL
        GROUP BY t.tecnico_id
      `)
    ]);

    const totalTickets = totalResult[0]?.total || 0;
    const avgResolutionHours = avgResult[0]?.avg_hours || 0;

    return ok(res, {
      totalTickets,
      porEstado: estados,
      porCategoria: categorias,
      tiempoPromedioResolucionHoras: Math.round(avgResolutionHours * 100) / 100,
      porTecnico
    }, 'Métricas obtenidas');
  } catch (err) {
    next(err);
  }
};

module.exports = { getMetrics };