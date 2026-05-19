const roleMiddleware = (...rolesPermitidos) => {
  return (req, res, next) => {
    const userRole = req.user?.rol;
    if (!userRole) {
      return res.status(403).json({
        error: 'Rol no definido en el token'
      });
    }
    if (!rolesPermitidos.includes(userRole)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`
      });
    }
    next();
  };
};
module.exports = roleMiddleware;