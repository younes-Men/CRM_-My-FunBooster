async function testGeneralFiltering() {
  const url = `https://recherche-entreprises.api.gouv.fr/search?per_page=25&etat_administratif=A&activite_principale=55.10Z&departement=92`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(`Found ${data.total_results} total results`);
  if (data.results) {
    data.results.forEach((r, idx) => {
      console.log(`\nResult ${idx + 1}: ${r.nom_complet}`);
      console.log(`  Siege SIRET: ${r.siege?.siret}`);
      console.log(`  Siege Departement: ${r.siege?.departement}`);
      console.log(`  Siege Code Postal: ${r.siege?.code_postal}`);
      if (r.matching_etablissements) {
        console.log(`  Matching etablissements count: ${r.matching_etablissements.length}`);
        r.matching_etablissements.forEach((etab, i) => {
          console.log(`    Etablissement ${i + 1}: SIRET=${etab.siret}, CP=${etab.code_postal}, Dept=${etab.departement || etab.code_postal?.substring(0, 2)}`);
        });
      } else {
        console.log('  No matching etablissements');
      }
    });
  }
}

testGeneralFiltering();
