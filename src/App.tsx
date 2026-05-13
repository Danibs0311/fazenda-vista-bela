
import React, { useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './modules/admin/Dashboard';
import { Collaborators } from './modules/collaborators/Collaborators';
import { HarvestEntry } from './modules/harvest/HarvestEntry';
import { WeekManagement } from './modules/harvest/WeekManagement';
import { Payments } from './modules/harvest/Payments';
import { Settings } from './modules/admin/Settings';
import { Reports } from './modules/reports/Reports';
import { Login } from './modules/admin/Login';
import { Toast, ToastType } from './components/Toast';
import { ToastContext } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const App: React.FC = () => {
  const [toast, setToast] = useState<{ msg: string, type: ToastType } | null>(null);

  const showToast = useCallback((msg: string, type: ToastType) => {
    setToast({ msg, type });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/colhedores" element={
              <ProtectedRoute>
                <Layout>
                  <Collaborators />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/colheita" element={
              <ProtectedRoute>
                <Layout>
                  <HarvestEntry />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/semanas" element={
              <ProtectedRoute>
                <Layout>
                  <WeekManagement />
                </Layout>
              </ProtectedRoute>
            } />
            
            
            <Route path="/pagamentos" element={
              <ProtectedRoute>
                <Layout>
                  <Payments />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/relatorios" element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />

            
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </HashRouter>
      </AuthProvider>
    </ToastContext.Provider>
  );
};

export default App;
