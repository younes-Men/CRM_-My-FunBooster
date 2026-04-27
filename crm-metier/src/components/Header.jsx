import React from 'react';
import { Layers, User, Bell, Search } from 'lucide-react';

const Header = ({ activeTab, user }) => {
  const isAdmin = user?.role === 'admin';
  return (
    <header className="relative z-50 px-8 py-6 transition-all duration-300 w-full">
      <div className="max-w-[2000px] mx-auto flex items-center justify-between h-16">
        
        {/* Logo Text / Branding Section */}
        <div className="flex items-center gap-4">
          <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl border-white/40">
            <span className="text-xl font-bold text-navy tracking-tight leading-none font-outfit uppercase">
              My <span className="text-primary">FunBooster</span>
            </span>
            <div className="h-4 w-px bg-navy/10 mx-1" />
            <span className="text-[10px] font-bold text-navy/40 uppercase tracking-[0.25em]">By DOCENDIA</span>
          </div>
        </div>

        {/* Right Section: View Indicator & User Profile */}
        <div className="flex items-center gap-4">
          <div className="glass-panel px-6 h-16 rounded-2xl flex items-center gap-6 shadow-xl border-white/40">
            
            {/* Active View Label */}
            <div className="hidden sm:flex items-center gap-2 bg-navy/5 px-4 py-2 rounded-xl border border-navy/5">
              <Layers className="w-3.5 h-3.5 text-navy" />
              <span className="text-[10px] font-black text-navy uppercase tracking-widest leading-none">
                {activeTab === 'leads' ? 'Base de Données' : activeTab.replace('-', ' ')}
              </span>
            </div>

            <div className="h-6 w-px bg-navy/10" />

            {/* User Profile */}
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-navy/30 uppercase tracking-[0.15em] leading-none mb-1">
                  {user?.role || 'FunBooster'}
                </span>
                <span className="text-sm font-bold text-navy tracking-tight group-hover:text-primary transition-colors">
                  {user?.name}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center shadow-lg shadow-navy/20 group-hover:scale-105 transition-transform">
                <User className="w-5 h-5" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
