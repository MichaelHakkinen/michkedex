const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool('mysql://root:1234@127.0.0.1:3306/michkedex');
  
  try {
    const [rows] = await pool.query('SELECT * FROM cards');
    console.log('Cards in Database:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
