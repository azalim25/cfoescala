import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { Military, Shift } from '../types';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';

const GenerateScalePage: React.FC = () => {
    const navigate = useNavigate();
    const { militaries } = useMilitary();
    const { addShifts } = useShift();
    const [currentMonth, setCurrentMonth] = useState(0); // Janeiro
    const [currentYear, setCurrentYear] = useState(2026);
    const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(militaries[0] || null);
    const [impediments, setImpediments] = useState<Record<string, string[]>>({}); // militaryId -> dates[]
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPreview, setGeneratedPreview] = useState<Array<{ date: string, militaryName: string }>>([]);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

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
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

        setTimeout(() => {
            const preview: Array<{ date: string, militaryName: string }> = [];
            let militaryIndex = 0;

            for (let i = 1; i <= totalDays; i++) {
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;

                let found = false;
                let attempts = 0;
                while (!found && attempts < militaries.length) {
                    const m = militaries[(militaryIndex + attempts) % militaries.length];
                    const isImpeded = impediments[m.id]?.includes(dateStr);
                    if (!isImpeded) {
                        preview.push({ date: dateStr, militaryName: `${m.rank} ${m.name}` });
                        militaryIndex = (militaryIndex + attempts + 1) % militaries.length;
                        found = true;
                    }
                    attempts++;
                }

                if (!found) {
                    preview.push({ date: dateStr, militaryName: 'SEM EFETIVO DISPONÍVEL' });
                }
            }

            setGeneratedPreview(preview);
            setIsGenerating(false);
            alert('Sugestão de Escala Geral gerada com sucesso! Veja o rascunho abaixo.');
        }, 1500);
    };

    const handlePublish = () => {
        if (generatedPreview.length === 0) return;

        const newShifts: Shift[] = generatedPreview.map((p, idx) => ({
            id: `gen-${Date.now()}-${idx}`,
            militaryId: militaries.find(m => `${m.rank} ${m.name}` === p.militaryName)?.id || '4',
            date: p.date,
            type: 'Escala Geral',
            startTime: '08:00',
            endTime: '08:00',
            status: 'Confirmado'
        }));

        addShifts(newShifts);
        alert('Escala publicada com sucesso!');
        navigate('/');
    };

    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = Array.from({ length: totalDays }, (_, i) => (i + 1).toString().padStart(2, '0'));

    return (
        <MainLayout activePage="generate">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">Gerador de Escala</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Configuração Automática • {months[currentMonth]} {currentYear}</p>
                        </div>
                    </div>
                    <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-10 shadow-sm">
                        <select
                            value={currentMonth}
                            onChange={(e) => {
                                setCurrentMonth(parseInt(e.target.value));
                                setGeneratedPreview([]);
                            }}
                            className="bg-transparent border-none focus:ring-0 cursor-pointer uppercase py-1.5 px-3 text-xs font-bold dark:text-white outline-none"
                        >
                            {months.map((m, i) => <option key={m} value={i} className="text-slate-900 bg-white">{m}</option>)}
                        </select>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                        <select
                            value={currentYear}
                            onChange={(e) => {
                                setCurrentYear(parseInt(e.target.value));
                                setGeneratedPreview([]);
                            }}
                            className="bg-transparent border-none focus:ring-0 cursor-pointer py-1.5 px-3 text-xs font-bold dark:text-white outline-none"
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="text-slate-900 bg-white">{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
                    {/* Left Column: Military List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">groups</span> Lista de Militares
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {militaries.map((m) => (
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

                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            {!selectedMilitary ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                    <span className="material-symbols-outlined text-6xl">person_search</span>
                                    <p className="font-medium text-sm">Selecione um militar à esquerda para gerenciar impedimentos</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                            Clique nos dias abaixo para marcar as datas em que o militar está <strong>impedido</strong> de ser escalado para serviço em {months[currentMonth]}.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {days.map(day => {
                                            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day}`;
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
                                            disabled={isGenerating || militaries.length === 0}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all select-none"
                                        >
                                            <span className="material-symbols-outlined text-lg">calendar_today</span>
                                            Configurar Escala Geral
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {generatedPreview.length > 0 && (
                    <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom duration-500">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">previews</span> Rascunho da Escala Gerada
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setGeneratedPreview([])}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    Limpar
                                </button>
                                <button
                                    onClick={handlePublish}
                                    className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                                >
                                    Confirmar e Publicar
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3">Convocado</th>
                                        <th className="px-6 py-3">Tipo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {generatedPreview.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">{p.date}</td>
                                            <td className="px-6 py-3">
                                                <span className={`text-sm font-bold ${p.militaryName === 'SEM EFETIVO DISPONÍVEL' ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {p.militaryName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded uppercase border border-blue-100 dark:border-blue-800/50">
                                                    Escala Geral
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout>
    );
};

export default GenerateScalePage;
