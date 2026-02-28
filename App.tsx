import React, { Suspense, lazy } from 'react';
import DashboardPage from './pages/DashboardPage';
import PersonalShiftPage from './pages/PersonalShiftPage';
import AuthPage from './pages/AuthPage';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Lazy load components
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const GenerateScalePage = lazy(() => import('./pages/GenerateScalePage'));
const ExtraHoursPage = lazy(() => import('./pages/ExtraHoursPage'));
const RankingPage = lazy(() => import('./pages/RankingPage'));
const EstadoMaiorPage = lazy(() => import('./pages/EstadoMaiorPage'));
const FuncoesTurmaPage = lazy(() => import('./pages/FuncoesTurmaPage'));
const StageLocalPage = lazy(() => import('./pages/StageLocalPage'));
const StageQuantityPage = lazy(() => import('./pages/StageQuantityPage'));
const ComandanteGuardaPage = lazy(() => import('./pages/ComandanteGuardaPage'));
const BarraFixaPage = lazy(() => import('./pages/BarraFixaPage'));
const HoursControlPage = lazy(() => import('./pages/HoursControlPage'));
const ExamsPage = lazy(() => import('./pages/ExamsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const QtmPage = lazy(() => import('./pages/QtmPage'));
const QdchPage = lazy(() => import('./pages/QdchPage'));
const RelatorioPage = lazy(() => import('./pages/RelatorioPage'));

import ProtectedRoute from './components/ProtectedRoute';

import { MilitaryProvider } from './contexts/MilitaryContext';
import { ShiftProvider } from './contexts/ShiftContext';
import { AuthProvider } from './contexts/AuthContext';
import { AcademicProvider } from './contexts/AcademicContext';

const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">Carregando...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AcademicProvider>
        <MilitaryProvider>
          <ShiftProvider>
            <HashRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />

                  <Route path="/" element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/contacts" element={
                    <ProtectedRoute>
                      <ContactsPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/generate-scale" element={
                    <ProtectedRoute requireModerator={true}>
                      <GenerateScalePage />
                    </ProtectedRoute>
                  } />

                  <Route path="/personal" element={
                    <ProtectedRoute>
                      <PersonalShiftPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/extra-hours" element={
                    <ProtectedRoute>
                      <ExtraHoursPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/ranking" element={
                    <ProtectedRoute>
                      <RankingPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/estado-maior" element={
                    <ProtectedRoute>
                      <EstadoMaiorPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/funcoes-turma" element={
                    <ProtectedRoute>
                      <FuncoesTurmaPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/stage" element={
                    <ProtectedRoute>
                      <StageLocalPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/stage-quantity" element={
                    <ProtectedRoute>
                      <StageQuantityPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/comandante-guarda" element={
                    <ProtectedRoute>
                      <ComandanteGuardaPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/hours-control" element={
                    <ProtectedRoute>
                      <HoursControlPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/qtm" element={
                    <ProtectedRoute>
                      <QtmPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/qdch" element={
                    <ProtectedRoute>
                      <QdchPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/barra-fixa" element={
                    <ProtectedRoute>
                      <BarraFixaPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/provas" element={
                    <ProtectedRoute>
                      <ExamsPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/statistics" element={
                    <ProtectedRoute>
                      <StatisticsPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/relatorio" element={
                    <ProtectedRoute>
                      <RelatorioPage />
                    </ProtectedRoute>
                  } />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </ShiftProvider>
        </MilitaryProvider>
      </AcademicProvider>
    </AuthProvider>
  );
};

export default App;
