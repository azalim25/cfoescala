
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import GenerateScalePage from './pages/GenerateScalePage';
import PersonalShiftPage from './pages/PersonalShiftPage';
import ExtraHoursPage from './pages/ExtraHoursPage';
import RankingPage from './pages/RankingPage';
import EstadoMaiorPage from './pages/EstadoMaiorPage';
import FuncoesTurmaPage from './pages/FuncoesTurmaPage';
import StagePage from './pages/StagePage';
import ComandanteGuardaPage from './pages/ComandanteGuardaPage';
import AuthPage from './pages/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';

import { MilitaryProvider } from './contexts/MilitaryContext';
import { ShiftProvider } from './contexts/ShiftContext';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MilitaryProvider>
        <ShiftProvider>
          <HashRouter>
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
                <ProtectedRoute>
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
                  <StagePage />
                </ProtectedRoute>
              } />

              <Route path="/comandante-guarda" element={
                <ProtectedRoute>
                  <ComandanteGuardaPage />
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ShiftProvider>
      </MilitaryProvider>
    </AuthProvider>
  );
};

export default App;
