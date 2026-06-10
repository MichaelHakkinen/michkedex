import React from 'react';

export const IDR = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return (window.activeCurrency || 'IDR') === 'USD' ? '$0.00' : 'Rp 0';
  }
  const cur = window.activeCurrency || 'IDR';
  if (cur === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const avgP = (c) => {
  if (!c) return 0;
  const prices = [c.pchrt, c.collectr, c.cardtell, c.snkrdunk, c.tcgp, c.cardm].filter(x => typeof x === 'number' && x > 0);
  return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
};

export const condPill = (cond) => {
  const c = (cond || '').toUpperCase();
  let bg = 'rgba(255,255,255,0.05)';
  let color = 'rgba(255,255,255,0.7)';
  
  if (c === 'M' || c === 'MINT') { bg = '#10b981'; color = '#ffffff'; }
  else if (c === 'NM' || c === 'NEAR MINT') { bg = '#10b981'; color = '#ffffff'; }
  else if (c === 'LP' || c === 'LIGHT PLAY') { bg = '#3b82f6'; color = '#ffffff'; }
  else if (c === 'MP' || c === 'MODERATE PLAY') { bg = '#f59e0b'; color = '#ffffff'; }
  else if (c === 'HP' || c === 'HEAVY PLAY') { bg = '#ef4444'; color = '#ffffff'; }
  else if (c === 'DMG' || c === 'DAMAGED') { bg = '#7f1d1d'; color = '#ffffff'; }
  
  return (
    <span className="cond-pill" style={{ 
      backgroundColor: bg, 
      color: color, 
      padding: '3px 8px', 
      borderRadius: '4px', 
      fontSize: '11px', 
      fontWeight: 'bold',
      display: 'inline-block',
      textAlign: 'center',
      minWidth: '35px'
    }}>
      {c}
    </span>
  );
};

export const rarShort = (rarity) => {
  const r = (rarity || '').toLowerCase();
  if (r.includes('secret')) return 'SR';
  if (r.includes('ultra')) return 'UR';
  if (r.includes('hyper')) return 'HR';
  if (r.includes('special')) return 'SAR';
  if (r.includes('illustration')) return 'AR';
  if (r.includes('rare')) return 'R';
  if (r.includes('uncommon')) return 'U';
  if (r.includes('common')) return 'C';
  return rarity || '';
};

export const srcLabel = (src) => {
  if (src === 'pchrt') return 'PriceCharting';
  if (src === 'collectr') return 'Collectr';
  if (src === 'cardtell') return 'Cardtell.id';
  return src;
};
