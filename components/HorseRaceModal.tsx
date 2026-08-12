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
  position: number;
}

interface HorseRaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitors: HorseCompetitor[];
}

const JOCKEY_COLORS = [
  { jacket: '#ef4444', cap: '#fca5a5' }, // Red
  { jacket: '#3b82f6', cap: '#93c5fd' }, // Blue
  { jacket: '#10b981', cap: '#6ee7b7' }, // Emerald
  { jacket: '#f59e0b', cap: '#fde68a' }, // Amber
  { jacket: '#8b5cf6', cap: '#c4b5fd' }, // Purple
  { jacket: '#ec4899', cap: '#fbcfe8' }, // Pink
  { jacket: '#06b6d4', cap: '#a5f3fc' }, // Cyan
  { jacket: '#14b8a6', cap: '#99f6e4' }, // Teal
  { jacket: '#f97316', cap: '#fed7aa' }, // Orange
  { jacket: '#6366f1', cap: '#c7d2fe' }, // Indigo
  { jacket: '#84cc16', cap: '#d9f99d' }, // Lime
  { jacket: '#e11d48', cap: '#fecdd3' }, // Rose
  { jacket: '#0284c7', cap: '#bae6fd' }, // Sky
  { jacket: '#d97706', cap: '#fef3c7' }, // Yellow-amber
  { jacket: '#7c3aed', cap: '#ddd6fe' }, // Violet
  { jacket: '#059669', cap: '#a7f3d0' }, // Dark green
  { jacket: '#db2777', cap: '#fbcfe8' }, // Fuchsia
  { jacket: '#2563eb', cap: '#bfdbfe' }, // Royal Blue
  { jacket: '#ea580c', cap: '#ffedd5' }, // Dark Orange
  { jacket: '#4f46e5', cap: '#e0e7ff' }, // Deep Indigo
  { jacket: '#16a34a', cap: '#bbf7d0' }, // Forest Green
];

// Animated Horse SVG Component
const AnimatedHorseSVG: React.FC<{ isRunning: boolean; colorIndex: number }> = ({ isRunning, colorIndex }) => {
  const colors = JOCKEY_COLORS[colorIndex % JOCKEY_COLORS.length];

  return (
    <div className="relative flex items-center select-none pointer-events-none">
      <svg
        viewBox="0 0 120 70"
        className={`w-14 h-9 sm:w-20 sm:h-12 drop-shadow-md transition-transform ${
          isRunning ? 'animate-horse-gallop' : ''
        }`}
      >
        {/* Shadow */}
        <ellipse cx="60" cy="65" rx="35" ry="4" fill="rgba(0,0,0,0.18)" />

        {/* Horse Body */}
        <g fill="#6d4c41">
          {/* Back Legs */}
          <path
            d={isRunning ? "M30 40 L18 62 L12 60 L24 38 Z" : "M30 40 L22 62 L16 60 L26 38 Z"}
            fill="#54382e"
            className={isRunning ? "animate-horse-backleg" : ""}
          />
          <path
            d={isRunning ? "M36 40 L28 62 L22 60 L32 38 Z" : "M34 40 L30 62 L24 60 L30 38 Z"}
            fill="#6d4c41"
          />

          {/* Main Torso */}
          <ellipse cx="52" cy="38" rx="26" ry="14" fill="#6d4c41" />

          {/* Front Legs */}
          <path
            d={isRunning ? "M68 40 L82 62 L88 60 L74 38 Z" : "M66 40 L72 62 L78 60 L70 38 Z"}
            fill="#54382e"
            className={isRunning ? "animate-horse-frontleg" : ""}
          />
          <path
            d={isRunning ? "M74 40 L88 60 L94 58 L78 38 Z" : "M72 40 L76 60 L82 58 L74 38 Z"}
            fill="#7b5548"
          />

          {/* Neck & Head */}
          <path d="M68 36 L86 16 L98 22 L82 44 Z" fill="#6d4c41" />
          <polygon points="94,14 108,20 102,28 88,22" fill="#6d4c41" />

          {/* Ears */}
          <polygon points="92,12 96,6 98,14" fill="#54382e" />

          {/* Mane */}
          <path d="M72 30 L84 14 L88 18 L76 34 Z" fill="#2d1b15" />

          {/* Tail */}
          <path
            d={isRunning ? "M26 34 Q8 26 12 48 Q20 40 28 38 Z" : "M26 34 Q14 36 18 52 Q24 44 28 38 Z"}
            fill="#2d1b15"
            className={isRunning ? "animate-horse-tail" : ""}
          />

          {/* Muzzle & Reins */}
          <circle cx="106" cy="22" r="2" fill="#3e2723" />
          <path d="M102 24 L76 32" stroke="#d7ccc8" strokeWidth="1.2" fill="none" />
        </g>

        {/* Saddle & Blanket */}
        <rect x="42" y="27" width="18" height="12" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <rect x="44" y="29" width="14" height="8" rx="2" fill={colors.jacket} />

        {/* Jockey Rider */}
        <g>
          {/* Body */}
          <path d="M46 22 L56 16 L62 26 L52 28 Z" fill={colors.jacket} />
          {/* Head & Helmet */}
          <circle cx="58" cy="12" r="5" fill="#f8fafc" />
          <path d="M54 10 Q58 6 63 10 L65 12 L53 12 Z" fill={colors.cap} />
          <polygon points="63,11 68,12 64,14" fill="#0f172a" />
          {/* Arms */}
          <path d="M52 20 L64 24 L76 30" stroke={colors.jacket} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="76" cy="30" r="2" fill="#fcd34d" />
        </g>
      </svg>

      {/* Dust particles when running */}
      {isRunning && (
        <div className="absolute -left-3 bottom-0 flex gap-1 animate-pulse">
          <span className="text-[10px] opacity-70">💨</span>
        </div>
      )}
    </div>
  );
};

export const HorseRaceModal: React.FC<HorseRaceModalProps> = ({ isOpen, onClose, competitors }) => {
  const [raceStatus, setRaceStatus] = useState<'idle' | 'countdown' | 'running' | 'finished'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [raceSpeed, setRaceSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'track' | 'podium' | 'table'>('track');
  const [searchFilter, setSearchFilter] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Dynamic race progress for each horse (0 to 1)
  const [horseProgress, setHorseProgress] = useState<Record<string, number>>({});
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Maximum hours for 100% track distance normalization
  const maxHours = useMemo(() => {
    return Math.max(...competitors.map(c => c.totalExtraHours), 1);
  }, [competitors]);

  // Target normalized final position for each horse (scaled between 30% and 94% of the track)
  const targetPositions = useMemo(() => {
    const map: Record<string, number> = {};
    competitors.forEach(c => {
      // Leader reaches 93%, lowest gets proportional space (min 20%)
      const ratio = c.totalExtraHours / maxHours;
      map[c.id] = Math.max(0.18, Math.min(0.93, ratio * 0.93));
    });
    return map;
  }, [competitors, maxHours]);

  // Reset or Start Countdown
  const startRace = () => {
    setRaceStatus('countdown');
    setCountdown(3);
    setActiveTab('track');
    
    // Reset positions to starting gates
    const initial: Record<string, number> = {};
    competitors.forEach(c => { initial[c.id] = 0.02; });
    setHorseProgress(initial);
  };

  // Countdown timer logic
  useEffect(() => {
    if (raceStatus !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 700 / raceSpeed);
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

    const baseDuration = 6500 / raceSpeed; // Total race time in ms

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const t = Math.min(elapsed / baseDuration, 1);

      // Smooth cubic ease out with slight natural fluctuating surge for excitement
      const easeOut = 1 - Math.pow(1 - t, 2.5);

      const currentProg: Record<string, number> = {};
      competitors.forEach((c, idx) => {
        const finalTarget = targetPositions[c.id] || 0.5;
        // Natural gallop fluctuation surge during middle of race (t < 0.85)
        const fluctuation = (t < 0.88)
          ? Math.sin(t * Math.PI * 4 + idx * 1.5) * 0.04 * (1 - t)
          : 0;

        const p = 0.02 + (finalTarget - 0.02) * easeOut + fluctuation;
        currentProg[c.id] = Math.max(0.02, Math.min(finalTarget, p));
      });

      setHorseProgress(currentProg);

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Race finished!
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

  // Reset race when modal opens
  useEffect(() => {
    if (isOpen) {
      startRace();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setRaceStatus('idle');
    }
  }, [isOpen]);

  // Filtered Competitors for search
  const filteredCompetitors = useMemo(() => {
    if (!searchFilter.trim()) return competitors;
    return competitors.filter(c =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.rank.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [competitors, searchFilter]);

  // Top 3 for podium
  const top3 = useMemo(() => {
    return competitors.slice(0, 3);
  }, [competitors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 text-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden max-h-[95vh] ring-1 ring-white/10">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-lg shadow-amber-500/10">
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
                CFO I - Acumulado + CFO II - Registro de Horas • {competitors.length} Militares
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tab Buttons */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs font-bold">
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

        {/* Live Race Control & Toolbar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={startRace}
              disabled={raceStatus === 'countdown' || raceStatus === 'running'}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">
                {raceStatus === 'finished' ? 'replay' : 'play_arrow'}
              </span>
              {raceStatus === 'finished' ? 'Reiniciar Corrida' : (raceStatus === 'running' ? 'Correndo...' : 'Iniciar Corrida')}
            </button>

            {/* Speed selector */}
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

            {/* Status pill */}
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
              raceStatus === 'running'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                : raceStatus === 'finished'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {raceStatus === 'countdown' && '🚦 Preparar...'}
              {raceStatus === 'running' && '🏇 Em Andamento!'}
              {raceStatus === 'finished' && '🏁 Corrida Finalizada!'}
              {raceStatus === 'idle' && 'Pronto'}
            </span>
          </div>

          {/* Quick Search in modal */}
          <div className="relative w-48 sm:w-60">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Destacar militar..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-primary transition-all font-semibold"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">

          {/* Tab 1: Race Track Arena */}
          {activeTab === 'track' && (
            <div className="space-y-4">
              {/* Winner Announcement Banner */}
              {raceStatus === 'finished' && top3[0] && (
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
                        Liderança absoluta com <strong className="text-amber-400">{top3[0].totalExtraHours.toFixed(1)}h</strong> extras acumuladas!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('podium')}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base font-black">emoji_events</span>
                    Ver Pódio Completo
                  </button>
                </div>
              )}

              {/* Racetrack Turf Field */}
              <div className="bg-[#1b4324] dark:bg-[#13331b] border-4 border-[#2f663c] rounded-2xl p-2 sm:p-4 shadow-2xl relative overflow-hidden">
                
                {/* Turf Grass Patterns */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(45deg,#000_0,#000_20px,transparent_20px,transparent_40px)]"></div>

                {/* Track Headers & Distance Markers */}
                <div className="relative flex justify-between items-center text-[9px] sm:text-[11px] font-black uppercase text-emerald-300/80 px-2 sm:px-6 py-2 border-b border-emerald-600/40 mb-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> BAIAS DE LARGADA
                  </span>
                  <div className="flex gap-8 sm:gap-16">
                    <span className="hidden sm:inline opacity-60">250m (25%)</span>
                    <span className="hidden sm:inline opacity-60">500m (50%)</span>
                    <span className="hidden sm:inline opacity-60">750m (75%)</span>
                  </div>
                  <span className="flex items-center gap-1 text-amber-300 font-black">
                    🏁 LINHA DE CHEGADA
                  </span>
                </div>

                {/* Finish Line Checkered Pattern Bar */}
                <div className="absolute top-0 right-10 sm:right-16 bottom-0 w-3 sm:w-4 bg-[repeating-linear-gradient(0deg,#fff_0,#fff_8px,#000_8px,#000_16px)] opacity-70 z-10 pointer-events-none shadow-lg"></div>

                {/* 21 Lanes */}
                <div className="space-y-1.5 relative z-20">
                  {filteredCompetitors.map((c, index) => {
                    const prog = horseProgress[c.id] || 0.02;
                    const isPodium = c.position <= 3;
                    const isSelected = highlightedId === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setHighlightedId(c.id === highlightedId ? null : c.id)}
                        className={`relative rounded-xl border transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400 shadow-lg'
                            : isPodium
                            ? 'bg-slate-900/80 border-amber-500/30 hover:border-amber-400/60'
                            : 'bg-slate-900/60 border-emerald-800/40 hover:bg-slate-900/90'
                        }`}
                      >
                        {/* Lane Track */}
                        <div className="h-12 sm:h-14 flex items-center relative overflow-hidden px-2">
                          
                          {/* Lane Number & Info Badge (Left) */}
                          <div className="absolute left-2 z-20 flex items-center gap-1.5 sm:gap-2 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-700/80 shadow-md">
                            <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-black text-[10px] sm:text-xs ${
                              c.position === 1
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                                : c.position === 2
                                ? 'bg-slate-300 text-slate-950'
                                : c.position === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {c.position}º
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[11px] sm:text-xs font-black text-white truncate max-w-[90px] sm:max-w-[140px] leading-tight">
                                {c.name}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-bold text-amber-400 uppercase leading-none">
                                {c.totalExtraHours.toFixed(1)}h
                              </span>
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
                              transform: 'translateX(-50%)',
                              transitionDuration: raceStatus === 'running' ? '120ms' : '400ms'
                            }}
                          >
                            <AnimatedHorseSVG
                              isRunning={raceStatus === 'running'}
                              colorIndex={index}
                            />
                          </div>

                          {/* Finish Gate Indicator */}
                          <div className="absolute right-2 z-20 text-[10px] sm:text-xs font-black text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700">
                            {c.totalExtraHours.toFixed(1)}h
                          </div>
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
                      <th className="py-3 px-4 text-right">CFO I (Acumulado)</th>
                      <th className="py-3 px-4 text-right">CFO II (Horas Extras)</th>
                      <th className="py-3 px-4 text-right">Total Horas Extras</th>
                      <th className="py-3 px-4 text-right">Diferença p/ Líder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {competitors.map((c) => {
                      const diffToLeader = competitors[0].totalExtraHours - c.totalExtraHours;

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            c.position === 1 ? 'bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex w-6 h-6 items-center justify-center rounded-md font-black text-[10px] ${
                              c.position === 1 ? 'bg-amber-400 text-slate-950' :
                              c.position === 2 ? 'bg-slate-300 text-slate-950' :
                              c.position === 3 ? 'bg-amber-700 text-white' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {c.position}º
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{c.rank} {c.name}</span>
                              {c.position === 1 && <span className="text-xs">🏆</span>}
                            </div>
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
