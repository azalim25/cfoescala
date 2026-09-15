import React, { createContext, useContext, useEffect, useState } from 'react';

export type InterfaceTheme = 'classic' | 'nova';

const STORAGE_KEY = 'cfo-interface-theme';

interface InterfaceThemeContextType {
    interfaceTheme: InterfaceTheme;
    setInterfaceTheme: (theme: InterfaceTheme) => void;
    toggleInterfaceTheme: () => void;
}

const InterfaceThemeContext = createContext<InterfaceThemeContextType | undefined>(undefined);

const applyTheme = (theme: InterfaceTheme) => {
    document.documentElement.setAttribute('data-theme', theme);
    // Nova Interface is a fixed light, warm/editorial theme — it doesn't
    // follow the separate light/dark toggle (that toggle is hidden while
    // nova is active, see Header.tsx).
    if (theme === 'nova') {
        document.documentElement.classList.remove('dark');
    }
};

export const InterfaceThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [interfaceTheme, setInterfaceThemeState] = useState<InterfaceTheme>(() => {
        if (typeof window === 'undefined') return 'nova';
        return (localStorage.getItem(STORAGE_KEY) as InterfaceTheme) || 'nova';
    });

    useEffect(() => {
        applyTheme(interfaceTheme);
    }, [interfaceTheme]);

    const setInterfaceTheme = (theme: InterfaceTheme) => {
        localStorage.setItem(STORAGE_KEY, theme);
        setInterfaceThemeState(theme);
    };

    const toggleInterfaceTheme = () => {
        setInterfaceTheme(interfaceTheme === 'nova' ? 'classic' : 'nova');
    };

    return (
        <InterfaceThemeContext.Provider value={{ interfaceTheme, setInterfaceTheme, toggleInterfaceTheme }}>
            {children}
        </InterfaceThemeContext.Provider>
    );
};

export const useInterfaceTheme = (): InterfaceThemeContextType => {
    const ctx = useContext(InterfaceThemeContext);
    if (!ctx) throw new Error('useInterfaceTheme deve ser usado dentro de InterfaceThemeProvider');
    return ctx;
};
