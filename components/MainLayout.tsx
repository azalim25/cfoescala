import React, { ReactNode } from 'react';
import Header from './Header';

interface MainLayoutProps {
    children: ReactNode;
    activePage: 'dashboard' | 'contacts' | 'personal' | 'generate' | 'extra-hours' | 'ranking';
    className?: string;
}

const MainLayoutRoot = ({ children, activePage, className = '' }: MainLayoutProps) => {
    return (
        <div className={`min-h-screen ${className}`}>
            <Header activePage={activePage} />
            <main className="max-w-[1600px] mx-auto p-4 flex flex-col lg:flex-row gap-6">
                {children}
            </main>
        </div>
    );
};

const Content = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={`flex-1 space-y-4 ${className}`}>
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
