import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Globe2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Route,
  Save,
  Search,
  Smartphone,
  Truck,
  Upload,
  X
} from 'lucide-react';
import {
  appendFreightHistory,
  createFreightRequest,
  formatFreightDate,
  freightLane,
  getFreightHistory,
  getFreightLookups,
  getFreightRequests,
  replaceFreightCollections,
  saveFreightMasterOption,
  sendFreightNotification,
  updateFreightRequest,
  updateFreightStatus,
  uploadFreightFiles,
  type FreightHistory,
  type FreightItem,
  type FreightLookupOption,
  type FreightRequest,
  type FreightStatus,
  type FreightVolume
} from '../utils/freightStorage';

type FreightMode = 'nacional' | 'motorista' | 'internacional';
type TabKey = 'dashboard' | 'nova' | 'atendimento' | 'kanban' | 'motorista' | 'relatorios';

const laneLabels: Record<string, string> = {
  nao_iniciado: 'Pendente',
  em_andamento: 'Agendado',
  em_rota: 'Em Rota',
  finalizado: 'Concluído'
};

const laneOrder = ['nao_iniciado', 'em_andamento', 'em_rota', 'finalizado'];

const statusOptionsNational: FreightStatus[] = ['Pendente', 'Agendado', 'Em Rota', 'Concluído', 'Cancelado'];
const statusOptionsInternational: FreightStatus[] = ['Pendente', 'Em cotação', 'Aguardando coleta', 'Em trânsito', 'Desembaraço', 'Concluído', 'Cancelado'];

const emptyNationalForm = {
  setor: '',
  setorId: '',
  prazoEntrega: '',
  projeto: '',
  projetoId: '',
  projetoDescricao: '',
  solicitanteNome: '',
  responsavelEntrega: '',
  itemDescricao: '',
  responsavelLocal: '',
  enderecoRetirada: '',
  enderecoEntrega: '',
  pagamento: '',
  observacoes: ''
};

const emptyInternationalForm = {
  necessidade: '',
  definitivaTemporaria: '',
  observacoesNecessidade: '',
  empresaRemetente: '',
  enderecoOrigem: '',
  enderecoColetaOrigem: '',
  nomeContatoOrigem: '',
  emailContatoOrigem: '',
  telefoneContatoOrigem: '',
  empresaDestinatario: '',
  enderecoDestino: '',
  enderecoEntregaDestino: '',
  nomeContatoDestino: '',
  emailContatoDestino: '',
  telefoneContatoDestino: '',
  prazoDesejado: '',
  tipoFrete: 'Rodoviário',
  modalidadeFrete: '',
  necessitaSeguro: 'Sim',
  observacoesFinais: '',
  solicitanteNome: '',
  empresaSolicitante: '',
  cnpj: '',
  telefoneSolicitante: '',
  emailSolicitante: '',
  responsavelCustos: ''
};

const newVolume = (itemNumero = 1): FreightVolume => ({
  itemNumero,
  quantidade: undefined,
  dimensoes: '',
  pesoBruto: undefined,
  tipoEmbalagem: 'Palete'
});

const newItem = (itemNumero = 1): FreightItem => ({
  itemNumero,
  quantidade: undefined,
  descricao: '',
  serialPartNumber: '',
  ncm: '',
  fabricante: '',
  paisOrigem: '',
  valorItem: undefined,
  pesoUnitario: undefined
});

function statusBadgeClass(status: string) {
  const lane = freightLane(status);
  if (status === 'Cancelado') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (status === 'Em cotação' || status === 'Aguardando coleta' || status === 'Desembaraço') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (lane === 'finalizado') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (lane === 'em_rota') return 'bg-red-50 text-red-700 border-red-200';
  if (lane === 'em_andamento') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function fieldClass() {
  return 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-400';
}

function areaClass() {
  return 'min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100';
}

function buttonClass(variant: 'primary' | 'secondary' | 'dark' | 'danger' = 'secondary') {
  const base = 'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    dark: 'bg-slate-950 text-white hover:bg-slate-800',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100'
  };
  return `${base} ${variants[variant]}`;
}

function labelClass() {
  return 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
}

function normalizeNumber(value: string) {
  if (value === '') return undefined;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatProtocol(request: FreightRequest) {
  return `#${String(request.protocol || 0).padStart(4, '0')}`;
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: any; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SelectOptionList({ options }: { options: FreightLookupOption[] }) {
  return (
    <>
      {options.map(option => (
        <option key={option.id || option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

function DetailDrawer({
  request,
  history,
  onClose,
  onSaveObservation
}: {
  request: FreightRequest | null;
  history: FreightHistory[];
  onClose: () => void;
  onSaveObservation: (value: string) => Promise<void>;
}) {
  const [obs, setObs] = useState('');

  useEffect(() => {
    setObs(request?.observacoesLogistica || '');
  }, [request?.id]);

  if (!request) return null;

  const attachments = [
    ...(request.attachments || []),
    ...request.fotosProdutoUrls.map(url => ({ fileUrl: url, category: 'produto' as const })),
    ...request.fotoEntregaUrls.map(url => ({ fileUrl: url, category: 'entrega' as const }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-red-600">{formatProtocol(request)}</p>
            <h2 className="text-xl font-bold text-slate-950">{request.freightType === 'internacional' ? 'Frete internacional' : 'Frete nacional'}</h2>
            <p className="text-sm text-slate-500">{request.setor || request.necessidade || '-'} · {formatFreightDate(request.createdAt)}</p>
          </div>
          <button className={buttonClass('secondary')} onClick={onClose} type="button">
            <X className="h-4 w-4" />
            Fechar
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <InfoBox label="Status" value={request.status} />
            <InfoBox label="Prazo" value={formatFreightDate(request.prazoEntrega || request.prazoDesejado, Boolean(request.prazoEntrega))} />
            <InfoBox label="Motorista" value={request.motorista || '-'} />
            <InfoBox label="Veículo" value={[request.veiculo, request.placa].filter(Boolean).join(' - ') || '-'} />
          </div>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-950">Dados da solicitação</h3>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <InfoLine label="Setor" value={request.setor || '-'} />
              <InfoLine label="Projeto" value={request.projeto || request.projetoDescricao || '-'} />
              <InfoLine label="Solicitante" value={request.solicitanteNome || request.emailSolicitante || request.createdByEmail || '-'} />
              <InfoLine label="Responsável no local" value={request.responsavelLocal || request.responsavelEntrega || '-'} />
              <InfoLine label="Origem" value={request.enderecoRetirada || request.enderecoOrigem || '-'} />
              <InfoLine label="Destino" value={request.enderecoEntrega || request.enderecoDestino || '-'} />
              <div className="md:col-span-2">
                <InfoLine label="Materiais / necessidade" value={request.itemDescricao || request.necessidade || '-'} multiline />
              </div>
              <div className="md:col-span-2">
                <InfoLine label="Observações" value={request.observacoes || request.observacoesFinais || '-'} multiline />
              </div>
            </div>
          </section>

          {(request.volumes?.length || request.items?.length) ? (
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-950">Volumes e mercadorias</h3>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Volumes</p>
                  <div className="space-y-2">
                    {(request.volumes || []).map(volume => (
                      <div key={volume.id || volume.itemNumero} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                        {volume.quantidade || '-'} un · {volume.dimensoes || '-'} · {volume.pesoBruto || '-'} kg · {volume.tipoEmbalagem || '-'}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Itens</p>
                  <div className="space-y-2">
                    {(request.items || []).map(item => (
                      <div key={item.id || item.itemNumero} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                        <div className="font-semibold text-slate-900">{item.quantidade || '-'}x {item.descricao || '-'}</div>
                        <div className="text-xs text-slate-500">NCM {item.ncm || '-'} · {item.fabricante || '-'} · {item.paisOrigem || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-950">Observação logística</h3>
            </div>
            <div className="space-y-3 p-4">
              <textarea className={areaClass()} value={obs} onChange={event => setObs(event.target.value)} />
              <button className={buttonClass('dark')} onClick={() => onSaveObservation(obs)} type="button">
                <Save className="h-4 w-4" />
                Salvar observação
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-950">Anexos e fotos</h3>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.length ? attachments.map((file, index) => (
                <a key={`${file.fileUrl}-${index}`} href={file.fileUrl} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:border-red-200 hover:text-red-700">
                  <FileSpreadsheet className="mb-2 h-4 w-4" />
                  {file.fileName || `Anexo ${index + 1}`}
                  <span className="mt-1 block text-xs font-normal text-slate-500">{file.category}</span>
                </a>
              )) : (
                <p className="text-sm text-slate-500">Nenhum anexo registrado.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-950">Histórico</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {history.length ? history.map(item => (
                <div key={item.id} className="px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-900">{item.newStatus || item.action}</div>
                  <div className="text-slate-500">{formatFreightDate(item.changedAt)} · {item.changedByEmail || '-'}</div>
                  {item.comment ? <div className="mt-1 text-slate-700">{item.comment}</div> : null}
                </div>
              )) : (
                <p className="p-4 text-sm text-slate-500">Sem histórico registrado.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-slate-950">{value}</div>
    </div>
  );
}

function InfoLine({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-sm text-slate-900 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</div>
    </div>
  );
}

function FreightPage({ mode }: { mode: FreightMode }) {
  const isInternational = mode === 'internacional';
  const isDriver = mode === 'motorista';
  const [tab, setTab] = useState<TabKey>(isInternational ? 'dashboard' : isDriver ? 'motorista' : 'dashboard');
  const [requests, setRequests] = useState<FreightRequest[]>([]);
  const [lookups, setLookups] = useState({
    setores: [] as FreightLookupOption[],
    projetos: [] as FreightLookupOption[],
    motoristas: [] as FreightLookupOption[],
    veiculos: [] as FreightLookupOption[],
    enderecos: [] as FreightLookupOption[],
    statusNacional: [] as FreightLookupOption[],
    statusInternacional: [] as FreightLookupOption[],
    tiposFrete: [] as FreightLookupOption[],
    modalidades: [] as FreightLookupOption[],
    embalagens: [] as FreightLookupOption[]
  });
  const [filters, setFilters] = useState({ search: '', status: 'Todos', motorista: 'TODOS', setor: '', projeto: '', protocolo: '' });
  const [selected, setSelected] = useState<FreightRequest | null>(null);
  const [history, setHistory] = useState<FreightHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [nationalForm, setNationalForm] = useState(emptyNationalForm);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [deliveryFiles, setDeliveryFiles] = useState<Record<string, File[]>>({});
  const [scheduleDraft, setScheduleDraft] = useState({ motorista: '', veiculo: '', placa: '', agendamentoAt: '', observacoesLogistica: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [internationalForm, setInternationalForm] = useState(emptyInternationalForm);
  const [volumes, setVolumes] = useState<FreightVolume[]>([newVolume()]);
  const [items, setItems] = useState<FreightItem[]>([newItem()]);
  const [volumeFiles, setVolumeFiles] = useState<File[]>([]);
  const [itemFiles, setItemFiles] = useState<File[]>([]);

  const freightType = isInternational ? 'internacional' : 'nacional';

  useEffect(() => {
    loadData();
  }, [freightType]);

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const [lookupData, requestData] = await Promise.all([
        getFreightLookups(),
        getFreightRequests({ type: freightType })
      ]);
      setLookups(lookupData);
      setRequests(requestData);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar o módulo de frete.' });
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      if (filters.status !== 'Todos' && request.status !== filters.status) return false;
      if (filters.motorista !== 'TODOS' && !(request.motorista || '').toLowerCase().includes(filters.motorista.toLowerCase())) return false;
      if (filters.setor && request.setor !== filters.setor) return false;
      if (filters.projeto && request.projeto !== filters.projeto) return false;
      if (filters.protocolo) {
        const terms = filters.protocolo.split(',').map(item => item.trim().replace(/^#/, '')).filter(Boolean);
        if (terms.length && !terms.some(term => String(request.protocol).includes(term))) return false;
      }
      const search = filters.search.trim().toLowerCase();
      if (!search) return true;
      return [
        request.protocol,
        request.setor,
        request.projeto,
        request.solicitanteNome,
        request.itemDescricao,
        request.motorista,
        request.veiculo,
        request.placa,
        request.necessidade,
        request.empresaRemetente,
        request.empresaDestinatario
      ].some(value => String(value || '').toLowerCase().includes(search));
    });
  }, [filters, requests]);

  const stats = useMemo(() => {
    const source = filteredRequests;
    return {
      total: source.length,
      pendente: source.filter(item => item.status === 'Pendente').length,
      agendado: source.filter(item => ['Agendado', 'Em cotação', 'Aguardando coleta'].includes(item.status)).length,
      rota: source.filter(item => ['Em Rota', 'Em trânsito', 'Desembaraço'].includes(item.status)).length,
      concluido: source.filter(item => item.status === 'Concluído').length
    };
  }, [filteredRequests]);

  async function openDetails(request: FreightRequest) {
    setSelected(request);
    try {
      setHistory(await getFreightHistory(request.id));
    } catch {
      setHistory([]);
    }
  }

  function updateNationalField(field: keyof typeof emptyNationalForm, value: string) {
    if (field === 'setor') {
      const option = lookups.setores.find(item => item.value === value);
      setNationalForm(current => ({ ...current, setor: value, setorId: option?.id || '' }));
      return;
    }

    if (field === 'projeto') {
      const option = lookups.projetos.find(item => item.value === value);
      setNationalForm(current => ({
        ...current,
        projeto: value,
        projetoId: option?.id || '',
        projetoDescricao: String(option?.metadata?.descricao || '')
      }));
      return;
    }

    setNationalForm(current => ({ ...current, [field]: value }));
  }

  async function handleCreateNational(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await createFreightRequest({
        freightType: 'nacional',
        status: 'Pendente',
        ...nationalForm,
        setorId: nationalForm.setorId || undefined,
        projetoId: nationalForm.projetoId || undefined,
        fotosProdutoUrls: [],
        fotoEntregaUrls: [],
        payloadOriginal: nationalForm
      });

      if (productFiles.length) {
        await uploadFreightFiles(created.id, productFiles, 'produto');
      }

      await sendFreightNotification(created.id, 'created');
      setNationalForm(emptyNationalForm);
      setProductFiles([]);
      setTab('dashboard');
      setMessage({ type: 'success', text: `Solicitação ${formatProtocol(created)} cadastrada.` });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao cadastrar solicitação.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInternational(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await createFreightRequest({
        freightType: 'internacional',
        status: 'Pendente',
        ...internationalForm,
        volumes,
        items,
        fotosProdutoUrls: [],
        fotoEntregaUrls: [],
        payloadOriginal: { ...internationalForm, volumes, items }
      });

      if (volumeFiles.length) await uploadFreightFiles(created.id, volumeFiles, 'volume');
      if (itemFiles.length) await uploadFreightFiles(created.id, itemFiles, 'itens');

      await sendFreightNotification(created.id, 'created');
      setInternationalForm(emptyInternationalForm);
      setVolumes([newVolume()]);
      setItems([newItem()]);
      setVolumeFiles([]);
      setItemFiles([]);
      setTab('dashboard');
      setMessage({ type: 'success', text: `Solicitação internacional ${formatProtocol(created)} cadastrada.` });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao cadastrar solicitação internacional.' });
    } finally {
      setSaving(false);
    }
  }

  function startSchedule(request?: FreightRequest) {
    if (request) {
      setSelectedIds([request.id]);
      setScheduleDraft({
        motorista: request.motorista || '',
        veiculo: request.veiculo || '',
        placa: request.placa || '',
        agendamentoAt: request.agendamentoAt ? request.agendamentoAt.slice(0, 16) : '',
        observacoesLogistica: request.observacoesLogistica || ''
      });
    } else {
      setScheduleDraft({ motorista: '', veiculo: '', placa: '', agendamentoAt: '', observacoesLogistica: '' });
    }
    setTab('atendimento');
  }

  async function applySchedule() {
    const targets = requests.filter(request => selectedIds.includes(request.id));
    if (!targets.length) {
      setMessage({ type: 'error', text: 'Selecione ao menos uma solicitação para agendar.' });
      return;
    }
    if (!scheduleDraft.motorista || !scheduleDraft.veiculo || !scheduleDraft.agendamentoAt) {
      setMessage({ type: 'error', text: 'Preencha motorista, veículo e data/hora do agendamento.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([
        saveFreightMasterOption('motorista', scheduleDraft.motorista).catch(() => undefined),
        saveFreightMasterOption('veiculo', scheduleDraft.veiculo, { placa: scheduleDraft.placa }).catch(() => undefined)
      ]);

      for (const request of targets) {
        await updateFreightStatus(request, 'Agendado', 'Agendamento logístico salvo.', {
          motorista: scheduleDraft.motorista,
          veiculo: scheduleDraft.veiculo,
          placa: scheduleDraft.placa,
          agendamentoAt: scheduleDraft.agendamentoAt,
          observacoesLogistica: scheduleDraft.observacoesLogistica
        });
        await sendFreightNotification(request.id, 'status');
      }

      setSelectedIds([]);
      setScheduleDraft({ motorista: '', veiculo: '', placa: '', agendamentoAt: '', observacoesLogistica: '' });
      setMessage({ type: 'success', text: `${targets.length} solicitação(ões) agendada(s).` });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar agendamento.' });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(request: FreightRequest, newStatus: FreightStatus, comment?: string) {
    setSaving(true);
    try {
      await updateFreightStatus(request, newStatus, comment || `Status alterado para ${newStatus}.`);
      await sendFreightNotification(request.id, 'status');
      setMessage({ type: 'success', text: `${formatProtocol(request)} atualizado para ${newStatus}.` });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar status.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeliveryPhoto(request: FreightRequest) {
    const files = deliveryFiles[request.id] || [];
    if (!files.length) {
      setMessage({ type: 'error', text: 'Selecione ao menos uma foto de entrega.' });
      return;
    }

    setSaving(true);
    try {
      await uploadFreightFiles(request.id, files, 'entrega');
      await updateFreightStatus(request, 'Concluído', 'Entrega concluída com foto pelo motorista.');
      await sendFreightNotification(request.id, 'status');
      setDeliveryFiles(current => ({ ...current, [request.id]: [] }));
      setMessage({ type: 'success', text: `${formatProtocol(request)} concluído com foto.` });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao concluir entrega.' });
    } finally {
      setSaving(false);
    }
  }

  async function saveDetailObservation(value: string) {
    if (!selected) return;
    try {
      await updateFreightRequest(selected.id, { observacoesLogistica: value });
      await appendFreightHistory(selected.id, { action: 'observation', comment: 'Observação logística atualizada.' });
      setMessage({ type: 'success', text: 'Observação salva.' });
      const refreshed = await getFreightRequests({ type: freightType });
      setRequests(refreshed);
      const updated = refreshed.find(item => item.id === selected.id) || null;
      setSelected(updated);
      if (updated) setHistory(await getFreightHistory(updated.id));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar observação.' });
    }
  }

  function exportXlsx() {
    const rows = filteredRequests.map(request => ({
      Protocolo: formatProtocol(request),
      Tipo: request.freightType,
      Status: request.status,
      Setor: request.setor || '',
      Projeto: request.projeto || request.projetoDescricao || '',
      Solicitante: request.solicitanteNome || request.emailSolicitante || request.createdByEmail || '',
      Prazo: formatFreightDate(request.prazoEntrega || request.prazoDesejado),
      Motorista: request.motorista || '',
      Veiculo: request.veiculo || '',
      Placa: request.placa || '',
      Origem: request.enderecoRetirada || request.enderecoOrigem || '',
      Destino: request.enderecoEntrega || request.enderecoDestino || '',
      Item: request.itemDescricao || request.necessidade || '',
      Observacoes: request.observacoes || request.observacoesFinais || ''
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Fretes');
    XLSX.writeFile(workbook, `fretes_${freightType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const header = isInternational
    ? { title: 'Frete Internacional', subtitle: 'Importação, exportação, volumes, mercadorias, anexos e status internos.', icon: Globe2 }
    : isDriver
      ? { title: 'Frete Nacional - Motorista', subtitle: 'Fluxo mobile para retirada, rota, conclusão e foto de entrega.', icon: Smartphone }
      : { title: 'Frete Nacional', subtitle: 'Solicitação, atendimento logístico, kanban, motorista e histórico integrados ao ConectaCup.', icon: Truck };
  const HeaderIcon = header.icon;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
              <HeaderIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">{header.title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">{header.subtitle}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{isInternational ? 'Internacional' : 'Nacional'}</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Integrado ao Supabase</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass('secondary')} onClick={loadData} type="button" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button className={buttonClass('secondary')} onClick={exportXlsx} type="button">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            {!isDriver ? (
              <button className={buttonClass('primary')} onClick={() => setTab('nova')} type="button">
                <Plus className="h-4 w-4" />
                Nova solicitação
              </button>
            ) : null}
          </div>
        </div>

        {message ? (
          <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {message.text}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total" value={stats.total} icon={ClipboardList} tone="bg-slate-100 text-slate-700" />
          <StatCard label="Pendentes" value={stats.pendente} icon={AlertTriangle} tone="bg-amber-100 text-amber-700" />
          <StatCard label={isInternational ? 'Em andamento' : 'Agendados'} value={stats.agendado} icon={CalendarClock} tone="bg-blue-100 text-blue-700" />
          <StatCard label={isInternational ? 'Trânsito/desembaraço' : 'Em rota'} value={stats.rota} icon={Route} tone="bg-red-100 text-red-700" />
          <StatCard label="Concluídos" value={stats.concluido} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3, visible: true },
            { id: 'nova', label: 'Nova solicitação', icon: Plus, visible: !isDriver },
            { id: 'atendimento', label: 'Atendimento', icon: CalendarClock, visible: !isInternational },
            { id: 'kanban', label: 'Kanban', icon: Columns3, visible: !isInternational },
            { id: 'motorista', label: 'Motorista', icon: Smartphone, visible: !isInternational },
            { id: 'relatorios', label: 'Relatórios', icon: FileSpreadsheet, visible: true }
          ].filter(item => item.visible).map(item => (
            <button
              key={item.id}
              className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${tab === item.id ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              onClick={() => setTab(item.id as TabKey)}
              type="button"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {tab !== 'nova' ? (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            statuses={isInternational ? statusOptionsInternational : statusOptionsNational}
            lookups={lookups}
            isInternational={isInternational}
          />
        ) : null}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <div className="text-center text-slate-500">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
              Carregando solicitações...
            </div>
          </div>
        ) : (
          <>
            {tab === 'dashboard' && (
              <RequestsTable
                requests={filteredRequests}
                isInternational={isInternational}
                onOpen={openDetails}
                onSchedule={startSchedule}
                onStatus={changeStatus}
                saving={saving}
              />
            )}

            {tab === 'nova' && !isInternational && (
              <NationalForm
                form={nationalForm}
                files={productFiles}
                lookups={lookups}
                saving={saving}
                onChange={updateNationalField}
                onFiles={files => setProductFiles(files)}
                onSubmit={handleCreateNational}
              />
            )}

            {tab === 'nova' && isInternational && (
              <InternationalForm
                form={internationalForm}
                setForm={setInternationalForm}
                volumes={volumes}
                setVolumes={setVolumes}
                items={items}
                setItems={setItems}
                lookups={lookups}
                saving={saving}
                volumeFiles={volumeFiles}
                itemFiles={itemFiles}
                setVolumeFiles={setVolumeFiles}
                setItemFiles={setItemFiles}
                onSubmit={handleCreateInternational}
              />
            )}

            {tab === 'atendimento' && !isInternational && (
              <AttendancePanel
                requests={filteredRequests.filter(request => request.status === 'Pendente' || selectedIds.includes(request.id))}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                draft={scheduleDraft}
                setDraft={setScheduleDraft}
                lookups={lookups}
                saving={saving}
                onApply={applySchedule}
                onOpen={openDetails}
              />
            )}

            {tab === 'kanban' && !isInternational && (
              <KanbanPanel
                requests={filteredRequests}
                isDriver={false}
                deliveryFiles={deliveryFiles}
                setDeliveryFiles={setDeliveryFiles}
                saving={saving}
                onOpen={openDetails}
                onStatus={changeStatus}
                onDelivery={handleDeliveryPhoto}
              />
            )}

            {tab === 'motorista' && !isInternational && (
              <KanbanPanel
                requests={filteredRequests}
                isDriver={true}
                deliveryFiles={deliveryFiles}
                setDeliveryFiles={setDeliveryFiles}
                saving={saving}
                onOpen={openDetails}
                onStatus={changeStatus}
                onDelivery={handleDeliveryPhoto}
              />
            )}

            {tab === 'relatorios' && (
              <ReportsPanel requests={filteredRequests} isInternational={isInternational} onExport={exportXlsx} />
            )}
          </>
        )}
      </div>

      <DetailDrawer request={selected} history={history} onClose={() => setSelected(null)} onSaveObservation={saveDetailObservation} />
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  statuses,
  lookups,
  isInternational
}: {
  filters: any;
  setFilters: (value: any) => void;
  statuses: FreightStatus[];
  lookups: any;
  isInternational: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className={labelClass()}>Busca</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${fieldClass()} pl-9`} value={filters.search} onChange={event => setFilters((current: any) => ({ ...current, search: event.target.value }))} placeholder="Protocolo, solicitante, item, motorista..." />
          </div>
        </div>
        <div>
          <label className={labelClass()}>Status</label>
          <select className={fieldClass()} value={filters.status} onChange={event => setFilters((current: any) => ({ ...current, status: event.target.value }))}>
            <option>Todos</option>
            {statuses.map(status => <option key={status}>{status}</option>)}
          </select>
        </div>
        {!isInternational ? (
          <div>
            <label className={labelClass()}>Motorista</label>
            <select className={fieldClass()} value={filters.motorista} onChange={event => setFilters((current: any) => ({ ...current, motorista: event.target.value }))}>
              <option>TODOS</option>
              <SelectOptionList options={lookups.motoristas} />
            </select>
          </div>
        ) : null}
        <div>
          <label className={labelClass()}>Setor</label>
          <select className={fieldClass()} value={filters.setor} onChange={event => setFilters((current: any) => ({ ...current, setor: event.target.value }))}>
            <option value="">Todos</option>
            <SelectOptionList options={lookups.setores} />
          </select>
        </div>
        <div>
          <label className={labelClass()}>Protocolo</label>
          <input className={fieldClass()} value={filters.protocolo} onChange={event => setFilters((current: any) => ({ ...current, protocolo: event.target.value }))} placeholder="#12, #15" />
        </div>
      </div>
    </div>
  );
}

function RequestsTable({
  requests,
  isInternational,
  onOpen,
  onSchedule,
  onStatus,
  saving
}: {
  requests: FreightRequest[];
  isInternational: boolean;
  onOpen: (request: FreightRequest) => void;
  onSchedule: (request: FreightRequest) => void;
  onStatus: (request: FreightRequest, status: FreightStatus) => void;
  saving: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-950">Solicitações</h2>
          <p className="text-sm text-slate-500">{requests.length} registro(s) encontrados</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Protocolo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">{isInternational ? 'Necessidade' : 'Setor'}</th>
              <th className="px-4 py-3">{isInternational ? 'Origem / destino' : 'Solicitante'}</th>
              <th className="px-4 py-3">{isInternational ? 'Transporte' : 'Prazo'}</th>
              <th className="px-4 py-3">Logística</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(request => (
              <tr key={request.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-950">{formatProtocol(request)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(request.status)}`}>{request.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{isInternational ? request.necessidade || '-' : request.setor || '-'}</div>
                  <div className="text-xs text-slate-500">{isInternational ? request.definitivaTemporaria || '-' : request.projeto || request.projetoDescricao || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  {isInternational ? (
                    <>
                      <div className="font-semibold text-slate-900">{request.empresaRemetente || '-'}</div>
                      <div className="text-xs text-slate-500">{request.empresaDestinatario || '-'}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-900">{request.solicitanteNome || '-'}</div>
                      <div className="max-w-sm truncate text-xs text-slate-500">{request.itemDescricao || '-'}</div>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{isInternational ? `${request.tipoFrete || '-'} · ${request.modalidadeFrete || '-'}` : formatFreightDate(request.prazoEntrega)}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{request.motorista || '-'}</div>
                  <div className="text-xs text-slate-500">{[request.veiculo, request.placa].filter(Boolean).join(' - ') || formatFreightDate(request.agendamentoAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button className={buttonClass('secondary')} onClick={() => onOpen(request)} type="button">
                      <Eye className="h-4 w-4" />
                      Detalhes
                    </button>
                    {!isInternational && request.status === 'Pendente' ? (
                      <button className={buttonClass('dark')} onClick={() => onSchedule(request)} type="button" disabled={saving}>
                        <CalendarClock className="h-4 w-4" />
                        Agendar
                      </button>
                    ) : null}
                    <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" value={request.status} onChange={event => onStatus(request, event.target.value as FreightStatus)} disabled={saving}>
                      {(isInternational ? statusOptionsInternational : statusOptionsNational).map(status => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {!requests.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Nenhuma solicitação encontrada.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NationalForm({
  form,
  files,
  lookups,
  saving,
  onChange,
  onFiles,
  onSubmit
}: {
  form: typeof emptyNationalForm;
  files: File[];
  lookups: any;
  saving: boolean;
  onChange: (field: keyof typeof emptyNationalForm, value: string) => void;
  onFiles: (files: File[]) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="rounded-lg border border-slate-200 bg-white shadow-sm" onSubmit={onSubmit}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">Cadastrar solicitação nacional</h2>
        <p className="text-sm text-slate-500">Campos equivalentes ao formulário Google Sheets atual, agora persistidos no Supabase.</p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Setor">
          <input className={fieldClass()} list="freight-setores" value={form.setor} onChange={event => onChange('setor', event.target.value)} required />
          <datalist id="freight-setores"><SelectOptionList options={lookups.setores} /></datalist>
        </Field>
        <Field label="Prazo de entrega">
          <input className={fieldClass()} type="datetime-local" value={form.prazoEntrega} onChange={event => onChange('prazoEntrega', event.target.value)} required />
        </Field>
        <Field label="Projeto">
          <select className={fieldClass()} value={form.projeto} onChange={event => onChange('projeto', event.target.value)} required>
            <option value="">Selecione...</option>
            <SelectOptionList options={lookups.projetos} />
          </select>
        </Field>
        <Field label="Responsável pela solicitação">
          <input className={fieldClass()} value={form.solicitanteNome} onChange={event => onChange('solicitanteNome', event.target.value)} required />
        </Field>
        <Field label="Responsável pela entrega">
          <input className={fieldClass()} value={form.responsavelEntrega} onChange={event => onChange('responsavelEntrega', event.target.value)} />
        </Field>
        <Field label="Responsável no local da retirada">
          <input className={fieldClass()} value={form.responsavelLocal} onChange={event => onChange('responsavelLocal', event.target.value)} />
        </Field>
        <Field label="Endereço de retirada">
          <input className={fieldClass()} list="freight-addresses" value={form.enderecoRetirada} onChange={event => onChange('enderecoRetirada', event.target.value)} />
        </Field>
        <Field label="Endereço de entrega">
          <input className={fieldClass()} list="freight-addresses" value={form.enderecoEntrega} onChange={event => onChange('enderecoEntrega', event.target.value)} />
          <datalist id="freight-addresses"><SelectOptionList options={lookups.enderecos} /></datalist>
        </Field>
        <Field label="Pagamento">
          <input className={fieldClass()} value={form.pagamento} onChange={event => onChange('pagamento', event.target.value)} placeholder="Centro de custo, forma ou condição" />
        </Field>
        <div className="md:col-span-2 xl:col-span-3">
          <Field label="Quantidades e materiais transportados">
            <textarea className={areaClass()} value={form.itemDescricao} onChange={event => onChange('itemDescricao', event.target.value)} placeholder={'Exemplo:\n1x Parachoque traseiro\n2x Molde de alumínio'} required />
          </Field>
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <Field label="Observações">
            <textarea className={areaClass()} value={form.observacoes} onChange={event => onChange('observacoes', event.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <Field label="Fotos do produto">
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <input type="file" accept="image/*" multiple onChange={event => onFiles(Array.from(event.target.files || []))} />
              <p className="text-sm text-slate-500">{files.length ? `${files.length} arquivo(s) selecionado(s)` : 'Nenhuma foto selecionada.'}</p>
            </div>
          </Field>
        </div>
      </div>
      <div className="flex justify-end border-t border-slate-100 px-5 py-4">
        <button className={buttonClass('primary')} type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Cadastrar solicitação'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass()}>{label}</span>
      {children}
    </label>
  );
}

function AttendancePanel({
  requests,
  selectedIds,
  setSelectedIds,
  draft,
  setDraft,
  lookups,
  saving,
  onApply,
  onOpen
}: {
  requests: FreightRequest[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  draft: any;
  setDraft: (fn: any) => void;
  lookups: any;
  saving: boolean;
  onApply: () => void;
  onOpen: (request: FreightRequest) => void;
}) {
  const toggle = (id: string) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id]);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-950">Pendentes para atendimento</h2>
            <p className="text-sm text-slate-500">Selecione uma ou várias solicitações e aplique o mesmo agendamento.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={Boolean(requests.length && selectedIds.length === requests.length)} onChange={event => setSelectedIds(event.target.checked ? requests.map(item => item.id) : [])} />
            Todos
          </label>
        </div>
        <div className="divide-y divide-slate-100">
          {requests.map(request => (
            <div key={request.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
              <input className="mt-1" type="checkbox" checked={selectedIds.includes(request.id)} onChange={() => toggle(request.id)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-950">{formatProtocol(request)}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(request.status)}`}>{request.status}</span>
                  <span className="text-sm text-slate-500">{formatFreightDate(request.prazoEntrega)}</span>
                </div>
                <div className="mt-1 font-semibold text-slate-900">{request.setor || '-'} · {request.projeto || '-'}</div>
                <div className="line-clamp-2 text-sm text-slate-500">{request.itemDescricao || '-'}</div>
              </div>
              <button className={buttonClass('secondary')} type="button" onClick={() => onOpen(request)}>
                <Eye className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!requests.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma solicitação pendente.</p> : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Preenchimento logística</h2>
        <p className="text-sm text-slate-500">{selectedIds.length} protocolo(s) selecionado(s)</p>
        <div className="mt-4 space-y-4">
          <Field label="Motorista">
            <input className={fieldClass()} list="freight-motoristas" value={draft.motorista} onChange={event => setDraft((current: any) => ({ ...current, motorista: event.target.value }))} />
            <datalist id="freight-motoristas"><SelectOptionList options={lookups.motoristas} /></datalist>
          </Field>
          <Field label="Veículo">
            <input className={fieldClass()} list="freight-veiculos" value={draft.veiculo} onChange={event => setDraft((current: any) => ({ ...current, veiculo: event.target.value }))} />
            <datalist id="freight-veiculos"><SelectOptionList options={lookups.veiculos} /></datalist>
          </Field>
          <Field label="Placa">
            <input className={fieldClass()} value={draft.placa} onChange={event => setDraft((current: any) => ({ ...current, placa: event.target.value.toUpperCase() }))} />
          </Field>
          <Field label="Data e horário de coleta e/ou entrega">
            <input className={fieldClass()} type="datetime-local" value={draft.agendamentoAt} onChange={event => setDraft((current: any) => ({ ...current, agendamentoAt: event.target.value }))} />
          </Field>
          <Field label="Observações logística">
            <textarea className={areaClass()} value={draft.observacoesLogistica} onChange={event => setDraft((current: any) => ({ ...current, observacoesLogistica: event.target.value }))} />
          </Field>
          <button className={buttonClass('primary')} type="button" onClick={onApply} disabled={saving}>
            <Save className="h-4 w-4" />
            Salvar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanPanel({
  requests,
  isDriver,
  deliveryFiles,
  setDeliveryFiles,
  saving,
  onOpen,
  onStatus,
  onDelivery
}: {
  requests: FreightRequest[];
  isDriver: boolean;
  deliveryFiles: Record<string, File[]>;
  setDeliveryFiles: (fn: any) => void;
  saving: boolean;
  onOpen: (request: FreightRequest) => void;
  onStatus: (request: FreightRequest, status: FreightStatus) => void;
  onDelivery: (request: FreightRequest) => void;
}) {
  const grouped = useMemo(() => {
    return laneOrder.reduce<Record<string, FreightRequest[]>>((acc, lane) => {
      acc[lane] = requests.filter(request => freightLane(request.status) === lane);
      return acc;
    }, {});
  }, [requests]);

  const driverRows = isDriver ? requests.filter(request => request.status !== 'Concluído') : requests;

  if (isDriver) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {driverRows.map(request => (
          <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-950">{formatProtocol(request)}</div>
                <div className="text-sm font-semibold text-slate-700">{request.setor || '-'} · {request.projeto || '-'}</div>
                <div className="text-sm text-slate-500">{formatFreightDate(request.agendamentoAt || request.prazoEntrega)}</div>
              </div>
              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClass(request.status)}`}>{request.status}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div><strong>Retirada:</strong> {request.enderecoRetirada || '-'}</div>
              <div><strong>Entrega:</strong> {request.enderecoEntrega || '-'}</div>
              <div><strong>Item:</strong> {request.itemDescricao || '-'}</div>
            </div>
            <div className="mt-4 grid gap-2">
              <a className={buttonClass('secondary')} href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(request.enderecoRetirada || '')}&destination=${encodeURIComponent(request.enderecoEntrega || '')}`} target="_blank" rel="noreferrer">
                <MapPin className="h-4 w-4" />
                Abrir rota
              </a>
              {request.status === 'Agendado' ? (
                <button className={buttonClass('dark')} onClick={() => onStatus(request, 'Em Rota')} type="button" disabled={saving}>
                  <Route className="h-4 w-4" />
                  Iniciar rota
                </button>
              ) : null}
              <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
                <span className="mb-2 flex items-center gap-2 font-semibold text-slate-700"><Camera className="h-4 w-4" /> Foto da entrega</span>
                <input type="file" accept="image/*" capture="environment" multiple onChange={event => setDeliveryFiles((current: any) => ({ ...current, [request.id]: Array.from(event.target.files || []) }))} />
                <span className="mt-2 block text-xs text-slate-500">{deliveryFiles[request.id]?.length || 0} arquivo(s)</span>
              </label>
              <button className={buttonClass('primary')} onClick={() => onDelivery(request)} type="button" disabled={saving}>
                <CheckCircle2 className="h-4 w-4" />
                Concluir entrega
              </button>
              <button className={buttonClass('secondary')} onClick={() => onOpen(request)} type="button">
                <Eye className="h-4 w-4" />
                Detalhes
              </button>
            </div>
          </div>
        ))}
        {!driverRows.length ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">Nenhuma entrega em aberto.</div> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {laneOrder.map(lane => (
        <div key={lane} className="min-h-96 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-bold text-slate-950">{laneLabels[lane]}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{grouped[lane]?.length || 0}</span>
          </div>
          <div className="space-y-3 p-3">
            {(grouped[lane] || []).map(request => (
              <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-950">{formatProtocol(request)}</span>
                  <button className="text-slate-500 hover:text-red-600" onClick={() => onOpen(request)} type="button">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-800">{request.setor || '-'}</div>
                <div className="line-clamp-2 text-xs text-slate-500">{request.itemDescricao || '-'}</div>
                <div className="mt-3 text-xs text-slate-500">{request.motorista || 'Sem motorista'} · {formatFreightDate(request.agendamentoAt || request.prazoEntrega)}</div>
                <div className="mt-3 flex gap-2">
                  {lane !== 'em_rota' && lane !== 'finalizado' ? (
                    <button className={buttonClass('secondary')} onClick={() => onStatus(request, lane === 'nao_iniciado' ? 'Agendado' : 'Em Rota')} type="button" disabled={saving}>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : null}
                  {lane !== 'finalizado' ? (
                    <button className={buttonClass('primary')} onClick={() => onStatus(request, 'Concluído')} type="button" disabled={saving}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InternationalForm({
  form,
  setForm,
  volumes,
  setVolumes,
  items,
  setItems,
  lookups,
  saving,
  volumeFiles,
  itemFiles,
  setVolumeFiles,
  setItemFiles,
  onSubmit
}: {
  form: typeof emptyInternationalForm;
  setForm: (fn: any) => void;
  volumes: FreightVolume[];
  setVolumes: (fn: any) => void;
  items: FreightItem[];
  setItems: (fn: any) => void;
  lookups: any;
  saving: boolean;
  volumeFiles: File[];
  itemFiles: File[];
  setVolumeFiles: (files: File[]) => void;
  setItemFiles: (files: File[]) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const change = (field: keyof typeof emptyInternationalForm, value: string) => setForm((current: any) => ({ ...current, [field]: value }));

  return (
    <form className="rounded-lg border border-slate-200 bg-white shadow-sm" onSubmit={onSubmit}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">Solicitação de Frete Internacional</h2>
        <p className="text-sm text-slate-500">Fluxo de importação/exportação com volumes, mercadorias, anexos e requisitos de transporte.</p>
      </div>
      <div className="space-y-6 p-5">
        <FormSection title="1. Tipo de solicitação">
          <div className="grid gap-3 md:grid-cols-3">
            <SegmentedButton value={form.necessidade} options={['Importação', 'Exportação']} onChange={value => change('necessidade', value)} />
            <SegmentedButton value={form.definitivaTemporaria} options={['Definitiva', 'Temporária']} onChange={value => change('definitivaTemporaria', value)} />
            <Field label="Observações">
              <input className={fieldClass()} value={form.observacoesNecessidade} onChange={event => change('observacoesNecessidade', event.target.value)} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="2. Origem e destino">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Origem</h3>
              <Field label="Empresa remetente"><input className={fieldClass()} value={form.empresaRemetente} onChange={event => change('empresaRemetente', event.target.value)} required /></Field>
              <Field label="Endereço completo"><input className={fieldClass()} value={form.enderecoOrigem} onChange={event => change('enderecoOrigem', event.target.value)} required /></Field>
              <Field label="Endereço de coleta se diferente"><input className={fieldClass()} value={form.enderecoColetaOrigem} onChange={event => change('enderecoColetaOrigem', event.target.value)} /></Field>
              <Field label="Contato"><input className={fieldClass()} value={form.nomeContatoOrigem} onChange={event => change('nomeContatoOrigem', event.target.value)} required /></Field>
              <Field label="E-mail"><input className={fieldClass()} type="email" value={form.emailContatoOrigem} onChange={event => change('emailContatoOrigem', event.target.value)} required /></Field>
              <Field label="Telefone"><input className={fieldClass()} value={form.telefoneContatoOrigem} onChange={event => change('telefoneContatoOrigem', event.target.value)} required /></Field>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Destino</h3>
              <Field label="Empresa destinatário"><input className={fieldClass()} value={form.empresaDestinatario} onChange={event => change('empresaDestinatario', event.target.value)} required /></Field>
              <Field label="Endereço completo"><input className={fieldClass()} value={form.enderecoDestino} onChange={event => change('enderecoDestino', event.target.value)} required /></Field>
              <Field label="Endereço de entrega se diferente"><input className={fieldClass()} value={form.enderecoEntregaDestino} onChange={event => change('enderecoEntregaDestino', event.target.value)} /></Field>
              <Field label="Contato"><input className={fieldClass()} value={form.nomeContatoDestino} onChange={event => change('nomeContatoDestino', event.target.value)} required /></Field>
              <Field label="E-mail"><input className={fieldClass()} type="email" value={form.emailContatoDestino} onChange={event => change('emailContatoDestino', event.target.value)} required /></Field>
              <Field label="Telefone"><input className={fieldClass()} value={form.telefoneContatoDestino} onChange={event => change('telefoneContatoDestino', event.target.value)} required /></Field>
            </div>
          </div>
        </FormSection>

        <FormSection title="3. Volumes">
          <EditableVolumes volumes={volumes} setVolumes={setVolumes} lookups={lookups} />
          <button className={buttonClass('secondary')} type="button" onClick={() => setVolumes((current: FreightVolume[]) => [...current, newVolume(current.length + 1)])}>
            <Plus className="h-4 w-4" />
            Adicionar volume
          </button>
          <FileDrop label="Anexar planilha de volumes" files={volumeFiles} onFiles={setVolumeFiles} />
        </FormSection>

        <FormSection title="4. Mercadorias">
          <EditableItems items={items} setItems={setItems} />
          <button className={buttonClass('secondary')} type="button" onClick={() => setItems((current: FreightItem[]) => [...current, newItem(current.length + 1)])}>
            <Plus className="h-4 w-4" />
            Adicionar item
          </button>
          <FileDrop label="Anexar planilha de itens" files={itemFiles} onFiles={setItemFiles} />
        </FormSection>

        <FormSection title="5. Requisitos de transporte">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Prazo desejado"><input className={fieldClass()} type="date" value={form.prazoDesejado} onChange={event => change('prazoDesejado', event.target.value)} /></Field>
            <Field label="Tipo de frete">
              <select className={fieldClass()} value={form.tipoFrete} onChange={event => change('tipoFrete', event.target.value)} required>
                <SelectOptionList options={lookups.tiposFrete} />
              </select>
            </Field>
            <Field label="Modalidade">
              <select className={fieldClass()} value={form.modalidadeFrete} onChange={event => change('modalidadeFrete', event.target.value)} required>
                <option value="">Selecione...</option>
                <SelectOptionList options={lookups.modalidades} />
              </select>
            </Field>
            <Field label="Seguro">
              <select className={fieldClass()} value={form.necessitaSeguro} onChange={event => change('necessitaSeguro', event.target.value)}>
                <option>Sim</option>
                <option>Não</option>
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="6. Solicitante e observações finais">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nome solicitante"><input className={fieldClass()} value={form.solicitanteNome} onChange={event => change('solicitanteNome', event.target.value)} /></Field>
            <Field label="Empresa solicitante"><input className={fieldClass()} value={form.empresaSolicitante} onChange={event => change('empresaSolicitante', event.target.value)} /></Field>
            <Field label="CNPJ"><input className={fieldClass()} value={form.cnpj} onChange={event => change('cnpj', event.target.value)} /></Field>
            <Field label="Telefone"><input className={fieldClass()} value={form.telefoneSolicitante} onChange={event => change('telefoneSolicitante', event.target.value)} /></Field>
            <Field label="E-mail"><input className={fieldClass()} type="email" value={form.emailSolicitante} onChange={event => change('emailSolicitante', event.target.value)} /></Field>
            <Field label="Responsável custos"><input className={fieldClass()} value={form.responsavelCustos} onChange={event => change('responsavelCustos', event.target.value)} /></Field>
            <div className="md:col-span-3">
              <Field label="Observações finais"><textarea className={areaClass()} value={form.observacoesFinais} onChange={event => change('observacoesFinais', event.target.value)} /></Field>
            </div>
          </div>
        </FormSection>
      </div>
      <div className="flex justify-end border-t border-slate-100 px-5 py-4">
        <button className={buttonClass('primary')} type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Cadastrar solicitação internacional'}
        </button>
      </div>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-4 text-base font-bold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function SegmentedButton({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(option => (
        <button key={option} className={`h-10 rounded-md border text-sm font-semibold ${value === option ? 'border-red-600 bg-red-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`} onClick={() => onChange(option)} type="button">
          {option}
        </button>
      ))}
    </div>
  );
}

function EditableVolumes({ volumes, setVolumes, lookups }: { volumes: FreightVolume[]; setVolumes: (fn: any) => void; lookups: any }) {
  return (
    <div className="mb-3 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="p-2">Qtd.</th>
            <th className="p-2">Dimensões CxLxA</th>
            <th className="p-2">Peso bruto kg</th>
            <th className="p-2">Embalagem</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {volumes.map((volume, index) => (
            <tr key={index}>
              <td className="p-2"><input className={fieldClass()} type="number" value={volume.quantidade ?? ''} onChange={event => setVolumes((current: FreightVolume[]) => current.map((item, i) => i === index ? { ...item, quantidade: normalizeNumber(event.target.value) } : item))} /></td>
              <td className="p-2"><input className={fieldClass()} value={volume.dimensoes || ''} onChange={event => setVolumes((current: FreightVolume[]) => current.map((item, i) => i === index ? { ...item, dimensoes: event.target.value } : item))} placeholder="120x80x90" /></td>
              <td className="p-2"><input className={fieldClass()} type="number" step="0.01" value={volume.pesoBruto ?? ''} onChange={event => setVolumes((current: FreightVolume[]) => current.map((item, i) => i === index ? { ...item, pesoBruto: normalizeNumber(event.target.value) } : item))} /></td>
              <td className="p-2">
                <select className={fieldClass()} value={volume.tipoEmbalagem || 'Palete'} onChange={event => setVolumes((current: FreightVolume[]) => current.map((item, i) => i === index ? { ...item, tipoEmbalagem: event.target.value } : item))}>
                  <SelectOptionList options={lookups.embalagens} />
                </select>
              </td>
              <td className="p-2">
                <button className={buttonClass('danger')} type="button" onClick={() => setVolumes((current: FreightVolume[]) => current.filter((_, i) => i !== index).map((item, i) => ({ ...item, itemNumero: i + 1 })))}>
                  <X className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditableItems({ items, setItems }: { items: FreightItem[]; setItems: (fn: any) => void }) {
  return (
    <div className="mb-3 space-y-3">
      {items.map((item, index) => (
        <div key={index} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4 xl:grid-cols-9">
          <input className={fieldClass()} type="number" placeholder="Qtd" value={item.quantidade ?? ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, quantidade: normalizeNumber(event.target.value) } : row))} />
          <input className={`${fieldClass()} md:col-span-3 xl:col-span-2`} placeholder="Descrição" value={item.descricao || ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, descricao: event.target.value } : row))} />
          <input className={fieldClass()} placeholder="Serial/Part" value={item.serialPartNumber || ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, serialPartNumber: event.target.value } : row))} />
          <input className={fieldClass()} placeholder="NCM" value={item.ncm || ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, ncm: event.target.value } : row))} />
          <input className={fieldClass()} placeholder="Fabricante" value={item.fabricante || ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, fabricante: event.target.value } : row))} />
          <input className={fieldClass()} placeholder="País origem" value={item.paisOrigem || ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, paisOrigem: event.target.value } : row))} />
          <input className={fieldClass()} type="number" step="0.01" placeholder="Valor" value={item.valorItem ?? ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, valorItem: normalizeNumber(event.target.value) } : row))} />
          <div className="flex gap-2">
            <input className={fieldClass()} type="number" step="0.01" placeholder="Peso kg" value={item.pesoUnitario ?? ''} onChange={event => setItems((current: FreightItem[]) => current.map((row, i) => i === index ? { ...row, pesoUnitario: normalizeNumber(event.target.value) } : row))} />
            <button className={buttonClass('danger')} type="button" onClick={() => setItems((current: FreightItem[]) => current.filter((_, i) => i !== index).map((row, i) => ({ ...row, itemNumero: i + 1 })))}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FileDrop({ label, files, onFiles }: { label: string; files: File[]; onFiles: (files: File[]) => void }) {
  return (
    <label className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
      <span className="flex items-center gap-2 font-semibold text-slate-700"><Upload className="h-4 w-4" /> {label}</span>
      <input type="file" accept=".xls,.xlsx,.csv,.pdf,image/*" multiple onChange={event => onFiles(Array.from(event.target.files || []))} />
      <span className="text-xs text-slate-500">{files.length ? `${files.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo selecionado.'}</span>
    </label>
  );
}

function ReportsPanel({ requests, isInternational, onExport }: { requests: FreightRequest[]; isInternational: boolean; onExport: () => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach(request => {
      const key = isInternational ? request.status : request.motorista || 'Sem motorista';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [requests, isInternational]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Relatório operacional</h2>
            <p className="text-sm text-slate-500">Baseado nos filtros atuais.</p>
          </div>
          <button className={buttonClass('primary')} onClick={onExport} type="button">
            <Download className="h-4 w-4" />
            Exportar XLSX
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {grouped.map(([label, total]) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <span className="font-semibold text-slate-800">{label}</span>
              <span className="text-xl font-bold text-slate-950">{total}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-950">Resumo</h3>
        <div className="mt-4 space-y-3 text-sm">
          <InfoLine label="Total" value={String(requests.length)} />
          <InfoLine label="Primeiro registro" value={requests.length ? formatFreightDate(requests[requests.length - 1].createdAt) : '-'} />
          <InfoLine label="Último registro" value={requests.length ? formatFreightDate(requests[0].createdAt) : '-'} />
        </div>
      </div>
    </div>
  );
}

export function FreightNational() {
  return <FreightPage mode="nacional" />;
}

export function FreightDriver() {
  return <FreightPage mode="motorista" />;
}

export function FreightInternational() {
  return <FreightPage mode="internacional" />;
}

export default FreightNational;
