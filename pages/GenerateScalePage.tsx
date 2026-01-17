import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import { MOCK_MILITARY } from '../constants';
import { Military, Rank } from '../types';
import { optimizeScale } from '../geminiService';

const GenerateScalePage: React.FC = () => {
    const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(MOCK_MILITARY[0]);
    const [impediments, setImpediments] = useState<Record<string, string[]>>({}); // militaryId -> dates[]
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);

    const toggleDate = (date: string) => {
        if (!selectedMilitary) return;
        const currentImpediments = impediments[selectedMilitary.id] || [];
        if (currentImpediments.includes(date)) {
            setImpediments({
                ...impediments,
                [selectedMilitary.id]: currentImpediments.filter(d => d !== date)
            });
        } else {
            setImpediments({
                ...impediments,
                [selectedMilitary.id]: [...currentImpediments, date]
            });
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setAiResponse(null);

        // Format data for AI
        const militaryWithImpediments = MOCK_MILITARY.map(m => ({
            ...m,
            impediments: impediments[m.id] || []
        }));

        try {
            const result = await optimizeScale(militaryWithImpediments, []);
            setAiResponse(result);
        } catch (err) {
            console.error(err);
            setAiResponse("Erro ao gerar escala. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

    return (
        <MainLayout activePage="generate">
            <MainLayout.Content>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
                    {/* Left Column: Military List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">groups</span> Lista de Militares
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {MOCK_MILITARY.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMilitary(m)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedMilitary?.id === m.id
                                            ? 'bg-primary/10 border border-primary/20 ring-1 ring-primary/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border ${selectedMilitary?.id === m.id ? 'bg-primary text-white border-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                            }`}>
                                            {m.firefighterNumber.slice(-2)}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-sm font-bold ${selectedMilitary?.id === m.id ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {m.rank} {m.name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Nº {m.firefighterNumber}</p>
                                        </div>
                                    </div>
                                    {impediments[m.id]?.length > 0 && (
                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold rounded-full border border-red-200 dark:border-red-800">
                                            {impediments[m.id].length} IMPED.
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Impediments Management */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">event_busy</span>
                                {selectedMilitary ? `Impedimentos de ${selectedMilitary.name}` : 'Selecione um Militar'}
                            </h3>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto">
                            {!selectedMilitary ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                    <span className="material-symbols-outlined text-6xl">person_search</span>
                                    <p className="font-medium text-sm">Selecione um militar à esquerda para gerenciar impedimentos</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                            Clique nos dias abaixo para marcar as datas em que o militar está <strong>impedido</strong> de ser escalado para serviço.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {days.map(day => {
                                            const dateStr = `2024-01-${day}`;
                                            const isSelected = impediments[selectedMilitary.id]?.includes(dateStr);
                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => toggleDate(dateStr)}
                                                    className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all ${isSelected
                                                            ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/20'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary'
                                                        }`}
                                                >
                                                    <span className="text-xs font-bold">{day}</span>
                                                    {isSelected && <span className="text-[8px] font-black uppercase mt-0.5">Off</span>}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={isGenerating}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all select-none"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Processando com IA...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                                                    Gerar Escala Otimizada
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {aiResponse && (
                                        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl relative">
                                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                                                    <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sugestão da IA</span>
                                                </div>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                                                    {aiResponse}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default GenerateScalePage;
