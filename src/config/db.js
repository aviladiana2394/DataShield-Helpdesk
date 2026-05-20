const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Verificar variables de entorno (para depuración)
console.log('MYSQLHOST:', process.env.MYSQLHOST || 'localhost');
console.log('MYSQLUSER:', process.env.MYSQLUSER || 'root');
console.log('MYSQLPASSWORD cargada:', process.env.MYSQLPASSWORD ? 'Sí' : 'No');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'helpcenter',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const query = async (sql, params) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

module.exports = { pool, query };