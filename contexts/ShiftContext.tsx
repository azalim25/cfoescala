import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Shift } from '../types';
import { MOCK_SHIFTS } from '../constants';

interface ShiftContextType {
    shifts: Shift[];
    addShifts: (newShifts: Shift[]) => void;
    clearShifts: () => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);

    const addShifts = (newShifts: Shift[]) => {
        setShifts(prev => {
            // Filter out existing shifts for the same dates to "overwrite" or append
            const datesToOverwrite = new Set(newShifts.map(s => s.date));
            const filteredPrev = prev.filter(s => !datesToOverwrite.has(s.date));
            return [...filteredPrev, ...newShifts];
        });
    };

    const clearShifts = () => {
        setShifts([]);
    };

    return (
        <ShiftContext.Provider value={{ shifts, addShifts, clearShifts }}>
            {children}
        </ShiftContext.Provider>
    );
};

export const useShift = () => {
    const context = useContext(ShiftContext);
    if (context === undefined) {
        throw new Error('useShift must be used within a ShiftProvider');
    }
    return context;
};
