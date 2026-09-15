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
    if (theme === 'nova') {
        document.documentElement.classList.add('dark');
    }
};

export const InterfaceThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [interfaceTheme, setInterfaceThemeState] = useState<InterfaceTheme>(() => {
        if (typeof window === 'undefined') return 'classic';
        return (localStorage.getItem(STORAGE_KEY) as InterfaceTheme) || 'classic';
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
