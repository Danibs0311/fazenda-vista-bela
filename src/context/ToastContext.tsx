import React, { useContext } from 'react';
import { ToastType } from '../components/Toast';

export interface ToastContextData {
  showToast: (msg: string, type: ToastType) => void;
}

export const ToastContext = React.createContext<ToastContextData>({ 
  showToast: () => {} 
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
