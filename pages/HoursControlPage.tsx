import React, { useMemo, useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

type ServiceType = 'Sobreaviso' | 'Manutenção' | 'Faxina';

interface ExtraRecord {
    id: string;
    military_id: string;
    category: string;
    hours: number;
}

const HoursControlPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts } = useShift();
    const { isModerator } = useAuth();

    const [extraRecords, setExtraRecords] = useState<ExtraRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<{
        militaryId: string;
        type: ServiceType;
        quantity: number;
    } | null>(null);

    const serviceTypes: ServiceType[] = ['Sobreaviso', 'Manutenção', 'Faxina'];

    const fetchExtraRecords = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('extra_hours')
            .select('id, military_id, category, hours')
            .filter('category', 'like', 'CFO I - %');

        if (!error && data) {
            setExtraRecords(data as ExtraRecord[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchExtraRecords();
    }, []);

    const sortedMilitaries = useMemo(() => {
        return [...militaries].sort((a, b) => {
            const aAnt = a.antiguidade || 999999;
            const bAnt = b.antiguidade || 999999;
            if (aAnt !== bAnt) return aAnt - bAnt;
            return a.warName.localeCompare(b.warName);
        });
    }, [militaries]);

    const getCFO1Count = (militaryId: string, type: ServiceType) => {
        const category = `CFO I - ${type}`;
        return extraRecords
            .filter(r => r.military_id === militaryId && r.category === category)
            .reduce((sum, r) => sum + r.hours, 0);
    };

    const getCFO2Count = (militaryId: string, type: ServiceType) => {
        return shifts.filter(s => s.militaryId === militaryId && s.type === type).length;
    };

    const handleEditCFO1 = (militaryId: string, type: ServiceType) => {
        if (!isModerator) return;
        const currentQty = getCFO1Count(militaryId, type);
        setEditingData({ militaryId, type, quantity: currentQty });
        setIsModalOpen(true);
    };

    const handleSaveCFO1 = async () => {
        if (!editingData) return;
        setIsSaving(true);

        const category = `CFO I - ${editingData.type}`;

        // Find existing record to update or delete all and insert one
        // To simplify, we'll try to update the first one found or insert a new one
        const existing = extraRecords.find(r => r.military_id === editingData.militaryId && r.category === category);

        try {
            if (existing) {
                if (editingData.quantity === 0) {
                    await supabase.from('extra_hours').delete().eq('id', existing.id);
                } else {
                    await supabase.from('extra_hours').update({ hours: editingData.quantity }).eq('id', existing.id);
                }
            } else if (editingData.quantity > 0) {
                await supabase.from('extra_hours').insert({
                    military_id: editingData.militaryId,
                    category: category,
                    hours: editingData.quantity,
                    minutes: 0,
                    description: 'Quantidade manual CFO I',
                    date: new Date().toISOString().split('T')[0]
                });
            }

            await fetchExtraRecords();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving CFO I:', error);
            alert('Erro ao salvar quantidade.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderTable = (type: ServiceType) => (
        <div key={type} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-widest text-sm">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    Tabela de {type}
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm">
                        <tr className="bg-slate-100 dark:bg-slate-800/80">
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 min-w-[200px]">Militar</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">Total - CFO I</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">Total - CFO II</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center bg-slate-100/50 dark:bg-slate-700/50">Total - Final</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMilitaries.map(mil => {
                            const cfo1 = getCFO1Count(mil.id, type);
                            const cfo2 = getCFO2Count(mil.id, type);
                            const total = cfo1 + cfo2;

                            return (
                                <tr key={mil.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm whitespace-nowrap">{mil.rank} {mil.warName}</span>
                                            <span className="text-[10px] text-slate-500">Antiguidade: {mil.antiguidade || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleEditCFO1(mil.id, type)}
                                            disabled={!isModerator}
                                            className={`inline-flex items-center justify-center min-w-[40px] px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${cfo1 > 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-transparent'} ${isModerator ? 'hover:border-primary hover:text-primary cursor-pointer' : 'cursor-default'}`}
                                        >
                                            {cfo1}
                                            {isModerator && <span className="material-symbols-outlined text-[14px] ml-1 opacity-50">edit</span>}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center min-w-[40px] px-3 py-1.5 rounded-lg text-sm font-bold ${cfo2 > 0 ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-transparent'}`}>
                                            {cfo2}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center bg-slate-50/30 dark:bg-slate-800/20">
                                        <span className={`inline-flex items-center justify-center min-w-[44px] px-3 py-1.5 rounded-lg text-sm font-black shadow-sm ${total > 0 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {total}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <MainLayout activePage="hours-control">
            <MainLayout.Content>
                {/* Header Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">query_stats</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 uppercase">Controle de Serviços</h2>
                            <p className="text-xs text-slate-500 font-medium">Consolidado de serviços por militar</p>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-bold text-sm italic">Carregando dados consolidados...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {serviceTypes.map(type => renderTable(type))}
                    </div>
                )}

                {/* Edit Modal */}
                {isModalOpen && editingData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">edit</span>
                                    Editar CFO I - {editingData.type}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined text-slate-400">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Militar</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">
                                        {militaries.find(m => m.id === editingData.militaryId)?.warName}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nova Quantidade Manual</label>
                                    <div className="flex items-center justify-center gap-4">
                                        <button
                                            onClick={() => setEditingData(prev => prev ? ({ ...prev, quantity: Math.max(0, prev.quantity - 1) }) : null)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all font-bold text-xl"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={editingData.quantity}
                                            onChange={(e) => setEditingData(prev => prev ? ({ ...prev, quantity: parseInt(e.target.value) || 0 }) : null)}
                                            className="w-20 h-12 text-center text-xl font-bold bg-slate-50 dark:bg-slate-800 border-2 border-primary/20 rounded-xl focus:border-primary outline-none dark:text-white"
                                        />
                                        <button
                                            onClick={() => setEditingData(prev => prev ? ({ ...prev, quantity: prev.quantity + 1 }) : null)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all font-bold text-xl"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-2">
                                    <button
                                        onClick={handleSaveCFO1}
                                        disabled={isSaving}
                                        className="w-full h-11 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? 'Salvando...' : 'Salvar Alteração'}
                                    </button>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full h-10 text-slate-500 text-xs font-bold uppercase transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout>
    );
};

export default HoursControlPage;
