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
  const [currentPage, setCurrentPage] = useState('portfolio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [usdToIdr, setUsdToIdr] = useState(16000);
  const [liveIndicator, setLiveIndicator] = useState('Active');

  // Fetch all cards from Express/MySQL backend
  const fetchCards = useCallback(async () => {
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
  }, [usdToIdr]);

  // Fetch exchange rate USD -> IDR on mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/exchange-rate');
        if (res.ok) {
          const data = await res.json();
          if (data.rates && data.rates.IDR) {
            setUsdToIdr(data.rates.IDR);
            console.log('Live exchange rate loaded from local proxy:', data.rates.IDR);
          }
        }
      } catch (err) {
        console.error('Failed to fetch live exchange rate:', err);
      }
    };
    
    fetchExchangeRate();
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
    setLiveIndicator('Connected');
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
      <header className="topbar">
        <div className="brand">
          🏆 Mich<em>Kedex</em> PokéVault
        </div>

        <div className="ntabs">
          <button 
            className={`ntab ${currentPage === 'portfolio' ? 'on' : ''}`}
            onClick={() => setCurrentPage('portfolio')}
          >
            📊 Portfolio
          </button>
          <button 
            className={`ntab ${currentPage === 'collection' ? 'on' : ''}`}
            onClick={() => setCurrentPage('collection')}
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
            <span className="live-dot"></span>
            <span>{liveIndicator}</span>
          </div>
        </div>
      </header>

      <main className="page">
        {currentPage === 'portfolio' ? (
          <Dashboard cards={fluctuatedCards} history={history} onUpdatePrices={fetchCards} />
        ) : currentPage === 'collection' ? (
          <Collection 
            cards={fluctuatedCards} 
            onEditCard={openEditModal} 
            onDeleteCard={handleDeleteCard}
            onOpenAddModal={openAddModal} 
            onOpenLightbox={openLightbox}
            onImportExcel={fetchCards}
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
