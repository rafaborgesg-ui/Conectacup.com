import type { StockEntry, TireModel } from './storage';

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
  modelId?: string;
  cai?: string;
  piloto?: string;
  carro?: string;
  numeroCarro?: string;
  modelo?: string;
  modeloCodigo?: string;
  modeloTipo?: string;
  lado?: string;
  set?: string;
  stockEntryFound?: boolean;
}

export interface PitlaneTireModelLookup {
  id: string;
  name: string;
  code?: string;
  type?: string;
  cai?: string;
}

export interface PitlaneCarTag {
  id: string;
  epc: string;
  pilotoId?: string;
  piloto: string;
  carroId?: string;
  carro?: string;
  numeroCarro: string;
  etapaId?: string;
  sessaoId?: string;
  ativo: boolean;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PitlaneLookupContext {
  tires: PitlaneTireLookup[];
  tireModels?: PitlaneTireModelLookup[];
  carTags?: PitlaneCarTag[];
}

export interface PitlaneDecodedRFID {
  barcode: string;
  cai: string;
}

export interface PitlaneSessionTag {
  id: string;
  sessionId: string;
  epc: string;
  barcode?: string;
  cai?: string;
  pneuId?: string;
  kind: 'pneu' | 'carro' | 'desconhecida';
  antennaIds: string[];
  rssiMax: number | null;
  readCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  confidenceScore: number;
  tire?: PitlaneTireLookup;
  carTag?: PitlaneCarTag;
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
  carTagId?: string;
  carTagEpc?: string;
  expectedPiloto?: string;
  expectedNumeroCarro?: string;
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

export function normalizeCAI(value: string | undefined | null): string {
  const numeric = String(value || '').replace(/\D/g, '');
  return numeric.replace(/^0+(?=\d)/, '');
}

function normalizeComparable(value: string | undefined | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}

export function isRfidEpc(value: string): boolean {
  return /^[0-9A-F]{24}$/.test(normalizeRfidValue(value));
}

export function decodePitlaneRFID(epcHex: string): PitlaneDecodedRFID | null {
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

export function extractPitlaneRfidTokens(input: string, knownCarTagTokens: string[] = []): string[] {
  const rawParts = String(input || '')
    .toUpperCase()
    .split(/[^0-9A-Z]+/)
    .filter(Boolean);
  const tokens: string[] = [];
  const knownCarTags = Array.from(
    new Set(knownCarTagTokens.map(tag => normalizeRfidValue(tag)).filter(Boolean))
  ).sort((a, b) => b.length - a.length);

  const pushTokenPart = (part: string) => {
    const normalizedPart = normalizeRfidValue(part);
    if (!normalizedPart) return;

    const exactKnownCarTag = knownCarTags.find(tag => tag === normalizedPart);
    if (exactKnownCarTag) {
      tokens.push(exactKnownCarTag);
      return;
    }

    if (normalizedPart.length === 24 && isRfidEpc(normalizedPart)) {
      tokens.push(normalizedPart);
      return;
    }

    if (normalizedPart.length > 24) {
      const embeddedCarTag = knownCarTags.find(tag =>
        tag.length < 24 && normalizedPart.includes(tag)
      );

      if (embeddedCarTag) {
        const index = normalizedPart.indexOf(embeddedCarTag);
        pushTokenPart(normalizedPart.slice(0, index));
        tokens.push(embeddedCarTag);
        pushTokenPart(normalizedPart.slice(index + embeddedCarTag.length));
        return;
      }

      splitPitlaneRfidBuffer(normalizedPart).forEach(token => tokens.push(token));
    }
  };

  rawParts.forEach(pushTokenPart);

  return Array.from(new Set(tokens));
}

export function mapStockEntryToPitlaneTire(entry: StockEntry): PitlaneTireLookup {
  return {
    pneuId: entry.id,
    barcode: entry.barcode,
    modelId: entry.model_id,
    piloto: entry.pilot || undefined,
    carro: entry.categoria || entry.team || undefined,
    numeroCarro: entry.numero || undefined,
    modelo: entry.model_name,
    modeloTipo: entry.model_type,
    lado: entry.lado || undefined,
    set: entry.set_pneu || undefined,
    stockEntryFound: true
  };
}

export function mapTireModelToPitlaneModel(model: TireModel): PitlaneTireModelLookup {
  return {
    id: model.id,
    name: model.name,
    code: model.code,
    type: model.type,
    cai: model.cai
  };
}

export function buildTireLookupMap(tires: PitlaneTireLookup[]): Map<string, PitlaneTireLookup> {
  const lookup = new Map<string, PitlaneTireLookup>();

  tires.forEach(tire => {
    const barcode = normalizeRfidValue(tire.barcode);
    if (barcode) {
      lookup.set(barcode, tire);
      if (/^\d{7,8}$/.test(barcode)) {
        lookup.set(barcode.padStart(8, '0'), tire);
        lookup.set(barcode.replace(/^0+(?=\d)/, ''), tire);
      }
    }
    if (tire.epc) lookup.set(normalizeRfidValue(tire.epc), tire);
  });

  return lookup;
}

export function buildTireModelLookupMap(models: PitlaneTireModelLookup[] = []): Map<string, PitlaneTireModelLookup> {
  const lookup = new Map<string, PitlaneTireModelLookup>();

  models.forEach(model => {
    const cai = normalizeCAI(model.cai);
    if (cai) lookup.set(cai, model);
  });

  return lookup;
}

export function buildCarTagLookupMap(carTags: PitlaneCarTag[] = []): Map<string, PitlaneCarTag> {
  const lookup = new Map<string, PitlaneCarTag>();

  carTags.forEach(tag => {
    const epc = normalizeRfidValue(tag.epc);
    if (epc && tag.ativo !== false) lookup.set(epc, { ...tag, epc });
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

function resolveTireFromEvent(
  event: PitlaneRawEventInput,
  tireLookup: Map<string, PitlaneTireLookup>,
  modelLookup: Map<string, PitlaneTireModelLookup>
): PitlaneTireLookup | undefined {
  const epc = normalizeRfidValue(event.epc);
  const decoded = decodePitlaneRFID(epc);
  const barcode = getEventBarcode(event);
  const stockTire = barcode
    ? tireLookup.get(normalizeRfidValue(barcode)) || tireLookup.get(normalizeRfidValue(barcode).replace(/^0+(?=\d)/, ''))
    : tireLookup.get(epc);
  const modelFromCai = decoded?.cai ? modelLookup.get(normalizeCAI(decoded.cai)) : undefined;

  if (!stockTire && !modelFromCai) return undefined;

  if (stockTire) {
    return {
      ...stockTire,
      epc: stockTire.epc || epc,
      barcode: barcode || stockTire.barcode,
      cai: decoded?.cai || stockTire.cai,
      modelId: modelFromCai?.id || stockTire.modelId,
      modelo: modelFromCai?.name || stockTire.modelo,
      modeloCodigo: modelFromCai?.code || stockTire.modeloCodigo,
      modeloTipo: modelFromCai?.type || stockTire.modeloTipo,
      stockEntryFound: true
    };
  }

  return {
    pneuId: `rfid-${barcode || epc}`,
    barcode: barcode || '',
    epc,
    cai: decoded?.cai,
    modelId: modelFromCai?.id,
    modelo: modelFromCai?.name,
    modeloCodigo: modelFromCai?.code,
    modeloTipo: modelFromCai?.type,
    stockEntryFound: false
  };
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
  sessionId = createPitlaneId('read-session'),
  modelLookup: Map<string, PitlaneTireModelLookup> = new Map(),
  carTagLookup: Map<string, PitlaneCarTag> = new Map()
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
    const decoded = decodePitlaneRFID(epc);
    const barcode = getEventBarcode(events[0]);
    const carTag = carTagLookup.get(epc);
    const tire = carTag ? undefined : resolveTireFromEvent(events[0], tireLookup, modelLookup);
    const rssiValues = events
      .map(event => event.rssi)
      .filter((value): value is number => typeof value === 'number');

    return {
      id: createPitlaneId('session-tag'),
      sessionId,
      epc,
      barcode,
      cai: decoded?.cai,
      pneuId: tire?.pneuId,
      kind: carTag ? 'carro' : tire ? 'pneu' : 'desconhecida',
      antennaIds: Array.from(new Set(events.map(event => event.antennaId))),
      rssiMax: rssiValues.length > 0 ? Math.max(...rssiValues) : null,
      readCount: events.reduce((total, event) => total + Math.max(1, event.seenCount || 1), 0),
      firstSeenAt: new Date(Math.min(...events.map(event => new Date(event.timestamp).getTime()))).toISOString(),
      lastSeenAt: new Date(Math.max(...events.map(event => new Date(event.timestamp).getTime()))).toISOString(),
      confidenceScore: calculateTagScore(events),
      tire,
      carTag,
      rawEvents: events
    };
  }).sort((a, b) => b.confidenceScore - a.confidenceScore);
}

function isTireConflictingWithCarTag(tag: PitlaneSessionTag, carTag?: PitlaneCarTag): boolean {
  if (!carTag || !tag.tire) return false;

  const expectedPilot = normalizeComparable(carTag.piloto);
  const tirePilot = normalizeComparable(tag.tire.piloto);
  const expectedNumber = normalizeComparable(carTag.numeroCarro);
  const tireNumber = normalizeComparable(tag.tire.numeroCarro);

  if (expectedPilot && tirePilot && expectedPilot !== tirePilot) return true;
  if (expectedNumber && tireNumber && expectedNumber !== tireNumber) return true;
  return false;
}

function hasUnresolvedTireOwnership(tag: PitlaneSessionTag): boolean {
  if (!tag.tire) return false;
  return !normalizeComparable(tag.tire.piloto) && !normalizeComparable(tag.tire.numeroCarro);
}

function getPitlaneStatus(
  selectedTags: PitlaneSessionTag[],
  allTags: PitlaneSessionTag[],
  carTag?: PitlaneCarTag
): PitlanePassageStatus {
  if (allTags.length === 0) return 'Erro de leitura';
  if (!carTag) return 'Pendente validação';
  if (selectedTags.length < 4) return 'Incompleto';
  if (selectedTags.some(tag => !tag.tire)) return 'Tag desconhecida';
  if (selectedTags.some(hasUnresolvedTireOwnership)) return 'Pendente validação';
  if (selectedTags.some(tag => isTireConflictingWithCarTag(tag, carTag))) return 'Conflito';

  if (selectedTags.length === 4) return 'Validado';
  return 'Pendente validação';
}

function buildPitlaneComment(
  status: PitlanePassageStatus,
  selectedTags: PitlaneSessionTag[],
  allTags: PitlaneSessionTag[],
  carTag?: PitlaneCarTag
): string {
  if (status === 'Validado') return `Passagem validada pela tag do carro ${carTag?.numeroCarro || ''}.`.trim();
  if (status === 'Incompleto') return `Leitura incompleta: ${selectedTags.length}/4 pneus conhecidos.`;
  if (status === 'Conflito') return `Pneu lido não corresponde ao piloto identificado pela tag do carro (${carTag?.piloto || 'não identificado'}).`;
  if (status === 'Tag desconhecida') return 'Uma ou mais tags de pneu não foram localizadas pelo EPC/CAI/cadastro.';
  if (status === 'Erro de leitura') return 'Nenhuma tag válida foi recebida na janela de leitura.';
  if (!carTag) return 'Tag RFID do carro não cadastrada ou não capturada na janela de leitura.';
  if (allTags.length > 4) return 'Mais de 4 tags capturadas; sistema selecionou as 4 mais prováveis.';
  return 'Aguardando validação manual do operador.';
}

function getTireValidationStatus(
  tag: PitlaneSessionTag,
  status: PitlanePassageStatus,
  carTag?: PitlaneCarTag
): PitlanePassageTire['statusValidacao'] {
  if (!tag.tire) return 'desconhecido';
  if (status === 'Validado') return 'ok';
  if (isTireConflictingWithCarTag(tag, carTag)) return 'conflito';
  return 'pendente';
}

export function createPitlanePassageFromEvents(
  rawEvents: PitlaneRawEventInput[],
  lookupContext: PitlaneTireLookup[] | PitlaneLookupContext,
  gate: PitlaneGateConfig = DEFAULT_PITLANE_GATE
): PitlanePassage {
  const context: PitlaneLookupContext = Array.isArray(lookupContext)
    ? { tires: lookupContext }
    : lookupContext;
  const tireLookup = buildTireLookupMap(context.tires);
  const modelLookup = buildTireModelLookupMap(context.tireModels || []);
  const carTagLookup = buildCarTagLookupMap(context.carTags || []);
  const sessionId = createPitlaneId('read-session');
  const normalizedEvents = rawEvents.map(event => ({
    ...event,
    epc: normalizeRfidValue(event.epc),
    timestamp: event.timestamp || new Date().toISOString()
  }));
  const tags = aggregatePitlaneSessionTags(normalizedEvents, tireLookup, sessionId, modelLookup, carTagLookup);
  const carTag = tags.find(tag => tag.kind === 'carro' && tag.carTag)?.carTag;
  const tireCandidateTags = tags.filter(tag => tag.kind !== 'carro');
  const selectedTags = tireCandidateTags.slice(0, 4);
  const status = getPitlaneStatus(selectedTags, tags, carTag);
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

  const passageId = createPitlaneId('passage');

  return {
    id: passageId,
    readSessionId: session.id,
    etapaId: gate.etapaId,
    sessaoId: gate.sessaoId,
    carTagId: carTag?.id,
    carTagEpc: carTag?.epc,
    expectedPiloto: carTag?.piloto,
    expectedNumeroCarro: carTag?.numeroCarro,
    pilotoId: carTag?.pilotoId,
    piloto: carTag?.piloto,
    carroId: carTag?.carroId,
    carro: carTag?.carro,
    numeroCarro: carTag?.numeroCarro,
    status,
    leituraPercentual: Math.min(100, Math.round((knownSelectedCount / 4) * 100)),
    comentario: buildPitlaneComment(status, selectedTags, tags, carTag),
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
      statusValidacao: getTireValidationStatus(tag, status, carTag),
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

export function buildPitlaneCarTagRawEvent(
  carTag: PitlaneCarTag,
  index: number,
  overrides: Partial<PitlaneRawEventInput> = {}
): PitlaneRawEventInput {
  const timestamp = overrides.timestamp || new Date(Date.now() + index * 80).toISOString();

  return {
    readerId: overrides.readerId || DEFAULT_PITLANE_GATE.readerId,
    antennaId: overrides.antennaId || 'ANT-CAR',
    epc: overrides.epc || normalizeRfidValue(carTag.epc),
    rssi: overrides.rssi ?? -38,
    seenCount: overrides.seenCount ?? 6,
    timestamp,
    raw: overrides.raw || {
      source: 'simulador-pitlane',
      tipo: 'tag-carro',
      piloto: carTag.piloto,
      numeroCarro: carTag.numeroCarro
    }
  };
}

export function createSimulatedPitlaneEvents(
  tires: PitlaneTireLookup[],
  scenario: PitlaneSimulationScenario = 'validado',
  carTag?: PitlaneCarTag
): PitlaneRawEventInput[] {
  const selected = tires.slice(0, 4);
  const carEvents = carTag && scenario !== 'erro-leitura'
    ? [buildPitlaneCarTagRawEvent(carTag, 0)]
    : [];
  const baseEvents = selected.map((tire, index) => buildPitlaneRawEvent(tire, index + 1));

  if (scenario === 'incompleto') {
    return [...carEvents, ...baseEvents.slice(0, 3)];
  }

  if (scenario === 'tag-desconhecida') {
    return [
      ...carEvents,
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

  return [...carEvents, ...baseEvents];
}
