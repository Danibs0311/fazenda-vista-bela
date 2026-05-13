
import { supabase } from './supabase';
import { storage } from './storageService';

export const backupService = {
  exportDataJSON: async () => {
    try {
      // Fetch all relevant tables
      const { data: collaborators } = await supabase.from('collaborators').select('*');
      const { data: harvestWeeks } = await supabase.from('harvest_weeks').select('*');
      const { data: pricingConfig } = await supabase.from('pricing_config').select('*');
      const { data: harvestLogs } = await supabase.from('harvest_logs').select('*');

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        farm: 'Fazenda Vista Bela',
        data: {
          collaborators: collaborators || [],
          harvestWeeks: harvestWeeks || [],
          pricingConfig: pricingConfig || [],
          harvestLogs: harvestLogs || []
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vista-bela-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error: any) {
      console.error('Backup failed:', error);
      return { success: false, error: error.message };
    }
  }
};
