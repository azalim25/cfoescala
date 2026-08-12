import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface HorseCompetitor {
  id: string;
  name: string;
  rank: string;
  battalion?: string;
  antiguidade?: number;
  totalExtraHours: number;
  cfo1Hours: number;
  cfo2Hours: number;
  position: number; // 1 to 21
}

interface HorseRaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitors: HorseCompetitor[];
}

const JOCKEY_COLORS = [
  { jacket: '#dc2626', cap: '#f87171', border: '#b91c1c' }, // Red
  { jacket: '#2563eb', cap: '#60a5fa', border: '#1d4ed8' }, // Blue
  { jacket: '#059669', cap: '#34d399', border: '#047857' }, // Emerald
  { jacket: '#d97706', cap: '#fbbf24', border: '#b45309' }, // Amber
  { jacket: '#7c3aed', cap: '#a78bfa', border: '#6d28d9' }, // Purple
  { jacket: '#db2777', cap: '#f472b6', border: '#be185d' }, // Pink
  { jacket: '#0891b2', cap: '#22d3ee', border: '#0e7490' }, // Cyan
  { jacket: '#0d9488', cap: '#2dd4bf', border: '#0f766e' }, // Teal
  { jacket: '#ea580c', cap: '#fb923c', border: '#c2410c' }, // Orange
  { jacket: '#4f46e5', cap: '#818cf8', border: '#4338ca' }, // Indigo
  { jacket: '#65a30d', cap: '#a3e635', border: '#4d7c0f' }, // Lime
  { jacket: '#e11d48', cap: '#fb7185', border: '#be123c' }, // Rose
  { jacket: '#0284c7', cap: '#38bdf8', border: '#0369a1' }, // Sky
  { jacket: '#ca8a04', cap: '#facc15', border: '#a16207' }, // Yellow
  { jacket: '#9333ea', cap: '#c084fc', border: '#7e22ce' }, // Violet
  { jacket: '#16a34a', cap: '#4ade80', border: '#15803d' }, // Green
  { jacket: '#c026d3', cap: '#e879f9', border: '#a21caf' }, // Fuchsia
  { jacket: '#1d4ed8', cap: '#93c5fd', border: '#1e40af' }, // Royal Blue
  { jacket: '#c2410c', cap: '#fdba74', border: '#9a3412' }, // Dark Orange
  { jacket: '#3730a3', cap: '#a5b4fc', border: '#312e81' }, // Deep Indigo
  { jacket: '#14532d', cap: '#86efac', border: '#166534' }, // Forest
];

// Rich Animated Galloping Horse Component
const GallopingHorse: React.FC<{ isRunning: boolean; colorIndex: number }> = ({ isRunning, colorIndex }) => {
  const colors = JOCKEY_COLORS[colorIndex % JOCKEY_COLORS.length];

  return (
    <div className="relative flex items-center select-none pointer-events-none">
      <svg
        viewBox="0 0 100 55"
        className={`w-14 h-8 sm:w-16 sm:h-9 drop-shadow-md transition-transform ${
          isRunning ? 'animate-horse-gallop' : ''
        }`}
      >
        {/* Ground shadow */}
        <ellipse cx="50" cy="52" rx="30" ry="3" fill="rgba(0,0,0,0.25)" />

        {/* Horse Legs & Body */}
        <g fill="#5c3826">
          {/* Back Legs */}
          <path
            d={isRunning ? "M24 32 L12 48 L8 46 L18 30 Z" : "M24 32 L16 48 L12 46 L20 30 Z"}
            fill="#422517"
            className={isRunning ? "animate-horse-backleg" : ""}
          />
          <path
            d={isRunning ? "M30 32 L22 48 L18 46 L26 30 Z" : "M28 32 L24 48 L20 46 L26 30 Z"}
            fill="#5c3826"
          />

          {/* Torso */}
          <ellipse cx="44" cy="30" rx="22" ry="11" fill="#6d4229" />

          {/* Front Legs */}
          <path
            d={isRunning ? "M58 32 L70 48 L74 46 L64 30 Z" : "M56 32 L62 48 L66 46 L60 30 Z"}
            fill="#422517"
            className={isRunning ? "animate-horse-frontleg" : ""}
          />
          <path
            d={isRunning ? "M64 32 L76 46 L80 44 L68 30 Z" : "M62 32 L66 46 L70 44 L64 30 Z"}
            fill="#6d4229"
          />

          {/* Neck & Head */}
          <path d="M58 28 L74 12 L84 17 L70 34 Z" fill="#6d4229" />
          <polygon points="80,11 92,15 86,22 74,17" fill="#6d4229" />
          {/* Ears */}
          <polygon points="78,9 81,4 83,10" fill="#422517" />
          {/* Mane */}
          <path d="M62 24 L72 10 L75 13 L65 27 Z" fill="#26140b" />
          {/* Tail */}
          <path
            d={isRunning ? "M22 28 Q4 22 8 40 Q16 34 24 32 Z" : "M22 28 Q10 30 14 42 Q18 36 24 32 Z"}
            fill="#26140b"
            className={isRunning ? "animate-horse-tail" : ""}
          />
          {/* Eye */}
          <circle cx="84" cy="14" r="1.2" fill="#0f172a" />
          {/* Reins */}
          <path d="M86 18 L64 24" stroke="#e2e8f0" strokeWidth="1" fill="none" opacity="0.8" />
        </g>

        {/* Saddle Blanket */}
        <rect x="36" y="22" width="16" height="10" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
        <rect x="38" y="24" width="12" height="6" rx="1.5" fill={colors.jacket} />

        {/* Jockey Rider */}
        <g>
          {/* Body */}
          <path d="M40 18 L48 12 L54 20 L45 22 Z" fill={colors.jacket} />
          {/* Helmet & Head */}
          <circle cx="50" cy="8" r="4" fill="#f8fafc" />
          <path d="M47 6 Q50 3 54 6 L56 8 L46 8 Z" fill={colors.cap} />
          <polygon points="54,7 58,8 55,10" fill="#0f172a" />
          {/* Arms & Hands */}
          <path d="M44 16 L54 20 L64 24" stroke={colors.jacket} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="64" cy="24" r="1.5" fill="#fcd34d" />
        </g>
      </svg>

      {/* Dust particles while running */}
      {isRunning && (
        <div className="absolute -left-2 bottom-0 animate-pulse text-[8px] opacity-80 select-none">
          💨
        </div>
      )}
    </div>
  );
};

export const HorseRaceModal: React.FC<HorseRaceModalProps> = ({ isOpen, onClose, competitors }) => {
  const [raceStatus, setRaceStatus] = useState<'idle' | 'countdown' | 'running' | 'finished'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [raceSpeed, setRaceSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'track' | 'podium' | 'table'>('track');
  const [viewOrdering, setViewOrdering] = useState<'antiguidade' | 'ranking'>('antiguidade');
  const [searchFilter, setSearchFilter] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Dynamic race progress for each horse (0 to 1)
  const [horseProgress, setHorseProgress] = useState<Record<string, number>>({});
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 1. Initial order: Sorted strictly by ANTIGUIDADE (1 to 21)
  const competitorsByAntiguidade = useMemo(() => {
    return [...competitors].sort((a, b) => (a.antiguidade || 999) - (b.antiguidade || 999));
  }, [competitors]);

  // 2. Ranking order: Sorted by TOTAL EXTRA HOURS (1st to 21st)
  const competitorsByRanking = useMemo(() => {
    return [...competitors].sort((a, b) => {
      if (b.totalExtraHours !== a.totalExtraHours) {
        return b.totalExtraHours - a.totalExtraHours;
      }
      return (a.antiguidade || 999) - (b.antiguidade || 999);
    });
  }, [competitors]);

  // Maximum hours for 100% track distance normalization
  const maxHours = useMemo(() => {
    return Math.max(...competitors.map(c => c.totalExtraHours), 1);
  }, [competitors]);

  // Target final distance across the track for each horse
  // 1st place reaches ~92% (just past the finish line), others proportional (min ~22%)
  const targetPositions = useMemo(() => {
    const map: Record<string, number> = {};
    competitors.forEach(c => {
      const ratio = c.totalExtraHours / maxHours;
      map[c.id] = Math.max(0.18, Math.min(0.92, ratio * 0.92));
    });
    return map;
  }, [competitors, maxHours]);

  // Reset to initial gate state
  const resetToGates = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setRaceStatus('idle');
    setCountdown(3);
    setViewOrdering('antiguidade');

    const initial: Record<string, number> = {};
    competitors.forEach(c => { initial[c.id] = 0; });
    setHorseProgress(initial);
  };

  // Start the countdown & race
  const startRace = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setRaceStatus('countdown');
    setCountdown(3);
    setActiveTab('track');
    setViewOrdering('antiguidade');

    const initial: Record<string, number> = {};
    competitors.forEach(c => { initial[c.id] = 0; });
    setHorseProgress(initial);
  };

  // Countdown timer effect
  useEffect(() => {
    if (raceStatus !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 750 / raceSpeed);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished -> Start Running!
      setRaceStatus('running');
      startTimeRef.current = performance.now();
    }
  }, [raceStatus, countdown, raceSpeed]);

  // Animation Loop during race
  useEffect(() => {
    if (raceStatus !== 'running') return;

    const baseDuration = 7000 / raceSpeed; // Total race time in ms

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / baseDuration, 1);

      // Smooth custom ease-out with dramatic race tension
      const easeOut = 1 - Math.pow(1 - t, 2.8);

      const currentMap: Record<string, number> = {};

      competitors.forEach((c, idx) => {
        const finalTarget = targetPositions[c.id] || 0.5;

        // Dynamic exciting surges during middle of the race (t between 0.15 and 0.85)
        const surge = (t > 0.1 && t < 0.88)
          ? Math.sin(t * Math.PI * 4 + idx * 1.7) * 0.05 * (1 - t)
          : 0;

        const currentPos = finalTarget * easeOut + surge;
        currentMap[c.id] = Math.max(0, Math.min(finalTarget, currentPos));
      });

      setHorseProgress(currentMap);

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Race finished! Settle exact final positions
        const finalMap: Record<string, number> = {};
        competitors.forEach(c => { finalMap[c.id] = targetPositions[c.id]; });
        setHorseProgress(finalMap);
        setRaceStatus('finished');
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [raceStatus, raceSpeed, competitors, targetPositions]);

  // Modal open/close reset
  useEffect(() => {
    if (isOpen) {
      resetToGates();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setRaceStatus('idle');
    }
  }, [isOpen]);

  // Displayed competitors list depending on active viewOrdering
  const displayedCompetitors = useMemo(() => {
    const list = (raceStatus === 'finished' && viewOrdering === 'ranking')
      ? competitorsByRanking
      : competitorsByAntiguidade;

    if (!searchFilter.trim()) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.rank.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [raceStatus, viewOrdering, competitorsByRanking, competitorsByAntiguidade, searchFilter]);

  // Top 3 for podium
  const top3 = useMemo(() => {
    return competitorsByRanking.slice(0, 3);
  }, [competitorsByRanking]);

  if (!isOpen) return null;

  const isFinished = raceStatus === 'finished';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden max-h-[96vh] ring-1 ring-white/10">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/10">
              🏇
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                  Grande Prêmio de Horas Extras
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 uppercase font-black">
                    CFO
                  </span>
                </h2>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {isFinished ? 'Classificação Final Revelada!' : 'Ordem de Largada por Antiguidade • 21 Cadetes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tab Buttons */}
            <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setActiveTab('track')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'track' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">flag</span>
                Pista
              </button>
              <button
                onClick={() => setActiveTab('podium')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'podium' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">emoji_events</span>
                Pódio
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">leaderboard</span>
                Tabela
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 flex items-center justify-center transition-colors border border-slate-700"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Live Race Controls & Toolbar */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Start / Replay Button */}
            <button
              onClick={startRace}
              disabled={raceStatus === 'countdown' || raceStatus === 'running'}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 ${
                raceStatus === 'idle'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20 animate-pulse'
                  : raceStatus === 'finished'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {raceStatus === 'finished' ? 'replay' : 'play_arrow'}
              </span>
              {raceStatus === 'idle' && 'Iniciar Corrida'}
              {raceStatus === 'countdown' && 'Preparando...'}
              {raceStatus === 'running' && 'Correndo...'}
              {raceStatus === 'finished' && 'Correr Novamente'}
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700 text-[10px] font-black">
              {[1, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setRaceSpeed(speed)}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    raceSpeed === speed ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Toggle Ordering (Only available after race finishes) */}
            {isFinished && (
              <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-[10px] font-black">
                <button
                  onClick={() => setViewOrdering('antiguidade')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    viewOrdering === 'antiguidade' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ordem de Baias
                </button>
                <button
                  onClick={() => setViewOrdering('ranking')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    viewOrdering === 'ranking' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏆 Ordem de Chegada
                </button>
              </div>
            )}

            {/* Status Pill */}
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
              raceStatus === 'running'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                : isFinished
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {raceStatus === 'idle' && '🚦 Aguardando Largada'}
              {raceStatus === 'countdown' && '🚦 Atenção...'}
              {raceStatus === 'running' && '🏇 Corrida em Andamento!'}
              {isFinished && '🏁 Corrida Finalizada!'}
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative w-44 sm:w-56">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar militar..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-primary transition-all font-semibold"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4 relative">

          {/* Large Countdown Overlay */}
          {raceStatus === 'countdown' && (
            <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-150">
              <div className="w-32 h-32 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center text-6xl font-black text-amber-300 shadow-2xl shadow-amber-500/40 animate-pulse">
                {countdown > 0 ? countdown : '🚩'}
              </div>
              <p className="text-base sm:text-xl font-black text-white uppercase tracking-widest mt-4">
                {countdown > 0 ? 'PREPARAR PARA A LARGADA...' : 'LARGADA! 🏁'}
              </p>
            </div>
          )}

          {/* Tab 1: Race Track Arena */}
          {activeTab === 'track' && (
            <div className="space-y-4">
              
              {/* Winner Announcement Banner (Only when finished) */}
              {isFinished && top3[0] && (
                <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-2 border-amber-500/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl shadow-amber-500/10 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl sm:text-4xl animate-bounce">🏆</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-md border border-amber-400/30">
                          1º Lugar • Campeão
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-2xl font-black text-white">
                        {top3[0].rank} {top3[0].name}
                      </h3>
                      <p className="text-xs text-amber-200/90 font-bold">
                        Vencedor do Grande Prêmio com <strong className="text-amber-400 text-sm">{top3[0].totalExtraHours.toFixed(1)}h</strong> extras acumuladas!
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('podium')}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base font-black">emoji_events</span>
                      Ver Pódio
                    </button>
                    <button
                      onClick={() => setActiveTab('table')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">leaderboard</span>
                      Classificação Completa
                    </button>
                  </div>
                </div>
              )}

              {/* Racetrack Turf Field */}
              <div className="bg-[#1b4324] dark:bg-[#112d17] border-4 border-[#2d6139] rounded-2xl p-2 sm:p-4 shadow-2xl relative overflow-hidden">
                
                {/* Turf Grass Patterns */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(45deg,#000_0,#000_20px,transparent_20px,transparent_40px)]"></div>

                {/* Track Header / Distance Markers */}
                <div className="relative flex justify-between items-center text-[9px] sm:text-[11px] font-black uppercase text-emerald-300/80 px-2 sm:px-6 py-2 border-b border-emerald-600/40 mb-2">
                  <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                    PORTÃO DE LARGADA
                  </span>
                  <div className="flex gap-8 sm:gap-16 opacity-60">
                    <span className="hidden sm:inline">250m</span>
                    <span className="hidden sm:inline">500m</span>
                    <span className="hidden sm:inline">750m</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-amber-300 font-black">
                    🏁 LINHA DE CHEGADA
                  </span>
                </div>

                {/* Finish Line Checkered Pattern Bar */}
                <div className="absolute top-0 right-8 sm:right-16 bottom-0 w-3.5 sm:w-4 bg-[repeating-linear-gradient(0deg,#fff_0,#fff_8px,#000_8px,#000_16px)] opacity-70 z-10 pointer-events-none shadow-lg"></div>

                {/* 21 Lanes */}
                <div className="space-y-1.5 relative z-20">
                  {displayedCompetitors.map((c, index) => {
                    const prog = horseProgress[c.id] || 0;
                    const isPodium = isFinished && c.position <= 3;
                    const isSelected = highlightedId === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setHighlightedId(c.id === highlightedId ? null : c.id)}
                        className={`relative rounded-xl border transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400 shadow-lg'
                            : isPodium
                            ? 'bg-slate-900/85 border-amber-500/40 hover:border-amber-400/70'
                            : 'bg-slate-900/65 border-emerald-800/40 hover:bg-slate-900/90'
                        }`}
                      >
                        {/* Lane Track Box */}
                        <div className="h-11 sm:h-13 flex items-center relative overflow-hidden px-2">
                          
                          {/* Lane Tag (Left) - Shows Antiguidade / Baia before finish, Position ONLY after finish */}
                          <div className="absolute left-1.5 sm:left-2 z-20 flex items-center gap-1.5 sm:gap-2 bg-slate-950/95 px-2 py-1 rounded-lg border border-slate-700/80 shadow-md">
                            
                            {/* Badge Number */}
                            {isFinished ? (
                              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 ${
                                c.position === 1
                                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 font-black'
                                  : c.position === 2
                                  ? 'bg-slate-300 text-slate-950 font-black'
                                  : c.position === 3
                                  ? 'bg-amber-700 text-white font-black'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {c.position}º
                              </span>
                            ) : (
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-black text-[10px] sm:text-xs bg-slate-800 text-slate-300 shrink-0">
                                #{c.antiguidade || (index + 1)}
                              </span>
                            )}

                            {/* Name & Hours (Hours only revealed when finished) */}
                            <div className="flex flex-col">
                              <span className="text-[11px] sm:text-xs font-black text-white truncate max-w-[90px] sm:max-w-[140px] leading-tight">
                                {c.name}
                              </span>
                              {isFinished ? (
                                <span className="text-[8px] sm:text-[9px] font-black text-amber-400 uppercase leading-none">
                                  {c.totalExtraHours.toFixed(1)}h
                                </span>
                              ) : (
                                <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase leading-none">
                                  Baia {String(c.antiguidade || (index + 1)).padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress Line Track */}
                          <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                            <div className="w-full h-1 bg-emerald-950/60 rounded-full"></div>
                          </div>

                          {/* Animated Horse Container */}
                          <div
                            className="absolute z-30 transition-all ease-linear"
                            style={{
                              left: `${prog * 100}%`,
                              transform: 'translateX(0%)',
                              transitionDuration: raceStatus === 'running' ? '120ms' : '300ms'
                            }}
                          >
                            <GallopingHorse
                              isRunning={raceStatus === 'running'}
                              colorIndex={(c.antiguidade || (index + 1)) - 1}
                            />
                          </div>

                          {/* Finish Gate Indicator (Only revealed when finished) */}
                          {isFinished && (
                            <div className="absolute right-1.5 sm:right-2 z-20 text-[10px] sm:text-xs font-black text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded border border-amber-500/40 shadow-md">
                              {c.totalExtraHours.toFixed(1)}h
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Podium Celebration */}
          {activeTab === 'podium' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-1">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                  Grande Prêmio de Horas Extras
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Pódio dos Campeões
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Os 3 cadetes com maior acúmulo de horas extras (CFO I + CFO II)
                </p>
              </div>

              {/* 3D-Style Podium Display */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto items-end pt-10 pb-4">
                
                {/* 2nd Place (Silver) */}
                {top3[1] && (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-2xl sm:text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🥈</div>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-300 text-slate-950 font-black text-lg sm:text-2xl flex items-center justify-center border-4 border-slate-100 shadow-xl shadow-slate-300/20">
                      2º
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-sm sm:text-base text-white">{top3[1].name}</p>
                      <p className="text-xs font-black text-slate-300">{top3[1].totalExtraHours.toFixed(1)}h</p>
                    </div>
                    <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-2xl border-t-4 border-slate-300 flex items-center justify-center shadow-lg">
                      <span className="text-3xl sm:text-5xl font-black text-slate-900/40">2</span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold) */}
                {top3[0] && (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-3xl sm:text-5xl animate-bounce">👑</div>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-2xl sm:text-3xl flex items-center justify-center border-4 border-yellow-200 shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/20">
                      1º
                    </div>
                    <div className="text-center">
                      <p className="font-black text-base sm:text-xl text-amber-300">{top3[0].name}</p>
                      <p className="text-sm font-black text-yellow-400">{top3[0].totalExtraHours.toFixed(1)}h</p>
                    </div>
                    <div className="w-full h-36 sm:h-48 bg-gradient-to-t from-amber-700 via-amber-600 to-yellow-500 rounded-t-2xl border-t-4 border-yellow-300 flex items-center justify-center shadow-2xl shadow-amber-500/20">
                      <span className="text-4xl sm:text-6xl font-black text-amber-950/40">1</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] && (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-2xl sm:text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>🥉</div>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-700 text-amber-100 font-black text-lg sm:text-2xl flex items-center justify-center border-4 border-amber-600 shadow-xl shadow-amber-700/20">
                      3º
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-sm sm:text-base text-white">{top3[2].name}</p>
                      <p className="text-xs font-black text-amber-400">{top3[2].totalExtraHours.toFixed(1)}h</p>
                    </div>
                    <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-amber-900 to-amber-700 rounded-t-2xl border-t-4 border-amber-600 flex items-center justify-center shadow-lg">
                      <span className="text-3xl sm:text-5xl font-black text-amber-950/40">3</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setActiveTab('track')}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
                >
                  Voltar para a Pista de Corrida
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Detailed Table */}
          {activeTab === 'table' && (
            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
                <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-base">format_list_numbered</span>
                  Classificação Geral dos 21 Militares
                </h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Total: {competitors.length} cadetes
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 text-center w-12">Pos.</th>
                      <th className="py-3 px-4">Militar</th>
                      <th className="py-3 px-4 text-center">Antiguidade</th>
                      <th className="py-3 px-4 text-right">CFO I (Acumulado)</th>
                      <th className="py-3 px-4 text-right">CFO II (Registro)</th>
                      <th className="py-3 px-4 text-right">Total Horas Extras</th>
                      <th className="py-3 px-4 text-right">Diferença p/ Líder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {competitorsByRanking.map((c, idx) => {
                      const diffToLeader = competitorsByRanking[0].totalExtraHours - c.totalExtraHours;

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            idx === 0 ? 'bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex w-6 h-6 items-center justify-center rounded-md font-black text-[10px] ${
                              idx === 0 ? 'bg-amber-400 text-slate-950' :
                              idx === 1 ? 'bg-slate-300 text-slate-950' :
                              idx === 2 ? 'bg-amber-700 text-white' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}º
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{c.rank} {c.name}</span>
                              {idx === 0 && <span className="text-xs">🏆</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400 font-mono">
                            #{c.antiguidade || '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 font-mono">
                            {c.cfo1Hours.toFixed(1)}h
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 font-mono">
                            {c.cfo2Hours.toFixed(1)}h
                          </td>
                          <td className="py-3 px-4 text-right font-black text-amber-400 font-mono text-sm">
                            {c.totalExtraHours.toFixed(1)}h
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                            {diffToLeader === 0 ? 'Líder' : `-${diffToLeader.toFixed(1)}h`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HorseRaceModal;
