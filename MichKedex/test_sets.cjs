async function test() {
  // Check me2 and me2pt5 sets for their ptcgoCode
  for (const setId of ['me2', 'me2pt5', 'sv6pt5', 'sv9']) {
    const url = `https://api.pokemontcg.io/v2/sets/${setId}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const { data } = await res.json();
        console.log(`Set ${setId}: name="${data.name}" ptcgoCode="${data.ptcgoCode}" series="${data.series}"`);
      } else {
        console.log(`Set ${setId}: not found (${res.status})`);
      }
    } catch(e) {
      console.error(`Error for ${setId}:`, e.message);
    }
  }
}
test();
