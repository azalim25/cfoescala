import React, { useState, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useAcademic } from '../contexts/AcademicContext';
import { useAuth } from '../contexts/AuthContext';
import { AcademicSchedule, Discipline } from '../types';
import { safeParseISO } from '../utils/dateUtils';

const QtmPage: React.FC = () => {
    const { schedule, disciplines, addScheduleEntry, updateScheduleEntry, removeScheduleEntry } = useAcademic();
    const { isModerator } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<AcademicSchedule | null>(null);

    const activityTypes = [
        'Aula',
        'Treinamento Esportivo',
        'Liberação',
        'Dispensa de Ensino',
        'Atividade Extra',
        'Sem Aula'
    ];

    const activityColors: Record<string, { bg: string, text: string, border: string, dot: string }> = {
        'Aula': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800/50', dot: 'bg-blue-500' },
        'Prova': { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-300 dark:border-pink-800', dot: 'bg-pink-500' },
        'Treinamento Esportivo': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800/50', dot: 'bg-orange-500' },
        'Liberação': { bg: 'bg-slate-900 dark:bg-black', text: 'text-white dark:text-slate-200', border: 'border-slate-800 dark:border-slate-700', dot: 'bg-white' },
        'Dispensa de Ensino': { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-500' },
        'Atividade Extra': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800/50', dot: 'bg-yellow-500' },
        'Sem Aula': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-800/50', dot: 'bg-red-500' }
    };

    const [selectedType, setSelectedType] = useState('Aula');
    const [isExam, setIsExam] = useState(false);
    const [formData, setFormData] = useState<Omit<AcademicSchedule, 'id'>>({
        date: '',
        startTime: '08:00',
        endTime: '09:40',
        disciplineId: null,
        location: 'ABM',
        description: ''
    });

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentYear(currentYear - 1);
            setCurrentMonth(11);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentYear(currentYear + 1);
            setCurrentMonth(0);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDayClick = (dayStr: string) => {
        setSelectedDate(dayStr);
    };

    const handleOpenAddModal = (day: number) => {
        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        setEditingEntry(null);
        setSelectedType('Aula');
        setIsExam(false);
        setFormData({
            date: dateStr,
            startTime: '08:00',
            endTime: '09:40',
            disciplineId: disciplines[0]?.id || null,
            location: 'ABM',
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (entry: AcademicSchedule) => {
        setEditingEntry(entry);

        let foundType = 'Aula';
        if (!entry.disciplineId) {
            foundType = activityTypes.find(t => t === entry.description) || 'Atividade Extra';
        }

        setSelectedType(foundType);
        setIsExam(entry.disciplineId !== null && entry.description === 'PROVA');
        setFormData({
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            disciplineId: entry.disciplineId,
            location: entry.location || 'ABM',
            description: entry.description || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveEntry = async () => {
        try {
            const dataToSave = { ...formData };
            if (selectedType !== 'Aula') {
                dataToSave.disciplineId = null;
                if (selectedType !== 'Atividade Extra') {
                    dataToSave.description = selectedType;
                }
            } else {
                dataToSave.description = isExam ? 'PROVA' : '';
            }

            if (editingEntry) {
                await updateScheduleEntry(editingEntry.id, dataToSave);
            } else {
                await addScheduleEntry(dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Erro ao salvar atividade.');
        }
    };

    const handleDeleteEntry = async () => {
        if (editingEntry && confirm('Deseja remover esta atividade?')) {
            await removeScheduleEntry(editingEntry.id);
            setIsModalOpen(false);
        }
    };

    const availableDisciplines = useMemo(() => {
        return disciplines.filter(disc => {
            const completedHours = schedule
                .filter(s => s.disciplineId === disc.id)
                .length * 2;

            // Show if not finished OR if it's the one currently being edited
            return completedHours < disc.totalHours || (editingEntry && editingEntry.disciplineId === disc.id);
        });
    }, [disciplines, schedule, editingEntry]);

    const selectedDayActivities = schedule
        .filter(s => s.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const selectedDayHasNoClass = selectedDayActivities.some(act => act.description === 'Sem Aula');

    return (
        <MainLayout activePage="qtm" reverseMobile>
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">event_note</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 uppercase">QTM - Quadro de Trabalho Mensal</h2>
                            <p className="text-xs text-slate-500 font-medium">Cronograma de Atividades e Aulas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <span className="px-4 py-2 text-sm font-bold uppercase min-w-[140px] text-center">
                                {months[currentMonth]} {currentYear}
                            </span>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-200 dark:border-slate-800">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {[...Array(getFirstDayOfMonth(currentYear, currentMonth))].map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10"></div>
                        ))}
                        {[...Array(getDaysInMonth(currentYear, currentMonth))].map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const dayActivities = schedule.filter(s => s.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
                            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                            const isSelected = selectedDate === dateStr;

                            const hasNoClass = dayActivities.some(act => act.description === 'Sem Aula');

                            return (
                                <div
                                    key={day}
                                    onClick={() => handleDayClick(dateStr)}
                                    className={`min-h-[100px] p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all relative cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'ring-2 ring-primary ring-inset z-10' : ''} ${isToday ? 'bg-primary/5' : hasNoClass ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs font-bold ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center' : hasNoClass ? 'text-red-500 font-black' : 'text-slate-400 group-hover:text-primary transition-colors'}`}>{day}</span>
                                        {isModerator && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenAddModal(day); }}
                                                className={`w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center ${hasNoClass ? 'text-red-300 hover:text-red-500' : 'text-slate-300 hover:text-primary'} transition-all`}
                                            >
                                                <span className="material-symbols-outlined text-xs">add</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {dayActivities.map(act => {
                                            if (act.description === 'Sem Aula') return null;

                                            const discipline = disciplines.find(d => d.id === act.disciplineId);

                                            let type = 'Aula';
                                            if (!act.disciplineId) {
                                                type = activityTypes.find(t => t === act.description) || 'Atividade Extra';
                                            } else if (act.description === 'PROVA') {
                                                type = 'Prova';
                                            }

                                            const colors = activityColors[type] || activityColors['Aula'];

                                            return (
                                                <div
                                                    key={act.id}
                                                    className={`w-full text-left p-1 rounded border overflow-hidden ${colors.bg} ${colors.border}`}
                                                >
                                                    <div className="h-1 w-full bg-current opacity-20 mb-0.5"></div>
                                                    <div className={`text-[7px] font-bold truncate px-0.5 ${colors.text}`}>
                                                        {discipline?.name || act.description}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </MainLayout.Content>

            <MainLayout.Sidebar>
                {/* Ficha do Dia */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-20">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase">
                            <span className="material-symbols-outlined text-primary text-xl">assignment</span>
                            Ficha do Dia
                        </h3>
                        <div className="flex flex-col">
                            <span className="text-[10px] sm:text-[11px] text-primary font-bold">
                                {safeParseISO(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                {safeParseISO(selectedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    <div className="p-4 space-y-4 min-h-[400px]">
                        {selectedDayHasNoClass ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
                                    <span className="material-symbols-outlined text-3xl">event_busy</span>
                                </div>
                                <div>
                                    <p className="font-bold text-red-600 dark:text-red-400 uppercase text-xs tracking-widest">Sem Aula</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Não há atividades registradas para este dia.</p>
                                </div>
                            </div>
                        ) : selectedDayActivities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-40">
                                <span className="material-symbols-outlined text-4xl text-slate-300">calendar_today</span>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma atividade</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Atividades Agendadas</p>
                                {selectedDayActivities.map(act => {
                                    const discipline = disciplines.find(d => d.id === act.disciplineId);
                                    let type = 'Aula';
                                    if (!act.disciplineId) {
                                        type = activityTypes.find(t => t === act.description) || 'Atividade Extra';
                                    } else if (act.description === 'PROVA') {
                                        type = 'Prova';
                                    }
                                    const colors = activityColors[type] || activityColors['Aula'];

                                    return (
                                        <button
                                            key={act.id}
                                            onClick={() => isModerator && handleOpenEditModal(act)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all hover:translate-x-1 ${colors.bg} ${colors.border} group relative overflow-hidden shadow-sm`}
                                        >
                                            <div className={`absolute top-0 left-0 bottom-0 w-1 ${colors.dot}`}></div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>{act.startTime.slice(0, 5)} - {act.endTime.slice(0, 5)}</span>
                                                {isModerator && <span className="material-symbols-outlined text-xs text-slate-300 group-hover:text-slate-500 transition-colors">edit</span>}
                                            </div>
                                            <p className={`text-xs font-bold leading-tight ${type === 'Liberação' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {type === 'Prova' && <span className="text-pink-600 dark:text-pink-400 mr-1 uppercase font-black">[PROVA]</span>}
                                                {discipline?.name || act.description}
                                            </p>
                                            {act.location && type !== 'Liberação' && (
                                                <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                                                    <span className="material-symbols-outlined text-[12px] text-slate-400">location_on</span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate">{act.location}</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {isModerator && (
                            <button
                                onClick={() => handleOpenAddModal(parseInt(selectedDate.split('-')[2]))}
                                className="w-full py-3 mt-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                Nova Atividade
                            </button>
                        )}
                    </div>
                </div>
            </MainLayout.Sidebar>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit_calendar</span>
                                {editingEntry ? 'Editar Atividade' : 'Nova Atividade'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo de Atividade</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {activityTypes.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedType(type)}
                                            className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${selectedType === type ? 'bg-primary text-white border-primary shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedType === 'Aula' ? (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disciplina</label>
                                    <select
                                        value={formData.disciplineId || ''}
                                        onChange={e => setFormData({ ...formData, disciplineId: e.target.value || null })}
                                        className="w-full h-11 px-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="">Selecione a disciplina...</option>
                                        {availableDisciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>

                                    <label className="flex items-center gap-2 px-1 cursor-pointer group pt-1">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isExam}
                                                onChange={e => setIsExam(e.target.checked)}
                                                className="peer appearance-none w-5 h-5 rounded border-2 border-slate-200 dark:border-slate-700 checked:bg-pink-500 checked:border-pink-500 transition-all cursor-pointer"
                                            />
                                            <span className="material-symbols-outlined absolute text-white text-sm scale-0 peer-checked:scale-100 transition-transform pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">check</span>
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${isExam ? 'text-pink-600 dark:text-pink-400' : 'text-slate-500'}`}>Avaliação / Prova</span>
                                    </label>
                                </div>
                            ) : selectedType === 'Atividade Extra' ? (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição da Atividade</label>
                                    <input
                                        type="text"
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ex: Formatura Geral, Instrução de Tiro"
                                        className="w-full h-11 px-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Início</label>
                                    <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full h-11 px-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fim</label>
                                    <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full h-11 px-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Local / Observação</label>
                                <input
                                    type="text"
                                    value={formData.location || ''}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Ex: Sala 01, ABM"
                                    className="w-full h-11 px-3 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            {editingEntry && (
                                <button onClick={handleDeleteEntry} className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-xs transition-colors uppercase tracking-widest">Excluir</button>
                            )}
                            <button onClick={handleSaveEntry} className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                                {editingEntry ? 'Salvar Alterações' : 'Adicionar no Cronograma'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default QtmPage;
