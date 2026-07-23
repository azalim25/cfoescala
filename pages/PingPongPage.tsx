import React, { useState, useEffect, useRef, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { supabase } from '../supabase';

type GameMode = 'vs-ai' | 'local-2p' | 'online';
type AIDifficulty = 'facil' | 'medio' | 'militar';

interface OnlineUser {
  id: string;
  name: string;
  rank: string;
  onlineAt: string;
}

interface Challenge {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  timestamp: number;
}

const PingPongPage: React.FC = () => {
  const { session } = useAuth();
  const { militaries } = useMilitary();

  // Game configuration & state
  const [gameMode, setGameMode] = useState<GameMode>('vs-ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medio');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Official Ping Pong Scores (11 pts per set, win by 2, server changes every 2 pts)
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);
  const [currentServer, setCurrentServer] = useState<1 | 2>(1); // 1 = P1, 2 = P2/AI
  const [setsP1, setSetsP1] = useState(0);
  const [setsP2, setSetsP2] = useState(0);
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);

  // High score in local storage
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('@cfo_pingpong_highscore');
    return saved ? parseInt(saved) || 0 : 0;
  });

  // Online presence & challenge states
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challengeSentTo, setChallengeSentTo] = useState<string | null>(null);
  const [challengeNotification, setChallengeNotification] = useState<string | null>(null);

  // Canvas & Game Loop Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Current logged in user details
  const currentUser = useMemo(() => {
    if (!session?.user) return { id: 'guest', name: 'Militar', rank: 'Cadete' };
    const mil = militaries.find(m => m.id === session.user.id);
    return {
      id: session.user.id,
      name: mil ? `${mil.rank} ${mil.name}` : (session.user.email?.split('@')[0] || 'Militar'),
      rank: mil?.rank || 'Cadete'
    };
  }, [session, militaries]);

  // Realtime Channel for Presence and Challenges
  useEffect(() => {
    const channel = supabase.channel('ping_pong_lobby', {
      config: { presence: { key: currentUser.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: OnlineUser[] = [];
        Object.keys(presenceState).forEach(key => {
          const presences = presenceState[key] as any[];
          if (presences && presences.length > 0) {
            const p = presences[0];
            if (p.id !== currentUser.id) {
              users.push({
                id: p.id,
                name: p.name || 'Militar Online',
                rank: p.rank || 'Cadete',
                onlineAt: p.onlineAt || new Date().toISOString()
              });
            }
          }
        });
        setOnlineUsers(users);
      })
      .on('broadcast', { event: 'ping_pong_challenge' }, ({ payload }) => {
        if (payload.toId === currentUser.id) {
          setActiveChallenge(payload);
          setChallengeNotification(`O militar ${payload.fromName} te desafiou para uma partida de Ping Pong!`);
        }
      })
      .on('broadcast', { event: 'ping_pong_challenge_response' }, ({ payload }) => {
        if (payload.fromId === currentUser.id && payload.toId === challengeSentTo) {
          if (payload.accepted) {
            setChallengeNotification(`O desafio foi ACEITO por ${payload.toName}! Partida iniciada.`);
            setGameMode('local-2p');
            handleStartGame();
          } else {
            setChallengeNotification(`O militar ${payload.toName} recusou o desafio.`);
          }
          setChallengeSentTo(null);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            rank: currentUser.rank,
            onlineAt: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, challengeSentTo]);

  // Handle Challenge Send
  const handleSendChallenge = async (targetUser: OnlineUser) => {
    setChallengeSentTo(targetUser.id);
    setChallengeNotification(`Desafio enviado para ${targetUser.name}... Aguardando resposta.`);

    const channel = supabase.channel('ping_pong_lobby');
    await channel.send({
      type: 'broadcast',
      event: 'ping_pong_challenge',
      payload: {
        id: `challenge_${Date.now()}`,
        fromId: currentUser.id,
        fromName: currentUser.name,
        toId: targetUser.id,
        timestamp: Date.now()
      }
    });
  };

  // Handle Accept / Decline Challenge
  const handleRespondChallenge = async (accept: boolean) => {
    if (!activeChallenge) return;

    const channel = supabase.channel('ping_pong_lobby');
    await channel.send({
      type: 'broadcast',
      event: 'ping_pong_challenge_response',
      payload: {
        fromId: activeChallenge.fromId,
        toId: currentUser.id,
        toName: currentUser.name,
        accepted: accept
      }
    });

    if (accept) {
      setGameMode('local-2p');
      handleStartGame();
    }

    setActiveChallenge(null);
    setChallengeNotification(null);
  };

  // --- GAME ENGINE (CANVAS 60FPS) ---
  const gameStateRef = useRef({
    p1Y: 150,
    p2Y: 150,
    ballX: 300,
    ballY: 200,
    ballVx: 4,
    ballVy: 3,
    paddleHeight: 70,
    paddleWidth: 10,
    ballRadius: 7,
    canvasWidth: 600,
    canvasHeight: 400,
    p1Score: 0,
    p2Score: 0,
    totalPoints: 0,
    isServing: true,
    server: 1 as 1 | 2
  });

  // Track keyboard keys pressed
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S', ' '].includes(e.key)) {
        if (e.key === ' ') {
          e.preventDefault();
          setIsPaused(prev => !prev);
          return;
        }
      }
      keysPressed.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update Server based on Ping Pong Rules (changes every 2 points, or every 1 point if 10-10 deuce)
  const calculateServer = (p1Pts: number, p2Pts: number): 1 | 2 => {
    const total = p1Pts + p2Pts;
    if (p1Pts >= 10 && p2Pts >= 10) {
      // Deuce: change server every 1 point
      return (total % 2 === 0) ? 1 : 2;
    }
    // Normal: change server every 2 points
    return (Math.floor(total / 2) % 2 === 0) ? 1 : 2;
  };

  // Reset ball position for next serve
  const resetBall = (server: 1 | 2) => {
    const state = gameStateRef.current;
    state.ballX = state.canvasWidth / 2;
    state.ballY = state.canvasHeight / 2;
    const speed = aiDifficulty === 'militar' ? 6 : aiDifficulty === 'medio' ? 4.5 : 3.5;
    state.ballVx = server === 1 ? speed : -speed;
    state.ballVy = (Math.random() > 0.5 ? 1 : -1) * (speed * 0.6);
  };

  const handleStartGame = () => {
    setScoreP1(0);
    setScoreP2(0);
    setSetsP1(0);
    setSetsP2(0);
    setWinnerMessage(null);
    setCurrentServer(1);

    const state = gameStateRef.current;
    state.p1Y = (state.canvasHeight - state.paddleHeight) / 2;
    state.p2Y = (state.canvasHeight - state.paddleHeight) / 2;
    state.p1Score = 0;
    state.p2Score = 0;
    state.totalPoints = 0;
    state.server = 1;
    resetBall(1);

    setIsPlaying(true);
    setIsPaused(false);
  };

  const handleResetGame = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setWinnerMessage(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // MAIN GAME LOOP
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    const paddleSpeed = 6;

    const gameLoop = () => {
      // 1. Move Player 1 Paddle (W/S or Up/Down if single mode)
      if (keysPressed.current['w'] || keysPressed.current['W'] || keysPressed.current['ArrowUp']) {
        state.p1Y = Math.max(0, state.p1Y - paddleSpeed);
      }
      if (keysPressed.current['s'] || keysPressed.current['S'] || keysPressed.current['ArrowDown']) {
        state.p1Y = Math.min(state.canvasHeight - state.paddleHeight, state.p1Y + paddleSpeed);
      }

      // 2. Move Player 2 Paddle (Local 2P keys or AI)
      if (gameMode === 'local-2p') {
        if (keysPressed.current['ArrowUp']) {
          state.p2Y = Math.max(0, state.p2Y - paddleSpeed);
        }
        if (keysPressed.current['ArrowDown']) {
          state.p2Y = Math.min(state.canvasHeight - state.paddleHeight, state.p2Y + paddleSpeed);
        }
      } else {
        // AI Logic
        const aiSpeed = aiDifficulty === 'militar' ? 5.5 : aiDifficulty === 'medio' ? 3.8 : 2.5;
        const targetY = state.ballY - state.paddleHeight / 2;
        if (state.p2Y < targetY - 5) {
          state.p2Y = Math.min(state.canvasHeight - state.paddleHeight, state.p2Y + aiSpeed);
        } else if (state.p2Y > targetY + 5) {
          state.p2Y = Math.max(0, state.p2Y - aiSpeed);
        }
      }

      // 3. Move Ball
      state.ballX += state.ballVx;
      state.ballY += state.ballVy;

      // 4. Wall Bounce (Top & Bottom borders)
      if (state.ballY - state.ballRadius <= 0) {
        state.ballY = state.ballRadius;
        state.ballVy *= -1;
      } else if (state.ballY + state.ballRadius >= state.canvasHeight) {
        state.ballY = state.canvasHeight - state.ballRadius;
        state.ballVy *= -1;
      }

      // 5. Paddle Collisions
      // Player 1 Paddle (Left)
      if (
        state.ballX - state.ballRadius <= state.paddleWidth + 10 &&
        state.ballY >= state.p1Y &&
        state.ballY <= state.p1Y + state.paddleHeight &&
        state.ballVx < 0
      ) {
        state.ballVx *= -1.05; // Slightly accelerate
        // Angled bounce based on impact point
        const impact = (state.ballY - (state.p1Y + state.paddleHeight / 2)) / (state.paddleHeight / 2);
        state.ballVy = impact * 5;
      }

      // Player 2 / AI Paddle (Right)
      if (
        state.ballX + state.ballRadius >= state.canvasWidth - (state.paddleWidth + 10) &&
        state.ballY >= state.p2Y &&
        state.ballY <= state.p2Y + state.paddleHeight &&
        state.ballVx > 0
      ) {
        state.ballVx *= -1.05;
        const impact = (state.ballY - (state.p2Y + state.paddleHeight / 2)) / (state.paddleHeight / 2);
        state.ballVy = impact * 5;
      }

      // 6. Scoring Logic (Ping Pong Rules)
      let pointScored = false;

      // Point P1 (Ball passed P2)
      if (state.ballX > state.canvasWidth + 10) {
        state.p1Score += 1;
        pointScored = true;
      }
      // Point P2 (Ball passed P1)
      else if (state.ballX < -10) {
        state.p2Score += 1;
        pointScored = true;
      }

      if (pointScored) {
        const p1 = state.p1Score;
        const p2 = state.p2Score;
        setScoreP1(p1);
        setScoreP2(p2);

        // Update High score
        if (p1 > highScore) {
          setHighScore(p1);
          localStorage.setItem('@cfo_pingpong_highscore', String(p1));
        }

        // Official Ping Pong Win condition: 11 points and leading by at least 2 points
        const isP1Win = p1 >= 11 && p1 - p2 >= 2;
        const isP2Win = p2 >= 11 && p2 - p1 >= 2;

        if (isP1Win || isP2Win) {
          setIsPlaying(false);
          if (isP1Win) {
            setSetsP1(prev => prev + 1);
            setWinnerMessage('VÍTÓRIA DO JOGADOR 1! 🏆');
          } else {
            setSetsP2(prev => prev + 1);
            setWinnerMessage(gameMode === 'vs-ai' ? 'VITÓRIA DA IA! 🤖' : 'VÍTÓRIA DO JOGADOR 2! 🏆');
          }
          return;
        }

        // Determine next server
        const nextServer = calculateServer(p1, p2);
        state.server = nextServer;
        setCurrentServer(nextServer);
        resetBall(nextServer);
      }

      // 7. RENDER CANVAS (OFFICIAL TABLE TENNIS GREEN STYLE)
      // Table Background
      ctx.fillStyle = '#0f5233'; // Classic Table Tennis Dark Green
      ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

      // Outer White Border Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(5, 5, state.canvasWidth - 10, state.canvasHeight - 10);

      // Center Line (Vertical split)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(state.canvasWidth / 2, 5);
      ctx.lineTo(state.canvasWidth / 2, state.canvasHeight - 5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Net (Thick white net line across the middle)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(state.canvasWidth / 2 - 2, 0, 4, state.canvasHeight);

      // Render Player 1 Paddle (Left - Red Rubber)
      ctx.fillStyle = '#dc2626'; // Red paddle rubber
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(10, state.p1Y, state.paddleWidth, state.paddleHeight, 4);
      ctx.fill();

      // Render Player 2 Paddle (Right - Black/Blue Rubber)
      ctx.fillStyle = gameMode === 'vs-ai' ? '#2563eb' : '#1e293b'; // Blue for AI, Dark for P2
      ctx.shadowColor = gameMode === 'vs-ai' ? '#3b82f6' : '#475569';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(state.canvasWidth - 10 - state.paddleWidth, state.p2Y, state.paddleWidth, state.paddleHeight, 4);
      ctx.fill();

      // Reset shadow for ball rendering
      ctx.shadowBlur = 0;

      // Render Ball (White Table Tennis Ball)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, state.ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isPaused, gameMode, aiDifficulty, highScore]);

  // Touch controls for mobile drag
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    const scaledY = (touchY / rect.height) * gameStateRef.current.canvasHeight;
    gameStateRef.current.p1Y = Math.max(0, Math.min(gameStateRef.current.canvasHeight - gameStateRef.current.paddleHeight, scaledY - gameStateRef.current.paddleHeight / 2));
  };

  return (
    <MainLayout activePage="ping-pong">
      <MainLayout.Content>
        {/* Header Notification Banner for Challenges */}
        {challengeNotification && (
          <div className="mb-4 bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl">sports_esports</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">{challengeNotification}</p>
            </div>
            {activeChallenge ? (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRespondChallenge(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition-all"
                >
                  Aceitar Desafio
                </button>
                <button
                  onClick={() => handleRespondChallenge(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-all"
                >
                  Recusar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setChallengeNotification(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Fechar
              </button>
            )}
          </div>
        )}

        {/* Page Title & Stats Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
              <span className="material-symbols-outlined text-3xl">sports_esports</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none">CFO GUARANI Ping Pong</h1>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Regras Oficiais de Tênis de Mesa (Set de 11 Pontos)</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Recorde Pessoal</span>
              <span className="text-lg font-black text-primary font-mono">{highScore} PTS</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Canvas Container & Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mode & Difficulty Selector Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => { setGameMode('vs-ai'); handleResetGame(); }}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase transition-all flex items-center gap-2 border ${
                    gameMode === 'vs-ai'
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">smart_toy</span>
                  1 Jogador (vs IA)
                </button>
                <button
                  onClick={() => { setGameMode('local-2p'); handleResetGame(); }}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase transition-all flex items-center gap-2 border ${
                    gameMode === 'local-2p'
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">groups</span>
                  2 Jogadores (Desafio)
                </button>
              </div>

              {gameMode === 'vs-ai' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível IA:</span>
                  {(['facil', 'medio', 'militar'] as AIDifficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setAiDifficulty(diff)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${
                        aiDifficulty === diff
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {diff === 'facil' ? 'Fácil' : diff === 'medio' ? 'Médio' : 'Militar'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Official Table Tennis Scoreboard Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border-2 border-emerald-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Jogador 1</span>
                  <span className="text-3xl font-black font-mono leading-none">{scoreP1}</span>
                  {currentServer === 1 && (
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mt-1">SAQUE •</span>
                  )}
                </div>
              </div>

              <div className="text-center px-4">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] block mb-1">MESA OFICIAL</span>
                <span className="text-xs font-bold bg-slate-800 px-3 py-1 rounded-full text-slate-300 border border-slate-700">Set de 11 Pontos</span>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {gameMode === 'vs-ai' ? `IA (${aiDifficulty.toUpperCase()})` : 'Jogador 2'}
                  </span>
                  <span className="text-3xl font-black font-mono leading-none">{scoreP2}</span>
                  {currentServer === 2 && (
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mt-1">• SAQUE</span>
                  )}
                </div>
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
            </div>

            {/* Canvas Ping Pong Table */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-emerald-900 flex justify-center items-center">
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                onTouchMove={handleTouchMove}
                className="w-full max-w-[600px] h-auto aspect-[3/2] cursor-crosshair touch-none"
              />

              {/* Start / Pause / Winner Overlay */}
              {(!isPlaying || isPaused || winnerMessage) && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in">
                  {winnerMessage ? (
                    <>
                      <h2 className="text-2xl sm:text-3xl font-black text-yellow-400 mb-2 uppercase tracking-tight drop-shadow-md">
                        {winnerMessage}
                      </h2>
                      <p className="text-xs font-bold text-slate-300 mb-6 uppercase tracking-wider">
                        Placar Final: {scoreP1} x {scoreP2}
                      </p>
                      <button
                        onClick={handleStartGame}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all uppercase tracking-wider"
                      >
                        Jogar Novamente
                      </button>
                    </>
                  ) : isPaused ? (
                    <>
                      <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-widest">JOGO PAUSADO</h2>
                      <button
                        onClick={() => setIsPaused(false)}
                        className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-primary/30 transition-all uppercase tracking-wider mb-2"
                      >
                        Continuar Partida
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary mb-4">
                        <span className="material-symbols-outlined text-4xl">sports_esports</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white mb-2 uppercase tracking-tight">Pronto para Iniciar?</h2>
                      <p className="text-xs text-slate-400 mb-6 max-w-sm">
                        Utilize as teclas <span className="text-primary font-bold">W / S</span> ou <span className="text-primary font-bold">Setas Cima / Baixo</span> (ou arraste na tela) para mover sua raquete.
                      </p>
                      <button
                        onClick={handleStartGame}
                        className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-base rounded-xl shadow-xl shadow-primary/30 hover:scale-105 transition-all uppercase tracking-widest"
                      >
                        Iniciar Partida
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick In-game Controls */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex gap-2">
                {isPlaying && (
                  <button
                    onClick={() => setIsPaused(prev => !prev)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">{isPaused ? 'play_arrow' : 'pause'}</span>
                    {isPaused ? 'Continuar' : 'Pausar'}
                  </button>
                )}
                <button
                  onClick={handleResetGame}
                  className="px-4 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-100 dark:border-rose-900/50 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  Reiniciar
                </button>
              </div>

              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Modo sem áudio ativo
              </div>
            </div>
          </div>

          {/* Right Column: Online Players & Challenges */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-xs uppercase tracking-tight">
                  <span className="material-symbols-outlined text-primary text-base">wifi</span>
                  Militares Online no App
                </h3>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 text-[10px] font-black rounded border border-emerald-200 dark:border-emerald-800">
                  {onlineUsers.length} Online
                </span>
              </div>

              <div className="p-4">
                {onlineUsers.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="material-symbols-outlined text-3xl opacity-50 block mb-1">person_off</span>
                    Nenhum outro militar online neste momento.
                    <p className="text-[10px] text-slate-400 mt-2 font-normal not-italic">Você ainda pode jogar no modo 1 Jogador vs IA ou 2 Jogadores no mesmo dispositivo!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onlineUsers.map(user => (
                      <div
                        key={user.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-200 dark:border-emerald-800">
                            <span className="material-symbols-outlined text-base">person</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</h4>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              Disponível
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSendChallenge(user)}
                          disabled={challengeSentTo === user.id}
                          className="px-3 py-1.5 bg-primary text-white hover:opacity-90 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 shrink-0 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">swords</span>
                          {challengeSentTo === user.id ? 'Enviado...' : 'Desafiar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Official Ping Pong Rules Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="material-symbols-outlined text-amber-500 text-base">menu_book</span>
                Regras do Tênis de Mesa (ITTF)
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-xs text-primary mt-0.5">check_circle</span>
                  <span><strong>Set de 11 Pontos:</strong> O vencedor deve atingir 11 pontos primeiro.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-xs text-primary mt-0.5">check_circle</span>
                  <span><strong>Diferença de 2 Pontos:</strong> Caso o placar chegue a 10 x 10 (empate), o jogo prossegue até abrir 2 pontos de vantagem.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-xs text-primary mt-0.5">check_circle</span>
                  <span><strong>Alternância de Saque:</strong> O saque alterna a cada 2 pontos disputados (e a cada 1 ponto no empate 10 x 10).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </MainLayout.Content>
    </MainLayout>
  );
};

export default PingPongPage;
