import { supabase } from '@/lib/supabase';
import { localStore } from './localStore';
import type { DataStore, LocalTools } from './store';
import { createSupabaseStore } from './supabaseStore';

/** Ponto único de acesso a dados: Supabase quando configurado, senão local. */
export const store: DataStore = supabase ? createSupabaseStore(supabase) : localStore;

/** Ferramentas de simulação, disponíveis só no modo local. */
export const localTools: LocalTools | null = supabase ? null : localStore;

export type { DataStore, LocalTools } from './store';
