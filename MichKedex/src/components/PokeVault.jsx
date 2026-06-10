import React, { useState, useEffect, useCallback } from 'react';
import './PokeVault.css';
import Dashboard from './Dashboard';
import Collection from './Collection';
import Pokedex from './Pokedex';
import CardModal from './CardModal';
import Lightbox from './Lightbox';
import { avgP } from './utils';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PokeVault = () => {
  const [cards, setCards] = useState([]);
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('pv_currency') || 'IDR';
    window.activeCurrency = saved;
    return saved;
  });
  const [history, setHistory] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null); // null = checking, true/false = result
  const [currentPage, setCurrentPage] = useState('pokedex'); // default to pokedex (works offline)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [usdToIdr, setUsdToIdr] = useState(16000);
  const [liveIndicator, setLiveIndicator] = useState('Checking...');

  // Fetch all cards from Express/MySQL backend
  const fetchCards = useCallback(async () => {
    if (backendOnline === null) return;
    if (backendOnline === false) {
      try {
        const localData = localStorage.getItem('pv_local_cards');
        const data = localData ? JSON.parse(localData) : [];
        setCards(data);

        const rate = usdToIdr || 16000;
        const isUSD = (localStorage.getItem('pv_currency') || 'IDR') === 'USD';

        // Calculate current total portfolio value
        const totalVal = data.reduce((sum, c) => {
          const pPchrt = isUSD ? (parseFloat(c.pchrt) || 0) : (parseFloat(c.pchrt) || 0) * rate;
          const pCollectr = isUSD ? (parseFloat(c.collectr) || 0) : (parseFloat(c.collectr) || 0) * rate;
          const pCardtell = isUSD ? (parseFloat(c.cardtell) || 0) / rate : (parseFloat(c.cardtell) || 0);

          const prices = [pPchrt, pCollectr, pCardtell].filter(x => x > 0);
          const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
          return sum + avg * (c.quantity || c.qty || 1);
        }, 0);

        // Append a real timestamped snapshot to rolling history (persisted in sessionStorage)
        const now = new Date();
        const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = { time: label, value: totalVal, ts: now.getTime() };

        const stored = sessionStorage.getItem('pv_history');
        let rollingHistory = stored ? JSON.parse(stored) : [];
        rollingHistory.push(newPoint);
        if (rollingHistory.length > 30) rollingHistory = rollingHistory.slice(-30);
        sessionStorage.setItem('pv_history', JSON.stringify(rollingHistory));
        setHistory(rollingHistory);
      } catch (err) {
        console.error('Failed to load cards from localStorage:', err);
      }
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/cards');
      if (res.ok) {
        const data = await res.json();
        setCards(data);
        
        const rate = usdToIdr || 16000;
        const isUSD = (localStorage.getItem('pv_currency') || 'IDR') === 'USD';

        // Calculate current total portfolio value
        const totalVal = data.reduce((sum, c) => {
          const pPchrt = isUSD ? (parseFloat(c.pchrt) || 0) : (parseFloat(c.pchrt) || 0) * rate;
          const pCollectr = isUSD ? (parseFloat(c.collectr) || 0) : (parseFloat(c.collectr) || 0) * rate;
          const pCardtell = isUSD ? (parseFloat(c.cardtell) || 0) / rate : (parseFloat(c.cardtell) || 0);

          const prices = [pPchrt, pCollectr, pCardtell].filter(x => x > 0);
          const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
          return sum + avg * (c.quantity || c.qty || 1);
        }, 0);

        // Append a real timestamped snapshot to rolling history (persisted in sessionStorage)
        const now = new Date();
        const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = { time: label, value: totalVal, ts: now.getTime() };

        const stored = sessionStorage.getItem('pv_history');
        let rollingHistory = stored ? JSON.parse(stored) : [];
        rollingHistory.push(newPoint);
        // Keep last 30 snapshots
        if (rollingHistory.length > 30) rollingHistory = rollingHistory.slice(-30);
        sessionStorage.setItem('pv_history', JSON.stringify(rollingHistory));
        setHistory(rollingHistory);
      }
    } catch (err) {
      console.error('Failed to fetch cards from server:', err);
    }
  }, [usdToIdr, backendOnline]);

  // Check if backend is reachable, then load exchange rate
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('http://localhost:5000/api/exchange-rate', { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data.rates && data.rates.IDR) {
            setUsdToIdr(data.rates.IDR);
          }
          setBackendOnline(true);
          setCurrentPage('portfolio');
          setLiveIndicator('Connected');
        } else {
          setBackendOnline(false);
          setLiveIndicator('Local Storage');
          setCurrentPage('portfolio');
        }
      } catch (err) {
        setBackendOnline(false);
        setLiveIndicator('Local Storage');
        setCurrentPage('portfolio');
        console.info('Backend not reachable — running in local storage mode.');
      }
    };

    checkBackend();
  }, []);

  // Fetch cards on mount and whenever currency changes
  useEffect(() => {
    fetchCards();
  }, [fetchCards, currency]);

  // Load history from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('pv_history');
    if (stored) {
      try { setHistory(JSON.parse(stored)); } catch (_) {}
    }
  }, []);

  // Update cards in local state with currency conversion (USD <-> IDR)
  const fluctuatedCards = React.useMemo(() => {
    const isUSD = currency === 'USD';
    return cards.map(c => {
      const basePchrt = isUSD ? (parseFloat(c.pchrt) || 0) : (parseFloat(c.pchrt) || 0) * usdToIdr;
      const baseCollectr = isUSD ? (parseFloat(c.collectr) || 0) : (parseFloat(c.collectr) || 0) * usdToIdr;
      const baseCardtell = isUSD ? (parseFloat(c.cardtell) || 0) / usdToIdr : (parseFloat(c.cardtell) || 0);
      const baseSnkrdunk = isUSD ? (parseFloat(c.snkrdunk) || 0) : (parseFloat(c.snkrdunk) || 0) * usdToIdr;
      const baseTcgp = isUSD ? (parseFloat(c.tcgp) || 0) : (parseFloat(c.tcgp) || 0) * usdToIdr;
      const baseCardm = isUSD ? (parseFloat(c.cardm) || 0) : (parseFloat(c.cardm) || 0) * usdToIdr;
      const baseBuy = isUSD ? (parseFloat(c.buy) || 0) / usdToIdr : (parseFloat(c.buy) || 0);

      return {
        ...c,
        buy: baseBuy,
        pchrt: basePchrt,
        collectr: baseCollectr,
        cardtell: baseCardtell,
        snkrdunk: baseSnkrdunk,
        tcgp: baseTcgp,
        cardm: baseCardm,
      };
    });
  }, [cards, currency, usdToIdr]);


  // CRUD operation handlers
  const handleSaveCard = async (cardData) => {
    if (backendOnline === false) {
      try {
        const localData = localStorage.getItem('pv_local_cards');
        let localCards = localData ? JSON.parse(localData) : [];
        
        if (cardData.id) {
          // Edit
          localCards = localCards.map(c => c.id === cardData.id ? cardData : c);
          toast.success('Card updated locally!');
        } else {
          // Create
          const newCard = {
            ...cardData,
            id: Date.now()
          };
          localCards.push(newCard);
          toast.success('Card added locally!');
        }
        
        localStorage.setItem('pv_local_cards', JSON.stringify(localCards));
        setCards(localCards);
        
        await fetchCards();
        setIsModalOpen(false);
        setEditingCard(null);
      } catch (err) {
        console.error('Save card locally error:', err);
        toast.error('Failed to save card locally.');
      }
      return;
    }

    try {
      const isEdit = !!cardData.id;
      const url = isEdit ? `http://localhost:5000/api/cards/${cardData.id}` : 'http://localhost:5000/api/cards';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      });

      if (response.ok) {
        toast.success(editingCard ? 'Card updated successfully!' : 'Card added successfully!');
        await fetchCards();
        setIsModalOpen(false);
        setEditingCard(null);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to save card: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Save card error:', err);
      toast.error('Network error when attempting to save the card.');
    }
  };

  const handleDeleteCard = async (id) => {
    if (backendOnline === false) {
      try {
        const localData = localStorage.getItem('pv_local_cards');
        let localCards = localData ? JSON.parse(localData) : [];
        localCards = localCards.filter(c => c.id !== id);
        
        localStorage.setItem('pv_local_cards', JSON.stringify(localCards));
        setCards(localCards);
        
        await fetchCards();
        toast.success('Card deleted locally!');
      } catch (err) {
        console.error('Delete card locally error:', err);
        toast.error('Failed to delete card.');
      }
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/cards/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Card deleted successfully!');
        await fetchCards();
      } else {
        toast.error('Failed to delete card.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting card.');
    }
  };

  const openAddModal = () => {
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const openEditModal = (card) => {
    // Find original database card with USD prices to avoid editing converted IDR prices
    const originalCard = cards.find(item => item.id === card.id) || card;
    setEditingCard(originalCard);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const openLightbox = (src, title) => {
    setSelectedPhoto({ src, title });
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const handleCurrencyChange = (newCurr) => {
    localStorage.setItem('pv_currency', newCurr);
    window.activeCurrency = newCurr;
    setCurrency(newCurr);
  };

  return (
    <div className="pokevault-wrapper">
      {/* Offline banner — shown when GitHub Pages / no local backend */}
      {backendOnline === false && (
        <div style={{
          background: 'linear-gradient(90deg, #1e293b, #0f172a)',
          borderBottom: '1px solid #334155',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#94a3b8',
        }}>
          <span style={{ fontSize: '16px' }}>🌐</span>
          <span>
            <strong style={{ color: '#f8fafc' }}>Offline Mode (Local Storage)</strong>
            {' '}— Your changes are saved temporarily in the browser. Run{' '}
            <code style={{ background: '#1e293b', padding: '1px 6px', borderRadius: '4px', color: '#38bdf8' }}>npm run dev:full</code>
            {' '}locally to use the MySQL database backend.
          </span>
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          🏆 Mich<em>Kedex</em> PokéVault
        </div>

        <div className="ntabs">
          <button 
            className={`ntab ${currentPage === 'portfolio' ? 'on' : ''}`}
            onClick={() => setCurrentPage('portfolio')}
            disabled={backendOnline === null}
            title={backendOnline === null ? 'Checking connection...' : ''}
            style={backendOnline === null ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            📊 Portfolio
          </button>
          <button 
            className={`ntab ${currentPage === 'collection' ? 'on' : ''}`}
            onClick={() => setCurrentPage('collection')}
            disabled={backendOnline === null}
            title={backendOnline === null ? 'Checking connection...' : ''}
            style={backendOnline === null ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            📂 Collection
          </button>
          <button 
            className={`ntab ${currentPage === 'pokedex' ? 'on' : ''}`}
            onClick={() => setCurrentPage('pokedex')}
          >
            🎮 Pokédex
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="currency-selector">
            <button 
              className={`curr-btn ${currency === 'IDR' ? 'active' : ''}`}
              onClick={() => handleCurrencyChange('IDR')}
            >
              IDR
            </button>
            <button 
              className={`curr-btn ${currency === 'USD' ? 'active' : ''}`}
              onClick={() => handleCurrencyChange('USD')}
            >
              USD
            </button>
          </div>

          <div className="live-pill">
            <span className="live-dot" style={backendOnline === false ? { background: '#ef4444' } : {}}></span>
            <span>{liveIndicator}</span>
          </div>
        </div>
      </header>

      <main className="page">
        {currentPage === 'portfolio' ? (
          <Dashboard cards={fluctuatedCards} history={history} onUpdatePrices={fetchCards} backendOnline={backendOnline} />
        ) : currentPage === 'collection' ? (
          <Collection 
            cards={fluctuatedCards} 
            onEditCard={openEditModal} 
            onDeleteCard={handleDeleteCard}
            onOpenAddModal={openAddModal} 
            onOpenLightbox={openLightbox}
            onImportExcel={fetchCards}
            backendOnline={backendOnline}
          />
        ) : (
          <Pokedex cards={fluctuatedCards} />
        )}
      </main>

      {/* Reusable Overlays */}
      <CardModal 
        isOpen={isModalOpen} 
        card={editingCard} 
        onSave={handleSaveCard} 
        onClose={closeModal} 
        onOpenLightbox={openLightbox}
      />

      <Lightbox 
        isOpen={!!selectedPhoto} 
        src={selectedPhoto?.src} 
        title={selectedPhoto?.title} 
        onClose={closeLightbox} 
      />

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default PokeVault;
