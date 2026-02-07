import React, { useState, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { SHIFT_TYPE_COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, Calendar } from 'lucide-react';

const StatisticsPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts } = useShift();

    // Filter State
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

    const months = [
        { value: '01', label: 'Janeiro' },
        { value: '02', label: 'Fevereiro' },
        { value: '03', label: 'Março' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Maio' },
        { value: '06', label: 'Junho' },
        { value: '07', label: 'Julho' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' }
    ];

    const filteredShifts = useMemo(() => {
        if (selectedMonths.length === 0) return shifts;
        return shifts.filter(s => {
            const month = s.date.split('-')[1];
            return selectedMonths.includes(month);
        });
    }, [shifts, selectedMonths]);

    const toggleMonth = (month: string) => {
        setSelectedMonths(prev =>
            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
        );
    };

    const clearFilters = () => setSelectedMonths([]);

    // Data Aggregation Logic
    const statsData = useMemo(() => {
        const data: any = {
            comandante: {},
            estagio: {},
            manutencao: {},
            faxina: {},
            sobreaviso: {}
        };

        militaries.forEach(m => {
            data.comandante[m.id] = { name: m.name, weekday: 0, weekend: 0, total: 0 };
            data.estagio[m.id] = { name: m.name, h12: 0, h24: 0, total: 0 };
            data.manutencao[m.id] = { name: m.name, count: 0 };
            data.faxina[m.id] = { name: m.name, count: 0 };
            data.sobreaviso[m.id] = { name: m.name, count: 0 };
        });

        filteredShifts.forEach(s => {
            const milData = data;
            if (s.type === 'Comandante da Guarda') {
                const date = new Date(s.date + 'T12:00:00');
                const day = date.getDay();
                const isWeekend = day === 0 || day === 6;
                if (milData.comandante[s.militaryId]) {
                    if (isWeekend) milData.comandante[s.militaryId].weekend++;
                    else milData.comandante[s.militaryId].weekday++;
                    milData.comandante[s.militaryId].total++;
                }
            } else if (s.type === 'Estágio') {
                if (milData.estagio[s.militaryId]) {
                    if (s.duration === 24) milData.estagio[s.militaryId].h24++;
                    else milData.estagio[s.militaryId].h12++;
                    milData.estagio[s.militaryId].total++;
                }
            } else if (s.type === 'Manutenção') {
                if (milData.manutencao[s.militaryId]) milData.manutencao[s.militaryId].count++;
            } else if (s.type === 'Faxina') {
                if (milData.faxina[s.militaryId]) milData.faxina[s.militaryId].count++;
            } else if (s.type === 'Sobreaviso') {
                if (milData.sobreaviso[s.militaryId]) milData.sobreaviso[s.militaryId].count++;
            }
        });

        return {
            comandante: Object.values(data.comandante).filter((v: any) => v.total > 0).sort((a: any, b: any) => b.total - a.total),
            estagio: Object.values(data.estagio).filter((v: any) => v.total > 0).sort((a: any, b: any) => b.total - a.total),
            manutencao: Object.values(data.manutencao).filter((v: any) => v.count > 0).sort((a: any, b: any) => b.count - a.count),
            faxina: Object.values(data.faxina).filter((v: any) => v.count > 0).sort((a: any, b: any) => b.count - a.count),
            sobreaviso: Object.values(data.sobreaviso).filter((v: any) => v.count > 0).sort((a: any, b: any) => b.count - a.count)
        };
    }, [filteredShifts, militaries]);

    const ChartSection = ({ title, data, bars, color }: { title: string, data: any[], bars: { key: string, label: string, color: string }[], color: string }) => (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-1.5 h-6 rounded-full ${color}`}></div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{title}</h2>
            </div>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                backgroundColor: '#1e293b',
                                color: '#fff'
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                        {bars.map(bar => (
                            <Bar
                                key={bar.key}
                                dataKey={bar.key}
                                name={bar.label}
                                fill={bar.color}
                                radius={[0, 4, 4, 0]}
                                barSize={bars.length > 1 ? 15 : 25}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <MainLayout activePage="statistics">
            <MainLayout.Content>
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <span className="material-symbols-outlined text-3xl">analytics</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tight">Estatísticas de Escala</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Análise de empenho e distribuição</p>
                        </div>
                    </div>

                    {/* Month Filter */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meses:</span>
                            <div className="flex gap-1">
                                {selectedMonths.length === 0 ? (
                                    <span className="text-[10px] font-black text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">TODOS</span>
                                ) : (
                                    selectedMonths.sort().map(m => (
                                        <span key={m} className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
                                            {months.find(mon => mon.value === m)?.label.substring(0, 3).toUpperCase()}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="relative group">
                            <button className="h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                                <Filter className="w-4 h-4 text-slate-500" />
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Filtrar</span>
                            </button>

                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <div className="grid grid-cols-2 gap-2">
                                    {months.map(m => (
                                        <button
                                            key={m.value}
                                            onClick={() => toggleMonth(m.value)}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedMonths.includes(m.value)
                                                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-700'
                                                }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                {selectedMonths.length > 0 && (
                                    <button
                                        onClick={clearFilters}
                                        className="w-full mt-4 py-2 text-[10px] font-black text-rose-500 uppercase border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 transition-colors"
                                    >
                                        Limpar Filtros
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-12">
                    {/* Cmd Guarda */}
                    <ChartSection
                        title="CMD. DA GUARDA"
                        data={statsData.comandante}
                        color="bg-rose-500"
                        bars={[
                            { key: 'weekday', label: 'Segunda a Sexta', color: '#f43f5e' },
                            { key: 'weekend', label: 'Sábado e Domingo', color: '#fb7185' }
                        ]}
                    />

                    {/* Estágio */}
                    <ChartSection
                        title="ESTÁGIO"
                        data={statsData.estagio}
                        color="bg-indigo-500"
                        bars={[
                            { key: 'h12', label: '12 Horas', color: '#6366f1' },
                            { key: 'h24', label: '24 Horas', color: '#818cf8' }
                        ]}
                    />

                    {/* Manutenção */}
                    <ChartSection
                        title="MANUTENÇÃO"
                        data={statsData.manutencao}
                        color="bg-emerald-500"
                        bars={[
                            { key: 'count', label: 'Total de Serviços', color: '#10b981' }
                        ]}
                    />

                    {/* Faxina */}
                    <ChartSection
                        title="FAXINA"
                        data={statsData.faxina}
                        color="bg-cyan-500"
                        bars={[
                            { key: 'count', label: 'Total de Serviços', color: '#06b6d4' }
                        ]}
                    />

                    {/* Sobreaviso */}
                    <ChartSection
                        title="SOBREAVISO"
                        data={statsData.sobreaviso}
                        color="bg-amber-500"
                        bars={[
                            { key: 'count', label: 'Total de Serviços', color: '#f59e0b' }
                        ]}
                    />
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default StatisticsPage;
