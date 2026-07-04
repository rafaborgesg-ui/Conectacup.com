import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Antenna,
  BarChart3,
  Car,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Keyboard,
  RadioTower,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Tag,
  Trash2,
  UserCheck,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import {
  DEFAULT_PITLANE_GATE,
  PITLANE_STATUS_COLORS,
  extractPitlaneRfidTokens,
  normalizeRfidValue,
  type PitlaneCarTag,
  type PitlaneGateConfig,
  type PitlanePassage,
  type PitlanePassageStatus,
  type PitlaneRawEventInput,
  type PitlaneSimulationScenario
} from '../utils/pitlaneRfid';
import {
  clearPitlaneMockHistory,
  correctPitlanePassage,
  deletePitlaneCarTag,
  getPitlaneGate,
  getPitlaneState,
  ingestPitlaneEvents,
  savePitlaneCarTag,
  savePitlaneGate,
  simulatePitlanePassage
} from '../utils/pitlaneRfidStorage';

type PitlaneView = 'live' | 'car-tags' | 'passages' | 'pending' | 'config' | 'reports';

const PITLANE_VIEWS: Array<{ id: PitlaneView; label: string; icon: any }> = [
  { id: 'live', label: 'Leituras ao vivo', icon: RadioTower },
  { id: 'car-tags', label: 'Tags dos carros', icon: Car },
  { id: 'passages', label: 'Passagens registradas', icon: Clock },
  { id: 'pending', label: 'Pendências de validação', icon: AlertTriangle },
  { id: 'config', label: 'Configuração do pórtico', icon: Settings },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 }
];

const STATUS_OPTIONS: PitlanePassageStatus[] = [
  'Validado',
  'Incompleto',
  'Conflito',
  'Tag desconhecida',
  'Pendente validação',
  'Erro de leitura'
];

const SIMULATION_OPTIONS: Array<{ value: PitlaneSimulationScenario; label: string }> = [
  { value: 'validado', label: 'Passagem validada' },
  { value: 'incompleto', label: 'Leitura incompleta' },
  { value: 'conflito', label: 'Conflito de piloto' },
  { value: 'tag-desconhecida', label: 'Tag desconhecida' },
  { value: 'erro-leitura', label: 'Erro de leitura' }
];

const TC22_READER_ID = 'TC22-RFD40';

type CarTagForm = {
  id?: string;
  epc: string;
  piloto: string;
  carro: string;
  numeroCarro: string;
  etapaId: string;
  sessaoId: string;
  observacao: string;
  ativo: boolean;
};

const EMPTY_CAR_TAG_FORM: CarTagForm = {
  epc: '',
  piloto: '',
  carro: '',
  numeroCarro: '',
  etapaId: '',
  sessaoId: '',
  observacao: '',
  ativo: true
};

const buildTc22GatePreset = (base: PitlaneGateConfig): PitlaneGateConfig => ({
  ...base,
  nome: 'Coletor TC22 + RFD40',
  local: 'Pitlane - teste móvel',
  readerId: TC22_READER_ID,
  tempoJanelaMs: base.tempoJanelaMs || 3000,
  ativo: true
});

const formatTime = (value?: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
};

function StatusBadge({ status }: { status: PitlanePassageStatus }) {
  return (
    <Badge variant="outline" className={PITLANE_STATUS_COLORS[status]}>
      {status}
    </Badge>
  );
}

function TireCell({ passage, index }: { passage: PitlanePassage; index: number }) {
  const tire = passage.tires[index];

  if (!tire) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="min-w-[116px]">
      <div className="font-mono text-xs font-semibold text-slate-900">{tire.barcode || tire.epc}</div>
      <div className="text-[11px] text-slate-500">{tire.posicaoSugerida}</div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  accent
}: {
  title: string;
  value: string | number;
  icon: any;
  accent: string;
}) {
  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${accent}`}>
          <Icon size={20} />
        </div>
      </CardContent>
    </Card>
  );
}

export function PitlaneRFID() {
  const collectorInputRef = useRef<HTMLInputElement | null>(null);
  const collectorEventsRef = useRef<PitlaneRawEventInput[]>([]);
  const collectorFlushTimerRef = useRef<number | null>(null);
  const [activeView, setActiveView] = useState<PitlaneView>('live');
  const [passages, setPassages] = useState<PitlanePassage[]>([]);
  const [carTags, setCarTags] = useState<PitlaneCarTag[]>([]);
  const [carTagForm, setCarTagForm] = useState<CarTagForm>(EMPTY_CAR_TAG_FORM);
  const [gate, setGate] = useState<PitlaneGateConfig>(DEFAULT_PITLANE_GATE);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [simulationScenario, setSimulationScenario] = useState<PitlaneSimulationScenario>('validado');
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState<PitlanePassage | null>(null);
  const [manualPilot, setManualPilot] = useState('');
  const [manualCar, setManualCar] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [manualStatus, setManualStatus] = useState<PitlanePassageStatus>('Validado');
  const [manualComment, setManualComment] = useState('');
  const [configDraft, setConfigDraft] = useState<PitlaneGateConfig>(DEFAULT_PITLANE_GATE);
  const [collectorActive, setCollectorActive] = useState(false);
  const [collectorInput, setCollectorInput] = useState('');
  const [collectorPendingTags, setCollectorPendingTags] = useState(0);
  const [collectorRawEvents, setCollectorRawEvents] = useState(0);
  const [collectorLastTag, setCollectorLastTag] = useState('-');
  const [collectorStatus, setCollectorStatus] = useState('Aguardando ativação do coletor');
  const [isCollectorProcessing, setIsCollectorProcessing] = useState(false);

  const refresh = useCallback(async () => {
    const [state, currentGate] = await Promise.all([getPitlaneState(), getPitlaneGate()]);
    setPassages(state.passages);
    setCarTags(state.carTags || []);
    setGate(currentGate);
    setConfigDraft(currentGate);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('pitlane-rfid-updated', onUpdate);
    return () => window.removeEventListener('pitlane-rfid-updated', onUpdate);
  }, [refresh]);

  useEffect(() => {
    if (!selectedPassage) return;
    setManualPilot(selectedPassage.piloto || '');
    setManualCar(selectedPassage.carro || '');
    setManualNumber(selectedPassage.numeroCarro || '');
    setManualStatus(selectedPassage.status === 'Validado' ? 'Validado' : 'Validado');
    setManualComment('');
  }, [selectedPassage]);

  useEffect(() => {
    return () => {
      if (collectorFlushTimerRef.current) {
        window.clearTimeout(collectorFlushTimerRef.current);
      }
    };
  }, []);

  const focusCollectorInput = useCallback(() => {
    window.setTimeout(() => collectorInputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (collectorActive && activeView === 'live' && !selectedPassage) {
      focusCollectorInput();
    }
  }, [activeView, collectorActive, focusCollectorInput, selectedPassage]);

  const flushCollectorWindow = useCallback(async () => {
    if (collectorFlushTimerRef.current) {
      window.clearTimeout(collectorFlushTimerRef.current);
      collectorFlushTimerRef.current = null;
    }

    const events = collectorEventsRef.current;
    collectorEventsRef.current = [];
    setCollectorPendingTags(0);
    setCollectorRawEvents(0);
    setCollectorInput('');

    if (events.length === 0) {
      setCollectorStatus('Nenhuma tag na janela atual');
      return;
    }

    const uniqueCount = new Set(events.map(event => event.epc)).size;
    setIsCollectorProcessing(true);
    setCollectorStatus(`Processando ${uniqueCount} tag(s) capturada(s)...`);

    try {
      const passage = await ingestPitlaneEvents(events);
      await refresh();
      setCollectorStatus(`Passagem registrada: ${passage.status} • ${passage.leituraPercentual}%`);
    } catch (error) {
      console.error('Erro ao processar janela TC22 + RFD40:', error);
      setCollectorStatus('Erro ao processar leitura do coletor');
    } finally {
      setIsCollectorProcessing(false);
      if (collectorActive && activeView === 'live') {
        focusCollectorInput();
      }
    }
  }, [activeView, collectorActive, focusCollectorInput, refresh]);

  const scheduleCollectorFlush = useCallback(() => {
    if (collectorFlushTimerRef.current) {
      window.clearTimeout(collectorFlushTimerRef.current);
    }

    const windowMs = Math.max(500, Number(gate.tempoJanelaMs) || DEFAULT_PITLANE_GATE.tempoJanelaMs);
    collectorFlushTimerRef.current = window.setTimeout(() => {
      void flushCollectorWindow();
    }, windowMs);
  }, [flushCollectorWindow, gate.tempoJanelaMs]);

  const registerCollectorText = useCallback((value: string, source: string) => {
    const tokens = extractPitlaneRfidTokens(value, carTags.map(tag => tag.epc));
    if (tokens.length === 0) return false;

    const now = Date.now();
    const events: PitlaneRawEventInput[] = tokens.map((epc, index) => ({
      readerId: TC22_READER_ID,
      antennaId: 'RFD40',
      epc,
      timestamp: new Date(now + index * 20).toISOString(),
      seenCount: 1,
      raw: {
        source,
        hardware: 'TC22 + RFD40',
        original: value
      }
    }));

    collectorEventsRef.current = [...collectorEventsRef.current, ...events];

    const uniqueTags = new Set(collectorEventsRef.current.map(event => event.epc));
    setCollectorPendingTags(uniqueTags.size);
    setCollectorRawEvents(collectorEventsRef.current.length);
    setCollectorLastTag(tokens[tokens.length - 1]);
    setCollectorStatus(`Janela aberta: ${uniqueTags.size} tag(s) única(s)`);
    scheduleCollectorFlush();
    return true;
  }, [carTags, scheduleCollectorFlush]);

  const handleCollectorChange = (value: string) => {
    const nextValue = value.toUpperCase();
    setCollectorInput(nextValue);

    if (registerCollectorText(nextValue, 'tc22-rfd40-keystroke')) {
      setCollectorInput('');
    }
  };

  const handleCollectorKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === 'Tab') && collectorInput.trim()) {
      event.preventDefault();
      if (registerCollectorText(collectorInput, 'tc22-rfd40-submit')) {
        setCollectorInput('');
      }
    }
  };

  const handleCollectorPaste = () => {
    window.setTimeout(() => {
      const value = collectorInputRef.current?.value || '';
      if (registerCollectorText(value, 'tc22-rfd40-paste')) {
        setCollectorInput('');
      }
    }, 0);
  };

  const handleCollectorBlur = () => {
    if (collectorActive && activeView === 'live' && !selectedPassage) {
      focusCollectorInput();
    }
  };

  const applyTc22Preset = useCallback(async () => {
    const preset = buildTc22GatePreset(configDraft);
    setConfigDraft(preset);
    const saved = await savePitlaneGate(preset);
    setGate(saved);
    setConfigDraft(saved);
    return saved;
  }, [configDraft]);

  const handleToggleCollector = async () => {
    setActiveView('live');
    if (collectorActive) {
      setCollectorActive(false);
      setCollectorStatus('Captura pausada');
      return;
    }

    await applyTc22Preset();
    setCollectorActive(true);
    setCollectorStatus('Coletor ativo: aguardando tags do RFD40');
    focusCollectorInput();
  };

  const summary = useMemo(() => {
    const valid = passages.filter(passage => passage.status === 'Validado').length;
    const conflicts = passages.filter(passage => passage.status === 'Conflito').length;
    const unknown = passages.filter(passage => passage.status === 'Tag desconhecida').length;
    const pending = passages.filter(passage =>
      ['Incompleto', 'Conflito', 'Tag desconhecida', 'Pendente validação', 'Erro de leitura'].includes(passage.status)
    ).length;

    return {
      valid,
      conflicts,
      unknown,
      pending,
      lastRead: passages[0]?.createdAt ? formatTime(passages[0].createdAt) : '-'
    };
  }, [passages]);

  const filteredPassages = useMemo(() => {
    return passages.filter(passage => {
      const term = searchTerm.trim().toLowerCase();
      const matchesStatus = selectedStatus === 'all' || passage.status === selectedStatus;
      const matchesView = activeView !== 'pending' || passage.status !== 'Validado';
      const matchesTerm = !term || [
        passage.piloto,
        passage.carro,
        passage.numeroCarro,
        passage.carTagEpc,
        passage.status,
        passage.comentario,
        ...passage.tires.flatMap(tire => [tire.barcode, tire.epc, tire.tire?.modelo])
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesView && matchesTerm;
    });
  }, [activeView, passages, searchTerm, selectedStatus]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await simulatePitlanePassage(simulationScenario);
      await refresh();
    } finally {
      setIsSimulating(false);
    }
  };

  const handleManualCorrection = async () => {
    if (!selectedPassage || !manualComment.trim()) return;

    const updated = await correctPitlanePassage({
      passageId: selectedPassage.id,
      piloto: manualPilot.trim(),
      carro: manualCar.trim(),
      numeroCarro: manualNumber.trim(),
      status: manualStatus,
      comentario: manualComment.trim()
    });

    await refresh();
    setSelectedPassage(updated);
  };

  const handleSaveGate = async () => {
    const saved = await savePitlaneGate(configDraft);
    setGate(saved);
    setConfigDraft(saved);
  };

  const handleSaveCarTag = async () => {
    const epc = normalizeRfidValue(carTagForm.epc);
    if (!epc || !carTagForm.piloto.trim() || !carTagForm.numeroCarro.trim()) return;

    await savePitlaneCarTag({
      id: carTagForm.id,
      epc,
      piloto: carTagForm.piloto,
      carro: carTagForm.carro,
      numeroCarro: carTagForm.numeroCarro,
      etapaId: carTagForm.etapaId,
      sessaoId: carTagForm.sessaoId,
      observacao: carTagForm.observacao,
      ativo: carTagForm.ativo
    });

    setCarTagForm(EMPTY_CAR_TAG_FORM);
    await refresh();
  };

  const handleEditCarTag = (tag: PitlaneCarTag) => {
    setCarTagForm({
      id: tag.id,
      epc: tag.epc,
      piloto: tag.piloto,
      carro: tag.carro || '',
      numeroCarro: tag.numeroCarro,
      etapaId: tag.etapaId || '',
      sessaoId: tag.sessaoId || '',
      observacao: tag.observacao || '',
      ativo: tag.ativo
    });
  };

  const handleDeleteCarTag = async (id: string) => {
    await deletePitlaneCarTag(id);
    if (carTagForm.id === id) setCarTagForm(EMPTY_CAR_TAG_FORM);
    await refresh();
  };

  const handleUseTc22Preset = async () => {
    await applyTc22Preset();
    setActiveView('live');
    setCollectorActive(true);
    setCollectorStatus('Coletor ativo: aguardando tags do RFD40');
    focusCollectorInput();
  };

  const exportRows = filteredPassages.map(passage => ({
    Hora: formatDateTime(passage.createdAt),
    Numero: passage.numeroCarro || '',
    Piloto: passage.piloto || '',
    Carro: passage.carro || '',
    TagCarro: passage.carTagEpc || '',
    Leitura: `${passage.leituraPercentual}%`,
    Pneu1: passage.tires[0]?.barcode || passage.tires[0]?.epc || '',
    Pneu2: passage.tires[1]?.barcode || passage.tires[1]?.epc || '',
    Pneu3: passage.tires[2]?.barcode || passage.tires[2]?.epc || '',
    Pneu4: passage.tires[3]?.barcode || passage.tires[3]?.epc || '',
    Status: passage.status,
    Comentario: passage.comentario
  }));

  const handleExportXlsx = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pitlane RFID');
    XLSX.writeFile(workbook, `controle-pitlane-rfid-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCsv = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `controle-pitlane-rfid-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const renderTable = () => (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardHeader className="gap-3 border-b pb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-950">Passagens do pórtico</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{filteredPassages.length} registro(s) encontrados</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px] xl:w-[560px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar piloto, pneu, status..."
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Hora</TableHead>
              <TableHead>Nº</TableHead>
              <TableHead>Piloto</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead>Leitura</TableHead>
              <TableHead>Pneu 1</TableHead>
              <TableHead>Pneu 2</TableHead>
              <TableHead>Pneu 3</TableHead>
              <TableHead>Pneu 4</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPassages.map(passage => (
              <TableRow key={passage.id}>
                <TableCell className="font-mono text-xs">{formatTime(passage.createdAt)}</TableCell>
                <TableCell className="font-semibold">{passage.numeroCarro || '-'}</TableCell>
                <TableCell className="min-w-[180px] font-medium">{passage.piloto || 'Não identificado'}</TableCell>
                <TableCell>{passage.carro || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-[#D50000]" style={{ width: `${passage.leituraPercentual}%` }} />
                    </div>
                    <span className="text-xs font-semibold">{passage.leituraPercentual}%</span>
                  </div>
                </TableCell>
                {[0, 1, 2, 3].map(index => (
                  <TableCell key={index}><TireCell passage={passage} index={index} /></TableCell>
                ))}
                <TableCell><StatusBadge status={passage.status} /></TableCell>
                <TableCell className="max-w-[260px] truncate text-slate-600">{passage.comentario}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedPassage(passage)}>
                      <Eye size={14} />
                      Detalhes
                    </Button>
                    {passage.status !== 'Validado' && (
                      <Button size="sm" className="bg-[#D50000] text-white hover:bg-[#B00000]" onClick={() => setSelectedPassage(passage)}>
                        <UserCheck size={14} />
                        Validar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPassages.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="h-32 text-center text-slate-500">
                  Nenhuma passagem encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderCarTagManagement = () => (
    <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag size={18} />
            Associação da tag do carro
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <div className="space-y-2">
            <Label>Tag RFID do carro</Label>
            <Input
              value={carTagForm.epc}
              onChange={event => setCarTagForm(prev => ({ ...prev, epc: event.target.value.toUpperCase() }))}
              placeholder="EPC do adesivo"
              className="font-mono"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="space-y-2">
              <Label>Piloto</Label>
              <Input value={carTagForm.piloto} onChange={event => setCarTagForm(prev => ({ ...prev, piloto: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Número do carro</Label>
              <Input value={carTagForm.numeroCarro} onChange={event => setCarTagForm(prev => ({ ...prev, numeroCarro: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Carro/Categoria</Label>
            <Input value={carTagForm.carro} onChange={event => setCarTagForm(prev => ({ ...prev, carro: event.target.value }))} placeholder="Opcional" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Input value={carTagForm.etapaId} onChange={event => setCarTagForm(prev => ({ ...prev, etapaId: event.target.value }))} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Sessão/Manga</Label>
              <Input value={carTagForm.sessaoId} onChange={event => setCarTagForm(prev => ({ ...prev, sessaoId: event.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <textarea
              value={carTagForm.observacao}
              onChange={event => setCarTagForm(prev => ({ ...prev, observacao: event.target.value }))}
              className="min-h-20 w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:border-[#D50000]"
            />
          </div>
          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
            <input
              id="car-tag-active"
              type="checkbox"
              checked={carTagForm.ativo}
              onChange={event => setCarTagForm(prev => ({ ...prev, ativo: event.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="car-tag-active">Tag ativa</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSaveCarTag}
              disabled={!normalizeRfidValue(carTagForm.epc) || !carTagForm.piloto.trim() || !carTagForm.numeroCarro.trim()}
              className="bg-[#D50000] text-white hover:bg-[#B00000]"
            >
              <Save size={16} />
              Salvar associação
            </Button>
            <Button variant="outline" onClick={() => setCarTagForm(EMPTY_CAR_TAG_FORM)}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car size={18} />
            Tags cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Tag RFID</TableHead>
                <TableHead>Piloto</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Carro</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carTags.map(tag => (
                <TableRow key={tag.id}>
                  <TableCell className="max-w-[240px] break-all font-mono text-xs">{tag.epc}</TableCell>
                  <TableCell className="font-medium">{tag.piloto}</TableCell>
                  <TableCell className="font-semibold">{tag.numeroCarro}</TableCell>
                  <TableCell>{tag.carro || '-'}</TableCell>
                  <TableCell>{tag.etapaId || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tag.ativo ? 'border-green-200 bg-green-100 text-green-800' : 'border-slate-200 bg-slate-100 text-slate-700'}>
                      {tag.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditCarTag(tag)}>
                        <Tag size={14} />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-700" onClick={() => handleDeleteCarTag(tag.id)}>
                        <Trash2 size={14} />
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {carTags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    Nenhuma tag de carro cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#D50000] text-white shadow-sm">
              <Antenna size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 lg:text-3xl">Controle Pitlane RFID</h1>
              <p className="text-sm text-slate-500">
                Pórtico {gate.nome} • {gate.readerId} • janela {gate.tempoJanelaMs} ms
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[220px_auto_auto]">
            <Select value={simulationScenario} onValueChange={value => setSimulationScenario(value as PitlaneSimulationScenario)}>
              <SelectTrigger>
                <SelectValue placeholder="Cenário" />
              </SelectTrigger>
              <SelectContent>
                {SIMULATION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSimulate} disabled={isSimulating} className="bg-[#D50000] text-white hover:bg-[#B00000]">
              <Zap size={16} />
              {isSimulating ? 'Simulando...' : 'Simular passagem'}
            </Button>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw size={16} />
              Atualizar
            </Button>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
          {PITLANE_VIEWS.map(view => {
            const Icon = view.icon;
            const active = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                {view.label}
              </button>
            );
          })}
        </nav>

        {activeView !== 'config' && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard title="Passagens válidas" value={summary.valid} icon={CheckCircle2} accent="bg-green-100 text-green-700" />
            <SummaryCard title="Pendências" value={summary.pending} icon={Clock} accent="bg-slate-100 text-slate-700" />
            <SummaryCard title="Conflitos" value={summary.conflicts} icon={AlertTriangle} accent="bg-red-100 text-red-700" />
            <SummaryCard title="Tags desconhecidas" value={summary.unknown} icon={ShieldCheck} accent="bg-orange-100 text-orange-700" />
            <SummaryCard title="Última leitura" value={summary.lastRead} icon={RadioTower} accent="bg-blue-100 text-blue-700" />
          </section>
        )}

        {activeView === 'live' && (
          <Card className="rounded-lg border-slate-200 shadow-sm">
            <CardHeader className="gap-3 border-b pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950">
                    <Smartphone size={18} />
                    Teste real TC22 + RFD40
                    <Badge variant="outline" className={collectorActive ? 'border-green-200 bg-green-100 text-green-800' : 'border-slate-200 bg-slate-100 text-slate-700'}>
                      {collectorActive ? 'ON' : 'OFF'}
                    </Badge>
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Entrada por DataWedge/teclado • janela {gate.tempoJanelaMs} ms • leitor TC22-RFD40
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleToggleCollector} className={collectorActive ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-[#D50000] text-white hover:bg-[#B00000]'}>
                    <Keyboard size={16} />
                    {collectorActive ? 'Pausar captura' : 'Ativar captura'}
                  </Button>
                  <Button variant="outline" onClick={() => void flushCollectorWindow()} disabled={isCollectorProcessing || collectorRawEvents === 0}>
                    <CheckCircle2 size={16} />
                    Finalizar janela
                  </Button>
                  <Button variant="outline" onClick={handleUseTc22Preset}>
                    <Settings size={16} />
                    Usar TC22/RFD40
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_repeat(4,160px)]">
              <div className="space-y-2">
                <Label>Campo de captura RFID</Label>
                <Input
                  ref={collectorInputRef}
                  value={collectorInput}
                  onChange={event => handleCollectorChange(event.target.value)}
                  onKeyDown={handleCollectorKeyDown}
                  onPaste={handleCollectorPaste}
                  onBlur={handleCollectorBlur}
                  disabled={!collectorActive || isCollectorProcessing}
                  placeholder={collectorActive ? 'Aguardando EPC do RFD40...' : 'Ative a captura para testar'}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
                <p className="text-xs text-slate-500">{collectorStatus}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Tags na janela</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{collectorPendingTags}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Eventos brutos</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{collectorRawEvents}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3 xl:col-span-2">
                <p className="text-xs uppercase text-slate-500">Última tag</p>
                <p className="mt-2 break-all font-mono text-xs font-semibold text-slate-950">{collectorLastTag}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {(activeView === 'live' || activeView === 'passages' || activeView === 'pending') && renderTable()}

        {activeView === 'car-tags' && renderCarTagManagement()}

        {activeView === 'config' && (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal size={18} />
                  Configuração do pórtico
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do pórtico</Label>
                  <Input value={configDraft.nome} onChange={event => setConfigDraft(prev => ({ ...prev, nome: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Leitor RFID</Label>
                  <Input value={configDraft.readerId} onChange={event => setConfigDraft(prev => ({ ...prev, readerId: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input value={configDraft.local} onChange={event => setConfigDraft(prev => ({ ...prev, local: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Janela de leitura (ms)</Label>
                  <Input
                    type="number"
                    min={500}
                    max={15000}
                    value={configDraft.tempoJanelaMs}
                    onChange={event => setConfigDraft(prev => ({ ...prev, tempoJanelaMs: Number(event.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Etapa ativa</Label>
                  <Input value={configDraft.etapaId || ''} onChange={event => setConfigDraft(prev => ({ ...prev, etapaId: event.target.value }))} placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Sessão/Manga ativa</Label>
                  <Input value={configDraft.sessaoId || ''} onChange={event => setConfigDraft(prev => ({ ...prev, sessaoId: event.target.value }))} placeholder="Opcional" />
                </div>
                <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 md:col-span-2">
                  <input
                    id="gate-active"
                    type="checkbox"
                    checked={configDraft.ativo}
                    onChange={event => setConfigDraft(prev => ({ ...prev, ativo: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="gate-active">Pórtico ativo para receber leituras</Label>
                </div>
                <div className="md:col-span-2">
                  <Button onClick={handleSaveGate} className="bg-[#D50000] text-white hover:bg-[#B00000]">
                    <Save size={16} />
                    Salvar configuração
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Antenna size={18} />
                  Hardware previsto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 text-sm text-slate-600">
                <p>Teste móvel habilitado para TC22 com RFD40 via DataWedge/Keystroke.</p>
                <p>No perfil do DataWedge, mantenha RFID Input ativo, Keystroke Output ativo e envio de Enter/newline por tag.</p>
                <p>Leitor Zebra FXR90 com antenas AN480 e sensores de ativação.</p>
                <p>Endpoint de ingestão preparado: <span className="font-mono text-slate-950">POST /api/rfid/pitlane/events</span></p>
                <p>Endpoint de simulação preparado: <span className="font-mono text-slate-950">POST /api/rfid/pitlane/simulate</span></p>
              </CardContent>
            </Card>
          </section>
        )}

        {activeView === 'reports' && (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            {renderTable()}
            <div className="space-y-4">
              <Card className="rounded-lg border-slate-200 shadow-sm">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter size={18} />
                    Exportação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  <Button onClick={handleExportXlsx} className="w-full bg-[#D50000] text-white hover:bg-[#B00000]">
                    <Download size={16} />
                    Exportar XLSX
                  </Button>
                  <Button onClick={handleExportCsv} variant="outline" className="w-full">
                    <Download size={16} />
                    Exportar CSV
                  </Button>
                  <Button onClick={async () => { await clearPitlaneMockHistory(); await refresh(); }} variant="outline" className="w-full text-red-700">
                    Limpar histórico mock
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>

      <Dialog open={!!selectedPassage} onOpenChange={open => !open && setSelectedPassage(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          {selectedPassage && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da passagem</DialogTitle>
                <DialogDescription>
                  {formatDateTime(selectedPassage.createdAt)} • {selectedPassage.session.tags.length} tag(s) capturadas • {selectedPassage.session.rawEvents.length} evento(s) bruto(s)
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-5">
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Piloto</p>
                      <p className="font-semibold">{selectedPassage.piloto || 'Não identificado'}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Nº</p>
                      <p className="font-semibold">{selectedPassage.numeroCarro || '-'}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Carro</p>
                      <p className="font-semibold">{selectedPassage.carro || '-'}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Status</p>
                      <div className="mt-1"><StatusBadge status={selectedPassage.status} /></div>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Tag do carro</p>
                      <p className="break-all font-mono text-xs font-semibold">{selectedPassage.carTagEpc || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-950">Pneus lidos</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedPassage.tires.map((tire, index) => (
                        <div key={tire.id} className="rounded-md border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">Pneu {index + 1}</p>
                            <Badge variant="outline">{tire.statusValidacao}</Badge>
                          </div>
                          <p className="mt-2 font-mono text-xs">EPC: {tire.epc}</p>
                          <p className="font-mono text-xs">Código: {tire.barcode || '-'}</p>
                          <p className="font-mono text-xs">CAI: {tire.tire?.cai || '-'}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {tire.tire?.modelo || 'Modelo não identificado'} • {tire.posicaoSugerida}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-950">Tags da sessão</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>EPC</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>RSSI</TableHead>
                          <TableHead>Antenas</TableHead>
                          <TableHead>Leituras</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPassage.session.tags.map(tag => (
                          <TableRow key={tag.id}>
                            <TableCell>{tag.kind}</TableCell>
                            <TableCell className="font-mono text-xs">{tag.epc}</TableCell>
                            <TableCell className="font-mono text-xs">{tag.barcode || tag.cai || '-'}</TableCell>
                            <TableCell>{tag.rssiMax ?? '-'}</TableCell>
                            <TableCell>{tag.antennaIds.join(', ')}</TableCell>
                            <TableCell>{tag.readCount}</TableCell>
                            <TableCell>{tag.confidenceScore}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Validação manual</h3>
                  <div className="space-y-2">
                    <Label>Piloto</Label>
                    <Input value={manualPilot} onChange={event => setManualPilot(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Carro</Label>
                    <Input value={manualCar} onChange={event => setManualCar(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número do carro</Label>
                    <Input value={manualNumber} onChange={event => setManualNumber(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={manualStatus} onValueChange={value => setManualStatus(value as PitlanePassageStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Comentário da correção</Label>
                    <textarea
                      value={manualComment}
                      onChange={event => setManualComment(event.target.value)}
                      className="min-h-24 w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:border-[#D50000]"
                      placeholder="Obrigatório para salvar validação manual"
                    />
                  </div>
                  <Button
                    onClick={handleManualCorrection}
                    disabled={!manualComment.trim()}
                    className="w-full bg-[#D50000] text-white hover:bg-[#B00000]"
                  >
                    <UserCheck size={16} />
                    Salvar validação
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPassage(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PitlaneRFID;
