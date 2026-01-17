import React from 'react';
import { Link } from 'react-router-dom';

const SidebarNav: React.FC = () => {
    return (
        <aside className="w-64 lg:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20 transition-all shrink-0">
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-md">
                    <span className="material-symbols-outlined text-white text-2xl font-bold">shield</span>
                </div>
                <div>
                    <h2 className="text-sm font-extrabold tracking-tight uppercase leading-none dark:text-white">CFO - GUARANI</h2>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-0.5">MINHA CONTA</p>
                </div>
            </div>
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                    <span className="material-symbols-outlined text-[22px] group-hover:text-primary">dashboard</span>
                    <span className="text-sm font-bold">Voltar ao Início</span>
                </Link>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-white shadow-lg shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-[22px]">history</span>
                    <span className="text-sm font-extrabold">Histórico Pessoal</span>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                    <span className="material-symbols-outlined text-[22px] group-hover:text-primary">person</span>
                    <span className="text-sm font-bold">Perfil</span>
                </button>
            </nav>
            <div className="p-6">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-200 text-slate-700">Status</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Dados sincronizados. Nenhuma pendência urgente.</p>
                </div>
            </div>
        </aside>
    );
};

export default SidebarNav;
