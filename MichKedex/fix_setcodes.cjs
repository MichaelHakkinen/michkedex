const mysql = require('mysql2/promise');

async function fixSetCodes() {
  const pool = mysql.createPool('mysql://root:1234@127.0.0.1:3306/michkedex');
  
  // Mapping from internal API set ID -> ptcgoCode (official short code on cards)
  const setCodeMap = {
    'me2': 'PFL',        // Phantasmal Flames -> PFL
    'me2pt5': 'ASC',     // Ascended Heroes -> ASC
    'sv9': 'JTG',        // Journey Together -> JTG
    'sv6pt5': 'SFA',     // Shrouded Fable -> SFA
    'sv3pt5': '151',     // Pokemon 151 -> 151
    // Add more as needed
  };
  
  try {
    const [rows] = await pool.query('SELECT id, name, set_code FROM cards');
    console.log('Cards to check:', rows.length);
    
    for (const row of rows) {
      const currentCode = row.set_code;
      const newCode = setCodeMap[currentCode];
      if (newCode && newCode !== currentCode) {
        await pool.query('UPDATE cards SET set_code = ? WHERE id = ?', [newCode, row.id]);
        console.log(`Updated card "${row.name}" set_code: ${currentCode} -> ${newCode}`);
      } else {
        console.log(`Card "${row.name}" set_code "${currentCode}" - no change needed`);
      }
    }
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fixSetCodes();
