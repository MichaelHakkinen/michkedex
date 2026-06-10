const API_URL = 'https://api.pokemontcg.io/v2';

// Note: You can add an API key to the .env file as VITE_POKEMON_TCG_API_KEY
// to increase rate limits.
const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY || '';

export const searchCards = async (query) => {
  try {
    // Search by name, number, or set id
    const q = `(name:"*${query}*" OR number:"${query}" OR set.id:"${query}" OR set.name:"*${query}*")`;
    const response = await fetch(`${API_URL}/cards?q=${encodeURIComponent(q)}&pageSize=20&orderBy=-set.releaseDate`, {
      headers: API_KEY ? { 'X-Api-Key': API_KEY } : {},
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching cards:', error);
    return [];
  }
};

export const getCardDetails = async (id) => {
  try {
    const response = await fetch(`${API_URL}/cards/${id}`, {
      headers: API_KEY ? { 'X-Api-Key': API_KEY } : {},
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching card details:', error);
    return null;
  }
};
