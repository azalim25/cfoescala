import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Military } from '../types';
import { safeParseISO } from '../utils/dateUtils';

interface EstadoMaior {
    id: string;
    name: string;
    description: string;
}

interface ExtraHourRecord {
    id: string;
    military_id: string;
    hours: number;
    minutes: number;
    description: string;
    category: string;
    date: string;
    created_at: string;
    militaries?: Military;
}

// Group container for history listing
interface GroupedHours {
    date: string;
    emId: string;
    emName: string;
    records: ExtraHourRecord[];
    totalHours: number;
}

const EstadoMaiorHorasPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { isModerator } = useAuth();
    
    const [estadosMaiores, setEstadosMaiores] = useState<EstadoMaior[]>([]);
    const [records, setRecords] = useState<ExtraHourRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedEmId, setSelectedEmId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [inputHours, setInputHours] = useState<Record<string, { hours: string; minutes: string }>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [originalGroupKey, setOriginalGroupKey] = useState<{ emId: string; date: string } | null>(null);

    // Fetch initial data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Estado Maior options
            const { data: emData, error: emError } = await supabase
                .from('estado_maior')
                .select('id, name, description')
                .order('name', { ascending: true });

            if (emError) throw emError;
            setEstadosMaiores(emData || []);

            // Fetch extra hours with category 'Estado Maior'
            const { data: recordsData, error: recordsError } = await supabase
                .from('extra_hours')
                .select('*, militaries(*)')
                .eq('category', 'Estado Maior')
                .order('date', { ascending: false });

            if (recordsError) throw recordsError;
            setRecords(recordsData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados do banco.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Group records by Date and Estado Maior ID
    const groupedRecords = useMemo((): GroupedHours[] => {
        const groups: Record<string, GroupedHours> = {};

        records.forEach(record => {
            let emId = '';
            let emName = 'Estado Maior Indefinido';

            try {
                // The description contains JSON metadata
                const meta = JSON.parse(record.description);
                emId = meta.estadoMaiorId || '';
                emName = meta.estadoMaiorName || emName;
            } catch (e) {
                // Fallback for non-JSON or other formats
                emId = record.description || '';
                const matchEm = estadosMaiores.find(em => em.id === emId);
                if (matchEm) emName = matchEm.name;
            }

            if (!emId) return;

            const dateKey = record.date || record.created_at.split('T')[0];
            const groupKey = `${dateKey}_${emId}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    date: dateKey,
                    emId,
                    emName,
                    records: [],
                    totalHours: 0
                };
            }

            groups[groupKey].records.push(record);
            groups[groupKey].totalHours += Number(record.hours || 0) + (Number(record.minutes || 0) / 60);
        });

        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [records, estadosMaiores]);

    // Open Modal for adding new hours
    const handleOpenAddModal = () => {
        setModalMode('add');
        setSelectedEmId(estadosMaiores[0]?.id || '');
        setSelectedDate(new Date().toISOString().split('T')[0]);
        setOriginalGroupKey(null);
        
        // Initialize military input mapping with zeroes
        const initialInputs: Record<string, { hours: string; minutes: string }> = {};
        militaries.forEach(m => {
            initialInputs[m.id] = { hours: '', minutes: '' };
        });
        setInputHours(initialInputs);
        setIsModalOpen(true);
    };

    // Open Modal to Edit a group of records
    const handleOpenEditModal = (group: GroupedHours) => {
        setModalMode('edit');
        setSelectedEmId(group.emId);
        setSelectedDate(group.date);
        setOriginalGroupKey({ emId: group.emId, date: group.date });

        // Initialize military input with values from records in this group
        const initialInputs: Record<string, { hours: string; minutes: string }> = {};
        
        militaries.forEach(m => {
            const milRecord = group.records.find(r => r.military_id === m.id);
            if (milRecord) {
                initialInputs[m.id] = {
                    hours: milRecord.hours > 0 ? String(milRecord.hours) : '',
                    minutes: milRecord.minutes > 0 ? String(milRecord.minutes) : ''
                };
            } else {
                initialInputs[m.id] = { hours: '', minutes: '' };
            }
        });
        
        setInputHours(initialInputs);
        setIsModalOpen(true);
    };

    // Save hours
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedEmId) {
            alert('Por favor, selecione um Estado Maior.');
            return;
        }

        const selectedEm = estadosMaiores.find(em => em.id === selectedEmId);
        if (!selectedEm) {
            alert('Estado Maior inválido.');
            return;
        }

        setIsSaving(true);
        try {
            // Determine records to create
            const newRecordsToInsert: any[] = [];
            const idsToDelete: string[] = [];

            militaries.forEach(m => {
                const inputs = inputHours[m.id];
                const h = parseInt(inputs?.hours || '0') || 0;
                const min = parseInt(inputs?.minutes || '0') || 0;

                if (h > 0 || min > 0) {
                    newRecordsToInsert.push({
                        military_id: m.id,
                        hours: h,
                        minutes: min,
                        category: 'Estado Maior',
                        description: JSON.stringify({
                            estadoMaiorId: selectedEm.id,
                            estadoMaiorName: selectedEm.name
                        }),
                        date: selectedDate
                    });
                }
            });

            // If we are editing, we should purge the old records in the group first
            if (modalMode === 'edit' && originalGroupKey) {
                // Find all existing records in this group to delete
                const originalGroup = groupedRecords.find(
                    g => g.emId === originalGroupKey.emId && g.date === originalGroupKey.date
                );
                
                if (originalGroup) {
                    const deleteIds = originalGroup.records.map(r => r.id);
                    if (deleteIds.length > 0) {
                        idsToDelete.push(...deleteIds);
                    }
                }
            }

            // Perform DB Operations
            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('extra_hours')
                    .delete()
                    .in('id', idsToDelete);

                if (deleteError) throw deleteError;
            }

            if (newRecordsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('extra_hours')
                    .insert(newRecordsToInsert);

                if (insertError) throw insertError;
            }

            setIsModalOpen(false);
            await fetchData();
            alert('Horas de Estado Maior salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar horas de estado maior:', error);
            alert('Ocorreu um erro ao salvar os registros.');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete a grouped log of hours
    const handleDeleteGroup = async (group: GroupedHours) => {
        const confirmDelete = window.confirm(
            `Deseja realmente excluir todos os registros de horas para o "${group.emName}" na data ${safeParseISO(group.date).toLocaleDateString('pt-BR')}?`
        );

        if (!confirmDelete) return;

        try {
            const deleteIds = group.records.map(r => r.id);
            if (deleteIds.length > 0) {
                const { error } = await supabase
                    .from('extra_hours')
                    .delete()
                    .in('id', deleteIds);

                if (error) throw error;
                await fetchData();
                alert('Registros removidos com sucesso.');
            }
        } catch (error) {
            console.error('Erro ao deletar grupo:', error);
            alert('Erro ao excluir registros.');
        }
    };

    // Handle single military input changes
    const handleInputChange = (militaryId: string, field: 'hours' | 'minutes', value: string) => {
        // Clean non-digits
        const cleaned = value.replace(/\D/g, '');
        
        setInputHours(prev => ({
            ...prev,
            [militaryId]: {
                ...prev[militaryId],
                [field]: cleaned
            }
        }));
    };

    // Filtered military list inside the Modal
    const filteredMilitaries = useMemo(() => {
        if (!searchTerm) return militaries;
        const searchLower = searchTerm.toLowerCase();
        return militaries.filter(m => 
            m.name.toLowerCase().includes(searchLower) || 
            (m.fullName && m.fullName.toLowerCase().includes(searchLower)) ||
            m.firefighterNumber.includes(searchLower)
        );
    }, [militaries, searchTerm]);

    return (
        <MainLayout activePage="estado-maior-horas">
            <MainLayout.Content>
                {/* Header Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-800">
                            <span className="material-symbols-outlined text-2xl sm:text-3xl">more_time</span>
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none">Estado Maior - Horas</h1>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gestão de Horas do Estado Maior</p>
                        </div>
                    </div>
                    {isModerator && (
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all w-full sm:w-auto"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            <span className="whitespace-nowrap">Adicionar Horas</span>
                        </button>
                    )}
                </div>

                {/* History Registry Listing */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-[11px] sm:text-sm uppercase tracking-tight">
                            <span className="material-symbols-outlined text-primary text-lg">history</span>
                            Registros Efetuados
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {groupedRecords.length} lançamentos
                        </span>
                    </div>

                    <div className="p-4">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-slate-400 text-sm mt-4">Carregando registros...</p>
                            </div>
                        ) : groupedRecords.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <span className="material-symbols-outlined text-6xl opacity-50">event_busy</span>
                                <p className="font-bold text-sm mt-4">Nenhum registro de horas no Estado Maior foi lançado.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {groupedRecords.map(group => (
                                    <div 
                                        key={`${group.date}_${group.emId}`} 
                                        className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 transition-all"
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3 mb-3">
                                            <div>
                                                <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight">
                                                    {group.emName}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                                                    {safeParseISO(group.date).toLocaleDateString('pt-BR')}
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-650"></span>
                                                    <span className="text-indigo-600 dark:text-indigo-400">
                                                        Total: {group.totalHours.toFixed(1)}h
                                                    </span>
                                                </div>
                                            </div>
                                            {isModerator && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(group)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-600 dark:text-slate-300 hover:text-primary rounded-lg text-xs font-bold bg-white dark:bg-slate-900 transition-colors shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteGroup(group)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-100 dark:border-rose-900/30 hover:border-rose-500 text-rose-600 hover:text-white hover:bg-rose-500 rounded-lg text-xs font-bold bg-rose-50/50 dark:bg-rose-950/20 transition-all shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-sm bg-transparent">delete</span>
                                                        Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sub-table showing individual military hours inside this entry */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {group.records
                                                .sort((a,b) => (b.hours*60 + b.minutes) - (a.hours*60 + a.minutes))
                                                .map(record => {
                                                    const mil = record.militaries;
                                                    return (
                                                        <div 
                                                            key={record.id} 
                                                            className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-slate-750">
                                                                    <span className="material-symbols-outlined text-sm">person</span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                                                        {mil ? `${mil.rank} ${mil.name}` : 'Militar'}
                                                                    </p>
                                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                                        Nº: {mil?.firefighterNumber || '-'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-300 text-[10px] font-black rounded border border-indigo-150 dark:border-indigo-900/50">
                                                                {record.hours}h {record.minutes}m
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
                            
                            {/* Modal Header */}
                            <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <span className="material-symbols-outlined text-primary text-xl">
                                        {modalMode === 'edit' ? 'edit_note' : 'add_circle'}
                                    </span>
                                    {modalMode === 'edit' ? 'Editar Registro de Horas' : 'Lançar Horas no Estado Maior'}
                                </h3>
                                <button 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                                
                                {/* Form Inputs Section */}
                                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Estado Maior Dropdown Selection */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Maior</label>
                                            <select
                                                value={selectedEmId}
                                                onChange={(e) => setSelectedEmId(e.target.value)}
                                                disabled={modalMode === 'edit'}
                                                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-60"
                                                required
                                            >
                                                {estadosMaiores.length === 0 ? (
                                                    <option value="">Nenhum Estado Maior cadastrado</option>
                                                ) : (
                                                    estadosMaiores.map(em => (
                                                        <option key={em.id} value={em.id}>{em.name}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        {/* Date selection */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Lançamento</label>
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                disabled={modalMode === 'edit'}
                                                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-60"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Scrollable list of military personnel with inputs */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horas por Militar</label>
                                            
                                            {/* Small search filter in modal */}
                                            <div className="relative w-full sm:w-64">
                                                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                                                <input 
                                                    type="text" 
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Filtrar por nome/número..."
                                                    className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg focus:ring-1 focus:ring-primary outline-none dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                            {filteredMilitaries.length === 0 ? (
                                                <p className="text-center py-6 text-xs text-slate-400">Nenhum militar correspondente.</p>
                                            ) : (
                                                filteredMilitaries.map(m => {
                                                    const currentVal = inputHours[m.id] || { hours: '', minutes: '' };
                                                    return (
                                                        <div key={m.id} className="py-2.5 flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-slate-750">
                                                                    <span className="material-symbols-outlined text-[18px]">person</span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                                                                        {m.rank} {m.name}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                                        Nº: {m.firefighterNumber || '-'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Hour/Minute Inputs */}
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    placeholder="0h"
                                                                    value={currentVal.hours}
                                                                    onChange={(e) => handleInputChange(m.id, 'hours', e.target.value)}
                                                                    className="w-16 h-8 text-center text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-1 focus:ring-primary outline-none font-bold"
                                                                />
                                                                <span className="text-slate-400 text-xs font-bold">:</span>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    placeholder="0m"
                                                                    value={currentVal.minutes}
                                                                    onChange={(e) => handleInputChange(m.id, 'minutes', e.target.value)}
                                                                    className="w-16 h-8 text-center text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:ring-1 focus:ring-primary outline-none font-bold"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        disabled={isSaving}
                                        className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-base">save</span>
                                        {isSaving ? 'Salvando...' : 'Salvar Registros'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout>
    );
};

export default EstadoMaiorHorasPage;
