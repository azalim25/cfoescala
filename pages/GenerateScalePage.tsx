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
    const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>('auto');
    const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(militaries[0] || null);
    const [impediments, setImpediments] = useState<Record<string, string[]>>({}); // militaryId -> dates[]
    const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({}); // dateStr -> militaryId
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPreview, setGeneratedPreview] = useState<Array<{ date: string, militaryName: string }>>([]);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const toggleDateImpediment = (date: string) => {
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

    const handleManualAssign = (date: string, militaryId: string) => {
        setManualAssignments({
            ...manualAssignments,
            [date]: militaryId
        });
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
        let shiftsToPublish: Shift[] = [];

        if (generationMode === 'auto') {
            if (generatedPreview.length === 0) {
                alert('Gere uma escala primeiro ou use o modo manual.');
                return;
            }
            shiftsToPublish = generatedPreview.map((p, idx) => ({
                id: `gen-${Date.now()}-${idx}`,
                militaryId: militaries.find(m => `${m.rank} ${m.name}` === p.militaryName)?.id || '',
                date: p.date,
                type: 'Escala Geral',
                startTime: '08:00',
                endTime: '08:00',
                status: 'Confirmado'
            })).filter(s => s.militaryId !== '');
        } else {
            const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
            for (let i = 1; i <= totalDays; i++) {
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
                const mId = manualAssignments[dateStr];
                if (mId) {
                    shiftsToPublish.push({
                        id: `man-${Date.now()}-${i}`,
                        militaryId: mId,
                        date: dateStr,
                        type: 'Escala Geral',
                        startTime: '08:00',
                        endTime: '08:00',
                        status: 'Confirmado'
                    });
                }
            }
            if (shiftsToPublish.length === 0) {
                alert('Atribua pelo menos um militar em algum dia.');
                return;
            }
        }

        addShifts(shiftsToPublish);
        alert('Escala publicada com sucesso!');
        navigate('/');
    };

    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = Array.from({ length: totalDays }, (_, i) => (i + 1).toString().padStart(2, '0'));

    return (
        <MainLayout activePage="generate">
            <MainLayout.Content>
                {/* Header with Mode Toggle and Month/Year Selector */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group transition-all">
                            <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
                                {generationMode === 'auto' ? 'auto_awesome' : 'edit_calendar'}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">Gerador de Escala</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                {generationMode === 'auto' ? 'Distribuição Inteligente' : 'Distribuição Manual'} • {months[currentMonth]} {currentYear}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Mode Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setGenerationMode('auto')}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${generationMode === 'auto'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Automático
                            </button>
                            <button
                                onClick={() => {
                                    setGenerationMode('manual');
                                    setGeneratedPreview([]);
                                }}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${generationMode === 'manual'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Manual
                            </button>
                        </div>

                        {/* Date Selectors */}
                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-10 shadow-sm">
                            <select
                                value={currentMonth}
                                onChange={(e) => {
                                    setCurrentMonth(parseInt(e.target.value));
                                    setGeneratedPreview([]);
                                    setManualAssignments({});
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
                                    setManualAssignments({});
                                }}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer py-1.5 px-3 text-xs font-bold dark:text-white outline-none"
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="text-slate-900 bg-white">{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
                    {/* Left Column: Military List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                <span className="material-symbols-outlined text-primary">groups</span> Lista de Militares
                            </h3>
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {militaries.length} Total
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {militaries.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                                    <p className="text-xs font-medium italic">Nenhum militar cadastrado no banco.</p>
                                </div>
                            ) : (
                                militaries.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMilitary(m)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedMilitary?.id === m.id
                                            ? 'bg-primary/10 border border-primary/20 ring-1 ring-primary/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border transition-colors ${selectedMilitary?.id === m.id ? 'bg-primary text-white border-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                {m.firefighterNumber.slice(-3)}
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-sm font-bold ${selectedMilitary?.id === m.id ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {m.rank} {m.name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Nº {m.firefighterNumber}</p>
                                            </div>
                                        </div>
                                        {impediments[m.id]?.length > 0 && (
                                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-black rounded-full border border-red-200 dark:border-red-800">
                                                {impediments[m.id].length} OFF
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Interaction Column (Impediments or Manual Creator) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                <span className="material-symbols-outlined text-primary">
                                    {generationMode === 'auto' ? 'event_busy' : 'edit_calendar'}
                                </span>
                                {generationMode === 'auto'
                                    ? (selectedMilitary ? `Impedimentos de ${selectedMilitary.name}` : 'Selecione um Militar')
                                    : 'Montagem de Escala Manual'
                                }
                            </h3>
                            {generationMode === 'manual' && Object.keys(manualAssignments).length > 0 && (
                                <button
                                    onClick={() => setManualAssignments({})}
                                    className="text-[10px] font-black text-red-500 uppercase hover:underline"
                                >
                                    Limpar Tudo
                                </button>
                            )}
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            {generationMode === 'auto' && !selectedMilitary ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                    <span className="material-symbols-outlined text-6xl opacity-20">person_search</span>
                                    <p className="font-medium text-sm">Selecione um militar à esquerda para gerenciar impedimentos</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl">
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                            {generationMode === 'auto'
                                                ? `Marque as datas em que o(a) ${selectedMilitary?.name} está INDISPONÍVEL.`
                                                : `Selecione o militar responsável por cada dia da escala de ${months[currentMonth]}.`
                                            }
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {days.map(day => {
                                            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day}`;

                                            if (generationMode === 'auto') {
                                                const isSelected = selectedMilitary && impediments[selectedMilitary.id]?.includes(dateStr);
                                                return (
                                                    <button
                                                        key={day}
                                                        onClick={() => toggleDateImpediment(dateStr)}
                                                        className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all ${isSelected
                                                            ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/20'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary'
                                                            }`}
                                                    >
                                                        <span className="text-xs font-bold">{day}</span>
                                                        {isSelected && <span className="text-[8px] font-black uppercase mt-0.5">Off</span>}
                                                    </button>
                                                );
                                            } else {
                                                const assignedMId = manualAssignments[dateStr];
                                                const assignedM = militaries.find(m => m.id === assignedMId);

                                                return (
                                                    <div key={day} className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center px-1">
                                                            <span className="text-[10px] font-bold text-slate-400">{day}</span>
                                                            {assignedM && (
                                                                <button
                                                                    onClick={() => handleManualAssign(dateStr, '')}
                                                                    className="text-[8px] text-red-500 hover:text-red-700"
                                                                >
                                                                    <span className="material-symbols-outlined text-[10px]">close</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <select
                                                            value={assignedMId || ''}
                                                            onChange={(e) => handleManualAssign(dateStr, e.target.value)}
                                                            className={`w-full h-8 text-[9px] font-bold rounded-lg border focus:ring-1 focus:ring-primary outline-none transition-colors ${assignedMId
                                                                ? 'bg-primary/10 border-primary text-primary'
                                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                                        >
                                                            <option value="">Livre</option>
                                                            {militaries.map(m => (
                                                                <option key={m.id} value={m.id} className="text-slate-900 bg-white">
                                                                    {m.name.split(' ')[0]}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                        {generationMode === 'auto' ? (
                                            <button
                                                onClick={handleGenerate}
                                                disabled={isGenerating || militaries.length === 0}
                                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all select-none active:scale-[0.98]"
                                            >
                                                <span className="material-symbols-outlined text-lg">calendar_today</span>
                                                Geral Prévia da Escala
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handlePublish}
                                                disabled={Object.keys(manualAssignments).length === 0}
                                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all select-none active:scale-[0.98]"
                                            >
                                                <span className="material-symbols-outlined text-lg">publish</span>
                                                Confirmar e Publicar Manual
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview Table Section - only for Auto mode */}
                {generationMode === 'auto' && generatedPreview.length > 0 && (
                    <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom duration-500">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                <span className="material-symbols-outlined text-primary">previews</span> Rascunho da Escala Gerada
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setGeneratedPreview([])}
                                    className="px-3 py-1.5 text-[10px] font-black text-slate-500 hover:text-red-500 transition-colors uppercase"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handlePublish}
                                    className="px-4 py-1.5 bg-primary text-white text-[10px] font-black rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all uppercase"
                                >
                                    Confirmar e Publicar
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Militar Escalado</th>
                                        <th className="px-6 py-4 text-right">Missão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {generatedPreview.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs font-black text-slate-400 dark:text-slate-500">{p.date}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                        <span className="material-symbols-outlined text-sm">person</span>
                                                    </div>
                                                    <span className={`text-sm font-bold ${p.militaryName === 'SEM EFETIVO DISPONÍVEL' ? 'text-red-500 italic' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {p.militaryName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded uppercase border border-primary/20">
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
