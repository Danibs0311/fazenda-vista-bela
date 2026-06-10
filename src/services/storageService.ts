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
  let cleanOp = (op || '').replace(/\s+/g, ' ').trim().toUpperCase();
  
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
  if (
    cleanOp === 'C/ CORR' || 
    cleanOp === 'C/CORR' || 
    cleanOp === 'CORR' || 
    cleanOp === 'CC' || 
    cleanOp === 'C.CORR' || 
    cleanOp === 'C. CORR' || 
    cleanOp === 'C.CORRENTE' || 
    cleanOp === 'C. CORRENTE'
  ) {
    return 'CORRENTE';
  }
  if (
    cleanOp === 'C/POUP' || 
    cleanOp === 'C/ POUP' || 
    cleanOp === 'POUP' || 
    cleanOp === 'CP' || 
    cleanOp === 'POUPANCA' ||
    cleanOp === 'C.POUP' ||
    cleanOp === 'C. POUP'
  ) {
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
    const getMergedCollaborators = (baseList: Collaborator[]): Collaborator[] => {
      const unsyncedRaw = localStorage.getItem('fvb_unsynced_collaborators');
      if (!unsyncedRaw) return baseList;
      try {
        const unsynced: Collaborator[] = JSON.parse(unsyncedRaw);
        const mergedMap = new Map<string, Collaborator>();
        baseList.forEach(c => mergedMap.set(c.id, c));
        unsynced.forEach(c => mergedMap.set(c.id, c));
        return Array.from(mergedMap.values()).sort((a, b) => (a.id || "").localeCompare(b.id || "", undefined, { numeric: true }));
      } catch (e) {
        return baseList;
      }
    };

    if (!forceRefresh && !shouldFetch('collaborators') && cache.collaborators) {
      return getMergedCollaborators(cache.collaborators);
    }

    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }

      // 1. Get the exact count of rows first with a fast HEAD query
      const { count, error: countErr } = await supabase
        .from('collaborators')
        .select('*', { count: 'exact', head: true });

      if (countErr) throw countErr;

      const totalRows = count || 0;
      const limit = 1000;
      const pages = Math.ceil(totalRows / limit);

      // 2. Fetch all pages concurrently in parallel
      const promises = Array.from({ length: pages }, (_, i) => {
        const from = i * limit;
        const to = from + limit - 1;
        return supabase
          .from('collaborators')
          .select('*')
          .order('nome')
          .range(from, to);
      });

      const results = await Promise.all(promises);
      
      let allCollaborators: Collaborator[] = [];
      for (const res of results) {
        if (res.error) throw res.error;
        if (res.data) {
          allCollaborators = allCollaborators.concat(res.data);
        }
      }

      // Fallback: If for some reason parallel list was empty, try simple single page load
      if (allCollaborators.length === 0) {
        const { data } = await supabase.from('collaborators').select('*').order('nome').limit(limit);
        allCollaborators = data || [];
      }

      cache.collaborators = allCollaborators;
      cache.lastFetch.collaborators = Date.now();
      localStorage.setItem('fvb_collaborators', JSON.stringify(allCollaborators));
      return getMergedCollaborators(allCollaborators);
    } catch (err) {
      console.error('Error fetching collaborators concurrently, loading from localStorage fallback:', err);
      const saved = localStorage.getItem('fvb_collaborators');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Collaborator[];
          cache.collaborators = parsed;
          return getMergedCollaborators(parsed);
        } catch (e) {
          console.error('Failed to parse cached collaborators:', e);
        }
      }
      return getMergedCollaborators(cache.collaborators || []);
    }
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

    // 1. Update the local fvb_collaborators cache immediately
    const saved = localStorage.getItem('fvb_collaborators');
    let localCollabs: Collaborator[] = [];
    if (saved) {
      try {
        localCollabs = JSON.parse(saved);
      } catch (e) {}
    }
    const idx = localCollabs.findIndex(c => c.id === col.id);
    if (idx > -1) {
      localCollabs[idx] = uppercaseCol;
    } else {
      localCollabs.push(uppercaseCol);
    }
    localStorage.setItem('fvb_collaborators', JSON.stringify(localCollabs));
    if (cache.collaborators) {
      const cIdx = cache.collaborators.findIndex(c => c.id === col.id);
      if (cIdx > -1) cache.collaborators[cIdx] = uppercaseCol;
      else cache.collaborators.push(uppercaseCol);
    }

    // 2. Queue for syncing if offline, or if remote upsert fails
    const queueForSync = () => {
      const unsyncedRaw = localStorage.getItem('fvb_unsynced_collaborators');
      let unsynced: Collaborator[] = [];
      if (unsyncedRaw) {
        try {
          unsynced = JSON.parse(unsyncedRaw);
        } catch (e) {}
      }
      const uIdx = unsynced.findIndex(c => c.id === col.id);
      if (uIdx > -1) {
        unsynced[uIdx] = uppercaseCol;
      } else {
        unsynced.push(uppercaseCol);
      }
      localStorage.setItem('fvb_unsynced_collaborators', JSON.stringify(unsynced));
      console.log('Collaborator saved offline / queued for sync:', uppercaseCol.nome);
    };

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('collaborators')
          .upsert(uppercaseCol);

        if (error) {
          console.warn('Database error while saving collaborator, queuing offline:', error.message);
          queueForSync();
        } else {
          // If was unsynced, remove it
          const unsyncedRaw = localStorage.getItem('fvb_unsynced_collaborators');
          if (unsyncedRaw) {
            try {
              let unsynced: Collaborator[] = JSON.parse(unsyncedRaw);
              unsynced = unsynced.filter(c => c.id !== col.id);
              localStorage.setItem('fvb_unsynced_collaborators', JSON.stringify(unsynced));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Network error while saving collaborator, queuing offline:', err);
        queueForSync();
      }
    } else {
      queueForSync();
    }

    cache.lastFetch.collaborators = 0; // Invalidate cache
  },

  deleteCollaborator: async (id: string) => {
    // 1. Remove from local cache
    const saved = localStorage.getItem('fvb_collaborators');
    if (saved) {
      try {
        let localCollabs: Collaborator[] = JSON.parse(saved);
        localCollabs = localCollabs.filter(c => c.id !== id);
        localStorage.setItem('fvb_collaborators', JSON.stringify(localCollabs));
      } catch (e) {}
    }
    if (cache.collaborators) {
      cache.collaborators = cache.collaborators.filter(c => c.id !== id);
    }

    // 2. Remove from unsynced queue if it was created offline and not synced yet
    const unsyncedRaw = localStorage.getItem('fvb_unsynced_collaborators');
    let wasUnsynced = false;
    if (unsyncedRaw) {
      try {
        let unsynced: Collaborator[] = JSON.parse(unsyncedRaw);
        const originalLength = unsynced.length;
        unsynced = unsynced.filter(c => c.id !== id);
        if (unsynced.length < originalLength) {
          wasUnsynced = true;
          localStorage.setItem('fvb_unsynced_collaborators', JSON.stringify(unsynced));
        }
      } catch (e) {}
    }

    // 3. Queue deletion if already synced and offline
    if (!wasUnsynced) {
      const queueDeletion = () => {
        const pendingRaw = localStorage.getItem('fvb_pending_collab_deletions');
        let pending: string[] = [];
        if (pendingRaw) {
          try {
            pending = JSON.parse(pendingRaw);
          } catch (e) {}
        }
        if (!pending.includes(id)) {
          pending.push(id);
          localStorage.setItem('fvb_pending_collab_deletions', JSON.stringify(pending));
        }
      };

      if (navigator.onLine) {
        try {
          const { error } = await supabase
            .from('collaborators')
            .delete()
            .eq('id', id);

          if (error) {
            if (error.code === '23503' || error.message?.includes('violates foreign key constraint') || error.message?.includes('colheitas lançadas')) {
              throw new Error('Este colaborador possui colheitas lançadas e não pode ser excluído.');
            }
            console.warn('Database error while deleting collaborator, queuing deletion:', error.message);
            queueDeletion();
          }
        } catch (err: any) {
          if (err.message?.includes('colheitas lançadas') || err.message?.includes('violates foreign key constraint')) {
            throw err;
          }
          console.warn('Network error while deleting collaborator, queuing deletion:', err);
          queueDeletion();
        }
      } else {
        queueDeletion();
      }
    }

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

  getCurrentPrice: async (date?: string): Promise<number> => {
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

    // 3. Re-evaluate from our local prices array: ALWAYS return the latest price config
    if (prices && prices.length > 0) {
      const sorted = [...prices].sort((a, b) => b.data_inicio_vigencia.localeCompare(a.data_inicio_vigencia));
      return sorted[0].valor_lata;
    }

    // 4. Ultimate fallback query if everything else was empty
    try {
      const { data } = await supabase
        .from('pricing_config')
        .select('*')
        .order('data_inicio_vigencia', { ascending: false })
        .limit(1);

      return data?.[0]?.valor_lata || 0;
    } catch (err) {
      return 0;
    }
  },

  getHarvests: async (limit = 5000): Promise<OfflineHarvestLog[]> => {
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
    let remoteLogs: HarvestLog[] = [];
    if (navigator.onLine) {
      try {
        const { data } = await supabase
          .from('harvest_logs')
          .select('*')
          .eq('semana_id', weekId);
        remoteLogs = data || [];
      } catch (err) {
        console.warn('Failed to fetch harvests by week from remote:', err);
      }
    }
    
    const localLogs = await localDb.getAllLogs();
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
    return mergedList.filter(log => log.semana_id === weekId);
  },

  getWeek: async (weekId: string): Promise<HarvestWeek> => {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.from('harvest_weeks').select('*').eq('id', weekId).single();
        if (error) throw error;
        if (data) {
          // Cache it
          const saved = localStorage.getItem('fvb_weeks');
          let weeks: HarvestWeek[] = [];
          if (saved) {
            try {
              weeks = JSON.parse(saved);
            } catch (e) {}
          }
          const index = weeks.findIndex(w => w.id === weekId);
          if (index > -1) {
            weeks[index] = data;
          } else {
            weeks.push(data);
          }
          localStorage.setItem('fvb_weeks', JSON.stringify(weeks));
          return data;
        }
      } catch (err) {
        console.warn(`Failed to fetch week ${weekId} from network, checking cache:`, err);
      }
    }

    // Fallback: search in cached weeks
    const saved = localStorage.getItem('fvb_weeks');
    if (saved) {
      try {
        const weeks: HarvestWeek[] = JSON.parse(saved);
        const cached = weeks.find(w => w.id === weekId);
        if (cached) return cached;
      } catch (e) {}
    }

    // If still not found, return a virtual open week WITHOUT saving to database/cache
    const range = getWeekRange(weekId);
    return {
      id: range.id,
      data_inicio: range.start,
      data_fim: range.end,
      status: WeekStatus.OPEN
    };
  },

  saveWeek: async (week: HarvestWeek) => {
    // 1. Update local cache
    const saved = localStorage.getItem('fvb_weeks');
    let weeks: HarvestWeek[] = [];
    if (saved) {
      try {
        weeks = JSON.parse(saved);
      } catch (e) {}
    }
    const index = weeks.findIndex(w => w.id === week.id);
    if (index > -1) {
      weeks[index] = week;
    } else {
      weeks.push(week);
    }
    localStorage.setItem('fvb_weeks', JSON.stringify(weeks));

    // 2. Try online
    if (navigator.onLine) {
      const { error } = await supabase.from('harvest_weeks').upsert(week);
      if (error) throw new Error('Erro ao salvar semana: ' + error.message);
    }
  },

  saveHarvest: async (harvest: OfflineHarvestLog) => {
    // 1. Get week info (virtual, cached, or remote)
    const week = await storage.getWeek(harvest.semana_id);
    
    // 2. Validate week status
    if (week.status !== WeekStatus.OPEN) {
      let statusStr = 'FECHADA';
      if (week.status === WeekStatus.CLOSED) statusStr = 'FECHADA';
      else if (week.status === WeekStatus.IN_CONFERENCE) statusStr = 'EM CONFERÊNCIA';
      else if (week.status === WeekStatus.PAID) statusStr = 'PAGA';
      throw new Error(`SEMANA COM STATUS '${statusStr}'. OPERAÇÃO BLOQUEADA.`);
    }

    // 3. Track old week ID if this is an edit and the week is changing
    let oldWeekId: string | null = null;
    const localLogs = await localDb.getAllLogs();
    const existing = localLogs.find(l => l.id === harvest.id);
    if (existing) {
      oldWeekId = existing.semana_id;
    } else if (navigator.onLine) {
      try {
        const { data } = await supabase.from('harvest_logs').select('semana_id').eq('id', harvest.id).single();
        if (data) oldWeekId = data.semana_id;
      } catch (e) {}
    }

    // 4. Ensure week record is saved in database and local cache now that it has a harvest
    await storage.saveWeek(week);

    // 5. Save the harvest log locally
    const offlineLog: OfflineHarvestLog = {
      ...harvest,
      synced: false
    };
    await localDb.saveLog(offlineLog);

    // 6. Try saving to Supabase if online
    if (navigator.onLine) {
      try {
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

    // 7. Cleanup old week if it's now empty due to this update
    if (oldWeekId && oldWeekId !== harvest.semana_id) {
      const remaining = await storage.getHarvestsByWeek(oldWeekId);
      if (remaining.length === 0) {
        // Delete week from local cache
        const saved = localStorage.getItem('fvb_weeks');
        if (saved) {
          try {
            let weeks: HarvestWeek[] = JSON.parse(saved);
            weeks = weeks.filter(w => w.id !== oldWeekId);
            localStorage.setItem('fvb_weeks', JSON.stringify(weeks));
          } catch (e) {}
        }
        // Delete week from remote
        if (navigator.onLine) {
          try {
            await supabase.from('harvest_weeks').delete().eq('id', oldWeekId);
          } catch (e) {
            console.warn('Failed to delete old week from remote after moving harvest:', e);
          }
        }
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

    // Check week status using getWeek (falls back to local cache when offline)
    const week = await storage.getWeek(harvest.semana_id);
    if (week.status !== WeekStatus.OPEN) {
      let statusStr = 'FECHADA';
      if (week.status === WeekStatus.CLOSED) statusStr = 'FECHADA';
      else if (week.status === WeekStatus.IN_CONFERENCE) statusStr = 'EM CONFERÊNCIA';
      else if (week.status === WeekStatus.PAID) statusStr = 'PAGA';
      throw new Error(`SEMANA COM STATUS '${statusStr}'. NÃO É POSSÍVEL EXCLUIR LANÇAMENTOS.`);
    }

    // Delete locally
    await localDb.deleteLog(id);

    // Queue remote deletion if offline or connection fails
    const queueDeletion = () => {
      const pendingRaw = localStorage.getItem('fvb_pending_deletions');
      let pending: string[] = [];
      if (pendingRaw) {
        try {
          pending = JSON.parse(pendingRaw);
        } catch (e) {}
      }
      if (!pending.includes(id)) {
        pending.push(id);
        localStorage.setItem('fvb_pending_deletions', JSON.stringify(pending));
      }
      console.log('Harvest deletion queued offline:', id);
    };

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from('harvest_logs').delete().eq('id', id);
        if (error) {
          console.warn('Failed to delete on server, queuing deletion:', error.message);
          queueDeletion();
        }
      } catch (err) {
        console.warn('Network error while deleting, queuing deletion:', err);
        queueDeletion();
      }
    } else {
      queueDeletion();
    }

    // Check if week is now empty
    const remaining = await storage.getHarvestsByWeek(harvest.semana_id);
    if (remaining.length === 0) {
      // Delete from local cache
      const saved = localStorage.getItem('fvb_weeks');
      if (saved) {
        try {
          let weeks: HarvestWeek[] = JSON.parse(saved);
          weeks = weeks.filter(w => w.id !== harvest!.semana_id);
          localStorage.setItem('fvb_weeks', JSON.stringify(weeks));
        } catch (e) {}
      }

      // Delete from remote if online
      if (navigator.onLine) {
        try {
          await supabase.from('harvest_weeks').delete().eq('id', harvest.semana_id);
        } catch (e) {
          console.warn('Failed to delete week from remote after deleting last harvest:', e);
        }
      }
    }
  },

  syncOfflineLogs: async (): Promise<void> => {
    if (!navigator.onLine) return;

    try {
      let syncedAny = false;

      // 1. Sync Pending Harvest Deletions
      const pendingDeletionsRaw = localStorage.getItem('fvb_pending_deletions');
      if (pendingDeletionsRaw) {
        try {
          const pendingDeletions: string[] = JSON.parse(pendingDeletionsRaw);
          if (pendingDeletions.length > 0) {
            console.log(`Syncing ${pendingDeletions.length} pending harvest deletions...`);
            const successfulDeletions: string[] = [];
            for (const id of pendingDeletions) {
              const { error } = await supabase.from('harvest_logs').delete().eq('id', id);
              if (!error) {
                successfulDeletions.push(id);
                syncedAny = true;
              } else {
                console.error(`Error deleting harvest log ${id} on server during sync:`, error.message);
              }
            }
            const remaining = pendingDeletions.filter(id => !successfulDeletions.includes(id));
            localStorage.setItem('fvb_pending_deletions', JSON.stringify(remaining));
          }
        } catch (e) {
          console.error('Error processing pending deletions queue:', e);
        }
      }

      // 2. Sync Pending Collaborator Deletions
      const pendingCollabDeletionsRaw = localStorage.getItem('fvb_pending_collab_deletions');
      if (pendingCollabDeletionsRaw) {
        try {
          const pendingCollabDeletions: string[] = JSON.parse(pendingCollabDeletionsRaw);
          if (pendingCollabDeletions.length > 0) {
            console.log(`Syncing ${pendingCollabDeletions.length} pending collaborator deletions...`);
            const successfulDeletions: string[] = [];
            for (const id of pendingCollabDeletions) {
              const { error } = await supabase
                .from('collaborators')
                .delete()
                .eq('id', id);
              if (!error) {
                successfulDeletions.push(id);
                syncedAny = true;
              } else {
                console.error(`Error deleting collaborator ${id} on server during sync:`, error.message);
              }
            }
            const remaining = pendingCollabDeletions.filter(id => !successfulDeletions.includes(id));
            localStorage.setItem('fvb_pending_collab_deletions', JSON.stringify(remaining));
          }
        } catch (e) {
          console.error('Error processing pending collaborator deletions queue:', e);
        }
      }

      // 3. Sync Unsynced Collaborators
      const unsyncedCollabsRaw = localStorage.getItem('fvb_unsynced_collaborators');
      if (unsyncedCollabsRaw) {
        try {
          const unsyncedCollabs: Collaborator[] = JSON.parse(unsyncedCollabsRaw);
          if (unsyncedCollabs.length > 0) {
            console.log(`Syncing ${unsyncedCollabs.length} unsynced collaborators...`);
            const successfulCollabs: string[] = [];
            for (const col of unsyncedCollabs) {
              const { error } = await supabase.from('collaborators').upsert(col);
              if (!error) {
                successfulCollabs.push(col.id);
                syncedAny = true;
              } else {
                console.error(`Error syncing collaborator ${col.id} (${col.nome}):`, error.message);
              }
            }
            const remaining = unsyncedCollabs.filter(col => !successfulCollabs.includes(col.id));
            localStorage.setItem('fvb_unsynced_collaborators', JSON.stringify(remaining));
          }
        } catch (e) {
          console.error('Error processing unsynced collaborators queue:', e);
        }
      }

      // 4. Sync Unsynced Harvest Logs (IndexedDB)
      const unsyncedLogs = await localDb.getUnsyncedLogs();
      if (unsyncedLogs.length > 0) {
        console.log(`Syncing ${unsyncedLogs.length} unsynced harvest logs...`);
        for (const log of unsyncedLogs) {
          // Get week (check local/cache/db)
          const week = await storage.getWeek(log.semana_id);

          // Ensure the week record exists on the remote Supabase DB
          const { error: weekErr } = await supabase.from('harvest_weeks').upsert(week);
          if (weekErr) {
            console.error(`Error syncing week ${week.id} for log ${log.id}:`, weekErr.message);
            continue;
          }

          // Sync harvest log
          const { synced, ...payload } = log;
          const { error } = await supabase.from('harvest_logs').upsert(payload);
          
          if (error) {
            console.error(`Error syncing log ${log.id}:`, error.message);
            if (error.message.includes('not found') || error.message.includes('unauthorized') || error.message.includes('JWT')) {
              window.dispatchEvent(new CustomEvent('auth_sync_error', { detail: log }));
            }
          } else {
            await localDb.markAsSynced(log.id);
            syncedAny = true;
          }
        }
      }

      if (syncedAny) {
        window.dispatchEvent(new Event('offline-sync-completed'));
      }
    } catch (err) {
      console.error('Error in syncOfflineLogs:', err);
    }
  },

  getWeeks: async (): Promise<HarvestWeek[]> => {
    try {
      const { data, error } = await supabase.from('harvest_weeks').select('*').order('id', { ascending: false });
      if (error) throw error;
      
      const weeks = data || [];
      localStorage.setItem('fvb_weeks', JSON.stringify(weeks));
      return weeks;
    } catch (err) {
      console.warn('Failed to fetch weeks from remote, loading from localStorage fallback:', err);
      const saved = localStorage.getItem('fvb_weeks');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse cached weeks:', e);
        }
      }
      return [];
    }
  },

  getBanks: async (forceRefresh = false): Promise<Bank[]> => {
    if (!forceRefresh && !shouldFetch('banks') && cache.banks) return cache.banks;

    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }
      const { data, error } = await supabase.from('banks').select('*').order('nome');
      if (error) throw error;
      
      cache.banks = data || [];
      cache.lastFetch.banks = Date.now();
      localStorage.setItem('fvb_banks', JSON.stringify(cache.banks));
      return cache.banks;
    } catch (err) {
      console.warn('Failed to fetch banks, loading from localStorage fallback:', err);
      const saved = localStorage.getItem('fvb_banks');
      if (saved) {
        try {
          cache.banks = JSON.parse(saved);
          return cache.banks!;
        } catch (e) {
          console.error('Failed to parse cached banks:', e);
        }
      }
      return cache.banks || [];
    }
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
