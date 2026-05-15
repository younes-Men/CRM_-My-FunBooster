const fs = require('fs');
let c = fs.readFileSync('src/components/TeamList.jsx', 'utf8');

c = c.replace(/className="bg-card p-8 rounded-\[3rem\] border border-navy\/5/g, 'className="glass-panel p-8 rounded-[3rem]');
c = c.replace(/className="bg-card p-8 rounded-\[2\.5rem\] border border-navy\/5/g, 'className="glass-panel p-8 rounded-[2.5rem]');
c = c.replace(/className="bg-card p-6 rounded-\[2rem\] border border-navy\/5/g, 'className="glass-panel p-6 rounded-[2rem]');

fs.writeFileSync('src/components/TeamList.jsx', c);
