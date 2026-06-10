const mysql = require('mysql2/promise');

async function addApiIdColumn() {
  const pool = mysql.createPool('mysql://root:1234@127.0.0.1:3306/michkedex');
  try {
    // Add the set_api_id column if it doesn't exist
    await pool.query(`
      ALTER TABLE cards 
      ADD COLUMN IF NOT EXISTS set_api_id VARCHAR(50) NULL 
      COMMENT 'Internal pokemontcg.io API set ID for price lookups'
    `);
    console.log('Column set_api_id added (or already exists)');
    
    // Backfill: set_api_id from ptcgoCode -> API set ID reverse map
    const reverseMap = {
      'PFL': 'me2',
      'ASC': 'me2pt5',
      'JTG': 'sv9',
      'SFA': 'sv6pt5',
      '151': 'sv3pt5',
    };
    
    const [rows] = await pool.query('SELECT id, name, set_code FROM cards');
    for (const row of rows) {
      const apiId = reverseMap[row.set_code];
      if (apiId) {
        await pool.query('UPDATE cards SET set_api_id = ? WHERE id = ?', [apiId, row.id]);
        console.log(`Set set_api_id for "${row.name}": ${row.set_code} -> ${apiId}`);
      }
    }
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

addApiIdColumn();
