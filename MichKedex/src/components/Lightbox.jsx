import React from 'react';

const Lightbox = ({ isOpen, src, title, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div className="lightbox-title">{title}</div>
      <img src={src} className="lightbox-img" alt={title} onClick={(e) => e.stopPropagation()} />
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '20px' }}>Click anywhere to close</div>
    </div>
  );
};

export default Lightbox;
