const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') }); // sube dos niveles hasta la raíz

console.log('DB_PASSWORD cargada:', process.env.DB_PASSWORD ? 'Sí' : 'No'); // para verificar

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const query = async (sql, params) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

module.exports = { pool, query };