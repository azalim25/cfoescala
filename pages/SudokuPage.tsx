import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { supabase } from '../supabase';

type Difficulty = 'facil' | 'medio' | 'dificil';

interface SudokuScore {
  id: string;
  militaryId: string;
  militaryName: string;
  rank: string;
  difficulty: Difficulty;
  timeSeconds: number;
  createdAt: string;
}

// Sudoku helper functions (Generator & Solver)
const isValidMove = (board: number[][], row: number, col: number, num: number): boolean => {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num && i !== col) return false;
    if (board[i][col] === num && i !== row) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const curR = startRow + r;
      const curC = startCol + c;
      if (board[curR][curC] === num && (curR !== row || curC !== col)) return false;
    }
  }
  return true;
};

const solveSudoku = (board: number[][]): boolean => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
          if (isValidMove(board, r, c, num)) {
            board[r][c] = num;
            if (solveSudoku(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

const generateSudokuBoard = (difficulty: Difficulty) => {
  const solved: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveSudoku(solved);

  // Deep copy for initial puzzle grid
  const puzzle: number[][] = solved.map(row => [...row]);

  // Determine filled cells count based on difficulty
  const filledCount = difficulty === 'facil' ? 38 : difficulty === 'medio' ? 30 : 24;
  const totalToRemove = 81 - filledCount;

  let removed = 0;
  while (removed < totalToRemove) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }

  const initialFixed: boolean[][] = puzzle.map(row => row.map(cell => cell !== 0));

  return { puzzle, solved, initialFixed };
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const SudokuPage: React.FC = () => {
  const { session } = useAuth();
  const { militaries } = useMilitary();

  const [difficulty, setDifficulty] = useState<Difficulty>('medio');
  const [activeRankingTab, setActiveRankingTab] = useState<Difficulty>('medio');

  const [board, setBoard] = useState<number[][]>([]);
  const [initialFixed, setInitialFixed] = useState<boolean[][]>([]);
  const [solvedBoard, setSolvedBoard] = useState<number[][]>([]);

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionTime, setCompletionTime] = useState<number | null>(null);

  // Scores list (ranking)
  const [scores, setScores] = useState<SudokuScore[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState<boolean>(false);

  // Get logged-in user profile details
  const currentUser = useMemo(() => {
    if (!session?.user) return { id: 'guest', name: 'Militar', rank: 'Cadete' };
    const mil = militaries.find(m => m.id === session.user.id);
    return {
      id: session.user.id,
      name: mil ? `${mil.rank} ${mil.name}` : (session.user.email?.split('@')[0] || 'Militar'),
      rank: mil?.rank || 'Cadete'
    };
  }, [session, militaries]);

  // Load Ranking Scores from Supabase (with localStorage fallback)
  const fetchScores = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const { data, error } = await supabase
        .from('sudoku_scores')
        .select('*')
        .order('time_seconds', { ascending: true });

      if (data && !error) {
        const mapped: SudokuScore[] = data.map(item => ({
          id: item.id,
          militaryId: item.military_id,
          militaryName: item.military_name,
          rank: item.rank || 'Militar',
          difficulty: item.difficulty as Difficulty,
          timeSeconds: Number(item.time_seconds),
          createdAt: item.created_at
        }));
        setScores(mapped);
      } else {
        // Fallback to local storage cache
        const cached = localStorage.getItem('@cfo_sudoku_scores');
        if (cached) setScores(JSON.parse(cached));
      }
    } catch {
      const cached = localStorage.getItem('@cfo_sudoku_scores');
      if (cached) setScores(JSON.parse(cached));
    } finally {
      setIsLoadingScores(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Start new Sudoku Game
  const startNewGame = useCallback((diff: Difficulty = difficulty) => {
    const { puzzle, solved, initialFixed: fixed } = generateSudokuBoard(diff);
    setBoard(puzzle);
    setInitialFixed(fixed);
    setSolvedBoard(solved);
    setSelectedCell(null);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
    setCompletionTime(null);
  }, [difficulty]);

  useEffect(() => {
    startNewGame(difficulty);
  }, [difficulty, startNewGame]);

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && !isPaused && !isCompleted) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isPaused, isCompleted]);

  // Check victory condition
  const checkCompletion = useCallback((currentBoard: number[][]) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoard[r][c] === 0 || !isValidMove(currentBoard, r, c, currentBoard[r][c])) {
          return false;
        }
      }
    }
    return true;
  }, []);

  // Save Record upon victory
  const handleVictory = useCallback(async (finalTime: number) => {
    setIsCompleted(true);
    setIsTimerRunning(false);
    setCompletionTime(finalTime);

    const newScore: SudokuScore = {
      id: `sudoku_${Date.now()}`,
      militaryId: currentUser.id,
      militaryName: currentUser.name,
      rank: currentUser.rank,
      difficulty,
      timeSeconds: finalTime,
      createdAt: new Date().toISOString()
    };

    // Update local state first
    setScores(prev => {
      const updated = [...prev, newScore].sort((a, b) => a.timeSeconds - b.timeSeconds);
      localStorage.setItem('@cfo_sudoku_scores', JSON.stringify(updated));
      return updated;
    });

    // Save to Supabase table
    try {
      await supabase.from('sudoku_scores').insert({
        id: newScore.id,
        military_id: newScore.militaryId,
        military_name: newScore.militaryName,
        rank: newScore.rank,
        difficulty: newScore.difficulty,
        time_seconds: newScore.timeSeconds,
        created_at: newScore.createdAt
      });
    } catch {
      // Ignore Supabase error if table doesn't exist yet
    }
  }, [currentUser, difficulty]);

  // Handle cell number input
  const handleInputNumber = useCallback((num: number) => {
    if (!selectedCell || isCompleted || isPaused) return;
    const { row, col } = selectedCell;
    if (initialFixed[row]?.[col]) return; // Cannot edit initial numbers

    const newBoard = board.map((r, rIdx) =>
      r.map((val, cIdx) => (rIdx === row && cIdx === col ? num : val))
    );
    setBoard(newBoard);

    // Check if fully solved
    if (checkCompletion(newBoard)) {
      handleVictory(timerSeconds);
    }
  }, [selectedCell, isCompleted, isPaused, initialFixed, board, checkCompletion, handleVictory, timerSeconds]);

  // Keyboard navigation & number input listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || isPaused) return;

      if (e.key >= '1' && e.key <= '9') {
        handleInputNumber(parseInt(e.key));
      } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
        handleInputNumber(0);
      } else if (selectedCell) {
        let { row, col } = selectedCell;
        if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
        else if (e.key === 'ArrowDown') row = Math.min(8, row + 1);
        else if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
        else if (e.key === 'ArrowRight') col = Math.min(8, col + 1);

        setSelectedCell({ row, col });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isCompleted, isPaused, handleInputNumber]);

  // Highlight check helpers
  const isSelected = (r: number, c: number) => selectedCell?.row === r && selectedCell?.col === c;

  const isRelated = (r: number, c: number) => {
    if (!selectedCell) return false;
    const sameRow = selectedCell.row === r;
    const sameCol = selectedCell.col === c;
    const sameBlock = Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && Math.floor(selectedCell.col / 3) === Math.floor(c / 3);
    return sameRow || sameCol || sameBlock;
  };

  const isMatchingValue = (r: number, c: number) => {
    if (!selectedCell) return false;
    const selectedVal = board[selectedCell.row]?.[selectedCell.col];
    return selectedVal > 0 && board[r][c] === selectedVal;
  };

  const isConflict = (r: number, c: number) => {
    const val = board[r]?.[c];
    if (!val || initialFixed[r]?.[c]) return false;
    return !isValidMove(board, r, c, val);
  };

  // Filter Scores by Active Ranking Tab
  const rankingList = useMemo(() => {
    return scores
      .filter(s => s.difficulty === activeRankingTab)
      .sort((a, b) => a.timeSeconds - b.timeSeconds);
  }, [scores, activeRankingTab]);

  return (
    <MainLayout activePage="sudoku">
      <MainLayout.Content>
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-200 dark:border-indigo-800">
              <span className="material-symbols-outlined text-3xl">extension</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none">Jogo Sudoku CFO</h1>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Desafio Lógico • 3 Níveis de Dificuldade & Ranking por Tempo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Dificuldade:</span>
            {(['facil', 'medio', 'dificil'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border ${
                  difficulty === d
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {d === 'facil' ? 'Fácil' : d === 'medio' ? 'Médio' : 'Difícil'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Sudoku Board & Virtual Keypad */}
          <div className="lg:col-span-2 space-y-4">
            {/* Top Control Bar with Timer */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-indigo-500 text-2xl">timer</span>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tempo Decorrido</span>
                  <span className="text-2xl font-black font-mono text-slate-800 dark:text-white leading-none">{formatTime(timerSeconds)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(prev => !prev)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">{isPaused ? 'play_arrow' : 'pause'}</span>
                  {isPaused ? 'Continuar' : 'Pausar'}
                </button>
                <button
                  onClick={() => startNewGame(difficulty)}
                  className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 hover:bg-indigo-100 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-900/50 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Novo Jogo
                </button>
              </div>
            </div>

            {/* 9x9 Sudoku Board Container */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg relative">
              {/* Victory Overlay */}
              {isCompleted && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center text-yellow-400 mb-3">
                    <span className="material-symbols-outlined text-4xl">workspace_premium</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-1">
                    SUDOKU CONCLUÍDO! 🎉
                  </h2>
                  <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Dificuldade: <span className="text-yellow-400 font-black">{difficulty.toUpperCase()}</span>
                  </p>
                  <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-xl font-black font-mono text-emerald-400 mb-6">
                    Tempo: {formatTime(completionTime || 0)}
                  </div>
                  <button
                    onClick={() => startNewGame(difficulty)}
                    className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-primary/30 hover:scale-105 transition-all uppercase tracking-widest"
                  >
                    Jogar Novamente
                  </button>
                </div>
              )}

              {/* Pause Overlay */}
              {isPaused && !isCompleted && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in">
                  <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">pause_circle</span>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">JOGO PAUSADO</h3>
                  <button
                    onClick={() => setIsPaused(false)}
                    className="px-6 py-3 bg-primary text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow-lg"
                  >
                    Retomar Partida
                  </button>
                </div>
              )}

              {/* Grid 9x9 */}
              <div className="grid grid-cols-9 gap-0.5 sm:gap-1 max-w-[500px] mx-auto bg-slate-300 dark:bg-slate-700 p-1 rounded-xl border-2 border-slate-400 dark:border-slate-600 shadow-inner">
                {board.map((row, rIdx) =>
                  row.map((val, cIdx) => {
                    const selected = isSelected(rIdx, cIdx);
                    const related = isRelated(rIdx, cIdx);
                    const matching = isMatchingValue(rIdx, cIdx);
                    const conflict = isConflict(rIdx, cIdx);
                    const isFixed = initialFixed[rIdx]?.[cIdx];

                    // 3x3 block borders
                    const borderRight = (cIdx + 1) % 3 === 0 && cIdx < 8 ? 'mr-1 sm:mr-1.5' : '';
                    const borderBottom = (rIdx + 1) % 3 === 0 && rIdx < 8 ? 'mb-1 sm:mb-1.5' : '';

                    return (
                      <button
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                        className={`aspect-square flex items-center justify-center text-sm sm:text-lg font-mono font-bold rounded transition-all select-none ${borderRight} ${borderBottom} ${
                          selected
                            ? 'bg-primary text-white ring-2 ring-primary shadow-md z-10 font-black'
                            : conflict
                            ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-black'
                            : matching
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200'
                            : related
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <span className={isFixed ? 'font-black text-slate-900 dark:text-white' : 'font-extrabold text-primary'}>
                          {val > 0 ? val : ''}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* On-screen Virtual Keypad */}
              <div className="mt-6 max-w-[500px] mx-auto">
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handleInputNumber(num)}
                      className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 font-mono font-black text-base shadow-sm transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleInputNumber(0)}
                    className="py-3 col-span-1 sm:col-span-1 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-xs shadow-sm transition-all border border-rose-200 dark:border-rose-900/50 flex items-center justify-center"
                    title="Apagar Número"
                  >
                    <span className="material-symbols-outlined text-lg">backspace</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Leaderboard / Ranking per Difficulty */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2 text-xs uppercase tracking-tight mb-3">
                  <span className="material-symbols-outlined text-amber-500 text-base">leaderboard</span>
                  Ranking de Menores Tempos
                </h3>

                {/* Ranking Difficulty Tabs */}
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                  {(['facil', 'medio', 'dificil'] as Difficulty[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveRankingTab(tab)}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                        activeRankingTab === tab
                          ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {tab === 'facil' ? 'Fácil' : tab === 'medio' ? 'Médio' : 'Difícil'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {isLoadingScores ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando ranking...
                  </div>
                ) : rankingList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="material-symbols-outlined text-3xl opacity-50 block mb-1">emoji_events</span>
                    Nenhum tempo registrado nesta dificuldade ainda.
                    <p className="text-[10px] text-slate-400 mt-1 not-italic font-normal">Seja o primeiro militar a concluir e garantir o 1º lugar!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rankingList.map((score, index) => {
                      const isTop1 = index === 0;
                      const isTop2 = index === 1;
                      const isTop3 = index === 2;

                      return (
                        <div
                          key={score.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isTop1
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                              : isTop2
                              ? 'bg-slate-200/50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                              : isTop3
                              ? 'bg-amber-800/10 border-amber-800/30'
                              : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Position Medal Badge */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                              isTop1
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                : isTop2
                                ? 'bg-slate-400 text-white'
                                : isTop3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {index + 1}º
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                {score.militaryName}
                              </h4>
                              <p className="text-[9px] text-slate-400 font-medium">
                                {new Date(score.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black font-mono text-primary dark:text-primary block">
                              {formatTime(score.timeSeconds)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </MainLayout.Content>
    </MainLayout>
  );
};

export default SudokuPage;
