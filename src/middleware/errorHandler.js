const { fail } = require('../utils/response');
const errorHandler = (err, req, res, next) => {
  console.error('ERROR CAPTURADO:', err);

  // Errores de validación de express-validator (si los usas)
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({ error: 'Datos inválidos', detalles: err.array() });
  }
  // Errores de base de datos (códigos específicos de MySQL)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Registro duplicado' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({ error: 'Referencia inválida (ID no existe)' });
  }
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return res.status(500).json({ error: 'Error en la estructura de la base de datos' });
  }
  // Errores de Multer (archivos)
  if (err.name === 'MulterError') {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ error: 'El archivo excede el tamaño máximo (5MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  // Cualquier otro error
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  // En desarrollo se puede enviar el stack, en producción no
  const details = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  return fail(res, message, status, details);
};

module.exports = errorHandler;