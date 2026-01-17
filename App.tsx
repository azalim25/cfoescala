
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import GenerateScalePage from './pages/GenerateScalePage';
import PersonalShiftPage from './pages/PersonalShiftPage';
import AuthPage from './pages/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';

import { MilitaryProvider } from './contexts/MilitaryContext';
import { ShiftProvider } from './contexts/ShiftContext';

const App: React.FC = () => {
  return (
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ShiftProvider>
    </MilitaryProvider>
  );
};

export default App;
