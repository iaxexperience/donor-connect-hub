import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const invokeFunction = async (name: string, body: Record<string, unknown> = {}) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Function ${name} failed`);
  return data;
};

export const bbService = {
  /** Fetch and store BB bank transactions */
  async syncTransactions(params?: { dataInicio?: string; dataFim?: string }) {
    return invokeFunction('bb-fetch-transactions', params || {});
  },

  /** Reconcile bank transactions with pending donations */
  async reconcile() {
    return invokeFunction('bb-reconcile');
  },

  /** Full sync: fetch + reconcile */
  async fullSync(params?: { dataInicio?: string; dataFim?: string }) {
    const fetchResult = await bbService.syncTransactions(params);
    const reconcileResult = await bbService.reconcile();
    return { fetch: fetchResult, reconcile: reconcileResult };
  },

  /** Get bank transactions from DB */
  async getTransactions(filters?: { matched?: boolean; limit?: number; since?: string }) {
    let query = supabase
      .from('bank_transactions')
      .select('*')
      .eq('source', 'banco_brasil')
      .order('date', { ascending: false });

    if (filters?.matched !== undefined) query = query.eq('matched', filters.matched);
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.since) query = query.gte('date', filters.since);

    const { data, error } = await query;
    if (error) {
      if (error.message.includes('Could not find the table') || error.code === '42P01') {
        console.warn('Tabela bank_transactions não existe ainda. Retornando vazio.');
        return [];
      }
      throw error;
    }
    return data || [];
  },

  /** Get integration logs */
  async getLogs(limit = 50) {
    const { data, error } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('source', 'banco_brasil')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (error.message?.includes('Could not find') || error.code === '42P01') return [];
      throw error;
    }
    return data || [];
  },

  /** Get stats */
  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const defaultStats = { totalToday: 0, totalAll: 0, matched: 0, unmatched: 0, total: 0 };

    const { data: todayTx, error: err1 } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('source', 'banco_brasil')
      .eq('type', 'credit')
      .gte('date', `${today}T00:00:00`);

    if (err1 && (err1.message?.includes('Could not find') || err1.code === '42P01')) {
      return defaultStats;
    }

    const { data: allTx } = await supabase
      .from('bank_transactions')
      .select('amount, matched')
      .eq('source', 'banco_brasil')
      .eq('type', 'credit');

    const totalToday = todayTx?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const totalAll = allTx?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const matched = allTx?.filter(t => t.matched).length || 0;
    const unmatched = (allTx?.length || 0) - matched;

    return { totalToday, totalAll, matched, unmatched, total: allTx?.length || 0 };
  }
};
