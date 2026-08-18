import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  Globe2,
  Info,
  MapPin,
  Package,
  Pencil,
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
  isRequestedFreightStatus,
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
import { usePermissions } from '../utils/usePermissions';

type FreightMode = 'nacional' | 'motorista' | 'internacional';
type TabKey = 'dashboard' | 'nova' | 'atendimento' | 'kanban' | 'motorista' | 'relatorios';

const laneLabels: Record<string, string> = {
  nao_iniciado: 'Aguardando agendamento',
  em_andamento: 'Agendado',
  em_rota: 'Em Rota',
  finalizado: 'Entregue'
};

const laneOrder = ['nao_iniciado', 'em_andamento', 'em_rota', 'finalizado'];

const laneTargetStatus: Record<string, FreightStatus> = {
  nao_iniciado: 'Solicitado',
  em_andamento: 'Agendado',
  em_rota: 'Em Rota',
  finalizado: 'Concluído'
};

const laneStyles: Record<string, { border: string; bg: string; soft: string }> = {
  nao_iniciado: {
    border: 'bg-slate-300',
    bg: 'bg-slate-50',
    soft: 'bg-slate-100 text-slate-600'
  },
  em_andamento: {
    border: 'bg-amber-400',
    bg: 'bg-amber-50',
    soft: 'bg-amber-100 text-amber-700'
  },
  em_rota: {
    border: 'bg-blue-500',
    bg: 'bg-blue-50',
    soft: 'bg-blue-100 text-blue-700'
  },
  finalizado: {
    border: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    soft: 'bg-emerald-100 text-emerald-700'
  }
};

const statusOptionsNational: FreightStatus[] = ['Solicitado', 'Agendado', 'Em Rota', 'Concluído', 'Cancelado'];
const statusOptionsInternational: FreightStatus[] = ['Solicitado', 'Em cotação', 'Aguardando coleta', 'Em trânsito', 'Desembaraço', 'Concluído', 'Cancelado'];

const emptyNationalForm = {
  setor: '',
  setorId: '',
  prazoEntrega: '',
  projeto: '',
  projetoId: '',
  projetoDescricao: '',
  solicitanteNome: '',
  itemDescricao: '',
  responsavelLocal: '',
  enderecoRetirada: '',
  enderecoEntrega: '',
  observacoes: ''
};

const emptyNationalEditForm = {
  ...emptyNationalForm,
  status: 'Solicitado' as FreightStatus,
  motorista: '',
  veiculo: '',
  placa: '',
  agendamentoAt: '',
  observacoesLogistica: ''
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

type FreightMedia = {
  fileUrl: string;
  fileName?: string;
  category: FreightAttachmentCategory;
  mimeType?: string;
  isImage: boolean;
};

type FreightAttachmentCategory = FreightRequest['attachments'] extends Array<infer Attachment>
  ? Attachment extends { category: infer Category }
    ? Category
    : string
  : string;

function isImageUrl(url?: string, mimeType?: string) {
  if (mimeType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)(\?.*)?$/i.test(url || '');
}

function getFreightMedia(request: FreightRequest, categories?: FreightAttachmentCategory[]): FreightMedia[] {
  const allowed = categories?.length ? new Set<string>(categories) : null;
  const seen = new Set<string>();
  const media: FreightMedia[] = [];
  const add = (item: { fileUrl?: string; fileName?: string; category?: FreightAttachmentCategory; mimeType?: string }) => {
    const fileUrl = String(item.fileUrl || '').trim();
    const category = item.category || 'produto';
    if (!fileUrl || seen.has(fileUrl) || (allowed && !allowed.has(String(category)))) return;
    seen.add(fileUrl);
    media.push({
      fileUrl,
      fileName: item.fileName,
      category,
      mimeType: item.mimeType,
      isImage: isImageUrl(fileUrl, item.mimeType)
    });
  };

  (request.attachments || []).forEach(add);
  request.fotosProdutoUrls.forEach((fileUrl, index) => add({ fileUrl, fileName: `Foto do produto ${index + 1}`, category: 'produto' }));
  request.fotoEntregaUrls.forEach((fileUrl, index) => add({ fileUrl, fileName: `Foto da entrega ${index + 1}`, category: 'entrega' }));
  return media;
}

function firstLine(value?: string) {
  return String(value || '-').split(/\r?\n/).map(item => item.trim()).filter(Boolean)[0] || '-';
}

function compactText(value?: string, maxLength = 34) {
  const normalized = String(value || '-').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function requestPriority(request: FreightRequest) {
  const payload = request.payloadOriginal || {};
  return String(
    payload.prioridade ||
    payload.priority ||
    (payload as any).Prioridade ||
    'undefined'
  );
}

function splitSelection(value?: string) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function setMultiSelectValue(current: string, value: string, selected: boolean) {
  const values = new Set(splitSelection(current));
  if (selected) values.add(value);
  else values.delete(value);
  return Array.from(values).join(', ');
}

type RouteEstimate = {
  status: 'idle' | 'loading' | 'OK' | 'ERROR' | 'MISSING_FIELDS';
  provider?: string;
  distanceText?: string;
  durationText?: string;
  trafficText?: string;
  origin?: string;
  destination?: string;
  message?: string;
};

function routeProviderLabel(provider?: string, status?: RouteEstimate['status']) {
  if (provider === 'distancematrix_ai') return 'DistanceMatrix.ai';
  if (provider === 'google_distance_matrix') return 'Google Distance Matrix';
  return status === 'loading' ? 'calculando...' : '—';
}

async function fetchRouteEstimate(request: FreightRequest, departureAt?: string): Promise<RouteEstimate> {
  const origin = request.enderecoRetirada || '';
  const destination = request.enderecoEntrega || '';
  if (!origin || !destination) {
    return { status: 'MISSING_FIELDS', origin, destination, message: 'Retirada ou entrega ausente.' };
  }

  try {
    const response = await fetch('/api/freight/route-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, departureAt, mode: 'driving' })
    });
    const data = await response.json().catch(() => ({}));
    return {
      status: data.status || (response.ok ? 'OK' : 'ERROR'),
      provider: data.provider,
      distanceText: data.distanceText,
      durationText: data.durationText,
      trafficText: data.trafficText,
      origin: data.origin || origin,
      destination: data.destination || destination,
      message: data.message || (!response.ok ? 'API de estimativa indisponível.' : undefined)
    };
  } catch (error: any) {
    return {
      status: 'ERROR',
      origin,
      destination,
      message: error.message || 'Falha ao consultar estimativa.'
    };
  }
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

function freightAddressOptionValue(option: FreightLookupOption) {
  const metadata = option.metadata || {};
  return [
    metadata.valor,
    metadata.endereco,
    metadata.address,
    metadata.descricao,
    option.value,
    option.label
  ].map(item => String(item || '').trim()).find(Boolean) || option.value;
}

function googleMapsAddressUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function wazeAddressUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

function normalizedAddressText(value?: string) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function resolveAddressDisplay(value?: string, options: FreightLookupOption[] = []) {
  const raw = String(value || '').trim();
  if (!raw) return { display: '-', linkTarget: '' };

  const match = options.find(option => {
    const metadata = option.metadata || {};
    return [
      option.value,
      option.label,
      metadata.valor,
      metadata.endereco,
      metadata.address,
      metadata.descricao
    ].some(candidate => String(candidate || '').trim().toLowerCase() === raw.toLowerCase());
  });

  if (!match) return { display: raw, linkTarget: raw };

  const fullAddress = freightAddressOptionValue(match);
  const shortName = String(match.label || match.value || '').trim();
  const normalizedShortName = normalizedAddressText(shortName);
  const normalizedFullAddress = normalizedAddressText(fullAddress);
  const display = shortName && fullAddress && normalizedShortName.includes(normalizedFullAddress)
    ? shortName
    : shortName && fullAddress && normalizedShortName !== normalizedFullAddress
    ? `${shortName} - ${fullAddress}`
    : fullAddress || shortName || raw;

  return { display, linkTarget: fullAddress || raw };
}

function SelectAddressOptionList({ options }: { options: FreightLookupOption[] }) {
  return (
    <>
      {options.map(option => {
        const value = freightAddressOptionValue(option);
        return (
          <option key={option.id || option.value} value={value} label={option.label}>
            {option.label}
          </option>
        );
      })}
    </>
  );
}

function toDateTimeLocalInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function normalizeFreightProfileValue(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isLocalFreightAdminUser() {
  try {
    const user = JSON.parse(localStorage.getItem('porsche-cup-user') || '{}');
    const values = [user.profileId, user.role, user.accessType, user.tipoAcesso, user.tipo_acesso]
      .map(normalizeFreightProfileValue);
    return values.some(value => value === 'admin' || value === 'administrador');
  } catch {
    return false;
  }
}

function nationalEditFormFromRequest(request: FreightRequest): typeof emptyNationalEditForm {
  return {
    setor: request.setor || '',
    setorId: request.setorId || '',
    prazoEntrega: toDateTimeLocalInput(request.prazoEntrega),
    projeto: request.projeto || '',
    projetoId: request.projetoId || '',
    projetoDescricao: request.projetoDescricao || '',
    solicitanteNome: request.solicitanteNome || '',
    itemDescricao: request.itemDescricao || '',
    responsavelLocal: request.responsavelLocal || '',
    enderecoRetirada: request.enderecoRetirada || '',
    enderecoEntrega: request.enderecoEntrega || '',
    observacoes: request.observacoes || '',
    status: request.status || 'Solicitado',
    motorista: request.motorista || '',
    veiculo: request.veiculo || '',
    placa: request.placa || '',
    agendamentoAt: toDateTimeLocalInput(request.agendamentoAt),
    observacoesLogistica: request.observacoesLogistica || ''
  };
}

function freightDeadlineInfo(request: FreightRequest) {
  if (isRequestedFreightStatus(request.status)) {
    return {
      label: 'Prazo',
      value: request.prazoEntrega || request.prazoDesejado
    };
  }

  return {
    label: 'Agendamento',
    value: request.agendamentoAt
  };
}

function DetailDrawer({
  request,
  history,
  addressOptions,
  onClose,
  onSaveObservation
}: {
  request: FreightRequest | null;
  history: FreightHistory[];
  addressOptions: FreightLookupOption[];
  onClose: () => void;
  onSaveObservation: (value: string) => Promise<void>;
}) {
  const [obs, setObs] = useState('');
  const [detailRouteEstimate, setDetailRouteEstimate] = useState<RouteEstimate | null>(null);

  useEffect(() => {
    setObs(request?.observacoesLogistica || '');
  }, [request?.id]);

  useEffect(() => {
    let cancelled = false;

    if (!request || request.freightType === 'internacional') {
      setDetailRouteEstimate(null);
      return;
    }

    setDetailRouteEstimate({
      status: 'loading',
      origin: request.enderecoRetirada,
      destination: request.enderecoEntrega
    });

    fetchRouteEstimate(request, request.agendamentoAt).then(result => {
      if (!cancelled) setDetailRouteEstimate(result);
    });

    return () => {
      cancelled = true;
    };
  }, [request?.id, request?.freightType, request?.enderecoRetirada, request?.enderecoEntrega, request?.agendamentoAt]);

  if (!request) return null;

  const media = getFreightMedia(request);
  const imageMedia = media.filter(file => file.isImage);
  const documentMedia = media.filter(file => !file.isImage);
  const detailRouteEstimates = detailRouteEstimate ? { [request.id]: detailRouteEstimate } : {};
  const deadlineInfo = freightDeadlineInfo(request);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={onClose}>
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
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
            <InfoBox label={deadlineInfo.label} value={formatFreightDate(deadlineInfo.value)} />
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
              <AddressInfoLine label="Origem" value={request.enderecoRetirada || request.enderecoOrigem} options={addressOptions} />
              <AddressInfoLine label="Destino" value={request.enderecoEntrega || request.enderecoDestino} options={addressOptions} />
              <div className="md:col-span-2">
                <InfoLine label="Materiais / necessidade" value={request.itemDescricao || request.necessidade || '-'} multiline />
              </div>
              <div className="md:col-span-2">
                <InfoLine label="Observações" value={request.observacoes || request.observacoesFinais || '-'} multiline />
              </div>
            </div>
          </section>

          {request.freightType !== 'internacional' ? (
            <RouteEstimatePanel selectedRequests={[request]} estimates={detailRouteEstimates} showProtocol={false} />
          ) : null}

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
            <div className="space-y-4 p-4">
              {imageMedia.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {imageMedia.map((file, index) => (
                    <a key={`${file.fileUrl}-${index}`} href={file.fileUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-md border border-slate-200 bg-slate-50 hover:border-red-200">
                      <img src={file.fileUrl} alt={`Foto ${index + 1}`} className="h-40 w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
                      <div className="px-3 py-2 text-xs">
                        <span className="font-semibold text-slate-700">Foto {index + 1}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : null}

              {documentMedia.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {documentMedia.map((file, index) => (
                    <a key={`${file.fileUrl}-${index}`} href={file.fileUrl} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:border-red-200 hover:text-red-700">
                      <FileSpreadsheet className="mb-2 h-4 w-4" />
                      {file.fileName || `Anexo ${index + 1}`}
                      <span className="mt-1 block text-xs font-normal text-slate-500">{file.category}</span>
                    </a>
                  ))}
                </div>
              ) : null}

              {!media.length ? (
                <p className="text-sm text-slate-500">Nenhum anexo registrado.</p>
              ) : null}
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

function AddressInfoLine({ label, value, options }: { label: string; value?: string; options?: FreightLookupOption[] }) {
  const resolved = resolveAddressDisplay(value, options);
  const hasLink = Boolean(resolved.linkTarget);

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">
        {resolved.display}
        {hasLink ? (
          <span className="ml-1 whitespace-nowrap">
            (
            <a className="font-semibold text-blue-700 hover:text-blue-900" href={googleMapsAddressUrl(resolved.linkTarget)} target="_blank" rel="noreferrer">Google</a>
            <span className="text-slate-400"> | </span>
            <a className="font-semibold text-blue-700 hover:text-blue-900" href={wazeAddressUrl(resolved.linkTarget)} target="_blank" rel="noreferrer">Waze</a>
            )
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FreightPage({ mode }: { mode: FreightMode }) {
  const isInternational = mode === 'internacional';
  const isDriver = mode === 'motorista';
  const { isUserAdmin, profile } = usePermissions();
  const [tab, setTab] = useState<TabKey>(isInternational ? 'dashboard' : isDriver ? 'motorista' : 'dashboard');
  const profileId = normalizeFreightProfileValue(profile?.id);
  const profileName = normalizeFreightProfileValue(profile?.name);
  const isOperatorFreightProfile = !isInternational && !isDriver && (profileId === 'operator' || profileName === 'operador');
  const isDriverFreightProfile = !isInternational && !isDriver && (profileId === 'driver' || profileId === 'motorista' || profileName === 'motorista');
  const forcedTab: TabKey | null = isDriver || isDriverFreightProfile ? 'motorista' : isOperatorFreightProfile ? 'nova' : null;
  const activeTab = forcedTab || tab;
  const isSingleTabView = Boolean(forcedTab);
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
  const [filters, setFilters] = useState({ search: '', status: 'Todos', motorista: 'TODOS', setor: '', projeto: '', protocolo: '', dateFrom: '', dateTo: '' });
  const [kanbanFiltersOpen, setKanbanFiltersOpen] = useState(true);
  const [selected, setSelected] = useState<FreightRequest | null>(null);
  const [history, setHistory] = useState<FreightHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [nationalForm, setNationalForm] = useState(emptyNationalForm);
  const [editingRequest, setEditingRequest] = useState<FreightRequest | null>(null);
  const [nationalEditForm, setNationalEditForm] = useState(emptyNationalEditForm);
  const [editProductFiles, setEditProductFiles] = useState<File[]>([]);
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
  const canEditFreightRequests = !isInternational && !isDriver && !isSingleTabView && (isUserAdmin() || isLocalFreightAdminUser());

  useEffect(() => {
    loadData();
  }, [freightType]);

  useEffect(() => {
    if (forcedTab && tab !== forcedTab) {
      setTab(forcedTab);
    }
  }, [forcedTab, tab]);

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
      if (activeTab === 'kanban' && !isInternational && (filters.dateFrom || filters.dateTo)) {
        if (!request.agendamentoAt) return false;
        const scheduledAt = new Date(request.agendamentoAt).getTime();
        if (Number.isNaN(scheduledAt)) return false;
        if (filters.dateFrom) {
          const from = new Date(`${filters.dateFrom}T00:00:00`).getTime();
          if (scheduledAt < from) return false;
        }
        if (filters.dateTo) {
          const to = new Date(`${filters.dateTo}T23:59:59`).getTime();
          if (scheduledAt > to) return false;
        }
      }
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
  }, [activeTab, filters, isInternational, requests]);

  const stats = useMemo(() => {
    const source = filteredRequests;
    return {
      total: source.length,
      pendente: source.filter(item => isRequestedFreightStatus(item.status)).length,
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
      const setorId = option?.source === 'setor' ? option.id || '' : '';
      setNationalForm(current => ({ ...current, setor: value, setorId }));
      return;
    }

    if (field === 'projeto') {
      const option = lookups.projetos.find(item => item.value === value);
      const projetoId = option?.source === 'projeto' ? option.id || '' : '';
      setNationalForm(current => ({
        ...current,
        projeto: value,
        projetoId,
        projetoDescricao: String(option?.metadata?.descricao || '')
      }));
      return;
    }

    setNationalForm(current => ({ ...current, [field]: value }));
  }

  function openEditRequest(request: FreightRequest) {
    if (!canEditFreightRequests) {
      setMessage({ type: 'error', text: 'Apenas administradores podem editar solicitações.' });
      return;
    }
    setEditingRequest(request);
    setNationalEditForm(nationalEditFormFromRequest(request));
    setEditProductFiles([]);
  }

  function closeEditRequest() {
    setEditingRequest(null);
    setNationalEditForm(emptyNationalEditForm);
    setEditProductFiles([]);
  }

  function updateNationalEditField(field: keyof typeof emptyNationalEditForm, value: string) {
    if (field === 'setor') {
      const option = lookups.setores.find(item => item.value === value);
      const setorId = option?.source === 'setor' ? option.id || '' : '';
      setNationalEditForm(current => ({ ...current, setor: value, setorId }));
      return;
    }

    if (field === 'projeto') {
      const option = lookups.projetos.find(item => item.value === value);
      const projetoId = option?.source === 'projeto' ? option.id || '' : '';
      setNationalEditForm(current => ({
        ...current,
        projeto: value,
        projetoId,
        projetoDescricao: String(option?.metadata?.descricao || '')
      }));
      return;
    }

    if (field === 'veiculo') {
      const option = lookups.veiculos.find(item => item.value === value);
      const placa = String(option?.metadata?.placa || '').trim();
      setNationalEditForm(current => ({
        ...current,
        veiculo: value,
        placa: placa || current.placa
      }));
      return;
    }

    setNationalEditForm(current => ({ ...current, [field]: value }));
  }

  async function handleSaveNationalEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingRequest) return;
    if (!canEditFreightRequests) {
      setMessage({ type: 'error', text: 'Apenas administradores podem editar solicitações.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const previousPayload = editingRequest.payloadOriginal && typeof editingRequest.payloadOriginal === 'object'
        ? editingRequest.payloadOriginal
        : {};
      const payloadOriginal = {
        ...previousPayload,
        ...nationalEditForm,
        freightType: 'nacional'
      };

      await updateFreightRequest(editingRequest.id, {
        freightType: 'nacional',
        status: nationalEditForm.status,
        setor: nationalEditForm.setor,
        setorId: nationalEditForm.setorId || undefined,
        projeto: nationalEditForm.projeto,
        projetoId: nationalEditForm.projetoId || undefined,
        projetoDescricao: nationalEditForm.projetoDescricao || undefined,
        prazoEntrega: nationalEditForm.prazoEntrega,
        solicitanteNome: nationalEditForm.solicitanteNome,
        responsavelEntrega: undefined,
        itemDescricao: nationalEditForm.itemDescricao,
        responsavelLocal: nationalEditForm.responsavelLocal,
        enderecoRetirada: nationalEditForm.enderecoRetirada,
        enderecoEntrega: nationalEditForm.enderecoEntrega,
        pagamento: undefined,
        observacoes: nationalEditForm.observacoes,
        motorista: nationalEditForm.motorista,
        veiculo: nationalEditForm.veiculo,
        placa: nationalEditForm.placa,
        agendamentoAt: nationalEditForm.agendamentoAt,
        observacoesLogistica: nationalEditForm.observacoesLogistica,
        payloadOriginal
      });

      if (editProductFiles.length) {
        await uploadFreightFiles(editingRequest.id, editProductFiles, 'produto');
      }

      await appendFreightHistory(editingRequest.id, {
        action: 'admin_edit',
        previousStatus: editingRequest.status,
        newStatus: nationalEditForm.status,
        comment: 'Solicitação editada por administrador.',
        payload: {
          protocol: editingRequest.protocol,
          editedFields: Object.keys(nationalEditForm),
          addedFiles: editProductFiles.length
        }
      });

      setMessage({ type: 'success', text: `${formatProtocol(editingRequest)} atualizado.` });
      closeEditRequest();
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao editar solicitação.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateNational(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await createFreightRequest({
        freightType: 'nacional',
        status: 'Solicitado',
        ...nationalForm,
        setorId: nationalForm.setorId || undefined,
        projetoId: nationalForm.projetoId || undefined,
        responsavelEntrega: undefined,
        pagamento: undefined,
        fotosProdutoUrls: [],
        fotoEntregaUrls: [],
        payloadOriginal: {
          ...nationalForm,
          responsavelEntrega: undefined,
          pagamento: undefined
        }
      });

      if (productFiles.length) {
        await uploadFreightFiles(created.id, productFiles, 'produto');
      }

      await sendFreightNotification(created.id, 'created');
      setNationalForm(emptyNationalForm);
      setProductFiles([]);
      setTab(forcedTab || 'dashboard');
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
        status: 'Solicitado',
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

  async function cancelFreightRequests(targets: FreightRequest[], reason: string) {
    const normalizedReason = reason.trim();
    if (!targets.length) {
      setMessage({ type: 'error', text: 'Selecione ao menos uma solicitação para cancelar.' });
      return;
    }
    if (!normalizedReason) {
      setMessage({ type: 'error', text: 'Informe o motivo do cancelamento.' });
      return;
    }

    setSaving(true);
    try {
      for (const request of targets) {
        const cancelNote = `Motivo do cancelamento: ${normalizedReason}`;
        const updatedNotes = [request.observacoesLogistica, cancelNote].filter(Boolean).join('\n');
        await updateFreightStatus(request, 'Cancelado', cancelNote, {
          observacoesLogistica: updatedNotes
        });
        await sendFreightNotification(request.id, 'status');
      }
      setSelectedIds([]);
      setMessage({ type: 'success', text: `${targets.length} solicitação(ões) cancelada(s).` });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao cancelar solicitação.' });
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
    : isDriver || isDriverFreightProfile
      ? { title: 'Frete Nacional - Motorista', subtitle: 'Fluxo mobile para retirada, rota, conclusão e foto de entrega.', icon: Smartphone }
      : { title: 'Frete Nacional', subtitle: '', icon: Truck };
  const HeaderIcon = header.icon;
  const showPageHeader = !isSingleTabView && (isInternational || activeTab === 'dashboard');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {showPageHeader ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
                <HeaderIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-slate-950 md:text-3xl">{header.title}</h1>
                {header.subtitle ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{header.subtitle}</p> : null}
              </div>
            </div>
            {activeTab === 'dashboard' ? (
              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
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
            ) : null}
          </div>
        ) : null}

        {message ? (
          <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {message.text}
          </div>
        ) : null}

        {activeTab === 'dashboard' ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total" value={stats.total} icon={ClipboardList} tone="bg-slate-100 text-slate-700" />
            <StatCard label="Solicitadas" value={stats.pendente} icon={AlertTriangle} tone="bg-amber-100 text-amber-700" />
            <StatCard label={isInternational ? 'Em andamento' : 'Agendados'} value={stats.agendado} icon={CalendarClock} tone="bg-blue-100 text-blue-700" />
            <StatCard label={isInternational ? 'Trânsito/desembaraço' : 'Em rota'} value={stats.rota} icon={Route} tone="bg-red-100 text-red-700" />
            <StatCard label="Concluídos" value={stats.concluido} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
          </div>
        ) : null}

        {!isSingleTabView ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-slate-200 px-1 pb-2">
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
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${activeTab === item.id ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setTab(item.id as TabKey)}
                type="button"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        {activeTab !== 'nova' && !(activeTab === 'kanban' && !isInternational) ? (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            statuses={isInternational ? statusOptionsInternational : statusOptionsNational}
            lookups={lookups}
            isInternational={isInternational}
          />
        ) : null}

        {activeTab === 'kanban' && !isInternational ? (
          <FreightKanbanFilters
            filters={filters}
            setFilters={setFilters}
            requests={requests}
            lookups={lookups}
            filtersOpen={kanbanFiltersOpen}
            refreshing={loading}
            onToggleFilters={() => setKanbanFiltersOpen(current => !current)}
            onRefresh={loadData}
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
            {activeTab === 'dashboard' && (
              <RequestsTable
                requests={filteredRequests}
                isInternational={isInternational}
                canEdit={canEditFreightRequests}
                onOpen={openDetails}
                onEdit={openEditRequest}
                onSchedule={startSchedule}
                saving={saving}
              />
            )}

            {activeTab === 'nova' && !isInternational && (
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

            {activeTab === 'nova' && isInternational && (
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

            {activeTab === 'atendimento' && !isInternational && (
              <AttendancePanel
                requests={filteredRequests.filter(request => isRequestedFreightStatus(request.status) || selectedIds.includes(request.id))}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                draft={scheduleDraft}
                setDraft={setScheduleDraft}
                lookups={lookups}
                saving={saving}
                onApply={applySchedule}
                onOpen={openDetails}
                onCancel={cancelFreightRequests}
              />
            )}

            {activeTab === 'kanban' && !isInternational && (
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

            {activeTab === 'motorista' && !isInternational && (
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

            {activeTab === 'relatorios' && (
              <ReportsPanel requests={filteredRequests} isInternational={isInternational} onExport={exportXlsx} />
            )}
          </>
        )}
      </div>

      <DetailDrawer request={selected} history={history} addressOptions={lookups.enderecos} onClose={() => setSelected(null)} onSaveObservation={saveDetailObservation} />
      <EditRequestDrawer
        request={editingRequest}
        form={nationalEditForm}
        files={editProductFiles}
        lookups={lookups}
        saving={saving}
        onChange={updateNationalEditField}
        onFiles={setEditProductFiles}
        onClose={closeEditRequest}
        onSubmit={handleSaveNationalEdit}
      />
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

function FreightKanbanFilters({
  filters,
  setFilters,
  requests,
  lookups,
  filtersOpen,
  refreshing,
  onToggleFilters,
  onRefresh
}: {
  filters: any;
  setFilters: (value: any) => void;
  requests: FreightRequest[];
  lookups: any;
  filtersOpen: boolean;
  refreshing: boolean;
  onToggleFilters: () => void;
  onRefresh: () => void;
}) {
  const motoristaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    requests.forEach(request => {
      const motorista = (request.motorista || 'Sem motorista').trim() || 'Sem motorista';
      counts.set(motorista, (counts.get(motorista) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [requests]);

  const statusCounts = useMemo(() => {
    return statusOptionsNational.map(status => ({
      status,
      count: requests.filter(request => request.status === status).length
    })).filter(item => item.status !== 'Cancelado' || item.count);
  }, [requests]);

  const update = (patch: Record<string, string>) => setFilters((current: any) => ({ ...current, ...patch }));
  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    update({
      dateFrom: first.toISOString().slice(0, 10),
      dateTo: last.toISOString().slice(0, 10)
    });
  };
  const setThisYear = () => {
    const now = new Date();
    update({
      dateFrom: `${now.getFullYear()}-01-01`,
      dateTo: `${now.getFullYear()}-12-31`
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">Fretes Porsche Cup</h2>
        <div className="flex items-center gap-2">
          <button
            className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${filtersOpen ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            type="button"
            onClick={onToggleFilters}
          >
            Filtros
            <BarChart3 className="h-3.5 w-3.5 text-red-500" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar Kanban"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <>
      <div className="mt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${fieldClass()} pl-9`}
            value={filters.search}
            onChange={event => update({ search: event.target.value })}
            placeholder="Buscar por #protocolo, placa, setor..."
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-slate-500">Motorista:</span>
        <button
          className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold transition ${filters.motorista === 'TODOS' ? 'bg-red-600 text-white shadow-sm' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          type="button"
          onClick={() => update({ motorista: 'TODOS' })}
        >
          TODOS
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${filters.motorista === 'TODOS' ? 'bg-white text-red-600' : 'bg-white text-slate-600'}`}>{requests.length}</span>
        </button>
        {motoristaCounts.map(item => (
          <button
            key={item.label}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${filters.motorista === item.label ? 'bg-red-600 text-white shadow-sm' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            type="button"
            onClick={() => update({ motorista: item.label })}
          >
            {item.label}
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${filters.motorista === item.label ? 'bg-white text-red-600' : 'bg-white text-slate-600'}`}>{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-slate-500">Status:</span>
        {statusCounts.map(item => (
          <button
            key={item.status}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold transition ${filters.status === item.status ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-200' : 'bg-red-600 text-white hover:bg-red-700'}`}
            type="button"
            onClick={() => update({ status: filters.status === item.status ? 'Todos' : item.status })}
          >
            {item.status}
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-red-600">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <div>
          <label className={labelClass()}>Projeto</label>
          <select className={fieldClass()} value={filters.projeto} onChange={event => update({ projeto: event.target.value })}>
            <option value="">Todos os Projetos</option>
            <SelectOptionList options={lookups.projetos} />
          </select>
        </div>
        <div>
          <label className={labelClass()}>De</label>
          <input className={fieldClass()} type="date" value={filters.dateFrom} onChange={event => update({ dateFrom: event.target.value })} />
        </div>
        <div>
          <label className={labelClass()}>Até</label>
          <input className={fieldClass()} type="date" value={filters.dateTo} onChange={event => update({ dateTo: event.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="h-9 rounded-md border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200" type="button" onClick={setThisMonth}>Este Mês</button>
          <button className="h-9 rounded-md border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200" type="button" onClick={setThisYear}>Este Ano</button>
          <button className="h-9 rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700" type="button" onClick={() => update({ dateFrom: '', dateTo: '' })}>Limpar</button>
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}

function RequestsTable({
  requests,
  isInternational,
  canEdit,
  onOpen,
  onEdit,
  onSchedule,
  saving
}: {
  requests: FreightRequest[];
  isInternational: boolean;
  canEdit: boolean;
  onOpen: (request: FreightRequest) => void;
  onEdit: (request: FreightRequest) => void;
  onSchedule: (request: FreightRequest) => void;
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
              {!isInternational ? <th className="px-4 py-3">Agendamento</th> : null}
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
                {!isInternational ? (
                  <td className="px-4 py-3 text-slate-700">{formatFreightDate(request.agendamentoAt)}</td>
                ) : null}
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{request.motorista || '-'}</div>
                  <div className="text-xs text-slate-500">{[request.veiculo, request.placa].filter(Boolean).join(' - ') || formatFreightDate(request.agendamentoAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {!isInternational && canEdit ? (
                      <button
                        className={buttonClass('secondary')}
                        onClick={() => onEdit(request)}
                        type="button"
                        disabled={saving}
                        title="Editar solicitação"
                        aria-label={`Editar ${formatProtocol(request)}`}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                    ) : null}
                    <button className={buttonClass('secondary')} onClick={() => onOpen(request)} type="button">
                      <Eye className="h-4 w-4" />
                      Detalhes
                    </button>
                    {!isInternational && isRequestedFreightStatus(request.status) ? (
                      <button className={buttonClass('dark')} onClick={() => onSchedule(request)} type="button" disabled={saving}>
                        <CalendarClock className="h-4 w-4" />
                        Agendar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!requests.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={isInternational ? 7 : 8}>Nenhuma solicitação encontrada.</td>
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
        <h2 className="text-lg font-bold text-slate-950">Cadastrar solicitação de frete nacional</h2>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Setor">
          <select className={fieldClass()} value={form.setor} onChange={event => onChange('setor', event.target.value)} required>
            <option value="">Selecione...</option>
            <SelectOptionList options={lookups.setores} />
          </select>
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
        <Field label="Responsável no local da retirada">
          <input className={fieldClass()} value={form.responsavelLocal} onChange={event => onChange('responsavelLocal', event.target.value)} />
        </Field>
        <Field label="Endereço de retirada">
          <input className={fieldClass()} list="freight-addresses" value={form.enderecoRetirada} onChange={event => onChange('enderecoRetirada', event.target.value)} />
        </Field>
        <Field label="Endereço de entrega">
          <input className={fieldClass()} list="freight-addresses" value={form.enderecoEntrega} onChange={event => onChange('enderecoEntrega', event.target.value)} />
          <datalist id="freight-addresses"><SelectAddressOptionList options={lookups.enderecos} /></datalist>
        </Field>
        <div className="md:col-span-2 xl:col-span-3">
          <Field label="Descreva as quantidades e itens a serem transportados">
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

function EditRequestDrawer({
  request,
  form,
  files,
  lookups,
  saving,
  onChange,
  onFiles,
  onClose,
  onSubmit
}: {
  request: FreightRequest | null;
  form: typeof emptyNationalEditForm;
  files: File[];
  lookups: any;
  saving: boolean;
  onChange: (field: keyof typeof emptyNationalEditForm, value: string) => void;
  onFiles: (files: File[]) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <form className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edição administrativa</p>
            <h2 className="text-xl font-bold text-slate-950">Editar solicitação {formatProtocol(request)}</h2>
            <p className="mt-1 text-sm text-slate-500">Altere os dados da solicitação nacional e salve para atualizar o Supabase.</p>
          </div>
          <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100" type="button" onClick={onClose} aria-label="Fechar edição">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-5">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-950">Dados da solicitação</h3>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <Field label="Protocolo">
                  <input className={fieldClass()} value={formatProtocol(request)} disabled />
                </Field>
                <Field label="Status">
                  <select className={fieldClass()} value={form.status} onChange={event => onChange('status', event.target.value)} required>
                    {statusOptionsNational.map(status => <option key={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Setor">
                  <select className={fieldClass()} value={form.setor} onChange={event => onChange('setor', event.target.value)} required>
                    <option value="">Selecione...</option>
                    <SelectOptionList options={lookups.setores} />
                  </select>
                </Field>
                <Field label="Projeto">
                  <select className={fieldClass()} value={form.projeto} onChange={event => onChange('projeto', event.target.value)} required>
                    <option value="">Selecione...</option>
                    <SelectOptionList options={lookups.projetos} />
                  </select>
                </Field>
                <Field label="Prazo de entrega">
                  <input className={fieldClass()} type="datetime-local" value={form.prazoEntrega} onChange={event => onChange('prazoEntrega', event.target.value)} required />
                </Field>
                <Field label="Responsável pela solicitação">
                  <input className={fieldClass()} value={form.solicitanteNome} onChange={event => onChange('solicitanteNome', event.target.value)} required />
                </Field>
                <Field label="Responsável no local da retirada">
                  <input className={fieldClass()} value={form.responsavelLocal} onChange={event => onChange('responsavelLocal', event.target.value)} />
                </Field>
                <Field label="Endereço de retirada">
                  <input className={fieldClass()} list="edit-freight-addresses" value={form.enderecoRetirada} onChange={event => onChange('enderecoRetirada', event.target.value)} />
                </Field>
                <Field label="Endereço de entrega">
                  <input className={fieldClass()} list="edit-freight-addresses" value={form.enderecoEntrega} onChange={event => onChange('enderecoEntrega', event.target.value)} />
                  <datalist id="edit-freight-addresses"><SelectAddressOptionList options={lookups.enderecos} /></datalist>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Descreva as quantidades e itens a serem transportados">
                    <textarea className={areaClass()} value={form.itemDescricao} onChange={event => onChange('itemDescricao', event.target.value)} required />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Observações do solicitante">
                    <textarea className={areaClass()} value={form.observacoes} onChange={event => onChange('observacoes', event.target.value)} />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-950">Atendimento logístico</h3>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <Field label="Motorista">
                  <input className={fieldClass()} list="edit-freight-drivers" value={form.motorista} onChange={event => onChange('motorista', event.target.value)} />
                  <datalist id="edit-freight-drivers"><SelectOptionList options={lookups.motoristas} /></datalist>
                </Field>
                <Field label="Veículo">
                  <input className={fieldClass()} list="edit-freight-vehicles" value={form.veiculo} onChange={event => onChange('veiculo', event.target.value)} />
                  <datalist id="edit-freight-vehicles"><SelectOptionList options={lookups.veiculos} /></datalist>
                </Field>
                <Field label="Placa">
                  <input className={fieldClass()} value={form.placa} onChange={event => onChange('placa', event.target.value.toUpperCase())} />
                </Field>
                <Field label="Agendamento">
                  <input className={fieldClass()} type="datetime-local" value={form.agendamentoAt} onChange={event => onChange('agendamentoAt', event.target.value)} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Observações logística">
                    <textarea className={areaClass()} value={form.observacoesLogistica} onChange={event => onChange('observacoesLogistica', event.target.value)} />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-950">Fotos do produto</h3>
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                  <input type="file" accept="image/*" multiple onChange={event => onFiles(Array.from(event.target.files || []))} />
                  <p className="text-sm text-slate-500">{files.length ? `${files.length} nova(s) foto(s) selecionada(s)` : 'Selecione apenas se quiser anexar novas fotos.'}</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button className={buttonClass('secondary')} type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className={buttonClass('primary')} type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
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
  onOpen,
  onCancel
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
  onCancel: (targets: FreightRequest[], reason: string) => void;
}) {
  const [attendanceFilters, setAttendanceFilters] = useState({ protocolo: '', setor: '', projeto: '' });
  const [sortState, setSortState] = useState<{ column: 'protocol' | 'setor' | 'projeto' | 'prazo' | 'solicitante' | 'item'; direction: 'asc' | 'desc' }>({
    column: 'prazo',
    direction: 'asc'
  });
  const [routeEstimates, setRouteEstimates] = useState<Record<string, RouteEstimate>>({});
  const [cancelPanelOpen, setCancelPanelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const toggle = (id: string) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id]);
  };
  const selectedRequests = useMemo(() => requests.filter(request => selectedIds.includes(request.id)), [requests, selectedIds]);
  const filteredRequests = useMemo(() => {
    const protocolTerms = attendanceFilters.protocolo
      .split(',')
      .flatMap(term => {
        const normalized = term.trim().replace(/^#/, '');
        if (!normalized) return [];
        const range = normalized.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!range) return [normalized];
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 500) return [normalized];
        return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
      });

    return requests
      .filter(request => {
        if (attendanceFilters.setor && request.setor !== attendanceFilters.setor) return false;
        if (attendanceFilters.projeto && request.projeto !== attendanceFilters.projeto) return false;
        if (protocolTerms.length && !protocolTerms.some(term => String(request.protocol).includes(term))) return false;
        return true;
      })
      .sort((a, b) => {
        const direction = sortState.direction === 'asc' ? 1 : -1;
        const getValue = (request: FreightRequest) => {
          if (sortState.column === 'protocol') return request.protocol;
          if (sortState.column === 'setor') return request.setor || '';
          if (sortState.column === 'projeto') return request.projeto || request.projetoDescricao || '';
          if (sortState.column === 'prazo') return new Date(request.prazoEntrega || request.agendamentoAt || request.createdAt).getTime() || 0;
          if (sortState.column === 'solicitante') return request.solicitanteNome || '';
          return request.itemDescricao || '';
        };
        const valueA = getValue(a);
        const valueB = getValue(b);
        if (typeof valueA === 'number' && typeof valueB === 'number') return (valueA - valueB) * direction;
        return String(valueA).localeCompare(String(valueB), 'pt-BR', { sensitivity: 'base' }) * direction;
      });
  }, [attendanceFilters, requests, sortState]);

  const selectedVehicleValues = splitSelection(draft.veiculo);
  const vehicleOptions = useMemo(() => {
    const options = [...lookups.veiculos];
    selectedVehicleValues.forEach(value => {
      if (!options.some((option: FreightLookupOption) => option.value === value)) {
        options.push({ value, label: value });
      }
    });
    return options;
  }, [lookups.veiculos, selectedVehicleValues.join('|')]);

  const selectedDriverValues = splitSelection(draft.motorista);
  const driverOptions = useMemo(() => {
    const options = [...lookups.motoristas];
    selectedDriverValues.forEach(value => {
      if (!options.some((option: FreightLookupOption) => option.value === value)) {
        options.push({ value, label: value });
      }
    });
    return options;
  }, [lookups.motoristas, selectedDriverValues.join('|')]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedRequests.length) {
      setRouteEstimates({});
      return;
    }

    setRouteEstimates(current => {
      const next: Record<string, RouteEstimate> = {};
      selectedRequests.forEach(request => {
        next[request.id] = current[request.id] || {
          status: 'loading',
          origin: request.enderecoRetirada,
          destination: request.enderecoEntrega
        };
      });
      return next;
    });

    selectedRequests.forEach(request => {
      setRouteEstimates(current => ({
        ...current,
        [request.id]: {
          status: 'loading',
          origin: request.enderecoRetirada,
          destination: request.enderecoEntrega
        }
      }));
      fetchRouteEstimate(request, draft.agendamentoAt).then(result => {
        if (cancelled) return;
        setRouteEstimates(current => ({ ...current, [request.id]: result }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [draft.agendamentoAt, selectedRequests.map(request => `${request.id}:${request.enderecoRetirada}:${request.enderecoEntrega}`).join('|')]);

  const setSort = (column: typeof sortState.column) => {
    setSortState(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleAllDisplayed = (checked: boolean) => {
    const displayedIds = filteredRequests.map(request => request.id);
    if (checked) {
      setSelectedIds(Array.from(new Set([...selectedIds, ...displayedIds])));
      return;
    }
    setSelectedIds(selectedIds.filter(id => !displayedIds.includes(id)));
  };

  const updateVehicles = (value: string, checked: boolean) => {
    const veiculo = setMultiSelectValue(draft.veiculo, value, checked);
    const placas = splitSelection(veiculo)
      .map(vehicle => {
        const option = lookups.veiculos.find((item: FreightLookupOption) => item.value === vehicle);
        return String(option?.metadata?.placa || '').trim();
      })
      .filter(Boolean)
      .join(', ');
    setDraft((current: any) => ({ ...current, veiculo, placa: placas || current.placa }));
  };

  const headerCell = (label: string, column: typeof sortState.column) => (
    <button className="flex w-full items-center gap-1 text-left font-semibold text-slate-700 hover:text-red-700" type="button" onClick={() => setSort(column)}>
      {label}
      <span className="text-[10px] text-slate-400">{sortState.column === column ? (sortState.direction === 'asc' ? '▲' : '▼') : ''}</span>
    </button>
  );

  const openCancelPanel = (request?: FreightRequest) => {
    if (request) {
      setSelectedIds([request.id]);
    }
    setCancelReason('');
    setCancelPanelOpen(true);
  };

  const confirmCancel = () => {
    onCancel(selectedRequests, cancelReason);
    setCancelPanelOpen(false);
    setCancelReason('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Painel de Atendimento de Fretes</h2>
            <p className="text-sm text-slate-500">Filtre, selecione em lote e programe motoristas e veículos para as entregas solicitadas.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
            Entregas para programar: {filteredRequests.length}
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-bold text-red-600">Filtrar solicitações com status Solicitado</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Nº Protocolo">
              <input className={fieldClass()} value={attendanceFilters.protocolo} onChange={event => setAttendanceFilters(current => ({ ...current, protocolo: event.target.value }))} placeholder="ex.: 12, 15-18, #20" />
            </Field>
            <Field label="Filtrar por Setor">
              <select className={fieldClass()} value={attendanceFilters.setor} onChange={event => setAttendanceFilters(current => ({ ...current, setor: event.target.value }))}>
                <option value="">Todos</option>
                <SelectOptionList options={lookups.setores} />
              </select>
            </Field>
            <Field label="Filtrar por Projeto">
              <select className={fieldClass()} value={attendanceFilters.projeto} onChange={event => setAttendanceFilters(current => ({ ...current, projeto: event.target.value }))}>
                <option value="">Todos</option>
                <SelectOptionList options={lookups.projetos} />
              </select>
            </Field>
            <div className="flex items-end">
              <button className={buttonClass('primary')} type="button" onClick={() => setAttendanceFilters({ protocolo: '', setor: '', projeto: '' })}>
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" type="button" disabled={!selectedIds.length}>
            Agendar Selecionados
          </button>
          <button className={buttonClass('danger')} type="button" onClick={() => openCancelPanel()} disabled={!selectedIds.length || saving}>
            <X className="h-4 w-4" />
            Cancelar solicitação
          </button>
          {selectedIds.length ? <span className="inline-flex h-10 items-center rounded-md bg-slate-100 px-3 text-sm font-semibold text-slate-700">{selectedIds.length} selecionado(s)</span> : null}
        </div>

        {cancelPanelOpen ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-red-700">Cancelar solicitação</h3>
                <p className="text-sm text-red-700/80">
                  Informe o motivo para registrar no histórico e comunicar a atualização por e-mail.
                </p>
              </div>
              <button className="rounded-full p-1 text-red-700 hover:bg-red-100" type="button" onClick={() => setCancelPanelOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <Field label="Motivo">
                <textarea className={areaClass()} value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Descreva o motivo do cancelamento..." />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={buttonClass('primary')} type="button" onClick={confirmCancel} disabled={saving || !selectedIds.length || !cancelReason.trim()}>
                Confirmar cancelamento
              </button>
              <button className={buttonClass('secondary')} type="button" onClick={() => setCancelPanelOpen(false)} disabled={saving}>
                Fechar
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-100">
              <tr className="border border-slate-200">
                <th className="w-10 border border-slate-200 p-2">
                  <input type="checkbox" checked={Boolean(filteredRequests.length && filteredRequests.every(request => selectedIds.includes(request.id)))} onChange={event => toggleAllDisplayed(event.target.checked)} />
                </th>
                <th className="w-20 border border-slate-200 p-2">{headerCell('Nº', 'protocol')}</th>
                <th className="w-36 border border-slate-200 p-2">{headerCell('Setor', 'setor')}</th>
                <th className="w-40 border border-slate-200 p-2">{headerCell('Projeto', 'projeto')}</th>
                <th className="w-32 border border-slate-200 p-2">{headerCell('Prazo', 'prazo')}</th>
                <th className="w-36 border border-slate-200 p-2">{headerCell('Solicitante', 'solicitante')}</th>
                <th className="border border-slate-200 p-2">{headerCell('Item', 'item')}</th>
                <th className="w-16 border border-slate-200 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(request => (
                <tr key={request.id} className="border border-slate-200 bg-white hover:bg-slate-50">
                  <td className="border border-slate-200 p-2 text-center">
                    <input type="checkbox" checked={selectedIds.includes(request.id)} onChange={() => toggle(request.id)} />
                  </td>
                  <td className="border border-slate-200 p-2 font-bold text-slate-950">{request.protocol}</td>
                  <td className="border border-slate-200 p-2">{request.setor || '-'}</td>
                  <td className="border border-slate-200 p-2">{request.projeto || request.projetoDescricao || '-'}</td>
                  <td className="border border-slate-200 p-2">{formatFreightDate(request.prazoEntrega)}</td>
                  <td className="border border-slate-200 p-2">{request.solicitanteNome || '-'}</td>
                  <td className="border border-slate-200 p-2">{request.itemDescricao || '-'}</td>
                  <td className="border border-slate-200 p-2">
                    <div className="flex items-center justify-center gap-1">
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-red-600" type="button" onClick={() => onOpen(request)} title="Abrir detalhes">
                      <Eye className="h-4 w-4" />
                      </button>
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 hover:bg-red-100" type="button" onClick={() => openCancelPanel(request)} title="Cancelar solicitação" disabled={saving}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRequests.length ? (
                <tr>
                  <td colSpan={8} className="border border-slate-200 bg-white p-8 text-center text-slate-500">Nenhuma solicitação pendente encontrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-red-600">Agendar {selectedIds.length} Solicitações em Lote</h2>
        <p className="text-sm text-slate-500">Selecione um ou mais motoristas e veículos para a mesma operação.</p>
        <div className="mt-4 space-y-4">
          <MultiSelectList
            label="Motorista(s)*"
            options={driverOptions}
            selectedValues={selectedDriverValues}
            onChange={(value, checked) => setDraft((current: any) => ({ ...current, motorista: setMultiSelectValue(current.motorista, value, checked) }))}
          />
          <MultiSelectList
            label="Veículo(s)*"
            options={vehicleOptions}
            selectedValues={selectedVehicleValues}
            onChange={updateVehicles}
          />
          <Field label="Placa(s)">
            <input className={fieldClass()} value={draft.placa} onChange={event => setDraft((current: any) => ({ ...current, placa: event.target.value.toUpperCase() }))} />
          </Field>
          <Field label="Data e horário de coleta/entrega*">
            <input className={fieldClass()} type="datetime-local" value={draft.agendamentoAt} onChange={event => setDraft((current: any) => ({ ...current, agendamentoAt: event.target.value }))} />
          </Field>

          <RouteEstimatePanel selectedRequests={selectedRequests} estimates={routeEstimates} />

          <Field label="Observações">
            <textarea className={areaClass()} value={draft.observacoesLogistica} onChange={event => setDraft((current: any) => ({ ...current, observacoesLogistica: event.target.value }))} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass('primary')} type="button" onClick={onApply} disabled={saving || !selectedIds.length}>
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Agendamento'}
            </button>
            <button className={buttonClass('secondary')} type="button" onClick={() => setSelectedIds([])}>
              Cancelar seleção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MultiSelectList({
  label,
  options,
  selectedValues,
  onChange
}: {
  label: string;
  options: FreightLookupOption[];
  selectedValues: string[];
  onChange: (value: string, checked: boolean) => void;
}) {
  return (
    <div>
      <span className={labelClass()}>{label}</span>
      <div className="max-h-36 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
        {options.map(option => (
          <label key={option.id || option.value} className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${selectedValues.includes(option.value) ? 'bg-slate-200 text-slate-950' : 'hover:bg-slate-50'}`}>
            <input type="checkbox" checked={selectedValues.includes(option.value)} onChange={event => onChange(option.value, event.target.checked)} />
            <span>{option.label || option.value}</span>
          </label>
        ))}
        {!options.length ? <p className="px-2 py-3 text-sm text-slate-500">Nenhuma opção cadastrada na Masterdata Frete.</p> : null}
      </div>
    </div>
  );
}

function RouteEstimatePanel({
  selectedRequests,
  estimates,
  showProtocol = true
}: {
  selectedRequests: FreightRequest[];
  estimates: Record<string, RouteEstimate>;
  showProtocol?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-950">Estimativa de Percurso</h3>
        <span className="rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
          {selectedRequests.length ? `${selectedRequests.length} rota(s)` : '—'}
        </span>
      </div>
      {!selectedRequests.length ? (
        <p className="mt-2 text-sm text-slate-500">Selecione uma solicitação para calcular retirada e entrega.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {selectedRequests.map(request => {
            const estimate = estimates[request.id] || { status: 'loading' as const, origin: request.enderecoRetirada, destination: request.enderecoEntrega };
            return (
              <div key={request.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                <div className={`flex flex-wrap items-center gap-2 ${showProtocol ? 'justify-between' : 'justify-end'}`}>
                  {showProtocol ? <span className="font-bold text-slate-950">{formatProtocol(request)}</span> : null}
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {routeProviderLabel(estimate.provider, estimate.status)}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <InfoLine label="Distância" value={estimate.status === 'loading' ? 'calculando...' : estimate.distanceText || '—'} />
                  <InfoLine label="Tempo (trânsito)" value={estimate.status === 'loading' ? 'calculando...' : estimate.trafficText || estimate.durationText || '—'} />
                  <InfoLine label="Retirada" value={estimate.origin || request.enderecoRetirada || '—'} />
                  <InfoLine label="Entrega" value={estimate.destination || request.enderecoEntrega || '—'} />
                </div>
                {estimate.status === 'ERROR' || estimate.status === 'MISSING_FIELDS' ? (
                  <p className="mt-2 text-xs font-medium text-red-700">{estimate.message}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
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
  onStatus: (request: FreightRequest, status: FreightStatus, comment?: string) => void;
  onDelivery: (request: FreightRequest) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropLane, setDropLane] = useState<string | null>(null);
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
                <div className="text-sm text-slate-500">{formatFreightDate(freightDeadlineInfo(request).value)}</div>
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

  async function handleDrop(event: any, lane: string) {
    event.preventDefault();
    setDropLane(null);
    const requestId = event.dataTransfer?.getData('text/plain') || draggingId;
    const request = requests.find(item => item.id === requestId);
    if (!request) return;
    const targetStatus = laneTargetStatus[lane];
    if (!targetStatus || freightLane(request.status) === lane) return;
    await onStatus(request, targetStatus, `Status alterado no Kanban para ${targetStatus}.`);
  }

  return (
    <div className="grid min-h-[560px] gap-3 xl:grid-cols-4">
      {laneOrder.map(lane => (
        <div
          key={lane}
          className={`flex min-h-[520px] flex-col rounded-lg border bg-white shadow-sm transition ${dropLane === lane ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}
          onDragOver={event => {
            event.preventDefault();
            setDropLane(lane);
          }}
          onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropLane(null);
          }}
          onDrop={event => handleDrop(event, lane)}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-bold text-slate-950">{laneLabels[lane]}</h3>
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${laneStyles[lane].soft}`}>{grouped[lane]?.length || 0}</span>
          </div>
          <div className={`flex-1 space-y-2 p-2 ${laneStyles[lane].bg}`}>
            {(grouped[lane] || []).map(request => (
              <FreightKanbanCard
                key={request.id}
                request={request}
                lane={lane}
                saving={saving}
                dragging={draggingId === request.id}
                onOpen={onOpen}
                onDragStart={() => setDraggingId(request.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropLane(null);
                }}
              />
            ))}
            {!grouped[lane]?.length ? (
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white/70 text-center text-xs font-semibold text-slate-400">
                Arraste um card para cá
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function FreightKanbanCard({
  request,
  lane,
  saving,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd
}: {
  request: FreightRequest;
  lane: string;
  saving: boolean;
  dragging: boolean;
  onOpen: (request: FreightRequest) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const imageMedia = getFreightMedia(request, ['produto', 'entrega']).filter(file => file.isImage);
  const firstImage = imageMedia[0];
  const route = [request.veiculo, request.placa].filter(Boolean).join(' · ');
  const project = request.projeto || request.projetoDescricao || '-';
  const isRequestedCard = lane === 'nao_iniciado' || isRequestedFreightStatus(request.status);
  const deadlineInfo = freightDeadlineInfo(request);
  const dateLabel = isRequestedCard ? 'Prazo' : deadlineInfo.label;
  const dateValue = isRequestedCard
    ? request.prazoEntrega || request.prazoDesejado
    : deadlineInfo.value;

  return (
    <article
      draggable={!saving}
      onDragStart={event => {
        event.dataTransfer.setData('text/plain', request.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(request)}
      className={`group flex cursor-grab overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${dragging ? 'opacity-50' : ''}`}
    >
      <div className={`w-1.5 shrink-0 ${laneStyles[lane].border}`} />
      {firstImage ? (
        <div className="relative m-2 mr-0 h-28 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          <img src={firstImage.fileUrl} alt={firstImage.fileName || `Foto ${formatProtocol(request)}`} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute bottom-1 right-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">
            <Camera className="mr-1 inline h-3 w-3" />
            {imageMedia.length}
          </div>
        </div>
      ) : null}
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-950">{formatProtocol(request)}</span>
              <span className="truncate text-[11px] font-semibold uppercase text-slate-500">{request.setor || '-'}</span>
              {request.status === 'Em Rota' ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Em Rota</span> : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">Projeto: {compactText(project, 30)}</p>
          </div>
          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600"
            onClick={event => {
              event.stopPropagation();
              onOpen(request);
            }}
            type="button"
            aria-label={`Abrir detalhes ${formatProtocol(request)}`}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-1 space-y-0.5 text-[11px] leading-5 text-slate-600">
          <p>Solicitante: {compactText(request.solicitanteNome || request.createdByEmail, 36)}</p>
          {lane !== 'nao_iniciado' ? (
            <p>Motorista: {compactText(request.motorista || '-', 36)}</p>
          ) : null}
          <p>{dateLabel}: {formatFreightDate(dateValue)}</p>
          <p>Veículo: {compactText(route || '-', 34)}</p>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate">{compactText(firstLine(request.itemDescricao), 30)}</span>
          </span>
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
            <MapPin className="h-3 w-3 shrink-0 text-red-500" />
            <span className="truncate">{compactText(request.enderecoRetirada, 30)}</span>
          </span>
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
            <MapPin className="h-3 w-3 shrink-0 text-pink-500" />
            <span className="truncate">{compactText(request.enderecoEntrega, 30)}</span>
          </span>
        </div>
      </div>
    </article>
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
