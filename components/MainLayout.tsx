import React, { ReactNode } from 'react';
import Header from './Header';
import SidebarNav from './SidebarNav';
import { PageId } from '../constants';

interface MainLayoutProps {
    children: ReactNode;
    activePage: PageId;
    className?: string;
    reverseMobile?: boolean;
}

const MainLayoutRoot = ({ children, activePage, className = '', reverseMobile = false }: MainLayoutProps) => {
    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${className}`}>
            <Header activePage={activePage} />
            <div className="flex">
                <SidebarNav activePage={activePage} />
                <main className={`flex-1 max-w-[1600px] p-2 sm:p-4 sm:p-6 flex ${reverseMobile ? 'flex-col-reverse' : 'flex-col'} lg:flex-row gap-4 lg:gap-8`}>
                    {children}
                </main>
            </div>
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
