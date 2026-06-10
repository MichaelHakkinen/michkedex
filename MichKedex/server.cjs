const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Google Sheets Setup
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
let googleSheet = null;

async function initGoogleSheets() {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('Google Sheets credentials missing. Sync disabled.');
      return;
    }
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    googleSheet = doc.sheetsByIndex[0];
    console.log('Google Sheets sync ready:', doc.title);
  } catch (err) {
    console.error('Google Sheets init error:', err);
  }
}

initGoogleSheets();

async function syncToGoogleSheets(card) {
  if (!googleSheet) return;
  try {
    await googleSheet.addRow({
      'Pokemon Name': card.pokemon,
      'Card Name': card.name,
      'Card Number': card.cardnum,
      'Set Name': card.set,
      'Rarity': card.rarity,
      'Language': card.lang,
      'Condition': card.cond,
      'Quantity': card.qty,
      'Purchase Price': `Rp${card.buy.toLocaleString('id-ID')}`,
      'Notes': card.notes,
    });
    console.log('Synced to Google Sheets:', card.name);
  } catch (err) {
    console.error('Google Sheets sync error:', err);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection
const pool = mysql.createPool(process.env.VITE_DATABASE_URL);

// Test connection
pool.query('SELECT NOW()')
  .then(([rows]) => {
    console.log('Database connected successfully at:', Object.values(rows[0])[0]);
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// Multer setup for Excel uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- API ENDPOINTS ---

// Get all cards
app.get('/api/cards', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cards ORDER BY created_at DESC');
    // Map database snake_case to frontend camelCase
    const cards = rows.map(row => ({
      id: row.id,
      name: row.name,
      pokemon: row.pokemon,
      set: row.set_name,
      cardnum: row.card_number,
      setcode: row.set_code,
      rarity: row.rarity,
      lang: row.language,
      cond: row.condition,
      qty: row.quantity,
      buy: parseFloat(row.purchase_price),
      tcgp: parseFloat(row.tcgplayer_price),
      cardm: parseFloat(row.cardmarket_price),
      pchrt: parseFloat(row.pricecharting_price),
      local: parseFloat(row.local_price),
      collectr: parseFloat(row.collectr_price),
      snkrdunk: parseFloat(row.snkrdunk_price),
      ebay: parseFloat(row.ebay_price),
      cardtell: parseFloat(row.cardtell_price),
      notes: row.notes,
      photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : (row.photos || []),
      links: typeof row.links === 'string' ? JSON.parse(row.links) : (row.links || []),
    }));
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Add a new card
app.post('/api/cards', async (req, res) => {
  const c = req.body;
  const query = `
    INSERT INTO cards (
      name, pokemon, set_name, card_number, set_code, rarity, language, \`condition\`, 
      quantity, purchase_price, tcgplayer_price, cardmarket_price, pricecharting_price, 
      local_price, collectr_price, snkrdunk_price, ebay_price, cardtell_price, notes, photos, links
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    c.name, c.pokemon, c.set, c.cardnum, c.setcode, c.rarity, c.lang, c.cond,
    c.qty, c.buy, c.tcgp, c.cardm, c.pchrt, c.local, c.collectr, c.snkrdunk, c.ebay, c.cardtell,
    c.notes, JSON.stringify(c.photos), JSON.stringify(c.links)
  ];

  try {
    const [result] = await pool.query(query, values);
    const newCard = { id: result.insertId, ...c };
    // Sync to Google Sheets in background
    syncToGoogleSheets(c);
    res.status(201).json(newCard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add card' });
  }
});

// Update a card
app.put('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  const c = req.body;
  const query = `
    UPDATE cards SET 
      name=?, pokemon=?, set_name=?, card_number=?, set_code=?, rarity=?, language=?, \`condition\`=?, 
      quantity=?, purchase_price=?, tcgplayer_price=?, cardmarket_price=?, pricecharting_price=?, 
      local_price=?, collectr_price=?, snkrdunk_price=?, ebay_price=?, cardtell_price=?, notes=?, photos=?, links=?
    WHERE id=?
  `;
  const values = [
    c.name, c.pokemon, c.set, c.cardnum, c.setcode, c.rarity, c.lang, c.cond,
    c.qty, c.buy, c.tcgp, c.cardm, c.pchrt, c.local, c.collectr, c.snkrdunk, c.ebay, c.cardtell,
    c.notes, JSON.stringify(c.photos), JSON.stringify(c.links), id
  ];

  try {
    await pool.query(query, values);
    res.json({ id, ...c });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete a card
app.delete('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cards WHERE id = ?', [id]);
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Import Excel
app.post('/api/import-excel', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Importing ${data.length} cards from Excel...`);

    for (const row of data) {
      // Mapping from the user's specific Google Sheet headers
      const query = `
        INSERT INTO cards (
          name, pokemon, set_name, card_number, rarity, language, \`condition\`, 
          quantity, purchase_price, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // Helper to parse "Rp10,000" to 10000
      const parsePrice = (p) => {
        if (!p) return 0;
        const s = String(p).replace(/[^0-9]/g, '');
        return parseFloat(s) || 0;
      };

      const values = [
        row['Card Name'] || row.name || 'Unknown',
        row['Pokemon Name'] || row.pokemon || '',
        row['Set Name'] || row.set || 'Manual Import',
        row['Card Number'] || row.cardnum || '',
        row['Rarity'] || row.rarity || 'Common',
        row['Language'] || row.lang || 'Japanese',
        row['Condition'] || row.cond || 'RAW - Near Mint',
        parseInt(row['Quantity'] || row.qty) || 1,
        parsePrice(row['Purchase Price'] || row.buy),
        row['Notes'] || row.notes || ''
      ];
      await pool.query(query, values);
    }

    res.json({ message: `Successfully imported ${data.length} cards!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import Excel' });
  }
});

// Exchange rate proxy to avoid client-side CORS issues
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const response = await fetch('https://open.er-api.com/v4/latest/USD');
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      res.json({ rates: { IDR: 16000 } });
    }
  } catch (err) {
    console.error('Exchange rate fetch error:', err);
    res.json({ rates: { IDR: 16000 } });
  }
});

// Helper: Extract the best market price from a TCGPlayer price object
function getBestTcgPrice(priceObj) {
  if (!priceObj) return 0;
  return parseFloat(priceObj.market || priceObj.mid || priceObj.low || 0);
}

// Helper: Extract best market price from Cardmarket (market trend, not last sold)
function getBestCardmarketPrice(cmPrices) {
  if (!cmPrices) return 0;
  return parseFloat(cmPrices.trendPrice || cmPrices.avg7 || cmPrices.averageSellPrice || 0);
}

// Helper: Fetch a card from TCG API with fallback strategies for non-English cards
async function fetchCardFromTcgApi(row, headers) {
  const cleanSetCode = String(row.set_code || '').trim().toLowerCase();
  const cleanCardNum = String(row.card_number || '').trim();
  const cleanName = String(row.pokemon || row.name || '').trim();
  const lang = String(row.language || '').toLowerCase();

  const isNonEnglish = lang && !lang.includes('english') && lang !== 'en';

  const tryFetch = async (q) => {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=5`;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  };

  // Strategy 1: Exact set + number (works perfectly for English cards)
  if (cleanSetCode && cleanCardNum) {
    const results = await tryFetch(`set.id:"${cleanSetCode}" number:"${cleanCardNum}"`);
    if (results.length > 0) return results[0];
  }

  // Strategy 2: For non-English or fallback — search by name + number
  if (cleanName && cleanCardNum) {
    const results = await tryFetch(`name:"${cleanName}" number:"${cleanCardNum}"`);
    if (results.length > 0) return results[0];
  }

  // Strategy 3: Name only — pick the result with the best TCGPlayer price data
  if (cleanName) {
    const results = await tryFetch(`name:"${cleanName}"`);
    if (results.length > 0) {
      // Prefer a result that has tcgplayer price data
      const withPrices = results.find(r => r.tcgplayer?.prices && Object.keys(r.tcgplayer.prices).length > 0);
      return withPrices || results[0];
    }
  }

  return null;
}

// Helper: Fetch and update all prices from Pokemon TCG API
async function updateAllCardPrices() {
  console.log('[Price Updater] Starting automatic price update check...');
  try {
    const [rows] = await pool.query('SELECT id, set_code, card_number, name, pokemon, language FROM cards');
    console.log(`[Price Updater] Found ${rows.length} cards in inventory to inspect.`);
    
    let updatedCount = 0;
    const apiKey = process.env.VITE_POKEMON_TCG_API_KEY || '';
    const headers = apiKey ? { 'X-Api-Key': apiKey } : {};

    for (const row of rows) {
      try {
        const apiCard = await fetchCardFromTcgApi(row, headers);

        if (!apiCard) {
          console.warn(`[Price Updater] No match found for "${row.name}" (id: ${row.id})`);
          await new Promise(r => setTimeout(r, 150));
          continue;
        }

        // Pick best price object from TCGPlayer — prefer market price
        const tcgPrices = apiCard.tcgplayer?.prices || {};
        const possibleTypes = ['holofoil', 'normal', 'reverseHolofoil', '1stEditionHolofoil', 'unlimitedHolofoil'];
        let selectedPriceObj = null;
        for (const type of possibleTypes) {
          if (tcgPrices[type]) {
            selectedPriceObj = tcgPrices[type];
            break;
          }
        }
        if (!selectedPriceObj && Object.keys(tcgPrices).length > 0) {
          selectedPriceObj = tcgPrices[Object.keys(tcgPrices)[0]];
        }

        const newTcgPrice = getBestTcgPrice(selectedPriceObj);
        const newCardmarketPrice = getBestCardmarketPrice(apiCard.cardmarket?.prices);

        if (newTcgPrice > 0 || newCardmarketPrice > 0) {
          await pool.query(
            `UPDATE cards SET tcgplayer_price = ?, cardmarket_price = ? WHERE id = ?`,
            [newTcgPrice || null, newCardmarketPrice || null, row.id]
          );
          console.log(`[Price Updater] Updated "${row.name}": TCG=$${newTcgPrice} CM=$${newCardmarketPrice}`);
          updatedCount++;
        }

        // Small delay to prevent hitting rate limits too fast
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[Price Updater] Error processing card "${row.name}":`, err.message);
      }
    }
    
    console.log(`[Price Updater] Complete. Updated ${updatedCount}/${rows.length} cards.`);
    return { success: true, updated: updatedCount, total: rows.length };
  } catch (error) {
    console.error('[Price Updater] Failed to run automatic price update:', error);
    return { success: false, error: error.message };
  }
}

// Manual trigger API endpoint
app.post('/api/update-prices', async (req, res) => {
  try {
    const result = await updateAllCardPrices();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run automatically on server boot (with a 5s delay) and then every 12 hours
setTimeout(() => {
  updateAllCardPrices().catch(err => console.error('[Scheduler] Initial run failed:', err));
}, 5000);

setInterval(() => {
  updateAllCardPrices().catch(err => console.error('[Scheduler] Scheduled run failed:', err));
}, 12 * 60 * 60 * 1000); // 12 hours

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


