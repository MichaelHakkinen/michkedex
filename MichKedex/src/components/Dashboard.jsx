import React, { useMemo } from 'react';
import { IDR, avgP } from './utils.jsx';
import { toast } from 'react-toastify';

// ── Portfolio Value Chart (pure SVG, no extra deps) ──────────────────────────
const PortfolioChart = ({ history, currency }) => {
  const W = 900, H = 220, PAD = { top: 20, right: 24, bottom: 44, left: 20 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  const points = useMemo(() => {
    if (!history || history.length < 2) return [];
    const vals = history.map(h => h.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const span = maxV - minV || 1;
    return history.map((h, i) => ({
      x: PAD.left + (i / (history.length - 1)) * CW,
      y: PAD.top + (1 - (h.value - minV) / span) * CH,
      value: h.value,
      time: h.time,
    }));
  }, [history]);

  if (points.length < 2) return null;

  // Build smooth bezier path
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${acc} C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }, '');

  // Closed fill path (go down to bottom, back to start)
  const last = points[points.length - 1];
  const first = points[0];
  const fillD = `${pathD} L ${last.x},${PAD.top + CH} L ${first.x},${PAD.top + CH} Z`;

  const vals = history.map(h => h.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const totalChange = last.value - first.value;
  const isUp = totalChange >= 0;
  const strokeColor = isUp ? '#059669' : '#dc2626';
  const gradId = `chart-grad-${isUp ? 'up' : 'dn'}`;

  // Y-axis gridlines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y: PAD.top + pct * CH,
    label: IDR(maxV - pct * (maxV - minV)),
  }));

  return (
    <div className="portfolio-chart-wrap">
      <div className="chart-header">
        <span className="chart-title">Portfolio Value Over Time</span>
        <span className={`chart-delta ${isUp ? 'pnlp' : 'pnln'}`}>
          {isUp ? '▲' : '▼'} {IDR(Math.abs(totalChange))}
          <span style={{ fontWeight: 400, fontSize: '11px', marginLeft: 4 }}>
            ({history.length} snapshots)
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '220px', display: 'block' }}
        aria-label="Portfolio value chart"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={g.y}
              x2={W - PAD.right} y2={g.y}
              stroke="var(--pv-border-primary)" strokeWidth="0.5" strokeDasharray="4,4"
            />
          </g>
        ))}

        {/* Fill under curve */}
        <path d={fillD} fill={`url(#${gradId})`} />

        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={strokeColor} stroke="var(--pv-bg-primary)" strokeWidth="2" />
            <text
              x={p.x}
              y={PAD.top + CH + 16}
              textAnchor="middle"
              fontSize="10"
              fill="var(--pv-text-tertiary)"
              fontFamily="var(--pv-font-sans)"
            >
              {p.time}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const Dashboard = ({ cards, history, onUpdatePrices, backendOnline }) => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleManualUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const syncToast = toast.loading('Syncing prices with live market API...', { autoClose: false });
    try {
      const res = await fetch('http://localhost:5000/api/update-prices', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        toast.update(syncToast, {
          render: `Successfully synced live prices for ${data.updated}/${data.total} cards!`,
          type: 'success',
          isLoading: false,
          autoClose: 4000
        });
        if (onUpdatePrices) {
          onUpdatePrices();
        }
      } else {
        toast.update(syncToast, {
          render: 'Failed to update live market prices.',
          type: 'error',
          isLoading: false,
          autoClose: 4000
        });
      }
    } catch (err) {
      console.error(err);
      toast.update(syncToast, {
        render: 'Error updating live market prices.',
        type: 'error',
        isLoading: false,
        autoClose: 4000
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const cost = cards.reduce((s, c) => s + (c.buy || 0) * c.qty, 0);
  const val = cards.reduce((s, c) => s + avgP(c) * c.qty, 0);
  
  // Calculate 5-minute change
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const oldPoint = history.find(p => p.time >= fiveMinAgo) || history[0];
  const oldVal = oldPoint?.value || val;
  const fiveMinChange = val - oldVal;
  const fiveMinPct = oldVal > 0 ? (fiveMinChange / oldVal) * 100 : 0;

  const pnl = val - cost;
  const pct = cost > 0 ? (pnl / cost) * 100 : 0;
  const qty = cards.reduce((s, c) => s + c.qty, 0);

  const pm = {};
  const sm = {};
  cards.forEach((c) => {
    const v = avgP(c) * c.qty;
    pm[c.pokemon] = (pm[c.pokemon] || 0) + v;
    sm[c.set] = (sm[c.set] || 0) + v;
  });

  const ps = Object.entries(pm).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const ss = Object.entries(sm).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxP = ps[0]?.[1] || 1;
  const maxS = ss[0]?.[1] || 1;

  const topCards = [...cards]
    .sort((a, b) => avgP(b) * b.qty - avgP(a) * a.qty)
    .slice(0, 5);

  return (
    <div id="page-portfolio" className="page on">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Portfolio Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn sm" 
            onClick={handleManualUpdate} 
            disabled={isUpdating || backendOnline === false}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title={backendOnline === false ? 'Syncing prices requires the local backend' : ''}
          >
            {isUpdating ? '⏳ Syncing Prices...' : '🔄 Sync Live Prices'}
          </button>
          <span className="live-pill">
            <span className="live-dot" style={backendOnline === false ? { background: '#ef4444' } : {}}></span>
            {backendOnline === false ? 'Local Storage' : 'Live Market'}
          </span>
        </div>
      </div>
      <div className="metrics">
        <div className="mcard">
          <div className="mlabel">Net worth</div>
          <div className="mval">{IDR(val)}</div>
          <div className={`msub ${fiveMinChange >= 0 ? 'pnlp' : 'pnln'}`} style={{ fontWeight: '600' }}>
            {fiveMinChange >= 0 ? '↑' : '↓'} {fiveMinPct.toFixed(2)}% (5m)
          </div>
        </div>
        <div className="mcard">
          <div className="mlabel">Invested</div>
          <div className="mval">{IDR(cost)}</div>
          <div className="msub">
            {qty} copies, {cards.length} unique
          </div>
        </div>
        <div className="mcard">
          <div className="mlabel">Profit / Loss</div>
          <div className={`mval ${pnl >= 0 ? 'pos' : 'neg'}`}>
            {pnl >= 0 ? '+' : ''}
            {IDR(pnl)}
          </div>
          <div className={`msub ${pnl >= 0 ? 'pnlp' : 'pnln'}`}>
            {pnl >= 0 ? '+' : ''}
            {pct.toFixed(1)}%
          </div>
        </div>
        <div className="mcard">
          <div className="mlabel">Cards</div>
          <div className="mval">{cards.length}</div>
          <div className="msub">{qty} total copies</div>
        </div>
      </div>

      {/* Portfolio Value Chart */}
      {history && history.length >= 2 && (
        <PortfolioChart history={history} currency={undefined} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="panel">
          <div className="panel-title">Value by Pokémon</div>
          <div id="pokemon-bars">
            {ps.length > 0 ? (
              ps.map(([k, v]) => (
                <div className="bar-row" key={k}>
                  <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {k}
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.round((v / maxP) * 100)}%` }}></div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--pv-text-tertiary)', textAlign: 'right' }}>
                    {IDR(v)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--pv-text-tertiary)', fontSize: '13px' }}>No data</div>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">Top cards by value</div>
          <div id="top-cards">
            {topCards.length > 0 ? (
              topCards.map((c) => {
                const v = avgP(c) * c.qty;
                const cardPnl = v - (c.buy || 0) * c.qty;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--pv-border-secondary)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--pv-text-tertiary)' }}>
                        {c.pokemon} · {c.set}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                          {c.setcode && <span className="set-code-tag">{c.setcode}</span>}
                          {c.cardnum && <span style={{ fontSize: '10px', color: 'var(--pv-text-tertiary)' }}>{c.cardnum}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{IDR(v)}</div>
                      <div className={cardPnl >= 0 ? 'pnlp' : 'pnln'} style={{ fontSize: '11px' }}>
                        {cardPnl >= 0 ? '+' : ''}
                        {IDR(cardPnl)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--pv-text-tertiary)', fontSize: '13px' }}>No cards</div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Value by set</div>
        <div id="set-bars">
          {ss.length > 0 ? (
            ss.map(([k, v]) => (
              <div className="bar-row" key={k}>
                <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {k}
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.round((v / maxS) * 100)}%` }}></div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--pv-text-tertiary)', textAlign: 'right' }}>
                  {IDR(v)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--pv-text-tertiary)', fontSize: '13px' }}>No data</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
