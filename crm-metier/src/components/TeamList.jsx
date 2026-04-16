import React from 'react';
import { USERS_MAP } from '../lib/authConfig';
import { User, ShieldCheck, Mail } from 'lucide-react';

const TeamList = () => {
  // Filter only funneboosters (could include admin if needed, but user said funneboosters)
  const funneboosters = Object.entries(USERS_MAP)
    .filter(([_, data]) => data.role === 'funebooster')
    .map(([email, data]) => ({ email, ...data }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {funneboosters.map((fb) => (
        <div key={fb.email} className="glass-panel p-6 rounded-3xl flex items-center gap-5 border border-navy/5 shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all duration-300 group bg-white">
          <div className="w-14 h-14 rounded-2xl bg-navy/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <User className="w-7 h-7 text-navy/20 group-hover:text-primary transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-navy tracking-tight">{fb.name}</span>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-3 h-3 text-navy/30" />
              <span className="text-[11px] font-bold text-navy/40 uppercase tracking-widest">{fb.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-[0.1em]">
                Accès Funnebooster
              </span>
              <ShieldCheck className="w-3 h-3 text-primary/50" />
            </div>
          </div>
        </div>
      ))}
      
      {/* Admin indicator at the bottom or separate section */}
      <div className="col-span-full mt-10 opacity-30 hover:opacity-100 transition-opacity flex justify-center">
        <div className="flex items-center gap-3 w-full max-w-md">
          <div className="h-px flex-1 bg-navy/10" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-navy/50">Équipe DocendIA</span>
          <div className="h-px flex-1 bg-navy/10" />
        </div>
      </div>
    </div>
  );
};

export default TeamList;
