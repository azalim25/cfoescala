import React, { ReactNode } from 'react';
import Header from './Header';

interface MainLayoutProps {
    children: ReactNode;
    activePage: 'dashboard' | 'contacts' | 'personal' | 'generate' | 'extra-hours' | 'ranking' | 'estado-maior' | 'funcoes-turma' | 'stage' | 'comandante-guarda' | 'stage-quantity' | 'hours-control' | 'qtm' | 'qdch' | 'barra-fixa';
    className?: string;
    reverseMobile?: boolean;
}

const MainLayoutRoot = ({ children, activePage, className = '', reverseMobile = false }: MainLayoutProps) => {
    return (
        <div className={`min-h-screen ${className}`}>
            <Header activePage={activePage} />
            <main className={`max-w-[1600px] mx-auto p-2 sm:p-4 flex ${reverseMobile ? 'flex-col-reverse' : 'flex-col'} lg:flex-row gap-4 lg:gap-6`}>
                {children}
            </main>
        </div>
    );
};

const Content = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={`flex-1 space-y-4 w-full overflow-hidden ${className}`}>
        {children}
    </div>
);

const Sidebar = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <aside className={`w-full lg:w-[380px] space-y-4 shrink-0 ${className}`}>
        {children}
    </aside>
);

const MainLayout = Object.assign(MainLayoutRoot, {
    Content: Content,
    Sidebar: Sidebar
});

export default MainLayout;
