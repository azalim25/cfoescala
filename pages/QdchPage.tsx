import React, { useMemo, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { useAcademic } from '../contexts/AcademicContext';
import { useAuth } from '../contexts/AuthContext';
import { Discipline, AcademicSchedule } from '../types';

const QdchPage: React.FC = () => {
    const { disciplines, schedule, isLoading, addDiscipline, updateDiscipline, removeDiscipline } = useAcademic();
    const { isModerator } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDisc, setEditingDisc] = useState<Discipline | null>(null);
    const [formData, setFormData] = useState({ name: '', totalHours: 0 });
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenAddModal = () => {
        setEditingDisc(null);
        setFormData({ name: '', totalHours: 0 });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (disc: Discipline) => {
        setEditingDisc(disc);
        setFormData({
            name: disc.name,
            totalHours: disc.totalHours
        });
        setIsModalOpen(true);
    };

    const handleSaveDiscipline = async () => {
        if (!formData.name || formData.totalHours <= 0) {
            alert('Preencha os campos corretamente.');
            return;
        }
        setIsSaving(true);
        try {
            if (editingDisc) {
                await updateDiscipline(editingDisc.id, formData);
            } else {
                await addDiscipline(formData);
            }
            setIsModalOpen(false);
            setFormData({ name: '', totalHours: 0 });
            setEditingDisc(null);
        } catch (error) {
            console.error('Error saving discipline:', error);
            alert('Erro ao salvar disciplina.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDiscipline = async (id: string, name: string) => {
        if (confirm(`Deseja realmente excluir a disciplina "${name}"? Todas as aulas vinculadas a ela perderão o vínculo.`)) {
            try {
                await removeDiscipline(id);
            } catch (error) {
                console.error('Error deleting discipline:', error);
                alert('Erro ao excluir disciplina.');
            }
        }
    };

    const stats = useMemo(() => {
        return disciplines.map(disc => {
            const completedMinutes = schedule
                .filter(s => s.disciplineId === disc.id)
                .reduce((acc, s) => {
                    const [h1, m1] = s.startTime.split(':').map(Number);
                    const [h2, m2] = s.endTime.split(':').map(Number);
                    return acc + ((h2 * 60 + m2) - (h1 * 60 + m1));
                }, 0);

            const completedHours = completedMinutes / 60;
            const remainingHours = Math.max(0, disc.totalHours - completedHours);
            const percentage = disc.totalHours > 0 ? (completedHours / disc.totalHours) * 100 : 0;

            return {
                ...disc,
                completedHours,
                remainingHours,
                percentage
            };
        });
    }, [disciplines, schedule]);

    const totalPrevista = disciplines.reduce((acc, d) => acc + d.totalHours, 0);
    const totalCumprida = stats.reduce((acc, s) => acc + s.completedHours, 0);
    const totalPercentage = totalPrevista > 0 ? (totalCumprida / totalPrevista) * 100 : 0;

    return (
        <MainLayout activePage="qdch">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">monitoring</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 uppercase">QDCH - Quadro de Distribuição de Carga Horária</h2>
                            <p className="text-xs text-slate-500 font-medium">Acompanhamento de Execução do Curso</p>
                        </div>
                    </div>

                    {isModerator && (
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-all border border-primary/20"
                        >
                            <span className="material-symbols-outlined text-sm">add</span> Adicionar Disciplina
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">C.H. Total Prevista</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalPrevista}h</h3>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">C.H. Total Cumprida</p>
                        <h3 className="text-2xl font-black text-primary">{totalCumprida.toFixed(1)}h</h3>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${totalPercentage}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progresso Geral</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalPercentage.toFixed(1)}%</h3>
                        <div className="mt-4 flex items-center gap-1">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className={`h-2 flex-1 rounded-sm ${i < totalPercentage / 10 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Disciplina</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Prevista</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Cumprida</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Restante</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Progresso</th>
                                    {isModerator && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-right">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stats.length === 0 ? (
                                    <tr>
                                        <td colSpan={isModerator ? 6 : 5} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                                            Nenhuma disciplina cadastrada.
                                        </td>
                                    </tr>
                                ) : stats.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{s.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{s.totalHours}h</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-black text-primary">{s.completedHours.toFixed(1)}h</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold text-slate-500">{s.remainingHours.toFixed(1)}h</span>
                                        </td>
                                        <td className="px-6 py-4 min-w-[180px]">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${s.percentage >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                                                        style={{ width: `${Math.min(100, s.percentage)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 w-8 text-right">{s.percentage.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        {isModerator && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenEditModal(s)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDiscipline(s.id, s.name)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Adicionar/Editar Disciplina */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">{editingDisc ? 'edit' : 'add_circle'}</span>
                                    {editingDisc ? 'Editar Disciplina' : 'Nova Disciplina'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined text-slate-400">close</span>
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Disciplina</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary/50 transition-all"
                                        placeholder="Ex: Legislação Militar"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Horária Prevista</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.totalHours}
                                            onChange={(e) => setFormData({ ...formData, totalHours: parseInt(e.target.value) || 0 })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary/50 transition-all"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Horas</span>
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 h-12 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveDiscipline}
                                        disabled={isSaving}
                                        className="flex-[2] h-12 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? 'Salvando...' : (editingDisc ? 'Salvar Alterações' : 'Cadastrar')}
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

export default QdchPage;
