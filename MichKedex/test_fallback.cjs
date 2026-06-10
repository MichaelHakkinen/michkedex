async function test() {
  const cardName = "Pikachu";
  const cardNum = "081";
  const setCode = "sv3a"; // Japanese set code
  
  const apiCall = async (q) => {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`;
    console.log('Querying:', url);
    const res = await fetch(url);
    const json = await res.json();
    return json.data || [];
  };

  // Try 1: set.id + number
  let data = await apiCall(`set.id:"${setCode}" number:"${cardNum}"`);
  console.log('Try 1 results count:', data.length);

  // Try 2: name + number
  if (data.length === 0) {
    data = await apiCall(`name:"${cardName}" number:"${cardNum}"`);
    console.log('Try 2 results count:', data.length);
  }

  // Try 3: name only
  if (data.length === 0) {
    data = await apiCall(`name:"${cardName}"`);
    console.log('Try 3 results count:', data.length);
  }
  
  if (data.length > 0) {
    console.log('Matched Card Name:', data[0].name, 'Set:', data[0].set.name);
  }
}

test();
