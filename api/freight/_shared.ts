import {
  escapeHtml,
  formatDate,
  getSupabaseAdmin,
  readBody,
  sendJson,
  setCors
} from '../sourcing/_shared.js';

export {
  escapeHtml,
  formatDate,
  getSupabaseAdmin,
  readBody,
  sendJson,
  setCors
};

export const FREIGHT_OPERATION_EMAIL_CATEGORY = 'email_operacao_frete';
export const FREIGHT_RECURRING_ADDRESS_CATEGORY = 'endereco_recorrente';
export const REQUESTED_FREIGHT_STATUS = 'Solicitado';

export function splitRecipients(value?: string | string[] | null) {
  const source = Array.isArray(value) ? value.join(';') : String(value || '');
  return source
    .split(/[;,]/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

export function uniqueRecipients(values: string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function formatFreightProtocol(request: any) {
  const protocol = Number(request?.protocol);
  if (Number.isFinite(protocol) && protocol > 0) return `#${String(protocol).padStart(4, '0')}`;

  const fallback = request?.created_at
    ? String(new Date(request.created_at).getTime()).slice(-8)
    : String(request?.id || '').replace(/\D/g, '').slice(0, 8);

  return `#${String(fallback || '').padStart(4, '0')}`;
}

function protocolNumber(request: any) {
  return formatFreightProtocol(request).replace(/^#0*/, '') || '-';
}

function formatFreightDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date).replace(',', '');
}

function compactLine(items: unknown[]) {
  return items.map(item => String(item || '').trim()).filter(Boolean).join(' - ');
}

function normalizeFreightStatusLabel(status?: string | null) {
  const normalized = String(status || REQUESTED_FREIGHT_STATUS)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!normalized || normalized.includes('pendente') || normalized.includes('solicitad')) return REQUESTED_FREIGHT_STATUS;
  if (normalized.includes('cancel')) return 'Cancelado';
  if (normalized.includes('concl') || normalized.includes('entreg')) return 'Concluído';
  if (normalized.includes('desembaraco')) return 'Desembaraço';
  if (normalized.includes('em rota')) return 'Em Rota';
  if (normalized.includes('em transito') || normalized === 'em_transito') return normalized === 'em_transito' ? 'Em Rota' : 'Em trânsito';
  if (normalized.includes('aguardando coleta')) return 'Aguardando coleta';
  if (normalized.includes('cotacao')) return 'Em cotação';
  if (normalized.includes('agend') || normalized.includes('aprov')) return 'Agendado';
  return REQUESTED_FREIGHT_STATUS;
}

function looksLikeFullAddress(value?: string | null) {
  const text = String(value || '').toLowerCase();
  return /,|\bcep\b|\brua\b|\bav\.?\b|\bavenida\b|\brodovia\b|\bestrada\b|\balameda\b|\btravessa\b|\bkm\b|\b\d{5}-?\d{3}\b/.test(text);
}

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

function addressLinks(address: string) {
  const maps = googleMapsUrl(address);
  const waze = wazeUrl(address);
  const html = `(<a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Google Maps</a> | <a href="${escapeHtml(waze)}" target="_blank" rel="noopener noreferrer">Waze</a>)`;
  const text = `(Google Maps: ${maps} | Waze: ${waze})`;
  return { html, text };
}

type FreightAddressOption = {
  label?: string;
  value?: string;
  metadata?: Record<string, unknown>;
};

function resolveFreightAddress(value: unknown, options?: FreightAddressOption[]) {
  const raw = String(value || '').trim();
  if (!raw) return { text: '-', html: escapeHtml('-') };

  const candidates = options || [];
  const match = candidates.find(option => {
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

  if (!match) {
    const links = addressLinks(raw);
    return {
      text: `${raw} ${links.text}`,
      html: `${escapeHtml(raw)} ${links.html}`
    };
  }

  const metadata = match.metadata || {};
  const rawParts = [
    match.value,
    metadata.valor,
    metadata.endereco,
    metadata.address,
    metadata.descricao,
    match.label
  ].map(item => String(item || '').trim()).filter(Boolean);
  const fullAddress = rawParts.find(looksLikeFullAddress) || String(metadata.valor || metadata.descricao || match.value || match.label || raw).trim();
  const shortName = [
    match.label,
    match.value,
    raw
  ].map(item => String(item || '').trim()).find(item => item && !looksLikeFullAddress(item)) || raw;
  const text = shortName && fullAddress && shortName !== fullAddress ? `${shortName} - ${fullAddress}` : fullAddress || shortName;
  const linkTarget = fullAddress || shortName;
  const links = addressLinks(linkTarget);
  const htmlText = shortName && fullAddress && shortName !== fullAddress
    ? `${escapeHtml(shortName)} - ${escapeHtml(fullAddress)}`
    : escapeHtml(linkTarget);
  const html = `${htmlText} ${links.html}`;

  return { text: `${text} ${links.text}`, html };
}

function photoUrls(value: unknown) {
  return Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : [];
}

function uiStatusFromLegacyDb(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'cancelado') return 'Cancelado';
  if (normalized === 'entregue') return 'Concluído';
  if (normalized === 'em_transito') return 'Em Rota';
  if (normalized === 'aprovado') return 'Agendado';
  return REQUESTED_FREIGHT_STATUS;
}

export function normalizeFreightRequest(request: any) {
  if (request.freight_type || !request.type) return request;
  const payload = request.items && typeof request.items === 'object' && !Array.isArray(request.items) ? request.items : {};
  const data = payload.__conectaFrete === 'v1' ? payload.data || {} : {};

  return {
    ...request,
    protocol: request.protocol,
    freight_type: data.freightType || request.type || 'nacional',
    status: normalizeFreightStatusLabel(data.status || uiStatusFromLegacyDb(request.status)),
    setor: data.setor,
    projeto: data.projeto,
    projeto_descricao: data.projetoDescricao,
    prazo_entrega: data.prazoEntrega || request.delivery_date,
    solicitante_nome: data.solicitanteNome || request.requested_by_name,
    item_descricao: data.itemDescricao,
    endereco_retirada: data.enderecoRetirada || request.origin,
    endereco_entrega: data.enderecoEntrega || request.destination,
    observacoes: data.observacoes || request.notes,
    motorista: data.motorista,
    veiculo: data.veiculo,
    placa: data.placa,
    agendamento_at: data.agendamentoAt,
    observacoes_logistica: data.observacoesLogistica,
    necessidade: data.necessidade,
    definitiva_temporaria: data.definitivaTemporaria,
    empresa_remetente: data.empresaRemetente,
    endereco_origem: data.enderecoOrigem || request.origin,
    endereco_coleta_origem: data.enderecoColetaOrigem,
    empresa_destinatario: data.empresaDestinatario,
    endereco_destino: data.enderecoDestino || request.destination,
    endereco_entrega_destino: data.enderecoEntregaDestino,
    prazo_desejado: data.prazoDesejado || request.delivery_date,
    observacoes_finais: data.observacoesFinais,
    email_solicitante: data.emailSolicitante,
    created_by_email: data.createdByEmail
  };
}

export async function getFreightOperationRecipients(supabase: any) {
  const { data, error } = await supabase
    .from('freight_master_options')
    .select('value,label,metadata')
    .eq('category', FREIGHT_OPERATION_EMAIL_CATEGORY)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) console.warn('Falha ao buscar e-mails da operação de frete:', error);

  const masterRecipients = uniqueRecipients((data || []).flatMap((row: any) => {
    const metadata = row.metadata || {};
    return [
      ...splitRecipients(row.value),
      ...splitRecipients(typeof row.label === 'string' && row.label.includes('@') ? row.label : ''),
      ...splitRecipients(metadata.email),
      ...splitRecipients(metadata.descricao)
    ];
  }));

  if (masterRecipients.length) return masterRecipients;

  return uniqueRecipients(splitRecipients(
    process.env.FREIGHT_NOTIFICATION_EMAILS ||
    process.env.LOGISTICS_NOTIFICATION_EMAIL ||
    process.env.RESEND_TO_EMAIL
  ));
}

export async function getFreightRecurringAddresses(supabase: any) {
  const { data, error } = await supabase
    .from('freight_master_options')
    .select('label,value,metadata')
    .eq('category', FREIGHT_RECURRING_ADDRESS_CATEGORY)
    .eq('active', true);

  if (error) {
    console.warn('Falha ao buscar endereços recorrentes de frete:', error);
    return [];
  }

  return data || [];
}

export function getFreightRequesterRecipients(request: any) {
  return uniqueRecipients([
    ...splitRecipients(request?.email_solicitante),
    ...splitRecipients(request?.created_by_email)
  ]);
}

export function buildFreightRecipients(request: any, operationRecipients: string[]) {
  const requesterRecipients = getFreightRequesterRecipients(request);
  const to = requesterRecipients.length ? requesterRecipients : operationRecipients;
  const toSet = new Set(to.map(email => email.toLowerCase()));
  const cc = requesterRecipients.length
    ? operationRecipients.filter(email => !toSet.has(email.toLowerCase()))
    : [];

  return { to, cc };
}

export function buildFreightEmail(rawRequest: any, eventType: string, context: Record<string, any> = {}) {
  const request = normalizeFreightRequest(rawRequest);
  const latestHistory = context.latestHistory || {};
  const isInternational = request.freight_type === 'internacional';
  const title = isInternational ? 'Frete Internacional' : 'Frete Nacional';
  const previousStatus = normalizeFreightStatusLabel(context.previousStatus || latestHistory.previous_status || latestHistory.previousStatus || '');
  const currentStatus = normalizeFreightStatusLabel(request.status || latestHistory.new_status || latestHistory.newStatus || '');
  const scheduleDate = request.agendamento_at || request.prazo_entrega || request.prazo_desejado;
  const project = compactLine([request.projeto, request.projeto_descricao]) || '-';
  const subjectDetails = compactLine([
    request.setor,
    scheduleDate ? formatFreightDateTime(scheduleDate) : ''
  ]);
  const subject = eventType === 'status'
    ? `Atualização de frete ${formatFreightProtocol(request)}: ${currentStatus}${subjectDetails ? ` - ${subjectDetails}` : ''}`
    : `Nova solicitação de frete ${formatFreightProtocol(request)}${subjectDetails ? ` - ${subjectDetails}` : ` - ${title}`}`;

  const origin = isInternational
    ? resolveFreightAddress([request.empresa_remetente, request.endereco_origem, request.endereco_coleta_origem].filter(Boolean).join(' - '))
    : resolveFreightAddress(request.endereco_retirada, context.recurringAddresses);
  const destination = isInternational
    ? resolveFreightAddress([request.empresa_destinatario, request.endereco_destino, request.endereco_entrega_destino].filter(Boolean).join(' - '))
    : resolveFreightAddress(request.endereco_entrega, context.recurringAddresses);
  const requester = request.solicitante_nome || request.nome_contato_origem || request.email_solicitante || request.created_by_email || '-';
  const item = isInternational
    ? `${request.necessidade || '-'} / ${request.definitiva_temporaria || '-'}`
    : request.item_descricao || '-';
  const vehicle = compactLine([request.veiculo, request.placa]) || '-';
  const updatedBy = latestHistory.changed_by_email || latestHistory.changedByEmail || context.changedByEmail || request.created_by_email || '-';
  const updatedAt = latestHistory.changed_at || latestHistory.changedAt || request.updated_at || request.created_at;
  const historyComment = latestHistory.comment || context.comment || '';
  const productPhotos = photoUrls(request.fotos_produto_urls);
  const deliveryPhotos = photoUrls(request.foto_entrega_urls);
  const statusLine = eventType === 'status' && previousStatus && previousStatus !== currentStatus
    ? `${previousStatus} > ${currentStatus}`
    : currentStatus;
  const isStatusUpdate = eventType === 'status';

  const rows: Array<{ label: string; text: string; html?: string }> = [
    { label: 'Número da Solicitação (Protocolo)', text: protocolNumber(request) },
    { label: isStatusUpdate ? 'Status alterado' : 'Status', text: statusLine },
    { label: 'Setor', text: request.setor || '-' },
    { label: 'Projeto', text: project },
    { label: 'Data do Agendamento', text: request.agendamento_at ? formatFreightDateTime(request.agendamento_at) : formatFreightDateTime(request.prazo_entrega || request.prazo_desejado) }
  ];

  if (isStatusUpdate) {
    rows.push(
      { label: 'Motorista', text: request.motorista || '-' },
      { label: 'Veículo', text: vehicle }
    );
  }

  rows.push(
    { label: 'Solicitante', text: requester },
    { label: 'Atualizado por', text: updatedBy },
    { label: 'Última atualização em', text: formatFreightDateTime(updatedAt) },
    { label: 'Material / necessidade', text: item },
    { label: isInternational ? 'Endereço de origem' : 'Endereço de retirada', text: origin.text, html: origin.html },
    { label: isInternational ? 'Endereço de destino' : 'Endereço de entrega', text: destination.text, html: destination.html }
  );

  const noteLabel = isStatusUpdate ? 'Observações Logística' : 'Observações do solicitante';
  const note = isStatusUpdate
    ? request.observacoes_logistica || historyComment || request.observacoes_finais || ''
    : request.observacoes || '';
  const imageSection = (label: string, urls: string[]) => urls.length ? `
    <p style="margin:12px 0 3px;font-weight:700;">${escapeHtml(label)}:</p>
    ${urls.map(url => `
      <p style="margin:0 0 12px;">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" style="display:block;max-width:420px;width:100%;height:auto;border:1px solid #d1d5db;" />
      </p>
    `).join('')}
  ` : '';

  const htmlRows = rows.map(row => `
    <p style="margin:0 0 4px;">
      <strong>${escapeHtml(row.label)}:</strong> ${row.html || escapeHtml(row.text)}
    </p>
  `).join('');

  const html = `
    <div style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.35;">
      <div style="max-width:760px;">
        <p style="margin:0 0 16px;font-weight:700;">${escapeHtml(title)}</p>
        ${htmlRows}
        ${note ? `
          <br />
          <p style="margin:0 0 4px;"><strong>${escapeHtml(noteLabel)}:</strong> ${escapeHtml(note)}</p>
        ` : ''}
        ${imageSection('Fotos do produto', productPhotos)}
        ${imageSection('Foto da entrega', deliveryPhotos)}
      </div>
    </div>
  `;

  const text = [
    subject,
    ...rows.map(row => `${row.label}: ${row.text}`),
    note ? `${noteLabel}: ${note}` : '',
    ...productPhotos.map(url => `Foto do produto: ${url}`),
    ...deliveryPhotos.map(url => `Foto da entrega: ${url}`)
  ].join('\n');

  return { subject, html, text };
}

export function buildPendingSummaryEmail(rawRequests: any[]) {
  const requests = rawRequests.map(normalizeFreightRequest);
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());
  const subject = `Resumo diário de solicitações de frete - ${dateLabel}`;
  const rows = requests.map(request => {
    const isInternational = request.freight_type === 'internacional';
    return {
      protocolo: formatFreightProtocol(request),
      tipo: isInternational ? 'Internacional' : 'Nacional',
      status: normalizeFreightStatusLabel(request.status),
      setor: request.setor || '-',
      projeto: request.projeto || request.projeto_descricao || '-',
      solicitante: request.solicitante_nome || request.email_solicitante || request.created_by_email || '-',
      prazo: formatDate(request.prazo_entrega || request.prazo_desejado || request.delivery_date),
      origem: isInternational ? (request.endereco_origem || request.empresa_remetente || '-') : (request.endereco_retirada || request.origin || '-'),
      destino: isInternational ? (request.endereco_destino || request.empresa_destinatario || '-') : (request.endereco_entrega || request.destination || '-')
    };
  });

  const htmlRows = rows.length
    ? rows.map(row => `
      <tr>
        <td style="padding:10px;border-top:1px solid #e5e7eb;font-weight:700;">${escapeHtml(row.protocolo)}</td>
        <td style="padding:10px;border-top:1px solid #e5e7eb;">${escapeHtml(row.tipo)}</td>
        <td style="padding:10px;border-top:1px solid #e5e7eb;">${escapeHtml(row.status)}</td>
        <td style="padding:10px;border-top:1px solid #e5e7eb;">${escapeHtml(row.setor)}</td>
        <td style="padding:10px;border-top:1px solid #e5e7eb;">${escapeHtml(row.projeto)}</td>
        <td style="padding:10px;border-top:1px solid #e5e7eb;">${escapeHtml(row.solicitante)}</td>
        <td style="padding:10px;border-top:1px solid #e5e7eb;">${escapeHtml(row.prazo)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="7" style="padding:18px;border-top:1px solid #e5e7eb;color:#16a34a;font-weight:700;">Nenhuma solicitação em aberto.</td></tr>';

  const html = `
    <div style="margin:0;background:#f5f7fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:920px;margin:0 auto;background:#fff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
        <div style="height:5px;background:#d50000;"></div>
        <div style="padding:24px 28px;">
          <div style="font-size:13px;color:#64748b;text-align:right;">ConectaCup Frete</div>
          <h1 style="margin:10px 0 4px;font-size:23px;line-height:1.25;">${escapeHtml(subject)}</h1>
          <p style="margin:0;color:#475569;">${requests.length} solicitação(ões) em aberto para acompanhamento logístico.</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;color:#475569;text-align:left;">
              <th style="padding:10px;">Protocolo</th>
              <th style="padding:10px;">Tipo</th>
              <th style="padding:10px;">Status</th>
              <th style="padding:10px;">Setor</th>
              <th style="padding:10px;">Projeto</th>
              <th style="padding:10px;">Solicitante</th>
              <th style="padding:10px;">Prazo</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    </div>
  `;

  const text = [
    subject,
    `${requests.length} solicitação(ões) em aberto.`,
    ...rows.map(row => `${row.protocolo} | ${row.tipo} | ${row.status} | ${row.setor} | ${row.projeto} | ${row.solicitante} | ${row.prazo}`)
  ].join('\n');

  return { subject, html, text };
}

export async function logFreightEmail(supabase: any, payload: Record<string, unknown>) {
  await supabase.from('freight_email_logs').insert({
    freight_request_id: payload.freightRequestId || null,
    destinatario: payload.destinatario,
    cc: payload.cc || null,
    assunto: payload.assunto,
    event_type: payload.eventType,
    status: payload.status,
    provider: 'resend',
    provider_id: payload.providerId || null,
    erro: payload.erro || null,
    payload: payload.raw || null
  });
}

export async function sendFreightEmail(payload: {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text: string;
}) {
  const to = uniqueRecipients(payload.to);
  const cc = uniqueRecipients(payload.cc || []).filter(email => !to.includes(email));
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = (
    process.env.FREIGHT_FROM_EMAIL ||
    'ConectaCup Frete <frete@conectacup.com>'
  ).trim();

  if (!to.length) return { ok: true, mode: 'mock', warning: 'destinatario ausente' };
  if (!resendApiKey) return { ok: true, mode: 'mock', warning: 'RESEND_API_KEY ausente' };

  const resendPayload = {
    from: fromEmail,
    to,
    cc: cc.length ? cc : undefined,
    subject: payload.subject,
    html: payload.html,
    text: payload.text
  };

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resendPayload)
  });
  const raw = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    return {
      ok: false,
      mode: 'email',
      error: raw?.message || raw?.error || `Resend HTTP ${resendResponse.status}`,
      raw
    };
  }

  return { ok: true, mode: 'email', providerId: raw?.id, raw };
}
