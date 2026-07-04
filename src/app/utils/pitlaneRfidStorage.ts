import { createClient, getCurrentUser } from './supabase/client';
import { getStockEntries, getTireModels } from './storage';
import {
  DEFAULT_PITLANE_GATE,
  createPitlaneId,
  createPitlanePassageFromEvents,
  createSimulatedPitlaneEvents,
  mapTireModelToPitlaneModel,
  mapStockEntryToPitlaneTire,
  normalizeRfidValue,
  type PitlaneAuditLog,
  type PitlaneCarTag,
  type PitlaneGateConfig,
  type PitlanePassage,
  type PitlanePassageStatus,
  type PitlaneRawEventInput,
  type PitlaneSimulationScenario,
  type PitlaneTireLookup
} from './pitlaneRfid';

const STORAGE_KEY = 'conectacup-pitlane-rfid-state-v1';

interface PitlaneState {
  gates: PitlaneGateConfig[];
  carTags: PitlaneCarTag[];
  passages: PitlanePassage[];
  auditLogs: PitlaneAuditLog[];
}

export type PitlaneCarTagInput = Partial<PitlaneCarTag> & {
  epc: string;
  piloto: string;
  numeroCarro: string;
};

export interface PitlaneCorrectionInput {
  passageId: string;
  piloto?: string;
  carro?: string;
  numeroCarro?: string;
  status?: PitlanePassageStatus;
  comentario: string;
}

function getEmptyState(): PitlaneState {
  return {
    gates: [DEFAULT_PITLANE_GATE],
    carTags: [],
    passages: [],
    auditLogs: []
  };
}

function readLocalState(): PitlaneState {
  if (typeof window === 'undefined') return getEmptyState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getEmptyState();
    const parsed = JSON.parse(raw) as PitlaneState;

    return {
      gates: parsed.gates?.length ? parsed.gates : [DEFAULT_PITLANE_GATE],
      carTags: Array.isArray(parsed.carTags) ? parsed.carTags : [],
      passages: Array.isArray(parsed.passages) ? parsed.passages : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : []
    };
  } catch (error) {
    console.warn('Erro ao ler estado local do Controle Pitlane RFID:', error);
    return getEmptyState();
  }
}

function writeLocalState(state: PitlaneState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('pitlane-rfid-updated'));
}

function toSupabaseUuid(localId?: string | null): string | undefined {
  const match = String(localId || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  if (match) return match[0];
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined;
}

async function trySupabaseInsert(table: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      console.info(`Pitlane RFID: tabela ${table} ainda não disponível ou sem permissão:`, error.message);
    }
  } catch (error) {
    console.info(`Pitlane RFID: insert em ${table} ignorado no modo mock.`, error);
  }
}

async function trySupabaseUpsert(table: string, payload: Record<string, unknown>, onConflict = 'id') {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(table).upsert(payload, { onConflict });
    if (error) {
      console.info(`Pitlane RFID: upsert em ${table} ainda não disponível ou sem permissão:`, error.message);
    }
  } catch (error) {
    console.info(`Pitlane RFID: upsert em ${table} ignorado no modo mock.`, error);
  }
}

async function trySupabaseDelete(table: string, column: string, value: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(table).delete().eq(column, value);
    if (error) {
      console.info(`Pitlane RFID: delete em ${table} ainda não disponível ou sem permissão:`, error.message);
    }
  } catch (error) {
    console.info(`Pitlane RFID: delete em ${table} ignorado no modo mock.`, error);
  }
}

function mapCarTagRow(row: any): PitlaneCarTag {
  return {
    id: row.id,
    epc: normalizeRfidValue(row.epc),
    pilotoId: row.piloto_id || undefined,
    piloto: row.piloto || '',
    carroId: row.carro_id || undefined,
    carro: row.carro || undefined,
    numeroCarro: row.numero_carro || '',
    etapaId: row.etapa_id || undefined,
    sessaoId: row.sessao_id || undefined,
    ativo: row.ativo !== false,
    observacao: row.observacao || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

function mergeCarTags(localTags: PitlaneCarTag[], remoteTags: PitlaneCarTag[]): PitlaneCarTag[] {
  const byId = new Map<string, PitlaneCarTag>();

  [...localTags, ...remoteTags].forEach(tag => {
    if (!tag?.id) return;
    const current = byId.get(tag.id);
    if (!current || new Date(tag.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
      byId.set(tag.id, tag);
    }
  });

  return Array.from(byId.values()).sort((a, b) => {
    if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

async function fetchPitlaneCarTagsFromSupabase(): Promise<PitlaneCarTag[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pitlane_car_tags')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.info('Pitlane RFID: tabela pitlane_car_tags ainda não disponível ou sem permissão:', error.message);
      return [];
    }

    return Array.isArray(data) ? data.map(mapCarTagRow) : [];
  } catch (error) {
    console.info('Pitlane RFID: leitura de pitlane_car_tags ignorada no modo mock.', error);
    return [];
  }
}

async function mirrorPassageToSupabase(passage: PitlanePassage) {
  const readSessionDbId = toSupabaseUuid(passage.session.id);
  const passageDbId = toSupabaseUuid(passage.id);

  await trySupabaseInsert('rfid_raw_events', passage.session.rawEvents.map(event => ({
    reader_id: event.readerId,
    antenna_id: event.antennaId,
    epc: event.epc,
    rssi: event.rssi ?? null,
    seen_count: event.seenCount ?? 1,
    timestamp: event.timestamp,
    payload_original: event.raw || {}
  })));

  await trySupabaseInsert('rfid_read_sessions', {
    id: readSessionDbId,
    gate_id: passage.session.gateId,
    etapa_id: passage.session.etapaId || null,
    sessao_id: passage.session.sessaoId || null,
    started_at: passage.session.startedAt,
    ended_at: passage.session.endedAt,
    status: passage.session.status,
    confidence_score: passage.session.confidenceScore
  });

  await trySupabaseInsert('rfid_read_session_tags', passage.session.tags.map(tag => ({
    id: toSupabaseUuid(tag.id),
    session_id: readSessionDbId,
    epc: tag.epc,
    barcode: tag.barcode || null,
    cai: tag.cai || null,
    pneu_id: tag.pneuId || null,
    car_tag_id: tag.carTag?.id || null,
    tag_tipo: tag.kind,
    antenna_id: tag.antennaIds.join(','),
    rssi_max: tag.rssiMax,
    read_count: tag.readCount,
    first_seen_at: tag.firstSeenAt,
    last_seen_at: tag.lastSeenAt,
    confidence_score: tag.confidenceScore
  })));

  await trySupabaseInsert('pitlane_passages', {
    id: passageDbId,
    read_session_id: readSessionDbId,
    etapa_id: passage.etapaId || null,
    sessao_id: passage.sessaoId || null,
    car_tag_id: passage.carTagId || null,
    car_tag_epc: passage.carTagEpc || null,
    piloto: passage.piloto || null,
    piloto_id: passage.pilotoId || null,
    carro: passage.carro || null,
    carro_id: passage.carroId || null,
    numero_carro: passage.numeroCarro || null,
    expected_piloto: passage.expectedPiloto || null,
    expected_numero_carro: passage.expectedNumeroCarro || null,
    status: passage.status,
    leitura_percentual: passage.leituraPercentual,
    comentario: passage.comentario,
    validado_por: passage.validadoPor || null,
    validado_em: passage.validadoEm || null,
    created_at: passage.createdAt,
    updated_at: passage.updatedAt
  });

  await trySupabaseInsert('pitlane_passage_tires', passage.tires.map(tire => ({
    id: toSupabaseUuid(tire.id),
    passage_id: passageDbId,
    pneu_id: tire.pneuId || null,
    epc: tire.epc,
    barcode: tire.barcode || null,
    cai: tire.tire?.cai || null,
    modelo: tire.tire?.modelo || null,
    piloto_pneu: tire.tire?.piloto || null,
    numero_carro_pneu: tire.tire?.numeroCarro || null,
    posicao_sugerida: tire.posicaoSugerida,
    status_validacao: tire.statusValidacao
  })));
}

export async function getPitlaneTires(): Promise<PitlaneTireLookup[]> {
  const entries = await getStockEntries();
  return entries
    .filter(entry => entry.barcode && /^\d{7,8}$/.test(entry.barcode))
    .map(mapStockEntryToPitlaneTire);
}

export async function getPitlaneCarTags(): Promise<PitlaneCarTag[]> {
  const state = readLocalState();
  const remoteTags = await fetchPitlaneCarTagsFromSupabase();
  const carTags = remoteTags.length > 0
    ? mergeCarTags(state.carTags, remoteTags)
    : state.carTags;

  if (remoteTags.length > 0 && JSON.stringify(carTags) !== JSON.stringify(state.carTags)) {
    writeLocalState({ ...state, carTags });
  }

  return carTags;
}

export async function getPitlaneState(): Promise<PitlaneState> {
  const state = readLocalState();
  const remoteTags = await fetchPitlaneCarTagsFromSupabase();

  if (remoteTags.length === 0) return state;

  const carTags = mergeCarTags(state.carTags, remoteTags);
  const nextState = { ...state, carTags };
  if (JSON.stringify(carTags) !== JSON.stringify(state.carTags)) {
    writeLocalState(nextState);
  }
  return nextState;
}

export async function getPitlaneGate(): Promise<PitlaneGateConfig> {
  const state = readLocalState();
  return state.gates[0] || DEFAULT_PITLANE_GATE;
}

export async function savePitlaneGate(gate: PitlaneGateConfig): Promise<PitlaneGateConfig> {
  const state = readLocalState();
  const nextGate = {
    ...gate,
    tempoJanelaMs: Number(gate.tempoJanelaMs) || DEFAULT_PITLANE_GATE.tempoJanelaMs
  };
  const nextState = {
    ...state,
    gates: [nextGate]
  };

  writeLocalState(nextState);
  await trySupabaseInsert('rfid_pitlane_gates', {
    id: nextGate.id,
    nome: nextGate.nome,
    local: nextGate.local,
    reader_id: nextGate.readerId,
    tempo_janela_ms: nextGate.tempoJanelaMs,
    etapa_id: nextGate.etapaId || null,
    sessao_id: nextGate.sessaoId || null,
    ativo: nextGate.ativo
  });

  return nextGate;
}

export async function savePitlaneCarTag(input: PitlaneCarTagInput): Promise<PitlaneCarTag> {
  const state = readLocalState();
  const now = new Date().toISOString();
  const nextTag: PitlaneCarTag = {
    id: input.id || createPitlaneId('car-tag'),
    epc: normalizeRfidValue(input.epc),
    pilotoId: input.pilotoId || undefined,
    piloto: input.piloto.trim(),
    carroId: input.carroId || undefined,
    carro: input.carro?.trim() || undefined,
    numeroCarro: input.numeroCarro.trim(),
    etapaId: input.etapaId?.trim() || undefined,
    sessaoId: input.sessaoId?.trim() || undefined,
    ativo: input.ativo !== false,
    observacao: input.observacao?.trim() || undefined,
    createdAt: input.createdAt || now,
    updatedAt: now
  };

  const nextTags = [
    nextTag,
    ...state.carTags.filter(tag => tag.id !== nextTag.id)
  ];

  writeLocalState({
    ...state,
    carTags: nextTags
  });

  await trySupabaseUpsert('pitlane_car_tags', {
    id: nextTag.id,
    epc: nextTag.epc,
    piloto_id: nextTag.pilotoId || null,
    piloto: nextTag.piloto,
    carro_id: nextTag.carroId || null,
    carro: nextTag.carro || null,
    numero_carro: nextTag.numeroCarro,
    etapa_id: nextTag.etapaId || null,
    sessao_id: nextTag.sessaoId || null,
    ativo: nextTag.ativo,
    observacao: nextTag.observacao || null,
    created_at: nextTag.createdAt,
    updated_at: nextTag.updatedAt
  });

  return nextTag;
}

export async function deletePitlaneCarTag(id: string): Promise<void> {
  const state = readLocalState();
  writeLocalState({
    ...state,
    carTags: state.carTags.filter(tag => tag.id !== id)
  });
  await trySupabaseDelete('pitlane_car_tags', 'id', id);
}

function selectSimulationTires(tires: PitlaneTireLookup[], scenario: PitlaneSimulationScenario): PitlaneTireLookup[] {
  const tiresWithPilot = tires.filter(tire => tire.piloto && normalizeRfidValue(tire.piloto) !== 'SEM PILOTO');
  const grouped = new Map<string, PitlaneTireLookup[]>();
  const mockValidTires: PitlaneTireLookup[] = [
    { pneuId: 'mock-1', barcode: '05249735', piloto: 'Piloto Simulado', carro: 'Carrera Cup', numeroCarro: '11', modelo: 'Slick 992 Dianteiro', lado: 'DD' },
    { pneuId: 'mock-2', barcode: '05273958', piloto: 'Piloto Simulado', carro: 'Carrera Cup', numeroCarro: '11', modelo: 'Slick 992 Dianteiro', lado: 'DE' },
    { pneuId: 'mock-3', barcode: '05364339', piloto: 'Piloto Simulado', carro: 'Carrera Cup', numeroCarro: '11', modelo: 'Slick 992 Traseiro', lado: 'TE' },
    { pneuId: 'mock-4', barcode: '05368463', piloto: 'Piloto Simulado', carro: 'Carrera Cup', numeroCarro: '11', modelo: 'Slick 992 Traseiro', lado: 'TD' }
  ];

  tiresWithPilot.forEach(tire => {
    const key = `${normalizeRfidValue(tire.piloto)}|${normalizeRfidValue(tire.numeroCarro || tire.carro || '')}`;
    const group = grouped.get(key) || [];
    group.push(tire);
    grouped.set(key, group);
  });

  const samePilotGroup = Array.from(grouped.values()).find(group => group.length >= 4);

  if (scenario === 'conflito') {
    const groups = Array.from(grouped.values()).filter(group => group.length > 0);
    if (groups.length >= 2) {
      return [...groups[0].slice(0, 3), groups[1][0]];
    }
    return [
      ...mockValidTires.slice(0, 3),
      { pneuId: 'mock-5', barcode: '05410678', piloto: 'Piloto Conflitante', carro: 'Carrera Cup', numeroCarro: '54', modelo: 'Slick 992', lado: 'TD' }
    ];
  }

  if (samePilotGroup) return samePilotGroup.slice(0, 4);
  return mockValidTires;
}

function selectSimulationCarTag(carTags: PitlaneCarTag[], selectedTires: PitlaneTireLookup[]): PitlaneCarTag {
  const referenceTire = selectedTires.find(tire => tire.piloto || tire.numeroCarro) || selectedTires[0];
  const pilotKey = normalizeRfidValue(referenceTire?.piloto || '');
  const numberKey = normalizeRfidValue(referenceTire?.numeroCarro || '');
  const existing = carTags.find(tag =>
    tag.ativo !== false &&
    normalizeRfidValue(tag.piloto) === pilotKey &&
    normalizeRfidValue(tag.numeroCarro) === numberKey
  );

  if (existing) return existing;

  const now = new Date().toISOString();
  return {
    id: 'car-tag-simulado',
    epc: 'C0DEC0DEC0DEC0DEC0DEC0DE',
    piloto: referenceTire?.piloto || 'Piloto Simulado',
    carro: referenceTire?.carro || 'Carrera Cup',
    numeroCarro: referenceTire?.numeroCarro || '11',
    ativo: true,
    createdAt: now,
    updatedAt: now,
    observacao: 'Tag simulada automaticamente'
  };
}

export async function ingestPitlaneEvents(rawEvents: PitlaneRawEventInput[]): Promise<PitlanePassage> {
  const state = readLocalState();
  const gate = state.gates[0] || DEFAULT_PITLANE_GATE;
  const [tires, tireModels, carTags] = await Promise.all([
    getPitlaneTires(),
    getTireModels(),
    getPitlaneCarTags()
  ]);
  const passage = createPitlanePassageFromEvents(rawEvents, {
    tires,
    tireModels: tireModels.map(mapTireModelToPitlaneModel),
    carTags
  }, gate);
  const nextState = {
    ...state,
    carTags,
    passages: [passage, ...state.passages].slice(0, 500)
  };

  writeLocalState(nextState);
  await mirrorPassageToSupabase(passage);
  return passage;
}

export async function simulatePitlanePassage(scenario: PitlaneSimulationScenario = 'validado'): Promise<PitlanePassage> {
  const state = readLocalState();
  const gate = state.gates[0] || DEFAULT_PITLANE_GATE;
  const [tires, tireModels, carTags] = await Promise.all([
    getPitlaneTires(),
    getTireModels(),
    getPitlaneCarTags()
  ]);
  const selectedTires = selectSimulationTires(tires, scenario);
  const carTag = selectSimulationCarTag(carTags, selectedTires);
  const events = createSimulatedPitlaneEvents(selectedTires, scenario, carTag);
  const lookupTires = [
    ...tires,
    ...selectedTires.filter(selected => !tires.some(tire => tire.barcode === selected.barcode))
  ];

  const passage = createPitlanePassageFromEvents(events, {
    tires: lookupTires,
    tireModels: tireModels.map(mapTireModelToPitlaneModel),
    carTags: [...carTags, carTag]
  }, gate);
  const nextState = {
    ...state,
    carTags,
    passages: [passage, ...state.passages].slice(0, 500)
  };

  writeLocalState(nextState);
  await mirrorPassageToSupabase(passage);
  return passage;
}

export async function correctPitlanePassage(input: PitlaneCorrectionInput): Promise<PitlanePassage | null> {
  const state = readLocalState();
  const index = state.passages.findIndex(passage => passage.id === input.passageId);
  if (index === -1) return null;

  const currentUser = await getCurrentUser();
  const current = state.passages[index];
  const updated: PitlanePassage = {
    ...current,
    piloto: input.piloto || current.piloto,
    carro: input.carro || current.carro,
    numeroCarro: input.numeroCarro || current.numeroCarro,
    status: input.status || 'Validado',
    comentario: input.comentario,
    validadoPor: currentUser?.name || currentUser?.email || 'Operador',
    validadoEm: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const auditLog: PitlaneAuditLog = {
    id: createPitlaneId('audit'),
    passageId: current.id,
    usuario: updated.validadoPor,
    createdAt: updated.updatedAt,
    valorAnterior: {
      piloto: current.piloto,
      carro: current.carro,
      numeroCarro: current.numeroCarro,
      status: current.status
    },
    valorNovo: {
      piloto: updated.piloto,
      carro: updated.carro,
      numeroCarro: updated.numeroCarro,
      status: updated.status
    },
    comentario: input.comentario
  };

  const nextPassages = [...state.passages];
  nextPassages[index] = updated;
  writeLocalState({
    ...state,
    passages: nextPassages,
    auditLogs: [auditLog, ...state.auditLogs]
  });

  await trySupabaseInsert('pitlane_validation_audit', {
    id: toSupabaseUuid(auditLog.id),
    passage_id: toSupabaseUuid(auditLog.passageId),
    usuario: auditLog.usuario || null,
    valor_anterior: auditLog.valorAnterior,
    valor_novo: auditLog.valorNovo,
    comentario: auditLog.comentario,
    created_at: auditLog.createdAt
  });

  return updated;
}

export async function clearPitlaneMockHistory() {
  const state = readLocalState();
  writeLocalState({
    ...state,
    passages: [],
    auditLogs: []
  });
}
