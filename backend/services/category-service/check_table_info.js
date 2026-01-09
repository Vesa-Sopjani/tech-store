const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    database: process.env.DB_NAME || 'TechProductDB'
  });

  try {
    const [rows] = await connection.execute('DESCRIBE Categories');
    console.log('Columns in Categories table:');
    rows.forEach(row => {
      console.log(`- ${row.Field} (${row.Type})`);
    });
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    await connection.end();
  }
}

checkColumns();
