import React from 'react';
import { Link } from 'react-router-dom';
import { PageId, NAV_LINKS } from '../constants';

interface SidebarNavProps {
    activePage: PageId;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ activePage }) => {
    return (
        <aside className="hidden lg:flex w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col sticky top-16 h-[calc(100vh-64px)] z-20 transition-all shrink-0 overflow-y-auto custom-scrollbar">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800/50">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Navegação Principal</h3>
                <nav className="space-y-1">
                    {NAV_LINKS.map(link => (
                        <Link
                            key={link.id}
                            to={link.to}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all group ${activePage === link.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[22px] ${activePage === link.id ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`}>
                                {link.icon}
                            </span>
                            <span className="truncate">{link.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest dark:text-slate-200 text-slate-700">Sistema Online</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Todas as escalas estão sincronizadas com o servidor em tempo real.</p>
                </div>
            </div>
        </aside>
    );
};

export default SidebarNav;
