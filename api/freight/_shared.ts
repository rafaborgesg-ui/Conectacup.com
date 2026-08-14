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

function photoUrls(value: unknown) {
  return Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : [];
}

function uiStatusFromLegacyDb(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'cancelado') return 'Cancelado';
  if (normalized === 'entregue') return 'Concluído';
  if (normalized === 'em_transito') return 'Em Rota';
  if (normalized === 'aprovado') return 'Agendado';
  return 'Pendente';
}

export function normalizeFreightRequest(request: any) {
  if (request.freight_type || !request.type) return request;
  const payload = request.items && typeof request.items === 'object' && !Array.isArray(request.items) ? request.items : {};
  const data = payload.__conectaFrete === 'v1' ? payload.data || {} : {};

  return {
    ...request,
    protocol: request.protocol,
    freight_type: data.freightType || request.type || 'nacional',
    status: data.status || uiStatusFromLegacyDb(request.status),
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
  const previousStatus = context.previousStatus || latestHistory.previous_status || latestHistory.previousStatus;
  const currentStatus = request.status || latestHistory.new_status || latestHistory.newStatus || '-';
  const scheduleDate = request.agendamento_at || request.prazo_entrega || request.prazo_desejado;
  const subjectDetails = compactLine([
    request.setor,
    request.projeto || request.projeto_descricao,
    scheduleDate ? formatFreightDateTime(scheduleDate) : ''
  ]);
  const subject = eventType === 'status'
    ? `Atualização de frete ${formatFreightProtocol(request)}: ${currentStatus}${subjectDetails ? ` - ${subjectDetails}` : ''}`
    : `Nova solicitação de frete ${formatFreightProtocol(request)}${subjectDetails ? ` - ${subjectDetails}` : ` - ${title}`}`;

  const origin = isInternational
    ? [request.empresa_remetente, request.endereco_origem, request.endereco_coleta_origem].filter(Boolean).join(' - ')
    : request.endereco_retirada;
  const destination = isInternational
    ? [request.empresa_destinatario, request.endereco_destino, request.endereco_entrega_destino].filter(Boolean).join(' - ')
    : request.endereco_entrega;
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
  const statusLine = eventType === 'status' && previousStatus
    ? `${previousStatus} > ${currentStatus}`
    : currentStatus;

  const rows = [
    ['Número da Solicitação (Protocolo)', protocolNumber(request)],
    [eventType === 'status' ? 'Status alterado' : 'Status', statusLine],
    ['Setor', compactLine([request.setor, request.projeto || request.projeto_descricao]) || '-'],
    ['Data do Agendamento', request.agendamento_at ? formatFreightDateTime(request.agendamento_at) : formatFreightDateTime(request.prazo_entrega || request.prazo_desejado)],
    ['Motorista', request.motorista || '-'],
    ['Veículo', vehicle],
    ['Solicitante', requester],
    ['Atualizado por', updatedBy],
    ['Última atualização em', formatFreightDateTime(updatedAt)],
    ['Material / necessidade', item],
    ['Origem', origin || '-'],
    ['Destino', destination || '-']
  ];

  const note = request.observacoes_logistica || historyComment || request.observacoes || request.observacoes_finais || '';
  const imageSection = (label: string, urls: string[]) => urls.length ? `
    <p style="margin:12px 0 3px;font-weight:700;">${escapeHtml(label)}:</p>
    ${urls.map(url => `
      <p style="margin:0 0 12px;">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" style="display:block;max-width:420px;width:100%;height:auto;border:1px solid #d1d5db;" />
      </p>
    `).join('')}
  ` : '';

  const htmlRows = rows.map(([label, value]) => `
    <p style="margin:0 0 4px;">
      <strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}
    </p>
  `).join('');

  const html = `
    <div style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.35;">
      <div style="max-width:760px;">
        <p style="margin:0 0 16px;font-weight:700;">${escapeHtml(title)}</p>
        ${htmlRows}
        ${note ? `
          <br />
          <p style="margin:0 0 4px;"><strong>Observações Logística:</strong> ${escapeHtml(note)}</p>
        ` : ''}
        ${imageSection('Fotos do produto', productPhotos)}
        ${imageSection('Foto da entrega', deliveryPhotos)}
      </div>
    </div>
  `;

  const text = [
    subject,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    note ? `Observações Logística: ${note}` : '',
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
  const subject = `Resumo diário de pendências de frete - ${dateLabel}`;
  const rows = requests.map(request => {
    const isInternational = request.freight_type === 'internacional';
    return {
      protocolo: formatFreightProtocol(request),
      tipo: isInternational ? 'Internacional' : 'Nacional',
      status: request.status || '-',
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
    : '<tr><td colspan="7" style="padding:18px;border-top:1px solid #e5e7eb;color:#16a34a;font-weight:700;">Nenhuma pendência aberta.</td></tr>';

  const html = `
    <div style="margin:0;background:#f5f7fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:920px;margin:0 auto;background:#fff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
        <div style="height:5px;background:#d50000;"></div>
        <div style="padding:24px 28px;">
          <div style="font-size:13px;color:#64748b;text-align:right;">ConectaCup Frete</div>
          <h1 style="margin:10px 0 4px;font-size:23px;line-height:1.25;">${escapeHtml(subject)}</h1>
          <p style="margin:0;color:#475569;">${requests.length} solicitação(ões) pendente(s) para acompanhamento logístico.</p>
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
    `${requests.length} solicitação(ões) pendente(s).`,
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
