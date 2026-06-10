
import { supabase } from './supabase';
import { storage } from './storageService';

// Standard AES-GCM 256-bit encryption using native browser Web Crypto API
const encryptData = async (text: string, password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );
  
  const buffer = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  buffer.set(salt, 0);
  buffer.set(iv, salt.byteLength);
  buffer.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);
  
  return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
};

const decryptData = async (base64Str: string, password: string): Promise<string> => {
  const decoder = new TextDecoder();
  const binaryString = atob(base64Str);
  const buffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    buffer[i] = binaryString.charCodeAt(i);
  }
  
  const salt = buffer.slice(0, 16);
  const iv = buffer.slice(16, 28);
  const encrypted = buffer.slice(28);
  
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );
  
  return decoder.decode(decrypted);
};

export const backupService = {
  exportDataJSON: async (password?: string) => {
    try {
      // Fetch all relevant tables
      const { data: collaborators } = await supabase.from('collaborators').select('*');
      const { data: harvestWeeks } = await supabase.from('harvest_weeks').select('*');
      const { data: pricingConfig } = await supabase.from('pricing_config').select('*');
      const { data: harvestLogs } = await supabase.from('harvest_logs').select('*');

      const rawData = {
        collaborators: collaborators || [],
        harvestWeeks: harvestWeeks || [],
        pricingConfig: pricingConfig || [],
        harvestLogs: harvestLogs || []
      };

      const encrypted = !!password;
      const dataPayload = encrypted && password
        ? await encryptData(JSON.stringify(rawData), password)
        : rawData;

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        farm: 'Fazenda Vista Bela',
        encrypted,
        data: dataPayload
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vista-bela-backup-${new Date().toISOString().split('T')[0]}${encrypted ? '-encrypted' : ''}.json`;
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

  importDataJSON: async (jsonContent: string, password?: string) => {
    try {
      const backup = JSON.parse(jsonContent);
      if (!backup.version || backup.farm !== 'Fazenda Vista Bela' || !backup.data) {
        throw new Error('Formato de arquivo de backup inválido ou incompatível.');
      }

      let payload = backup.data;

      // Se estiver criptografado, precisamos decifrá-lo
      if (backup.encrypted) {
        if (!password) {
          throw new Error('PASSWORD_REQUIRED');
        }
        try {
          const decryptedText = await decryptData(backup.data, password);
          payload = JSON.parse(decryptedText);
        } catch (decErr) {
          throw new Error('Senha incorreta ou arquivo corrompido.');
        }
      }

      const { collaborators, harvestWeeks, pricingConfig, harvestLogs } = payload;

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
        let { error } = await supabase.from('harvest_logs').upsert(harvestLogs);
        if (error && (
          error.message?.includes('criado_por_id') || 
          error.message?.includes('criado_por_nome') || 
          error.message?.includes('column') || 
          error.message?.includes('schema cache')
        )) {
          console.warn('Server schema lacks created_by metadata columns during backup restore. Retrying without them...');
          const cleanedLogs = harvestLogs.map(({ criado_por_id, criado_por_nome, ...rest }: any) => rest);
          const fallbackRes = await supabase.from('harvest_logs').upsert(cleanedLogs);
          error = fallbackRes.error;
        }
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

