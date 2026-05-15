const fs = require('fs');
let c = fs.readFileSync('src/components/TeamList.jsx', 'utf8');

c = c.replace(
  /className="glass-panel p-8 rounded-\[3rem\] shadow-sm hover:shadow-2xl hover:scale-\[1.02\] transition-all group relative overflow-hidden"\s*>\s*<div/g,
  'className="glass-panel p-8 rounded-[3rem] shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all group relative overflow-hidden">\n<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div'
);

c = c.replace(
  /className="glass-panel p-8 rounded-\[2.5rem\] shadow-sm hover:shadow-xl transition-all group"\s*>\s*<div/g,
  'className="glass-panel p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">\n<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div'
);

c = c.replace(
  /className="glass-panel p-6 rounded-\[2rem\] shadow-sm hover:shadow-lg transition-all flex items-center gap-4"\s*>\s*<div/g,
  'className="glass-panel p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all flex items-center gap-4 relative overflow-hidden group">\n<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div'
);

c = c.replace(
  /className="glass-panel p-6 rounded-\[2rem\] shadow-sm hover:shadow-xl transition-all group flex items-center gap-4"\s*>\s*<div/g,
  'className="glass-panel p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group flex items-center gap-4 relative overflow-hidden">\n<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div'
);

c = c.replace(
  /className="glass-panel p-6 rounded-\[2rem\] shadow-sm hover:shadow-2xl hover:scale-\[1.02\] hover:border-primary\/20 transition-all flex flex-col gap-4 group text-left relative overflow-hidden"\s*>\s*<div/g,
  'className="glass-panel p-6 rounded-[2rem] shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all flex flex-col gap-4 group text-left relative overflow-hidden">\n<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div'
);

fs.writeFileSync('src/components/TeamList.jsx', c);
