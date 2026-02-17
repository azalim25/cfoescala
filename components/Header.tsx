
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAuth } from '../contexts/AuthContext';
import { PageId, NAV_LINKS } from '../constants';

interface HeaderProps {
  activePage: PageId;
}

const Header: React.FC<HeaderProps> = ({ activePage }) => {
  const { militaries } = useMilitary();
  const { isModerator } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const militaryProfile = useMemo(() => {
    if (!profile || !militaries) return null;
    const cleanProfileNumber = profile.firefighter_number?.replace(/\D/g, '');
    return militaries.find(m => m.firefighterNumber?.replace(/\D/g, '') === cleanProfileNumber);
  }, [profile, militaries]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const toggleDarkMode = (mode: 'light' | 'dark') => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };



  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-xl lg:text-2xl">shield</span>
            </div>
            <div className="truncate">
              <h1 className="font-bold text-sm lg:text-lg leading-tight tracking-tight text-slate-900 dark:text-white truncate">CFO • GUARANI</h1>
              <p className="text-[8px] lg:text-[10px] text-slate-500 font-medium tracking-widest uppercase">Sistema de Gestão</p>
            </div>
          </Link>

        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={() => toggleDarkMode('light')} className="p-1.5 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700">
              <span className="material-symbols-outlined text-lg">light_mode</span>
            </button>
            <button onClick={() => toggleDarkMode('dark')} className="p-1.5 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700">
              <span className="material-symbols-outlined text-lg">dark_mode</span>
            </button>
          </div>

          {isModerator && (
            <Link
              to="/generate-scale"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span> Gerar Escala
            </Link>
          )}

          <div className="flex items-center gap-2 lg:gap-3 lg:ml-2 lg:border-l lg:border-slate-200 lg:dark:border-slate-800 lg:pl-4">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{militaryProfile?.name || profile?.name || 'Usuário'}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">{militaryProfile?.rank || profile?.rank || 'Militar'}</p>
            </div>
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden text-orange-600 dark:text-orange-400 font-black text-xs">
              {militaryProfile?.antiguidade || '-'}
            </div>
          </div>

          <button
            onClick={() => setIsMenuOpen(true)}
            className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/#/auth';
            }}
            className="hidden lg:block p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`fixed top-0 right-0 h-full w-[280px] bg-white dark:bg-slate-900 z-[70] shadow-2xl transition-transform duration-300 transform lg:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-lg">shield</span>
              </div>
              <span className="font-bold text-sm dark:text-white">GUARANI</span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
            <div className="px-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-sm border border-orange-200 dark:border-orange-800/50">
                  {militaryProfile?.antiguidade || '-'}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">{militaryProfile?.name || profile?.name || 'Usuário'}</p>
                  <p className="text-xs text-slate-500">{militaryProfile?.rank || profile?.rank || 'Militar'}</p>
                </div>
              </div>
            </div>

            {NAV_LINKS.map(link => (
              <Link
                key={link.id}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activePage === link.id ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <span className="material-symbols-outlined">{link.icon}</span> {link.label}
              </Link>
            ))}

            {isModerator && (
              <Link
                to="/generate-scale"
                onClick={() => setIsMenuOpen(false)}
                className="flex lg:hidden items-center gap-3 px-3 py-2.5 bg-primary/10 text-primary rounded-lg text-sm font-bold mt-4"
              >
                <span className="material-symbols-outlined">add</span> Gerar Escala
              </Link>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Tema</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button onClick={() => toggleDarkMode('light')} className="p-1 px-3 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700">
                  <span className="material-symbols-outlined text-lg">light_mode</span>
                </button>
                <button onClick={() => toggleDarkMode('dark')} className="p-1 px-3 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700">
                  <span className="material-symbols-outlined text-lg">dark_mode</span>
                </button>
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/#/auth';
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-bold transition-colors"
            >
              <span className="material-symbols-outlined">logout</span> Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
