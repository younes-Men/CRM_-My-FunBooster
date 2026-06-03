async function testApiResponse() {
  const url = `https://recherche-entreprises.api.gouv.fr/search?q=45244038100989`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    const result = data.results[0];
    console.log('Result properties:', Object.keys(result));
    console.log('Siege properties:', Object.keys(result.siege));
    console.log('Siege:', JSON.stringify(result.siege, null, 2));
    if (result.matching_etablissements) {
      console.log('Matching Etablissement 0 properties:', Object.keys(result.matching_etablissements[0]));
      console.log('Matching Etablissement 0:', JSON.stringify(result.matching_etablissements[0], null, 2));
    }
  }
}

testApiResponse();
