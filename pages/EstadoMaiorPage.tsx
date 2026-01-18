import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

interface EstadoMaiorAssignment {
    militaryId: string;
    role: string;
}

interface EstadoMaior {
    id: string;
    name: string;
    description: string;
    assignments: EstadoMaiorAssignment[];
    createdAt: string;
}

const EstadoMaiorPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { isGuest } = useAuth();
    const [estadosMaiores, setEstadosMaiores] = useState<EstadoMaior[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formAssignments, setFormAssignments] = useState<EstadoMaiorAssignment[]>([
        { militaryId: '', role: '' }
    ]);

    // Fetch Estado Maior from Supabase
    const fetchEstadosMaiores = async () => {
        setIsLoading(true);
        try {
            const { data: emData, error: emError } = await supabase
                .from('estado_maior')
                .select('*')
                .order('created_at', { ascending: false });

            if (emError) throw emError;

            if (emData) {
                // Fetch assignments for each estado maior
                const estadosWithAssignments = await Promise.all(
                    emData.map(async (em) => {
                        const { data: assignments, error: assignError } = await supabase
                            .from('estado_maior_assignments')
                            .select('military_id, role')
                            .eq('estado_maior_id', em.id);

                        if (assignError) throw assignError;

                        return {
                            id: em.id,
                            name: em.name,
                            description: em.description || '',
                            assignments: assignments?.map(a => ({
                                militaryId: a.military_id,
                                role: a.role
                            })) || [],
                            createdAt: em.created_at
                        };
                    })
                );

                setEstadosMaiores(estadosWithAssignments);
            }
        } catch (error) {
            console.error('Error fetching estados maiores:', error);
            alert('Erro ao carregar Estados Maiores.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEstadosMaiores();
    }, []);

    const handleOpenAddModal = () => {
        setEditingId(null);
        setFormName('');
        setFormDescription('');
        setFormAssignments([{ militaryId: '', role: '' }]);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (em: EstadoMaior) => {
        setEditingId(em.id);
        setFormName(em.name);
        setFormDescription(em.description);
        setFormAssignments(em.assignments.length > 0 ? em.assignments : [{ militaryId: '', role: '' }]);
        setIsModalOpen(true);
    };

    const handleAddAssignment = () => {
        setFormAssignments([...formAssignments, { militaryId: '', role: '' }]);
    };

    const handleRemoveAssignment = (index: number) => {
        setFormAssignments(formAssignments.filter((_, i) => i !== index));
    };

    const handleAssignmentChange = (index: number, field: 'militaryId' | 'role', value: string) => {
        const updated = [...formAssignments];
        updated[index][field] = value;
        setFormAssignments(updated);
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            alert('Por favor, insira um nome para o Estado Maior.');
            return;
        }

        setIsSaving(true);
        try {
            // Filter out empty assignments
            const validAssignments = formAssignments.filter(a => a.militaryId && a.role.trim());

            if (editingId) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('estado_maior')
                    .update({
                        name: formName,
                        description: formDescription,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId);

                if (updateError) throw updateError;

                // Delete old assignments
                const { error: deleteError } = await supabase
                    .from('estado_maior_assignments')
                    .delete()
                    .eq('estado_maior_id', editingId);

                if (deleteError) throw deleteError;

                // Insert new assignments
                if (validAssignments.length > 0) {
                    const { error: insertError } = await supabase
                        .from('estado_maior_assignments')
                        .insert(
                            validAssignments.map(a => ({
                                estado_maior_id: editingId,
                                military_id: a.militaryId,
                                role: a.role
                            }))
                        );

                    if (insertError) throw insertError;
                }
            } else {
                // Create new
                const { data: newEM, error: createError } = await supabase
                    .from('estado_maior')
                    .insert({
                        name: formName,
                        description: formDescription
                    })
                    .select()
                    .single();

                if (createError) throw createError;

                // Insert assignments
                if (validAssignments.length > 0 && newEM) {
                    const { error: insertError } = await supabase
                        .from('estado_maior_assignments')
                        .insert(
                            validAssignments.map(a => ({
                                estado_maior_id: newEM.id,
                                military_id: a.militaryId,
                                role: a.role
                            }))
                        );

                    if (insertError) throw insertError;
                }
            }

            setIsModalOpen(false);
            fetchEstadosMaiores();
        } catch (error) {
            console.error('Error saving estado maior:', error);
            alert('Erro ao salvar Estado Maior.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este Estado Maior?')) return;

        try {
            const { error } = await supabase
                .from('estado_maior')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchEstadosMaiores();
        } catch (error) {
            console.error('Error deleting estado maior:', error);
            alert('Erro ao excluir Estado Maior.');
        }
    };

    // Calculate ranking
    const ranking = militaries.map(military => {
        const roleCount = estadosMaiores.reduce((count, em) => {
            return count + em.assignments.filter(a => a.militaryId === military.id).length;
        }, 0);
        return { military, roleCount };
    }).filter(r => r.roleCount > 0).sort((a, b) => b.roleCount - a.roleCount);

    return (
        <MainLayout activePage="estado-maior">
            <MainLayout.Content>
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">military_tech</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">Estado Maior</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gestão de Funções e Atribuições</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por militar ou estado maior..."
                                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary w-80 dark:text-white"
                            />
                        </div>
                        {!isGuest && (
                            <button
                                onClick={handleOpenAddModal}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                Adicionar Estado Maior
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <span className="material-symbols-outlined text-primary text-lg">list_alt</span>
                                    Estados Maiores Cadastrados
                                </h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {isLoading ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <p className="text-slate-400 text-sm mt-4">Carregando...</p>
                                    </div>
                                ) : estadosMaiores.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <span className="material-symbols-outlined text-6xl opacity-50">folder_open</span>
                                        <p className="font-bold text-sm mt-4">Nenhum Estado Maior cadastrado.</p>
                                    </div>
                                ) : (
                                    estadosMaiores
                                        .filter(em => {
                                            if (!searchTerm) return true;
                                            const searchLower = searchTerm.toLowerCase();
                                            // Check if estado maior name matches
                                            if (em.name.toLowerCase().includes(searchLower)) return true;
                                            // Check if any assigned military name matches
                                            return em.assignments.some(assignment => {
                                                const military = militaries.find(m => m.id === assignment.militaryId);
                                                return military?.name.toLowerCase().includes(searchLower);
                                            });
                                        })
                                        .map(em => {
                                            // Determine if we're searching for a military name (not estado maior name)
                                            const searchLower = searchTerm.toLowerCase();
                                            const isSearchingMilitary = searchTerm && !em.name.toLowerCase().includes(searchLower);

                                            return (
                                                <div key={em.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 dark:text-white">{em.name}</h4>
                                                            <p className="text-xs text-slate-500 mt-1">{em.description}</p>
                                                        </div>
                                                        {!isGuest && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleOpenEditModal(em)}
                                                                    className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(em.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        {em.assignments
                                                            .filter(assignment => {
                                                                // If no search term, show all assignments
                                                                if (!searchTerm) return true;
                                                                // If searching by estado maior name, show all assignments
                                                                if (!isSearchingMilitary) return true;
                                                                // If searching by military name, only show matching military's assignments
                                                                const military = militaries.find(m => m.id === assignment.militaryId);
                                                                return military?.name.toLowerCase().includes(searchLower);
                                                            })
                                                            .map((assignment, idx) => {
                                                                const military = militaries.find(m => m.id === assignment.militaryId);
                                                                return (
                                                                    <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                                            <span className="material-symbols-outlined text-sm">person</span>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                                                {military?.rank} {military?.name}
                                                                            </p>
                                                                            <p className="text-xs text-primary font-bold uppercase">{assignment.role}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}                         </div>
                                                </div>
                                            ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ranking Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-20">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <span className="material-symbols-outlined text-primary text-lg">leaderboard</span>
                                    Ranking por Funções
                                </h3>
                            </div>
                            <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                                {ranking.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl opacity-50">emoji_events</span>
                                        <p className="text-xs mt-2">Nenhuma atribuição ainda.</p>
                                    </div>
                                ) : (
                                    ranking.map((item, index) => (
                                        <div key={item.military.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' :
                                                index === 1 ? 'bg-slate-200 text-slate-700 border-2 border-slate-300' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' :
                                                        'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                    {item.military.rank} {item.military.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {item.roleCount} {item.roleCount === 1 ? 'função' : 'funções'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout.Content>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">
                                    {editingId ? 'edit' : 'add_circle'}
                                </span>
                                {editingId ? 'Editar Estado Maior' : 'Adicionar Estado Maior'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nome do Estado Maior</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ex: Estado Maior 2026"
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Descrição</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Descrição opcional..."
                                    rows={3}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Militares e Funções</label>
                                    <button
                                        onClick={handleAddAssignment}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Adicionar Função e Militar
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formAssignments.map((assignment, index) => (
                                        <div key={index} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex-1 space-y-2">
                                                <select
                                                    value={assignment.militaryId}
                                                    onChange={(e) => handleAssignmentChange(index, 'militaryId', e.target.value)}
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                >
                                                    <option value="">Selecione um militar...</option>
                                                    {militaries.map(m => (
                                                        <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={assignment.role}
                                                    onChange={(e) => handleAssignmentChange(index, 'role', e.target.value)}
                                                    placeholder="Função (ex: Comandante, Adjunto...)"
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                />
                                            </div>
                                            {formAssignments.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveAssignment(index)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default EstadoMaiorPage;
