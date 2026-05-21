require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

console.log('📁 Iniciando carga de middlewares...');

// middlewares
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

console.log('✅ Middlewares cargados correctamente');
console.log('📁 Iniciando carga de rutas...');

// rutas
const ticketsRoutes = require('./routes/tickets.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const knowledgeRoutes = require('./routes/knowledgeRoutes');   
const dashboardRoutes = require('./routes/dashboardRoutes');   

console.log('✅ Rutas cargadas correctamente');

app.use(express.json());
app.use(logger);

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ruta de prueba
app.get('/', (req, res) => {
  console.log('📍 Ruta raíz consultada');
  res.send('Help Center API funcionando');
});

console.log('📁 Montando rutas principales...');

// rutas principales
app.use('/auth', authRoutes);
app.use('/tickets', ticketsRoutes);
app.use('/users', usersRoutes);
app.use('/knowledge', knowledgeRoutes);  
app.use('/dashboard', dashboardRoutes);

console.log('✅ Rutas principales montadas:');
console.log('   - /auth');
console.log('   - /tickets');
console.log('   - /users');
console.log('   - /knowledge');
console.log('   - /dashboard');

// manejo de rutas inexistentes
app.use((req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// middleware global de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 API disponible en: http://localhost:${PORT}`);
  console.log(`📚 Swagger UI en: http://localhost:${PORT}/api-docs`);
});