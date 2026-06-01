import {
  Collaborator,
  HarvestLog,
  CanPriceConfig,
  HarvestWeek,
  WeekStatus,
  CollaboratorStatus,
  Bank
} from '../types';
import { supabase } from './supabase';
import { getWeekRange } from '../utils/dateUtils';
import { localDb, OfflineHarvestLog } from './localDb';

export const normalizeOperation = (op: string | null | undefined): string => {
  let cleanOp = (op || '').trim().toUpperCase();
  
  // Normalize float representations of integers, e.g., "13.0" -> "13"
  if (/^\d+(\.0+)?$/.test(cleanOp)) {
    cleanOp = String(Math.floor(parseFloat(cleanOp)));
  }

  if (!cleanOp || cleanOp === '0') {
    return 'XXXX';
  }
  if (cleanOp === '13') {
    return '013';
  }
  if (cleanOp === '23') {
    return '023';
  }
  if (cleanOp === 'C/ CORR' || cleanOp === 'C/CORR' || cleanOp === 'CORR') {
    return 'CORRENTE';
  }
  if (cleanOp === 'C/POUP' || cleanOp === 'POUP') {
    return 'POUPANÇA';
  }
  return cleanOp;
};

// Simple memory cache to avoid redundant network requests
const cache = {
  collaborators: null as Collaborator[] | null,
  banks: null as Bank[] | null,
  prices: null as CanPriceConfig[] | null,
  lastFetch: {
    collaborators: 0,
    banks: 0,
    prices: 0
  }
};

const CACHE_TTL = 30 * 1000; // 30 seconds for rapid changes, but better than every click

const shouldFetch = (key: keyof typeof cache.lastFetch) => {
  return !cache[key] || (Date.now() - cache.lastFetch[key] > CACHE_TTL);
};

export const storage = {
  getCollaborators: async (forceRefresh = false): Promise<Collaborator[]> => {
    if (!forceRefresh && !shouldFetch('collaborators')) return cache.collaborators!;

    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Error fetching collaborators:', error);
      return cache.collaborators || [];
    }
    
    cache.collaborators = data || [];
    cache.lastFetch.collaborators = Date.now();
    return cache.collaborators;
  },

  saveCollaborator: async (col: Collaborator) => {
    const uppercaseCol = {
      ...col,
      nome: col.nome?.toUpperCase(),
      cpf: col.cpf?.toUpperCase(),
      banco: col.banco?.toUpperCase(),
      agencia: col.agencia?.toUpperCase(),
      conta: col.conta?.toUpperCase(),
      tipo_conta: normalizeOperation(col.tipo_conta)
    };

    const { error } = await supabase
      .from('collaborators')
      .upsert(uppercaseCol);

    if (error) throw new Error('Erro ao salvar colaborador: ' + error.message);
    cache.lastFetch.collaborators = 0; // Invalidate cache
  },

  getPrices: async (forceRefresh = false): Promise<CanPriceConfig[]> => {
    if (!forceRefresh && !shouldFetch('prices') && cache.prices) return cache.prices;

    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('data_inicio_vigencia', { ascending: false });
      
      if (error) throw error;
      
      cache.prices = data || [];
      cache.lastFetch.prices = Date.now();
      localStorage.setItem('fvb_prices', JSON.stringify(cache.prices));
      return cache.prices;
    } catch (err) {
      console.warn('Failed to fetch prices, loading from localStorage fallback:', err);
      const saved = localStorage.getItem('fvb_prices');
      if (saved) {
        cache.prices = JSON.parse(saved);
        return cache.prices!;
      }
      return cache.prices || [];
    }
  },

  savePrice: async (price: CanPriceConfig) => {
    // Check if a price config with the exact same date already exists in the database
    const { data: existing } = await supabase
      .from('pricing_config')
      .select('id')
      .eq('data_inicio_vigencia', price.data_inicio_vigencia)
      .limit(1);

    if (existing && existing.length > 0) {
      // Overwrite the existing record with the new price value
      const { error } = await supabase
        .from('pricing_config')
        .update({ valor_lata: price.valor_lata })
        .eq('id', existing[0].id);

      if (error) throw new Error('Erro ao atualizar preço existente: ' + error.message);
    } else {
      // Se o ID não for um UUID válido, removemos para que o Supabase gere automaticamente
      const { id, ...data } = price;
      const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const payload = isUUID ? { id, ...data } : data;

      const { error } = await supabase.from('pricing_config').insert(payload);
      if (error) throw new Error('Erro ao salvar preço: ' + error.message);
    }
    
    cache.lastFetch.prices = 0; // Invalidate cache
  },

  deletePrice: async (id: string) => {
    const { error } = await supabase.from('pricing_config').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir preço: ' + error.message);
    cache.lastFetch.prices = 0; // Invalidate cache
  },

  getCurrentPrice: async (date: string): Promise<number> => {
    // 1. Try to read from memory cache or load from localStorage fallback
    let prices = cache.prices;
    if (!prices) {
      const saved = localStorage.getItem('fvb_prices');
      if (saved) {
        try {
          prices = JSON.parse(saved);
          cache.prices = prices;
        } catch (e) {
          console.error('Failed to parse cached prices:', e);
        }
      }
    }

    // 2. If online and cache has expired, try fetching from network in background
    if (navigator.onLine && shouldFetch('prices')) {
      try {
        const { data, error } = await supabase
          .from('pricing_config')
          .select('*')
          .order('data_inicio_vigencia', { ascending: false });

        if (!error && data) {
          prices = data;
          cache.prices = data;
          cache.lastFetch.prices = Date.now();
          localStorage.setItem('fvb_prices', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Network pricing fetch failed inside getCurrentPrice, using cache:', err);
      }
    }

    // 3. Re-evaluate from our local prices array
    if (prices && prices.length > 0) {
      const match = prices
        .filter(p => p.data_inicio_vigencia <= date)
        .sort((a, b) => b.data_inicio_vigencia.localeCompare(a.data_inicio_vigencia))[0];
      if (match) return match.valor_lata;
    }

    // 4. Ultimate fallback query if everything else was empty
    try {
      const { data } = await supabase
        .from('pricing_config')
        .select('*')
        .lte('data_inicio_vigencia', date)
        .order('data_inicio_vigencia', { ascending: false })
        .limit(1);

      return data?.[0]?.valor_lata || 0;
    } catch (err) {
      return 0;
    }
  },

  getHarvests: async (limit = 100): Promise<OfflineHarvestLog[]> => {
    let remoteLogs: HarvestLog[] = [];
    
    if (navigator.onLine) {
      const { data } = await supabase
        .from('harvest_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      remoteLogs = data || [];
    }
    
    const localLogs = await localDb.getAllLogs();
    
    // Merge remote and local logs, deduping by id. Local unsynced logs take precedence.
    const mergedMap = new Map<string, OfflineHarvestLog>();
    
    remoteLogs.forEach(log => {
      mergedMap.set(log.id, { ...log, synced: true });
    });
    
    localLogs.forEach(log => {
      if (!log.synced || !mergedMap.has(log.id)) {
        mergedMap.set(log.id, log);
      }
    });
    
    const mergedList = Array.from(mergedMap.values());
    
    return mergedList.sort((a, b) => {
      const dateA = a.created_at || a.data_colheita;
      const dateB = b.created_at || b.data_colheita;
      return dateB.localeCompare(dateA);
    }).slice(0, limit);
  },

  getHarvestsByWeek: async (weekId: string): Promise<HarvestLog[]> => {
    const { data } = await supabase
      .from('harvest_logs')
      .select('*')
      .eq('semana_id', weekId);
    return data || [];
  },

  getWeek: async (weekId: string): Promise<HarvestWeek> => {
    const { data } = await supabase.from('harvest_weeks').select('*').eq('id', weekId).single();

    if (data) return data;

    const range = getWeekRange(weekId);
    const newWeek: HarvestWeek = {
      id: range.id,
      data_inicio: range.start,
      data_fim: range.end,
      status: WeekStatus.OPEN
    };

    await storage.saveWeek(newWeek);
    return newWeek;
  },

  saveWeek: async (week: HarvestWeek) => {
    const { error } = await supabase.from('harvest_weeks').upsert(week);
    if (error) throw new Error('Erro ao salvar semana: ' + error.message);
  },

  saveHarvest: async (harvest: OfflineHarvestLog) => {
    // Save locally first to guarantee data persistence instantly
    const offlineLog: OfflineHarvestLog = {
      ...harvest,
      synced: false
    };
    await localDb.saveLog(offlineLog);

    if (navigator.onLine) {
      try {
        const week = await storage.getWeek(harvest.semana_id);
        if (week.status !== WeekStatus.OPEN) {
          throw new Error(`Semana ${week.status}. Operação bloqueada.`);
        }

        const { synced, ...payload } = offlineLog;
        const { error } = await supabase.from('harvest_logs').upsert(payload);
        
        if (error) {
          console.warn('Network error while saving to server, keeping local offline backup:', error.message);
        } else {
          await localDb.markAsSynced(harvest.id);
        }
      } catch (err: any) {
        console.warn('Network or database error while saving to server, keeping local offline backup:', err.message);
      }
    }
  },

  deleteHarvest: async (id: string) => {
    // Retrieve from local DB or remote
    let harvest: OfflineHarvestLog | undefined;
    
    const localLogs = await localDb.getAllLogs();
    harvest = localLogs.find(l => l.id === id);
    
    if (!harvest && navigator.onLine) {
      const { data } = await supabase.from('harvest_logs').select('*').eq('id', id).single();
      if (data) harvest = data;
    }
    
    if (!harvest) return;

    // Check week status if online
    if (navigator.onLine) {
      const week = await storage.getWeek(harvest.semana_id);
      if (week.status !== WeekStatus.OPEN) {
        throw new Error(`Semana ${week.status}. Não é possível excluir lançamentos.`);
      }
    }

    // Delete locally and remotely
    await localDb.deleteLog(id);

    if (navigator.onLine) {
      const { error } = await supabase.from('harvest_logs').delete().eq('id', id);
      if (error) throw new Error('Erro ao excluir no servidor: ' + error.message);
    }
  },

  syncOfflineLogs: async (): Promise<void> => {
    if (!navigator.onLine) return;

    try {
      const unsynced = await localDb.getUnsyncedLogs();
      if (unsynced.length === 0) return;

      console.log(`Syncing ${unsynced.length} offline logs...`);

      for (const log of unsynced) {
        const { synced, ...payload } = log;
        const { error } = await supabase.from('harvest_logs').upsert(payload);
        
        if (error) {
          console.error(`Error syncing log ${log.id}:`, error.message);
          if (error.message.includes('not found') || error.message.includes('unauthorized') || error.message.includes('JWT')) {
            window.dispatchEvent(new CustomEvent('auth_sync_error', { detail: log }));
          }
        } else {
          await localDb.markAsSynced(log.id);
        }
      }
    } catch (err) {
      console.error('Error in syncOfflineLogs:', err);
    }
  },

  getWeeks: async (): Promise<HarvestWeek[]> => {
    const { data } = await supabase.from('harvest_weeks').select('*').order('id', { ascending: false });
    return data || [];
  },

  getBanks: async (forceRefresh = false): Promise<Bank[]> => {
    if (!forceRefresh && !shouldFetch('banks')) return cache.banks!;

    const { data } = await supabase.from('banks').select('*').order('nome');
    
    cache.banks = data || [];
    cache.lastFetch.banks = Date.now();
    return cache.banks;
  },

  saveBank: async (bank: Partial<Bank>) => {
    const { error } = await supabase.from('banks').upsert(bank);
    if (error) throw new Error('Erro ao salvar banco: ' + error.message);
    cache.lastFetch.banks = 0; // Invalidate cache
  },

  deleteBank: async (id: string) => {
    const { error } = await supabase.from('banks').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir banco: ' + error.message);
    cache.lastFetch.banks = 0; // Invalidate cache
  }
};
