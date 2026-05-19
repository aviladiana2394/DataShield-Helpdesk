const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { sendEmail } = require('../utils/email');

const estadosValidos = ['abierto', 'en_proceso', 'resuelto', 'cerrado'];
const categoriasValidas = ['phishing', 'malware', 'acceso_no_autorizado', 'vulnerabilidad', 'otro'];
const prioridadesValidas = ['baja', 'media', 'alta', 'critica'];

// Helper para obtener un ticket por ID sin repeticiones
const getTicketRaw = async (id) => {
  const rows = await query('SELECT * FROM tickets WHERE id_ticket = ?', [id]);
  return rows.length ? rows[0] : null;
};

// Helper para registrar historial
const registrarHistorial = async (ticketId, usuarioId, campo, valorAnterior, valorNuevo) => {
  try {
    await query(
      'INSERT INTO ticket_historial (ticket_id, usuario_id, campo, valor_anterior, valor_nuevo) VALUES (?, ?, ?, ?, ?)',
      [ticketId, usuarioId, campo, valorAnterior, valorNuevo]
    );
  } catch (err) {
    console.error('Error al guardar historial:', err);
  }
};

// Obtener todos los tickets (con filtros) - solo técnico/admin
const getTickets = async (req, res, next) => {
  try {
    if (!['tecnico', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado. Solo técnicos o administradores pueden ver la lista de tickets.' });
    }
    // Optimización: seleccionar solo columnas necesarias
    let sql = `
      SELECT t.id_ticket, t.titulo, t.descripcion, t.estado, t.prioridad, t.categoria,
             t.fecha_creacion, t.fecha_actualizacion, t.usuario_id, t.tecnico_id, t.adjuntos,
             u.nombre as creador_nombre, 
             tec.nombre as tecnico_nombre
      FROM tickets t
      LEFT JOIN usuarios u ON t.usuario_id = u.id_usuario
      LEFT JOIN usuarios tec ON t.tecnico_id = tec.id_usuario
    `;
    const params = [];
    if (req.query.estado) {
      sql += ' WHERE t.estado = ?';
      params.push(req.query.estado);
    }
    if (req.query.categoria) {
      sql += params.length ? ' AND t.categoria = ?' : ' WHERE t.categoria = ?';
      params.push(req.query.categoria);
    }
    const rows = await query(sql, params);
    return ok(res, rows, 'Listado de tickets');
  } catch (err) {
    next(err);
  }
};

// Obtener un ticket por ID
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await getTicketRaw(id);
    if (!ticket) return fail(res, 'Ticket no encontrado', 404);
    // Opcional: añadir nombres del creador y técnico
    const [detalle] = await query(`
      SELECT t.*, u.nombre as creador_nombre, tec.nombre as tecnico_nombre
      FROM tickets t
      LEFT JOIN usuarios u ON t.usuario_id = u.id_usuario
      LEFT JOIN usuarios tec ON t.tecnico_id = tec.id_usuario
      WHERE t.id_ticket = ?
    `, [id]);
    return ok(res, detalle, 'Ticket encontrado');
  } catch (err) {
    next(err);
  }
};

// Crear ticket (cualquier usuario autenticado)
const createTicket = async (req, res, next) => {
  try {
    const { titulo, descripcion, categoria, prioridad } = req.body;
    const usuario_id = req.user.id;
    const estado = 'abierto';

    if (!titulo || titulo.length < 5) {
      return fail(res, 'El título debe tener al menos 5 caracteres', 400);
    }
    if (!descripcion || descripcion.length < 10) {
      return fail(res, 'La descripción debe tener al menos 10 caracteres', 400);
    }
    const contieneHtml = /<[^>]*>/.test(titulo) || /<[^>]*>/.test(descripcion);
    if (contieneHtml) {
      return fail(res, 'No se permite código HTML en título o descripción', 400);
    }

    const categoriaVal = categoria && categoriasValidas.includes(categoria) ? categoria : 'otro';
    const prioridadVal = prioridad && prioridadesValidas.includes(prioridad) ? prioridad : 'media';

    let attachments = [];
    if (req.files && req.files.length) {
      attachments = req.files.map(f => f.path);
    }

    const sql = `
      INSERT INTO tickets (titulo, descripcion, categoria, prioridad, estado, usuario_id, adjuntos)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [titulo, descripcion, categoriaVal, prioridadVal, estado, usuario_id, JSON.stringify(attachments)]);
    const ticketId = result.insertId;

    await registrarHistorial(ticketId, usuario_id, 'creación', null, JSON.stringify({ titulo, descripcion, categoria: categoriaVal }));

    const userRows = await query('SELECT email, nombre FROM usuarios WHERE id_usuario = ?', [usuario_id]);
    if (userRows.length) {
      const user = userRows[0];
      await sendEmail(
        user.email,
        `Ticket #${ticketId} creado`,
        `Hola ${user.nombre}, tu ticket "${titulo}" ha sido registrado. ID: ${ticketId}. Estado: ${estado}.`
      );
    }

    return ok(res, { id: ticketId }, 'Ticket creado', 201);
  } catch (err) {
    next(err);
  }
};

// Actualizar ticket (solo técnico o admin)
const updateTicket = async (req, res, next) => {
  try {
    if (!['tecnico', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado. Solo técnicos o administradores pueden actualizar tickets.' });
    }
    const { id } = req.params;
    const { titulo, descripcion, estado, prioridad, categoria } = req.body;
    const userId = req.user.id;

    const oldTicket = await getTicketRaw(id);
    if (!oldTicket) return fail(res, 'Ticket no encontrado', 404);

    if (estado && !estadosValidos.includes(estado)) return fail(res, 'Estado inválido', 400);
    if (prioridad && !prioridadesValidas.includes(prioridad)) return fail(res, 'Prioridad inválida', 400);
    if (categoria && !categoriasValidas.includes(categoria)) return fail(res, 'Categoría inválida', 400);
    
    if (titulo !== undefined) {
      if (titulo.length < 5) return fail(res, 'El título debe tener al menos 5 caracteres', 400);
      if (/<[^>]*>/.test(titulo)) return fail(res, 'No se permite HTML en el título', 400);
    }
    if (descripcion !== undefined) {
      if (descripcion.length < 10) return fail(res, 'La descripción debe tener al menos 10 caracteres', 400);
      if (/<[^>]*>/.test(descripcion)) return fail(res, 'No se permite HTML en la descripción', 400);
    }

    const updateFields = [];
    const values = [];
    if (titulo !== undefined) { updateFields.push('titulo = ?'); values.push(titulo); }
    if (descripcion !== undefined) { updateFields.push('descripcion = ?'); values.push(descripcion); }
    if (estado !== undefined) { updateFields.push('estado = ?'); values.push(estado); }
    if (prioridad !== undefined) { updateFields.push('prioridad = ?'); values.push(prioridad); }
    if (categoria !== undefined) { updateFields.push('categoria = ?'); values.push(categoria); }
    if (updateFields.length === 0) return fail(res, 'No hay campos para actualizar', 400);

    values.push(id);
    const sql = `UPDATE tickets SET ${updateFields.join(', ')} WHERE id_ticket = ?`;
    const result = await query(sql, values);
    if (result.affectedRows === 0) return fail(res, 'Ticket no encontrado', 404);

    if (titulo !== undefined && oldTicket.titulo !== titulo) {
      await registrarHistorial(id, userId, 'titulo', oldTicket.titulo, titulo);
    }
    if (descripcion !== undefined && oldTicket.descripcion !== descripcion) {
      await registrarHistorial(id, userId, 'descripcion', oldTicket.descripcion, descripcion);
    }
    if (estado !== undefined && oldTicket.estado !== estado) {
      await registrarHistorial(id, userId, 'estado', oldTicket.estado, estado);
      const userRows = await query('SELECT email, nombre FROM usuarios WHERE id_usuario = ?', [oldTicket.usuario_id]);
      if (userRows.length) {
        await sendEmail(
          userRows[0].email,
          `Ticket #${id} cambió a estado ${estado}`,
          `Tu ticket "${oldTicket.titulo}" ahora está en estado: ${estado}.`
        );
      }
    }
    if (prioridad !== undefined && oldTicket.prioridad !== prioridad) {
      await registrarHistorial(id, userId, 'prioridad', oldTicket.prioridad, prioridad);
    }
    if (categoria !== undefined && oldTicket.categoria !== categoria) {
      await registrarHistorial(id, userId, 'categoria', oldTicket.categoria, categoria);
    }

    return ok(res, null, 'Ticket actualizado');
  } catch (err) {
    next(err);
  }
};

// Asignar técnico (solo admin)
const asignarTecnico = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No autorizado. Solo administradores pueden asignar técnicos.' });
    }
    const { id } = req.params;
    const { tecnico_id } = req.body;
    if (!tecnico_id) return fail(res, 'tecnico_id es obligatorio', 400);
    const userId = req.user.id;

    const tecRows = await query('SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND rol = "tecnico"', [tecnico_id]);
    if (tecRows.length === 0) return fail(res, 'El técnico no existe o no tiene rol válido', 400);

    const oldTicket = await getTicketRaw(id);
    if (!oldTicket) return fail(res, 'Ticket no encontrado', 404);

    const sql = 'UPDATE tickets SET tecnico_id = ?, estado = "en_proceso" WHERE id_ticket = ?';
    const result = await query(sql, [tecnico_id, id]);
    if (result.affectedRows === 0) return fail(res, 'Ticket no encontrado', 404);

    await registrarHistorial(id, userId, 'tecnico_id', oldTicket.tecnico_id || null, tecnico_id);

    const tecEmailRows = await query('SELECT email, nombre FROM usuarios WHERE id_usuario = ?', [tecnico_id]);
    if (tecEmailRows.length) {
      await sendEmail(
        tecEmailRows[0].email,
        `Nuevo ticket asignado #${id}`,
        `Se te ha asignado el ticket: "${oldTicket.titulo}". Estado actual: en proceso.`
      );
    }

    return ok(res, null, 'Ticket asignado correctamente');
  } catch (err) {
    next(err);
  }
};

// Cambiar estado (solo técnico o admin)
const cambiarEstado = async (req, res, next) => {
  try {
    if (!['tecnico', 'admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado. Solo técnicos o administradores pueden cambiar el estado.' });
    }
    const { id } = req.params;
    const { estado } = req.body;
    if (!estadosValidos.includes(estado)) return fail(res, 'Estado inválido', 400);

    const userId = req.user.id;
    const oldTicket = await getTicketRaw(id);
    if (!oldTicket) return fail(res, 'Ticket no encontrado', 404);
    if (oldTicket.estado === estado) return fail(res, 'El ticket ya tiene ese estado', 400);

    const sql = 'UPDATE tickets SET estado = ? WHERE id_ticket = ?';
    const result = await query(sql, [estado, id]);
    if (result.affectedRows === 0) return fail(res, 'Ticket no encontrado', 404);

    await registrarHistorial(id, userId, 'estado', oldTicket.estado, estado);

    const userRows = await query('SELECT email, nombre FROM usuarios WHERE id_usuario = ?', [oldTicket.usuario_id]);
    if (userRows.length) {
      await sendEmail(
        userRows[0].email,
        `Ticket #${id} cambió a estado ${estado}`,
        `Tu ticket "${oldTicket.titulo}" ahora está en estado: ${estado}.`
      );
    }

    return ok(res, null, 'Estado actualizado');
  } catch (err) {
    next(err);
  }
};

// Eliminar ticket (solo admin)
const deleteTicket = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No autorizado. Solo administradores pueden eliminar tickets.' });
    }
    const { id } = req.params;
    const sql = 'DELETE FROM tickets WHERE id_ticket = ?';
    const result = await query(sql, [id]);
    if (result.affectedRows === 0) return fail(res, 'Ticket no encontrado', 404);
    return ok(res, null, 'Ticket eliminado');
  } catch (err) {
    next(err);
  }
};

// Agregar comentario
const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) return fail(res, 'El comentario es obligatorio', 400);

    const ticket = await getTicketRaw(id);
    if (!ticket) return fail(res, 'Ticket no encontrado', 404);

    const commentSql = 'INSERT INTO comentarios (ticket_id, usuario_id, comentario) VALUES (?, ?, ?)';
    const result = await query(commentSql, [id, userId, content]);
    const commentId = result.insertId;

    await registrarHistorial(id, userId, 'comentario', null, content);

    const usersToNotify = [];
    if (ticket.usuario_id !== userId) usersToNotify.push(ticket.usuario_id);
    if (ticket.tecnico_id && ticket.tecnico_id !== userId) usersToNotify.push(ticket.tecnico_id);

    if (usersToNotify.length) {
      const placeholders = usersToNotify.map(() => '?').join(',');
      const userRows = await query(`SELECT email, nombre FROM usuarios WHERE id_usuario IN (${placeholders})`, usersToNotify);
      for (const user of userRows) {
        await sendEmail(
          user.email,
          `Nuevo comentario en ticket #${id}`,
          `Hola ${user.nombre}, se ha agregado un comentario al ticket "${ticket.titulo}".`
        );
      }
    }

    return ok(res, { id: commentId }, 'Comentario agregado', 201);
  } catch (err) {
    next(err);
  }
};

// Obtener historial
const getHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await query(
      `SELECT h.*, u.nombre as usuario_nombre 
       FROM ticket_historial h
       LEFT JOIN usuarios u ON h.usuario_id = u.id_usuario
       WHERE h.ticket_id = ?
       ORDER BY h.fecha DESC`,
      [id]
    );
    return ok(res, history, 'Historial del ticket');
  } catch (err) {
    next(err);
  }
};

// Obtener comentarios
const getComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comments = await query(
      `SELECT c.*, u.nombre as usuario_nombre 
       FROM comentarios c
       LEFT JOIN usuarios u ON c.usuario_id = u.id_usuario
       WHERE c.ticket_id = ?
       ORDER BY c.fecha DESC`,
      [id]
    );
    return ok(res, comments, 'Comentarios del ticket');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  asignarTecnico,
  cambiarEstado,
  addComment,
  getHistory,
  getComments
};