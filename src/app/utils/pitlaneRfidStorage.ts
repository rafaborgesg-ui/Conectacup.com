import { createClient, getCurrentUser } from './supabase/client';
import { getStockEntries } from './storage';
import {
  DEFAULT_PITLANE_GATE,
  createPitlaneId,
  createPitlanePassageFromEvents,
  createSimulatedPitlaneEvents,
  mapStockEntryToPitlaneTire,
  normalizeRfidValue,
  type PitlaneAuditLog,
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
  passages: PitlanePassage[];
  auditLogs: PitlaneAuditLog[];
}

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

async function mirrorPassageToSupabase(passage: PitlanePassage) {
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
    id: passage.session.id,
    gate_id: passage.session.gateId,
    etapa_id: passage.session.etapaId || null,
    sessao_id: passage.session.sessaoId || null,
    started_at: passage.session.startedAt,
    ended_at: passage.session.endedAt,
    status: passage.session.status,
    confidence_score: passage.session.confidenceScore
  });

  await trySupabaseInsert('rfid_read_session_tags', passage.session.tags.map(tag => ({
    id: tag.id,
    session_id: passage.session.id,
    epc: tag.epc,
    pneu_id: tag.pneuId || null,
    antenna_id: tag.antennaIds.join(','),
    rssi_max: tag.rssiMax,
    read_count: tag.readCount,
    first_seen_at: tag.firstSeenAt,
    last_seen_at: tag.lastSeenAt,
    confidence_score: tag.confidenceScore
  })));

  await trySupabaseInsert('pitlane_passages', {
    id: passage.id,
    read_session_id: passage.readSessionId,
    etapa_id: passage.etapaId || null,
    sessao_id: passage.sessaoId || null,
    piloto_id: passage.pilotoId || null,
    carro_id: passage.carroId || null,
    numero_carro: passage.numeroCarro || null,
    status: passage.status,
    leitura_percentual: passage.leituraPercentual,
    comentario: passage.comentario,
    validado_por: passage.validadoPor || null,
    validado_em: passage.validadoEm || null,
    created_at: passage.createdAt,
    updated_at: passage.updatedAt
  });

  await trySupabaseInsert('pitlane_passage_tires', passage.tires.map(tire => ({
    id: tire.id,
    passage_id: passage.id,
    pneu_id: tire.pneuId || null,
    epc: tire.epc,
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

export async function getPitlaneState(): Promise<PitlaneState> {
  return readLocalState();
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

export async function ingestPitlaneEvents(rawEvents: PitlaneRawEventInput[]): Promise<PitlanePassage> {
  const state = readLocalState();
  const gate = state.gates[0] || DEFAULT_PITLANE_GATE;
  const tires = await getPitlaneTires();
  const passage = createPitlanePassageFromEvents(rawEvents, tires, gate);
  const nextState = {
    ...state,
    passages: [passage, ...state.passages].slice(0, 500)
  };

  writeLocalState(nextState);
  await mirrorPassageToSupabase(passage);
  return passage;
}

export async function simulatePitlanePassage(scenario: PitlaneSimulationScenario = 'validado'): Promise<PitlanePassage> {
  const state = readLocalState();
  const gate = state.gates[0] || DEFAULT_PITLANE_GATE;
  const tires = await getPitlaneTires();
  const selectedTires = selectSimulationTires(tires, scenario);
  const events = createSimulatedPitlaneEvents(selectedTires, scenario);
  const lookupTires = [
    ...tires,
    ...selectedTires.filter(selected => !tires.some(tire => tire.barcode === selected.barcode))
  ];

  const passage = createPitlanePassageFromEvents(events, lookupTires, gate);
  const nextState = {
    ...state,
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
    id: auditLog.id,
    passage_id: auditLog.passageId,
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
