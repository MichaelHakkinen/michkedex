-- PokéVault Main Database Schema
-- Database: michkedex

-- Create Cards table
CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    pokemon VARCHAR(100) NOT NULL,
    set_name VARCHAR(255) NOT NULL,
    card_number VARCHAR(50),
    set_code VARCHAR(50),
    rarity VARCHAR(100),
    language VARCHAR(50),
    `condition` VARCHAR(100), -- backticks required since CONDITION is reserved in MySQL
    quantity INTEGER DEFAULT 1,
    purchase_price DECIMAL(15, 2) DEFAULT 0.00,
    tcgplayer_price DECIMAL(15, 2) DEFAULT 0.00,
    cardmarket_price DECIMAL(15, 2) DEFAULT 0.00,
    pricecharting_price DECIMAL(15, 2) DEFAULT 0.00,
    local_price DECIMAL(15, 2) DEFAULT 0.00,
    collectr_price DECIMAL(15, 2) DEFAULT 0.00,
    snkrdunk_price DECIMAL(15, 2) DEFAULT 0.00,
    ebay_price DECIMAL(15, 2) DEFAULT 0.00,
    cardtell_price DECIMAL(15, 2) DEFAULT 0.00,
    notes TEXT,
    photos JSON, -- MySQL uses JSON instead of PostgreSQL's JSONB
    links JSON,  -- MySQL uses JSON instead of PostgreSQL's JSONB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

