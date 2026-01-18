
import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

interface HeaderProps {
  activePage: 'dashboard' | 'contacts' | 'personal' | 'generate' | 'extra-hours' | 'ranking' | 'estado-maior' | 'funcoes-turma';
}

const Header: React.FC<HeaderProps> = ({ activePage }) => {
  const [profile, setProfile] = React.useState<any>(null);

  React.useEffect(() => {
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
      <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white">CFO • GUARANI ESCALAS</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Sistema de Gestão</p>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activePage === 'dashboard' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span> Calendário
            </Link>
            <Link
              to="/contacts"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activePage === 'contacts' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">contact_page</span> Contatos
            </Link>
            <Link
              to="/personal"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activePage === 'personal' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">person_pin</span> Minha Escala
            </Link>
            <Link
              to="/extra-hours"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activePage === 'extra-hours' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">more_time</span> Registro de Horas
            </Link>
            <Link
              to="/ranking"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activePage === 'ranking' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">leaderboard</span> Ranking
            </Link>
            <Link
              to="/estado-maior"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activePage === 'estado-maior' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">military_tech</span> Estado Maior
            </Link>
            <Link
              to="/funcoes-turma"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activePage === 'funcoes-turma' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">school</span> Funções de Turma
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={() => toggleDarkMode('light')} className="p-1.5 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700">
              <span className="material-symbols-outlined">light_mode</span>
            </button>
            <button onClick={() => toggleDarkMode('dark')} className="p-1.5 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700">
              <span className="material-symbols-outlined">dark_mode</span>
            </button>
          </div>
          <Link
            to="/generate-scale"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span> Gerar Escala
          </Link>
          <div className="flex items-center gap-3 ml-2 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{profile?.name || 'Usuário'}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">{profile?.rank || 'Militar'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-xl">person</span>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/#/auth';
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
