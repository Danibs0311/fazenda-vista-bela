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
    const { error } = await supabase
      .from('collaborators')
      .upsert(col);

    if (error) throw new Error('Erro ao salvar colaborador: ' + error.message);
    cache.lastFetch.collaborators = 0; // Invalidate cache
  },

  getPrices: async (forceRefresh = false): Promise<CanPriceConfig[]> => {
    if (!forceRefresh && !shouldFetch('prices')) return cache.prices!;

    const { data } = await supabase.from('pricing_config').select('*').order('data_inicio_vigencia', { ascending: false });
    
    cache.prices = data || [];
    cache.lastFetch.prices = Date.now();
    return cache.prices;
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
    // If we have cached prices, we can calculate this locally for speed
    if (cache.prices && !shouldFetch('prices')) {
      const match = cache.prices
        .filter(p => p.data_inicio_vigencia <= date)
        .sort((a, b) => b.data_inicio_vigencia.localeCompare(a.data_inicio_vigencia))[0];
      if (match) return match.valor_lata;
    }

    const { data } = await supabase
      .from('pricing_config')
      .select('*')
      .lte('data_inicio_vigencia', date)
      .order('data_inicio_vigencia', { ascending: false })
      .limit(1);

    return data?.[0]?.valor_lata || 0;
  },

  getHarvests: async (limit = 100): Promise<HarvestLog[]> => {
    // Fetch limited results for "Recent" views
    const { data } = await supabase
      .from('harvest_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
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

  saveHarvest: async (harvest: HarvestLog) => {
    // Optimization: avoid double-fetching week/price if we trust client side check 
    // but keep it for data integrity
    const week = await storage.getWeek(harvest.semana_id);

    if (week.status !== WeekStatus.OPEN) {
      throw new Error(`Semana ${week.status}. Operação bloqueada.`);
    }

    const { error } = await supabase.from('harvest_logs').upsert(harvest);
    if (error) throw new Error('Erro ao salvar colheita: ' + error.message);
  },

  deleteHarvest: async (id: string) => {
    const { data: harvest } = await supabase.from('harvest_logs').select('*').eq('id', id).single();
    if (!harvest) return;

    const week = await storage.getWeek(harvest.semana_id);
    if (week.status !== WeekStatus.OPEN) {
      throw new Error(`Semana ${week.status}. Não é possível excluir lançamentos.`);
    }

    const { error } = await supabase.from('harvest_logs').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir: ' + error.message);
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
