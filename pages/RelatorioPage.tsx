import React, { useState, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useShifts } from '../contexts/ShiftContext';
import { useMilitaries } from '../contexts/MilitaryContext';
import { Shift, Military } from '../types';

const RelatorioPage: React.FC = () => {
    const { shifts } = useShifts();
    const { militaries } = useMilitaries();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const currentShifts = useMemo(() => {
        return shifts.filter(s => {
            const date = new Date(s.date + 'T12:00:00'); // Use fixed time to avoid TZ issues
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [shifts, selectedMonth, selectedYear]);

    const formatMilitaryName = (mil: Military | undefined) => {
        if (!mil) return "Militar não encontrado";

        const fullName = mil.fullName || mil.name;
        const warName = mil.name.toUpperCase();

        // Find the war name in the full name and make it bold
        // We split by words and compare
        const words = fullName.split(' ');
        return (
            <span>
                {words.map((word, idx) => (
                    <React.Fragment key={idx}>
                        {word.toUpperCase() === warName ? <strong>{word}</strong> : word}
                        {idx < words.length - 1 ? ' ' : ''}
                    </React.Fragment>
                ))}
            </span>
        );
    };

    const renderShiftTable = (title: string, type: string | string[], filterByLocation?: string) => {
        const typeArray = Array.isArray(type) ? type : [type];
        const filteredShifts = currentShifts.filter(s => {
            const matchesType = typeArray.includes(s.type);
            const matchesLocation = filterByLocation ? s.location === filterByLocation : true;
            return matchesType && matchesLocation;
        });

        if (filteredShifts.length === 0) return null;

        return (
            <div className="mb-8 overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-wider">{title}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <th className="p-3 border-b border-slate-200 dark:border-slate-800">Dia</th>
                                <th className="p-3 border-b border-slate-200 dark:border-slate-800">Semana</th>
                                <th className="p-3 border-b border-slate-200 dark:border-slate-800">Nº BM</th>
                                <th className="p-3 border-b border-slate-200 dark:border-slate-800">Nome Completo</th>
                                <th className="p-3 border-b border-slate-200 dark:border-slate-800">Telefone</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredShifts.map(s => {
                                const mil = militaries.find(m => m.id === s.militaryId);
                                const dateObj = new Date(s.date + 'T12:00:00');
                                const dayOfMonth = dateObj.getDate().toString().padStart(2, '0');
                                const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();

                                return (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-3 text-sm font-bold text-slate-700 dark:text-slate-300">{dayOfMonth}</td>
                                        <td className="p-3 text-xs text-slate-500 uppercase font-medium">{dayOfWeek}</td>
                                        <td className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400">{mil?.firefighterNumber || '-'}</td>
                                        <td className="p-3 text-sm text-slate-800 dark:text-slate-100">{formatMilitaryName(mil)}</td>
                                        <td className="p-3 text-xs text-slate-500">{mil?.contact || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <MainLayout activePage="relatorio">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                            <span className="material-symbols-outlined text-3xl">description</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 uppercase tracking-tight">Relatório Mensal de Escalas</h2>
                            <p className="text-xs text-slate-500 font-medium">Visualização resumida por serviço</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-6">
                    {renderShiftTable("Comandante da Guarda", "Comandante da Guarda")}
                    {renderShiftTable("Faxina", "Faxina")}
                    {renderShiftTable("Sobreaviso", "Sobreaviso")}
                    {renderShiftTable("Manutenção", "Manutenção")}

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            Tabelas de Estágio
                        </h2>
                        {renderShiftTable("Estágio - 1º BBM", "Estágio", "1º BBM")}
                        {renderShiftTable("Estágio - 2º BBM", "Estágio", "2º BBM")}
                        {renderShiftTable("Estágio - 3º BBM", "Estágio", "3º BBM")}
                        {/* Fallback for stages with other or missing location */}
                        {renderShiftTable("Estágio - Outros Locais", "Estágio", "")}
                    </div>
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default RelatorioPage;
