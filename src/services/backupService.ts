
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
  },

  importDataJSON: async (jsonContent: string) => {
    try {
      const backup = JSON.parse(jsonContent);
      if (!backup.version || backup.farm !== 'Fazenda Vista Bela' || !backup.data) {
        throw new Error('Formato de arquivo de backup inválido ou incompatível.');
      }

      const { collaborators, harvestWeeks, pricingConfig, harvestLogs } = backup.data;

      // 1. Restaurar colaboradores (upsert)
      if (collaborators && collaborators.length > 0) {
        const { error } = await supabase.from('collaborators').upsert(collaborators);
        if (error) throw new Error('Erro ao restaurar colaboradores: ' + error.message);
      }

      // 2. Restaurar ciclos/semanas (upsert)
      if (harvestWeeks && harvestWeeks.length > 0) {
        const { error } = await supabase.from('harvest_weeks').upsert(harvestWeeks);
        if (error) throw new Error('Erro ao restaurar semanas: ' + error.message);
      }

      // 3. Restaurar configurações de preços (upsert)
      if (pricingConfig && pricingConfig.length > 0) {
        const { error } = await supabase.from('pricing_config').upsert(pricingConfig);
        if (error) throw new Error('Erro ao restaurar preços: ' + error.message);
      }

      // 4. Restaurar logs de colheitas (upsert)
      if (harvestLogs && harvestLogs.length > 0) {
        const { error } = await supabase.from('harvest_logs').upsert(harvestLogs);
        if (error) throw new Error('Erro ao restaurar colheitas: ' + error.message);
      }

      // Invalidar caches locais para forçar atualização imediata nas páginas
      storage.getCollaborators(true);
      storage.getPrices(true);
      storage.getBanks(true);

      return { success: true };
    } catch (error: any) {
      console.error('Restore failed:', error);
      return { success: false, error: error.message };
    }
  }
};

