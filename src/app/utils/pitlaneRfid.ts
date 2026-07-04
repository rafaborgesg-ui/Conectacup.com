import type { StockEntry } from './storage';

export type PitlanePassageStatus =
  | 'Validado'
  | 'Incompleto'
  | 'Conflito'
  | 'Tag desconhecida'
  | 'Pendente validação'
  | 'Erro de leitura';

export interface PitlaneRawEventInput {
  readerId: string;
  antennaId: string;
  epc: string;
  barcode?: string;
  rssi?: number;
  seenCount?: number;
  timestamp: string;
  raw?: Record<string, unknown>;
}

export interface PitlaneGateConfig {
  id: string;
  nome: string;
  local: string;
  readerId: string;
  tempoJanelaMs: number;
  etapaId?: string;
  sessaoId?: string;
  ativo: boolean;
}

export interface PitlaneTireLookup {
  pneuId: string;
  barcode: string;
  epc?: string;
  piloto?: string;
  carro?: string;
  numeroCarro?: string;
  modelo?: string;
  lado?: string;
  set?: string;
}

export interface PitlaneSessionTag {
  id: string;
  sessionId: string;
  epc: string;
  barcode?: string;
  pneuId?: string;
  antennaIds: string[];
  rssiMax: number | null;
  readCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  confidenceScore: number;
  tire?: PitlaneTireLookup;
  rawEvents: PitlaneRawEventInput[];
}

export interface PitlaneReadSession {
  id: string;
  gateId: string;
  etapaId?: string;
  sessaoId?: string;
  startedAt: string;
  endedAt: string;
  status: PitlanePassageStatus;
  confidenceScore: number;
  tags: PitlaneSessionTag[];
  rawEvents: PitlaneRawEventInput[];
}

export interface PitlanePassageTire {
  id: string;
  passageId: string;
  pneuId?: string;
  epc: string;
  barcode?: string;
  posicaoSugerida: string;
  statusValidacao: 'ok' | 'desconhecido' | 'conflito' | 'pendente';
  tire?: PitlaneTireLookup;
}

export interface PitlanePassage {
  id: string;
  readSessionId: string;
  etapaId?: string;
  sessaoId?: string;
  pilotoId?: string;
  piloto?: string;
  carroId?: string;
  carro?: string;
  numeroCarro?: string;
  status: PitlanePassageStatus;
  leituraPercentual: number;
  comentario: string;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
  validadoPor?: string;
  validadoEm?: string;
  tires: PitlanePassageTire[];
  session: PitlaneReadSession;
}

export interface PitlaneAuditLog {
  id: string;
  passageId: string;
  usuario?: string;
  createdAt: string;
  valorAnterior: Record<string, unknown>;
  valorNovo: Record<string, unknown>;
  comentario: string;
}

export type PitlaneSimulationScenario =
  | 'validado'
  | 'incompleto'
  | 'conflito'
  | 'tag-desconhecida'
  | 'erro-leitura';

export const DEFAULT_PITLANE_GATE: PitlaneGateConfig = {
  id: 'gate-pitlane-principal',
  nome: 'Pórtico Pitlane 1',
  local: 'Entrada da pista',
  readerId: 'FXR90-01',
  tempoJanelaMs: 3000,
  ativo: true
};

export const PITLANE_STATUS_COLORS: Record<PitlanePassageStatus, string> = {
  Validado: 'bg-green-100 text-green-800 border-green-200',
  Incompleto: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Conflito: 'bg-red-100 text-red-800 border-red-200',
  'Tag desconhecida': 'bg-orange-100 text-orange-800 border-orange-200',
  'Pendente validação': 'bg-slate-100 text-slate-800 border-slate-200',
  'Erro de leitura': 'bg-red-950 text-white border-red-900'
};

const POSITION_LABELS = ['Pneu 1', 'Pneu 2', 'Pneu 3', 'Pneu 4'];

export function createPitlaneId(prefix: string): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

export function normalizeRfidValue(value: string | undefined | null): string {
  return String(value || '').replace(/\s/g, '').trim().toUpperCase();
}

export function isRfidEpc(value: string): boolean {
  return /^[0-9A-F]{24}$/.test(normalizeRfidValue(value));
}

export function decodePitlaneRFID(epcHex: string): { barcode: string; cai: string } | null {
  try {
    const normalizedEpcHex = normalizeRfidValue(epcHex);
    if (!isRfidEpc(normalizedEpcHex)) return null;

    const epcBigInt = BigInt(`0x${normalizedEpcHex}`);
    const serialMask = BigInt('0x3FFFFFFFFF');
    const serial = Number(epcBigInt & serialMask);
    const withoutSerial = epcBigInt >> BigInt(38);
    const itemRefMask = BigInt('0xFFFFFF');
    const itemReference = Number(withoutSerial & itemRefMask);
    const cai = Math.floor(itemReference / 16).toString();
    const barcodeNumber = Math.floor(serial / 4);

    return {
      cai,
      barcode: barcodeNumber.toString().padStart(8, '0')
    };
  } catch {
    return null;
  }
}

export function splitPitlaneRfidBuffer(buffer: string): string[] {
  const normalized = normalizeRfidValue(buffer);
  const chunks: string[] = [];

  for (let index = 0; index + 24 <= normalized.length; index += 24) {
    const candidate = normalized.slice(index, index + 24);
    if (!isRfidEpc(candidate)) break;
    chunks.push(candidate);
  }

  return chunks;
}

export function extractPitlaneRfidTokens(input: string): string[] {
  const rawParts = String(input || '')
    .toUpperCase()
    .split(/[^0-9A-F]+/)
    .filter(Boolean);
  const tokens: string[] = [];

  rawParts.forEach(part => {
    if (part.length === 24 && isRfidEpc(part)) {
      tokens.push(part);
      return;
    }

    if (part.length > 24) {
      splitPitlaneRfidBuffer(part).forEach(token => tokens.push(token));
    }
  });

  return Array.from(new Set(tokens));
}

export function mapStockEntryToPitlaneTire(entry: StockEntry): PitlaneTireLookup {
  return {
    pneuId: entry.id,
    barcode: entry.barcode,
    piloto: entry.pilot || undefined,
    carro: entry.categoria || entry.team || undefined,
    numeroCarro: entry.numero || undefined,
    modelo: entry.model_name,
    lado: entry.lado || undefined,
    set: entry.set_pneu || undefined
  };
}

export function buildTireLookupMap(tires: PitlaneTireLookup[]): Map<string, PitlaneTireLookup> {
  const lookup = new Map<string, PitlaneTireLookup>();

  tires.forEach(tire => {
    if (tire.barcode) lookup.set(normalizeRfidValue(tire.barcode), tire);
    if (tire.epc) lookup.set(normalizeRfidValue(tire.epc), tire);
  });

  return lookup;
}

export function getEventBarcode(event: PitlaneRawEventInput): string | undefined {
  const explicitBarcode = normalizeRfidValue(event.barcode);
  if (/^\d{7,8}$/.test(explicitBarcode)) {
    return explicitBarcode.padStart(8, '0');
  }

  const decoded = decodePitlaneRFID(event.epc);
  return decoded?.barcode;
}

function calculateTagScore(events: PitlaneRawEventInput[]): number {
  const readCount = events.reduce((total, event) => total + Math.max(1, event.seenCount || 1), 0);
  const antennaCount = new Set(events.map(event => event.antennaId)).size;
  const rssiValues = events
    .map(event => event.rssi)
    .filter((value): value is number => typeof value === 'number');
  const rssiMax = rssiValues.length > 0 ? Math.max(...rssiValues) : -90;
  const first = Math.min(...events.map(event => new Date(event.timestamp).getTime()));
  const last = Math.max(...events.map(event => new Date(event.timestamp).getTime()));
  const spanMs = Math.max(1, last - first);
  const temporalScore = Math.max(0, 20 - spanMs / 150);
  const rssiScore = Math.max(0, Math.min(40, rssiMax + 90));

  return Math.round((readCount * 10 + antennaCount * 15 + rssiScore + temporalScore) * 10) / 10;
}

export function aggregatePitlaneSessionTags(
  rawEvents: PitlaneRawEventInput[],
  tireLookup: Map<string, PitlaneTireLookup>,
  sessionId = createPitlaneId('read-session')
): PitlaneSessionTag[] {
  const byEpc = new Map<string, PitlaneRawEventInput[]>();

  rawEvents.forEach(event => {
    const epc = normalizeRfidValue(event.epc);
    if (!epc) return;
    const events = byEpc.get(epc) || [];
    events.push({ ...event, epc });
    byEpc.set(epc, events);
  });

  return Array.from(byEpc.entries()).map(([epc, events]) => {
    const barcode = getEventBarcode(events[0]);
    const tire = barcode ? tireLookup.get(normalizeRfidValue(barcode)) : tireLookup.get(epc);
    const rssiValues = events
      .map(event => event.rssi)
      .filter((value): value is number => typeof value === 'number');

    return {
      id: createPitlaneId('session-tag'),
      sessionId,
      epc,
      barcode,
      pneuId: tire?.pneuId,
      antennaIds: Array.from(new Set(events.map(event => event.antennaId))),
      rssiMax: rssiValues.length > 0 ? Math.max(...rssiValues) : null,
      readCount: events.reduce((total, event) => total + Math.max(1, event.seenCount || 1), 0),
      firstSeenAt: new Date(Math.min(...events.map(event => new Date(event.timestamp).getTime()))).toISOString(),
      lastSeenAt: new Date(Math.max(...events.map(event => new Date(event.timestamp).getTime()))).toISOString(),
      confidenceScore: calculateTagScore(events),
      tire,
      rawEvents: events
    };
  }).sort((a, b) => b.confidenceScore - a.confidenceScore);
}

function getPitlaneStatus(selectedTags: PitlaneSessionTag[], allTags: PitlaneSessionTag[]): PitlanePassageStatus {
  if (allTags.length === 0) return 'Erro de leitura';
  if (allTags.some(tag => !tag.tire)) return 'Tag desconhecida';
  if (selectedTags.length < 4) return 'Incompleto';

  const pilots = new Set(
    selectedTags
      .map(tag => normalizeRfidValue(tag.tire?.piloto))
      .filter(Boolean)
  );
  const numbers = new Set(
    selectedTags
      .map(tag => normalizeRfidValue(tag.tire?.numeroCarro))
      .filter(Boolean)
  );

  if (pilots.size > 1 || numbers.size > 1) return 'Conflito';
  if (selectedTags.length === 4 && pilots.size === 1) return 'Validado';
  return 'Pendente validação';
}

function buildPitlaneComment(status: PitlanePassageStatus, selectedTags: PitlaneSessionTag[], allTags: PitlaneSessionTag[]): string {
  if (status === 'Validado') return 'Passagem validada automaticamente.';
  if (status === 'Incompleto') return `Leitura incompleta: ${selectedTags.length}/4 pneus conhecidos.`;
  if (status === 'Conflito') return 'Pneus vinculados a pilotos ou carros diferentes.';
  if (status === 'Tag desconhecida') return 'Uma ou mais tags não foram localizadas no cadastro de pneus.';
  if (status === 'Erro de leitura') return 'Nenhuma tag válida foi recebida na janela de leitura.';
  if (allTags.length > 4) return 'Mais de 4 tags capturadas; sistema selecionou as 4 mais prováveis.';
  return 'Aguardando validação manual do operador.';
}

export function createPitlanePassageFromEvents(
  rawEvents: PitlaneRawEventInput[],
  tires: PitlaneTireLookup[],
  gate: PitlaneGateConfig = DEFAULT_PITLANE_GATE
): PitlanePassage {
  const tireLookup = buildTireLookupMap(tires);
  const sessionId = createPitlaneId('read-session');
  const normalizedEvents = rawEvents.map(event => ({
    ...event,
    epc: normalizeRfidValue(event.epc),
    timestamp: event.timestamp || new Date().toISOString()
  }));
  const tags = aggregatePitlaneSessionTags(normalizedEvents, tireLookup, sessionId);
  const selectedTags = tags.slice(0, 4);
  const status = getPitlaneStatus(selectedTags, tags);
  const knownSelectedCount = selectedTags.filter(tag => tag.tire).length;
  const confidenceScore = selectedTags.length > 0
    ? Math.round((selectedTags.reduce((sum, tag) => sum + tag.confidenceScore, 0) / selectedTags.length) * 10) / 10
    : 0;
  const startedAt = normalizedEvents.length
    ? new Date(Math.min(...normalizedEvents.map(event => new Date(event.timestamp).getTime()))).toISOString()
    : new Date().toISOString();
  const endedAt = normalizedEvents.length
    ? new Date(Math.max(...normalizedEvents.map(event => new Date(event.timestamp).getTime()))).toISOString()
    : startedAt;

  const session: PitlaneReadSession = {
    id: sessionId,
    gateId: gate.id,
    etapaId: gate.etapaId,
    sessaoId: gate.sessaoId,
    startedAt,
    endedAt,
    status,
    confidenceScore,
    tags,
    rawEvents: normalizedEvents
  };

  const pilotNames = Array.from(new Set(selectedTags.map(tag => tag.tire?.piloto).filter(Boolean))) as string[];
  const carNumbers = Array.from(new Set(selectedTags.map(tag => tag.tire?.numeroCarro).filter(Boolean))) as string[];
  const cars = Array.from(new Set(selectedTags.map(tag => tag.tire?.carro).filter(Boolean))) as string[];
  const passageId = createPitlaneId('passage');

  return {
    id: passageId,
    readSessionId: session.id,
    etapaId: gate.etapaId,
    sessaoId: gate.sessaoId,
    piloto: pilotNames.length === 1 ? pilotNames[0] : undefined,
    carro: cars.length === 1 ? cars[0] : undefined,
    numeroCarro: carNumbers.length === 1 ? carNumbers[0] : undefined,
    status,
    leituraPercentual: Math.min(100, Math.round((knownSelectedCount / 4) * 100)),
    comentario: buildPitlaneComment(status, selectedTags, tags),
    confidenceScore,
    createdAt: endedAt,
    updatedAt: new Date().toISOString(),
    tires: selectedTags.map((tag, index) => ({
      id: createPitlaneId('passage-tire'),
      passageId,
      pneuId: tag.pneuId,
      epc: tag.epc,
      barcode: tag.barcode,
      posicaoSugerida: tag.tire?.lado || POSITION_LABELS[index] || `Pneu ${index + 1}`,
      statusValidacao: !tag.tire ? 'desconhecido' : status === 'Conflito' ? 'conflito' : status === 'Validado' ? 'ok' : 'pendente',
      tire: tag.tire
    })),
    session
  };
}

export function buildPitlaneRawEvent(
  tire: PitlaneTireLookup,
  index: number,
  overrides: Partial<PitlaneRawEventInput> = {}
): PitlaneRawEventInput {
  const timestamp = overrides.timestamp || new Date(Date.now() + index * 120).toISOString();

  return {
    readerId: overrides.readerId || DEFAULT_PITLANE_GATE.readerId,
    antennaId: overrides.antennaId || `ANT-0${(index % 4) + 1}`,
    epc: overrides.epc || tire.epc || `SIM${tire.barcode.padStart(21, '0')}`.slice(0, 24),
    barcode: tire.barcode,
    rssi: overrides.rssi ?? -48 - index * 3,
    seenCount: overrides.seenCount ?? 4,
    timestamp,
    raw: overrides.raw || { source: 'simulador-pitlane' }
  };
}

export function createSimulatedPitlaneEvents(
  tires: PitlaneTireLookup[],
  scenario: PitlaneSimulationScenario = 'validado'
): PitlaneRawEventInput[] {
  const selected = tires.slice(0, 4);
  const baseEvents = selected.map((tire, index) => buildPitlaneRawEvent(tire, index));

  if (scenario === 'incompleto') {
    return baseEvents.slice(0, 3);
  }

  if (scenario === 'tag-desconhecida') {
    return [
      ...baseEvents.slice(0, 3),
      {
        readerId: DEFAULT_PITLANE_GATE.readerId,
        antennaId: 'ANT-04',
        epc: '0001CA1F0000000000435893',
        rssi: -41,
        seenCount: 3,
        timestamp: new Date(Date.now() + 480).toISOString(),
        raw: { source: 'simulador-pitlane', unknown: true }
      }
    ];
  }

  if (scenario === 'erro-leitura') {
    return [];
  }

  return baseEvents;
}
