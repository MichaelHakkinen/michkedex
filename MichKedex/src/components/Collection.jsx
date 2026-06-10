import React, { useState } from 'react';
import { IDR, avgP, condPill, rarShort, srcLabel } from './utils';
import { toast } from 'react-toastify';

const Collection = ({ cards, onEditCard, onDeleteCard, onOpenAddModal, onOpenLightbox, onImportExcel }) => {
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [condFilter, setCondFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const getLangCode = (lang) => {
    const l = (lang || '').toLowerCase();
    if (l.includes('english') || l === 'en') return 'EN';
    if (l.includes('japanese') || l === 'jp' || l === 'ja') return 'JP';
    if (l.includes('indonesian') || l === 'id') return 'ID';
    if (l.includes('korean') || l === 'ko' || l === 'kr') return 'KR';
    if (l.includes('simplified') || l === 'zh-s' || l === 'zh-cn') return 'ZH-S';
    if (l.includes('traditional') || l === 'zh-t' || l === 'zh-tw') return 'ZH-T';
    return lang || '';
  };

  const formatSetAndCardNum = (setcode, cardnum, lang) => {
    if (!setcode) return cardnum || '';
    const l = (lang || '').toLowerCase();
    // Display the code exactly as stored, just trim whitespace
    const s = setcode.trim();

    let suffix = '';
    if (l.includes('english') || l === 'en') suffix = ' EN';
    else if (l.includes('indonesian') || l === 'id') suffix = ' ID';
    else if (l.includes('korean') || l === 'ko' || l === 'kr') suffix = ' KR';
    else if (l.includes('simplified') || l === 'zh-s' || l === 'zh-cn') suffix = ' C';
    else if (l.includes('traditional') || l === 'zh-t' || l === 'zh-tw') suffix = ' F';
    else if (l.includes('japanese') || l === 'jp' || l === 'ja') suffix = ' JP';

    return `${s}${suffix} ${cardnum || ''}`;
  };

  const getSearchUrl = (c, platform) => {
    const query = `${c.pokemon} ${c.cardnum} ${c.set}`.trim();
    const encoded = encodeURIComponent(query);
    if (platform === 'pchrt') {
      return `https://www.pricecharting.com/search-products?type=prices&q=${encoded}`;
    }
    if (platform === 'collectr') {
      return `https://www.google.com/search?q=${encodeURIComponent(query + ' tcg collectr')}`;
    }
    if (platform === 'cardtell') {
      return `https://cardtell.id/search?q=${encoded}`;
    }
    if (platform === 'snkrdunk') {
      const snkrQuery = c.setcode ? `${c.setcode} ${c.cardnum}` : c.pokemon;
      return `https://snkrdunk.com/en/search?keyword=${encodeURIComponent(snkrQuery)}`;
    }
    return '#';
  };

  // Unique filters lists
  const languages = [...new Set(cards.map(c => c.lang))].filter(Boolean);
  const conditions = [...new Set(cards.map(c => c.cond))].filter(Boolean);
  const rarities = [...new Set(cards.map(c => c.rarity))].filter(Boolean);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Handle Excel upload
  const handleExcelFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://localhost:5000/api/import-excel', {
        method: 'POST',
        body: formData,
      });
      const res = await response.json();
      if (response.ok) {
        toast.success(res.message || 'Excel imported successfully!');
        if (onImportExcel) onImportExcel();
      } else {
        toast.error(res.error || 'Failed to import Excel');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error importing Excel file');
    }
  };

  // Filter & Sort cards
  const filteredCards = cards.filter(c => {
    const term = search.toLowerCase();
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(term) ||
      (c.pokemon || '').toLowerCase().includes(term) ||
      (c.set || '').toLowerCase().includes(term) ||
      (c.setcode || '').toLowerCase().includes(term) ||
      (c.cardnum || '').toLowerCase().includes(term);

    const matchesLang = langFilter ? c.lang === langFilter : true;
    const matchesCond = condFilter ? c.cond === condFilter : true;
    const matchesRarity = rarityFilter ? c.rarity === rarityFilter : true;

    return matchesSearch && matchesLang && matchesCond && matchesRarity;
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'avgPrice') {
      valA = avgP(a);
      valB = avgP(b);
    } else if (sortField === 'pnl') {
      valA = avgP(a) - (a.buy || 0);
      valB = avgP(b) - (b.buy || 0);
    } else if (sortField === 'totalValue') {
      valA = avgP(a) * (a.qty || 1);
      valB = avgP(b) * (b.qty || 1);
    }

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return sortAsc ? valA - valB : valB - valA;
    }
  });

  return (
    <div className="collection-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Your Card Collection</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label className="btn accent" style={{ cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelFileChange} style={{ display: 'none' }} />
          </label>
          <button className="btn accent" onClick={onOpenAddModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Pokemon Card
          </button>
        </div>
      </div>

      <div className="ctrl-row">
        <input 
          type="text" 
          placeholder="Search by name, set, code..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ flexGrow: 1, minWidth: '200px' }}
        />

        <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
          <option value="">All Languages</option>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select value={condFilter} onChange={(e) => setCondFilter(e.target.value)}>
          <option value="">All Conditions</option>
          {conditions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
          <option value="">All Rarities</option>
          {rarities.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="tbl-container">
        {sortedCards.length === 0 ? (
          <div className="empty">
            <i>📂</i>
            <p>No cards found matching your active filters.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Art</th>
                <th onClick={() => handleSort('pokemon')} style={{ cursor: 'pointer' }}>Card Name {sortField === 'pokemon' && (sortAsc ? '▲' : '▼')}</th>
                <th>Set Identifier</th>
                <th>Language</th>
                <th>Rarity</th>
                <th>Condition</th>
                <th onClick={() => handleSort('qty')} style={{ cursor: 'pointer' }}>Qty {sortField === 'qty' && (sortAsc ? '▲' : '▼')}</th>
                <th onClick={() => handleSort('buy')} style={{ cursor: 'pointer' }}>Buy Price {sortField === 'buy' && (sortAsc ? '▲' : '▼')}</th>
                <th>Market Pricing</th>
                <th onClick={() => handleSort('avgPrice')} style={{ cursor: 'pointer' }}>Avg Market {sortField === 'avgPrice' && (sortAsc ? '▲' : '▼')}</th>
                <th onClick={() => handleSort('totalValue')} style={{ cursor: 'pointer' }}>Total Value {sortField === 'totalValue' && (sortAsc ? '▲' : '▼')}</th>
                <th onClick={() => handleSort('pnl')} style={{ cursor: 'pointer' }}>PnL {sortField === 'pnl' && (sortAsc ? '▲' : '▼')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCards.map(c => {
                const avgPrice = avgP(c);
                const totalValue = avgPrice * (c.qty || 1);
                const totalBuy = (c.buy || 0) * (c.qty || 1);
                const pnl = totalValue - totalBuy;
                const pnlPercent = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;
                
                const thumb = c.photos && c.photos[0] ? c.photos[0] : null;

                return (
                  <tr key={c.id}>
                    <td>
                      {thumb ? (
                        <div className="card-thumb" onClick={() => onOpenLightbox(thumb, c.name)}>
                          <img src={thumb} alt={c.name} />
                        </div>
                      ) : (
                        <div className="card-thumb-placeholder">🃏</div>
                      )}
                    </td>
                    <td>
                      <div className="card-name-cell">
                        <div className="card-info">
                          <div className="cn">{c.name}</div>
                          <div className="cs" style={{ fontSize: '11px', color: 'var(--pv-text-tertiary)' }}>{c.set}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="set-code-tag">
                        {formatSetAndCardNum(c.setcode, c.cardnum, c.lang)}
                      </span>
                    </td>
                    <td><span className="lang-b">{getLangCode(c.lang)}</span></td>
                    <td><span className="rar-b">{rarShort(c.rarity)}</span></td>
                    <td>{condPill(c.cond)}</td>
                    <td><strong style={{ fontSize: '14px' }}>{c.qty}</strong></td>
                    <td>{IDR(c.buy)}</td>
                    <td>
                      <div className="price-col">
                        {c.tcgp > 0 && (
                          <a
                            href={`https://prices.pokemontcg.io/tcgplayer/${(c.setcode || '').toLowerCase()}-${c.cardnum}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="price-row-s price-link-row"
                          >
                            <span className="psrc" style={{ color: 'var(--pv-accent)', fontWeight: 600 }}>⚡ TCGPlayer</span>
                            <span className="pval" style={{ fontWeight: 700 }}>{IDR(c.tcgp)}</span>
                          </a>
                        )}
                        {c.cardm > 0 && (
                          <a
                            href={`https://prices.pokemontcg.io/cardmarket/${(c.setcode || '').toLowerCase()}-${c.cardnum}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="price-row-s price-link-row"
                          >
                            <span className="psrc" style={{ color: '#4ade80', fontWeight: 600 }}>🌍 Cardmarket</span>
                            <span className="pval" style={{ fontWeight: 700 }}>{IDR(c.cardm)}</span>
                          </a>
                        )}
                        {(c.tcgp > 0 || c.cardm > 0) && (c.pchrt > 0 || c.collectr > 0 || c.cardtell > 0 || c.snkrdunk > 0) && (
                          <div style={{ borderTop: '1px solid var(--pv-border-primary)', margin: '4px 0' }} />
                        )}
                        {c.pchrt > 0 && (
                          <a
                            href={getSearchUrl(c, 'pchrt')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="price-row-s price-link-row"
                          >
                            <span className="psrc">PriceCharting</span>
                            <span className="pval">{IDR(c.pchrt)}</span>
                          </a>
                        )}
                        {c.collectr > 0 && (
                          <a
                            href={getSearchUrl(c, 'collectr')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="price-row-s price-link-row"
                          >
                            <span className="psrc">Collectr</span>
                            <span className="pval">{IDR(c.collectr)}</span>
                          </a>
                        )}
                        {c.cardtell > 0 && (
                          <a
                            href={getSearchUrl(c, 'cardtell')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="price-row-s price-link-row"
                          >
                            <span className="psrc">Cardtell.id</span>
                            <span className="pval">{IDR(c.cardtell)}</span>
                          </a>
                        )}
                        {c.snkrdunk > 0 && (
                          <a
                            href={getSearchUrl(c, 'snkrdunk')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="price-row-s price-link-row"
                          >
                            <span className="psrc">SNKRDUNK</span>
                            <span className="pval">{IDR(c.snkrdunk)}</span>
                          </a>
                        )}
                        {[c.tcgp, c.cardm, c.pchrt, c.collectr, c.cardtell, c.snkrdunk].every(v => !v || v === 0) && (
                          <span style={{ fontSize: '11px', color: 'var(--pv-text-tertiary)' }}>No prices yet</span>
                        )}
                      </div>
                    </td>
                    <td><strong style={{ color: 'var(--pv-text-primary)' }}>{IDR(avgPrice)}</strong></td>
                    <td><strong style={{ color: 'var(--pv-accent)' }}>{IDR(totalValue)}</strong></td>
                    <td>
                      <span className={pnl >= 0 ? 'pnlp' : 'pnln'}>
                        {pnl >= 0 ? '+' : ''}{IDR(pnl)} ({pnlPercent.toFixed(1)}%)
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn sm" onClick={() => onEditCard(c)}>
                          Edit
                        </button>
                        <button className="btn sm danger" onClick={() => {
                          if (confirm(`Are you sure you want to delete ${c.name}?`)) {
                            onDeleteCard(c.id);
                          }
                        }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Collection;
