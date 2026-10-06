import type {
  BackupData,
  Demand,
  DemandHistoryEntry,
  DemandInput,
  DemandPhoto,
  OccurrencePatch,
  PhotoKind,
  Profile,
  Routine,
  RoutineInput,
  RoutineOccurrence,
} from '@/types/domain';

/**
 * Contrato único de acesso a dados. As telas só conhecem esta interface;
 * existem duas implementações: Supabase (produção) e local (desenvolvimento
 * enquanto o Supabase não estiver configurado).
 */
export interface DataStore {
  readonly mode: 'local' | 'supabase';

  currentUserId(): Promise<string | null>;
  listProfiles(): Promise<Profile[]>;
  updateProfile(id: string, patch: { full_name: string }): Promise<void>;

  listDemands(): Promise<Demand[]>;
  getDemand(id: string): Promise<Demand | null>;
  createDemand(input: DemandInput): Promise<Demand>;
  updateDemand(id: string, patch: Partial<DemandInput>): Promise<Demand>;
  deleteDemand(id: string): Promise<void>;

  listPhotos(demandId?: string): Promise<DemandPhoto[]>;
  addPhoto(demandId: string, kind: PhotoKind, image: Blob): Promise<DemandPhoto>;
  removePhoto(photo: DemandPhoto): Promise<void>;
  photoUrl(photo: DemandPhoto): Promise<string>;

  listHistory(demandId: string): Promise<DemandHistoryEntry[]>;

  listRoutines(): Promise<Routine[]>;
  createRoutine(input: RoutineInput): Promise<Routine>;
  updateRoutine(id: string, patch: Partial<RoutineInput>): Promise<Routine>;
  deleteRoutine(id: string): Promise<void>;

  /** Cria (idempotente) as ocorrências das rotinas ativas entre as datas. */
  generateOccurrences(from: string, until: string): Promise<void>;
  listOccurrences(from: string, until: string): Promise<RoutineOccurrence[]>;
  updateOccurrence(id: string, patch: OccurrencePatch): Promise<void>;

  exportAll(): Promise<BackupData>;

  /** Notifica qualquer alteração (inclusive feita por outro usuário). */
  subscribe(listener: () => void): () => void;
}

/** Recursos só do modo local (simular usuários sem Supabase). */
export interface LocalTools {
  addProfile(fullName: string): Promise<Profile>;
  setCurrentUser(id: string): Promise<void>;
  reset(): Promise<void>;
}
