import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Military } from '../types';
import { MOCK_MILITARY } from '../constants';

interface MilitaryContextType {
    militaries: Military[];
    addMilitary: (military: Military) => void;
    updateMilitary: (military: Military) => void;
    deleteMilitary: (id: string) => void;
}

const MilitaryContext = createContext<MilitaryContextType | undefined>(undefined);

export const MilitaryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [militaries, setMilitaries] = useState<Military[]>(MOCK_MILITARY);

    const addMilitary = (military: Military) => {
        setMilitaries((prev) => [...prev, military]);
    };

    const updateMilitary = (military: Military) => {
        setMilitaries((prev) => prev.map((m) => (m.id === military.id ? military : m)));
    };

    const deleteMilitary = (id: string) => {
        setMilitaries((prev) => prev.filter((m) => m.id !== id));
    };

    return (
        <MilitaryContext.Provider value={{ militaries, addMilitary, updateMilitary, deleteMilitary }}>
            {children}
        </MilitaryContext.Provider>
    );
};

export const useMilitary = () => {
    const context = useContext(MilitaryContext);
    if (context === undefined) {
        throw new Error('useMilitary must be used within a MilitaryProvider');
    }
    return context;
};
