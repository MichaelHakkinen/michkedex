import React, { useState, useEffect } from 'react';
import { searchCards } from './PokemonService';

const CardModal = ({ isOpen, card, onSave, onClose, onOpenLightbox }) => {
  const initialForm = {
    pokemon: '',
    name: '',
    set: '',
    lang: 'English',
    cond: 'NM',
    qty: 1,
    buy: 0,
    setcode: '',
    cardnum: '',
    rarity: 'Common',
    pchrt: 0,
    collectr: 0,
    cardtell: 0,
    snkrdunk: 0,
    notes: '',
    photos: [],
    links: [],
  };

  const [formData, setFormData] = useState(initialForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [photoInput, setPhotoInput] = useState('');

  useEffect(() => {
    if (card) {
      setFormData({
        ...initialForm,
        ...card,
        buy: card.buy || 0,
        pchrt: card.pchrt || 0,
        collectr: card.collectr || 0,
        cardtell: card.cardtell || 0,
        snkrdunk: card.snkrdunk || 0,
        photos: card.photos || [],
        links: card.links || [],
      });
    } else {
      setFormData(initialForm);
    }
    setSearchQuery('');
    setSearchResults([]);
  }, [card, isOpen]);

  // Dynamic TCGdex language-specific image fetching
  useEffect(() => {
    if (!formData.setcode || !formData.cardnum) return;

    const fetchLanguageImage = async () => {
      const langMap = {
        'English': 'en',
        'Japanese': 'ja',
        'Indonesian': 'id',
        'Korean': 'ko',
        'Simplified Chinese': 'zh-cn',
        'Traditional Chinese': 'zh-tw'
      };

      const tcgLang = langMap[formData.lang] || 'en';
      // Format TCGdex API card ID: e.g. sv3pt5-199
      let setcodeClean = formData.setcode.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Standard set mapping corrections if any
      if (setcodeClean === 'mew') setcodeClean = 'sv3pt5'; // Mew/151 correction if setcode was typed as MEW
      
      const apiId = `${setcodeClean}-${formData.cardnum}`;

      try {
        const response = await fetch(`https://api.tcgdex.net/v2/${tcgLang}/cards/${apiId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.image) {
            setFormData(prev => ({
              ...prev,
              photos: [`${data.image}/high.webp`, ...prev.photos.slice(1)].filter(Boolean)
            }));
            return;
          }
        }
        
        // Fallback to English if regional print fails
        if (tcgLang !== 'en') {
          const fbRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${apiId}`);
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (fbData.image) {
              setFormData(prev => ({
                ...prev,
                photos: [`${fbData.image}/high.webp`, ...prev.photos.slice(1)].filter(Boolean)
              }));
            }
          }
        }
      } catch (err) {
        console.error('TCGdex fetch error:', err);
      }
    };

    fetchLanguageImage();
  }, [formData.lang, formData.setcode, formData.cardnum]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'qty' || name === 'buy' || name === 'pchrt' || name === 'collectr' || name === 'cardtell' || name === 'snkrdunk'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleApiSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchCards(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const selectApiCard = (c) => {
    // Auto populate details from TCG Player search
    const prices = c.tcgplayer?.prices || {};
    const subPrice = prices.holofoil || prices.normal || prices.reverseHolofoil || {};
    const marketPrice = subPrice.market || subPrice.mid || 0;

    // Use ptcgoCode (printed on cards, e.g. "PFL", "SVE") when available,
    // otherwise fall back to the internal API set ID (e.g. "me2pt5", "sv9")
    const displaySetCode = c.set.ptcgoCode || c.set.id;

    setFormData(prev => ({
      ...prev,
      pokemon: c.name,
      name: `${c.name} (${c.supertype || 'Card'})`,
      set: c.set.name,
      setcode: displaySetCode,
      cardnum: c.number,
      rarity: c.rarity || 'Common',
      pchrt: marketPrice,
      collectr: marketPrice,
      photos: [c.images.large || c.images.small].filter(Boolean),
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  const addPhoto = () => {
    if (photoInput.trim()) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, photoInput.trim()]
      }));
      setPhotoInput('');
    }
  };

  const removePhoto = (idx) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Helper search URLs generator
  const getSearchUrl = (platform) => {
    const query = `${formData.pokemon} ${formData.cardnum} ${formData.set}`.trim();
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
      const snkrQuery = formData.setcode ? `${formData.setcode} ${formData.cardnum}` : formData.pokemon;
      return `https://snkrdunk.com/en/search?keyword=${encodeURIComponent(snkrQuery)}`;
    }
    return '#';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>{card ? 'Edit Pokemon Card' : 'Add Pokemon Card'}</h3>
          <button className="btn sm" onClick={onClose}>&times;</button>
        </div>

        {/* TCG search section */}
        {!card && (
          <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--pv-bg-secondary)', borderRadius: 'var(--pv-radius-md)', border: '1px solid var(--pv-border-primary)' }}>
            <label className="mlabel" style={{ display: 'block', marginBottom: '8px' }}>Auto-Fill using TCG API</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Search card (e.g. Mew 151)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiSearch()}
                style={{ flexGrow: 1, padding: '8px 12px', border: '1px solid var(--pv-border-primary)', borderRadius: 'var(--pv-radius-md)' }}
              />
              <button className="btn accent" onClick={handleApiSearch} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ 
                maxHeight: '380px', 
                overflowY: 'auto', 
                marginTop: '12px', 
                padding: '12px',
                background: 'var(--pv-bg-primary)', 
                border: '1px solid var(--pv-border-primary)', 
                borderRadius: 'var(--pv-radius-md)' 
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px' 
                }}>
                  {searchResults.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => selectApiCard(c)}
                      style={{ 
                        background: 'var(--pv-bg-secondary)',
                        border: '1px solid var(--pv-border-primary)',
                        borderRadius: 'var(--pv-radius-md)',
                        padding: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        minWidth: 0,
                      }}
                      className="search-item-card-hover"
                    >
                      <img 
                        src={c.images.small || c.images.large} 
                        alt={c.name} 
                        style={{ 
                          width: '100%', 
                          height: '110px', 
                          objectFit: 'contain', 
                          borderRadius: '4px',
                          marginBottom: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <div style={{ width: '100%' }}>
                        <strong style={{ fontSize: '12px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--pv-text-primary)' }} title={c.name}>
                          {c.name}
                        </strong>
                        <div style={{ fontSize: '10px', color: 'var(--pv-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={c.set.name}>
                          {c.set.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--pv-accent)', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase' }}>
                          {(c.set?.id || '').toUpperCase()} • #{c.number}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Pokemon Name</label>
              <input type="text" name="pokemon" value={formData.pokemon} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>Card Variant Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Mew ex Full Art" required />
            </div>

            <div className="form-field">
              <label>Set Name</label>
              <input type="text" name="set" value={formData.set} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>Language</label>
              <select name="lang" value={formData.lang} onChange={handleChange}>
                <option value="English">English</option>
                <option value="Japanese">Japanese</option>
                <option value="Indonesian">Indonesian</option>
                <option value="Korean">Korean</option>
                <option value="Simplified Chinese">Simplified Chinese</option>
                <option value="Traditional Chinese">Traditional Chinese</option>
              </select>
            </div>

            <div className="form-field">
              <label>Set Code</label>
              <input type="text" name="setcode" value={formData.setcode} onChange={handleChange} placeholder="e.g. MEW, sv3pt5" />
            </div>

            <div className="form-field">
              <label>Card Number</label>
              <input type="text" name="cardnum" value={formData.cardnum} onChange={handleChange} placeholder="e.g. 199/165" />
            </div>

            <div className="form-field">
              <label>Rarity</label>
              <input type="text" name="rarity" value={formData.rarity} onChange={handleChange} placeholder="e.g. Secret Rare" />
            </div>

            <div className="form-field">
              <label>Condition</label>
              <select name="cond" value={formData.cond} onChange={handleChange}>
                <option value="M">Mint (M)</option>
                <option value="NM">Near Mint (NM)</option>
                <option value="LP">Light Play (LP)</option>
                <option value="MP">Moderate Play (MP)</option>
                <option value="HP">Heavy Play (HP)</option>
                <option value="DMG">Damaged (DMG)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Quantity</label>
              <input type="number" name="qty" value={formData.qty} onChange={handleChange} min="1" required />
            </div>

            <div className="form-field">
              <label>Buy Price (IDR)</label>
              <input type="number" name="buy" value={formData.buy} onChange={handleChange} min="0" />
            </div>

            <div className="sec-divider">Market Prices (USD)</div>

            <div className="form-field">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                PriceCharting
                <a href={getSearchUrl('pchrt')} target="_blank" rel="noopener noreferrer" className="src-link" style={{ fontSize: '10px' }}>🔍 Search</a>
              </label>
              <input type="number" step="0.01" name="pchrt" value={formData.pchrt} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Collectr
                <a href={getSearchUrl('collectr')} target="_blank" rel="noopener noreferrer" className="src-link" style={{ fontSize: '10px' }}>🔍 Search</a>
              </label>
              <input type="number" step="0.01" name="collectr" value={formData.collectr} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Cardtell.id
                <a href={getSearchUrl('cardtell')} target="_blank" rel="noopener noreferrer" className="src-link" style={{ fontSize: '10px' }}>🔍 Search</a>
              </label>
              <input type="number" step="0.01" name="cardtell" value={formData.cardtell} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                SNKRDUNK
                <a href={getSearchUrl('snkrdunk')} target="_blank" rel="noopener noreferrer" className="src-link" style={{ fontSize: '10px' }}>🔍 Search</a>
              </label>
              <input type="number" step="0.01" name="snkrdunk" value={formData.snkrdunk} onChange={handleChange} />
            </div>

            <div className="form-field full">
              <label>Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" style={{ resize: 'none' }}></textarea>
            </div>

            <div className="sec-divider">Card Artwork</div>

            <div className="form-field full">
              {formData.photos.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <img 
                    src={formData.photos[0]} 
                    alt="Preview" 
                    onClick={() => onOpenLightbox && onOpenLightbox(formData.photos[0], formData.name || 'Card Artwork')}
                    style={{ 
                      width: '120px', 
                      height: '165px', 
                      objectFit: 'contain', 
                      borderRadius: '8px', 
                      border: '1px solid var(--pv-border-primary)', 
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                    }} 
                    className="card-artwork-preview-hover"
                  />
                </div>
              )}

              <label>Add Image URL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Paste artwork URL..." 
                  value={photoInput} 
                  onChange={(e) => setPhotoInput(e.target.value)} 
                  style={{ flexGrow: 1 }}
                />
                <button type="button" className="btn" onClick={addPhoto}>Add</button>
              </div>

              {formData.photos.length > 0 && (
                <div className="photo-preview-wrap">
                  {formData.photos.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt={`Preview ${i}`} className="photo-prev" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto(i)}
                        style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn accent">Save Card</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardModal;
