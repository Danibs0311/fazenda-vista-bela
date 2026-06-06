
import React, { useState, useCallback, useEffect } from 'react';
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
import { checkAndManageCycles } from './services/cycleManager';
import { storage } from './services/storageService';

const App: React.FC = () => {
  const [toast, setToast] = useState<{ msg: string, type: ToastType } | null>(null);

  const showToast = useCallback((msg: string, type: ToastType) => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    // Run immediately on load
    checkAndManageCycles();
    if (navigator.onLine) {
      storage.syncOfflineLogs().catch(err => {
        console.warn('Initial sync failed:', err);
      });
    }

    const handleOnline = () => {
      showToast('Conexão estabelecida! Sincronizando dados salvos localmente...', 'success');
      setTimeout(async () => {
        try {
          await storage.syncOfflineLogs();
        } catch (err: any) {
          console.warn('Background online transition sync failed:', err.message);
        }
      }, 1500);
    };

    const handleOffline = () => {
      showToast('Modo Offline Ativo. Seus lançamentos estão seguros no dispositivo.', 'info');
    };

    const handleSyncError = () => {
      showToast('Erro ao sincronizar dados: Sessão expirada ou não autorizada.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('auth_sync_error', handleSyncError);

    // Setup periodic polling every 5 seconds (5000ms)
    const interval = setInterval(() => {
      checkAndManageCycles();
      if (navigator.onLine) {
        storage.syncOfflineLogs().catch(err => {
          console.warn('Periodic sync failed:', err);
        });
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('auth_sync_error', handleSyncError);
    };
  }, [showToast]);

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
