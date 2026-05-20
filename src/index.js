require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

// middlewares
const logger = require('./src/middleware/logger');
const errorHandler = require('./src/middleware/errorHandler');

// rutas
const ticketsRoutes = require('./src/routes/tickets.routes');
const authRoutes = require('./src/routes/auth.routes');
const usersRoutes = require('./src/routes/users.routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const knowledgeRoutes = require('./src/routes/knowledgeRoutes');   
const dashboardRoutes = require('./src/routes/dashboardRoutes');   

app.use(express.json());
app.use(logger);

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ruta de prueba
app.get('/', (req, res) => {
  res.send('Help Center API funcionando');
});

// rutas principales
app.use('/auth', authRoutes);
app.use('/tickets', ticketsRoutes);
app.use('/users', usersRoutes);
app.use('/knowledge', knowledgeRoutes);  
app.use('/dashboard', dashboardRoutes);

// manejo de rutas inexistentes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// middleware global de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});