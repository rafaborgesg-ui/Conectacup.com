import {
  escapeHtml,
  formatDate,
  getSupabaseAdmin,
  readBody,
  sendJson,
  setCors
} from '../sourcing/_shared.js';

function splitRecipients(value?: string) {
  return String(value || '')
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatProtocol(request: any) {
  const fallback = request.created_at ? String(new Date(request.created_at).getTime()).slice(-8) : String(request.id || '').replace(/\D/g, '').slice(0, 8);
  return `#${String(request.protocol || fallback || '').padStart(4, '0')}`;
}

function uiStatusFromLegacyDb(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'cancelado') return 'Cancelado';
  if (normalized === 'entregue') return 'Concluído';
  if (normalized === 'em_transito') return 'Em Rota';
  if (normalized === 'aprovado') return 'Agendado';
  return 'Pendente';
}

function normalizeFreightRequest(request: any) {
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

function buildEmail(rawRequest: any, eventType: string) {
  const request = normalizeFreightRequest(rawRequest);
  const isInternational = request.freight_type === 'internacional';
  const title = isInternational ? 'Frete Internacional' : 'Frete Nacional';
  const subject = eventType === 'status'
    ? `Atualização de frete ${formatProtocol(request)}: ${request.status}`
    : `Nova solicitação de frete ${formatProtocol(request)} - ${title}`;

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

  const html = `
    <div style="margin:0;background:#f5f7fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
        <div style="height:5px;background:#d50000;"></div>
        <div style="padding:24px 28px;">
          <div style="font-size:13px;color:#64748b;text-align:right;">ConectaCup Frete</div>
          <h1 style="margin:10px 0 4px;font-size:23px;line-height:1.25;">${escapeHtml(subject)}</h1>
          <p style="margin:0;color:#475569;">${escapeHtml(title)} registrado no ConectaCup.</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${[
            ['Protocolo', formatProtocol(request)],
            ['Status', request.status || '-'],
            ['Setor', request.setor || '-'],
            ['Projeto', request.projeto || request.projeto_descricao || '-'],
            ['Solicitante', requester],
            ['Prazo / agendamento', request.agendamento_at ? formatDate(request.agendamento_at) : formatDate(request.prazo_entrega || request.prazo_desejado)],
            ['Item / necessidade', item],
            ['Origem', origin || '-'],
            ['Destino', destination || '-'],
            ['Motorista', request.motorista || '-'],
            ['Veículo', [request.veiculo, request.placa].filter(Boolean).join(' - ') || '-'],
            ['Observações logística', request.observacoes_logistica || request.observacoes || request.observacoes_finais || '-']
          ].map(([label, value]) => `
            <tr>
              <td style="width:210px;padding:11px 28px;border-top:1px solid #e5e7eb;color:#64748b;">${escapeHtml(label)}</td>
              <td style="padding:11px 28px;border-top:1px solid #e5e7eb;font-weight:600;">${escapeHtml(value)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;

  const text = [
    subject,
    `Protocolo: ${formatProtocol(request)}`,
    `Status: ${request.status || '-'}`,
    `Setor: ${request.setor || '-'}`,
    `Projeto: ${request.projeto || request.projeto_descricao || '-'}`,
    `Solicitante: ${requester}`,
    `Origem: ${origin || '-'}`,
    `Destino: ${destination || '-'}`
  ].join('\n');

  return { subject, html, text };
}

async function logEmail(supabase: any, payload: Record<string, unknown>) {
  await supabase.from('freight_email_logs').insert({
    freight_request_id: payload.freightRequestId,
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

export default async function handler(request: any, response: any) {
  setCors(response, 'POST, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Método não permitido' });
    return;
  }

  try {
    const body = readBody(request);
    const requestId = String(body.requestId || '').trim();
    const eventType = String(body.eventType || 'created').trim();

    if (!requestId) {
      sendJson(response, 400, { error: 'Informe requestId.' });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data: freightRequest, error } = await supabase
      .from('freight_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (error) throw error;
    if (!freightRequest) {
      sendJson(response, 404, { error: 'Solicitação não encontrada.' });
      return;
    }

    const normalizedRequest = normalizeFreightRequest(freightRequest);
    const configuredRecipients = splitRecipients(
      process.env.FREIGHT_NOTIFICATION_EMAILS ||
      process.env.LOGISTICS_NOTIFICATION_EMAIL ||
      process.env.RESEND_TO_EMAIL
    );
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = (
      process.env.FREIGHT_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.SOURCING_FROM_EMAIL ||
      'ConectaCup Frete <onboarding@resend.dev>'
    ).trim();
    const fallbackRecipient = normalizedRequest.email_solicitante || normalizedRequest.created_by_email || '';
    const recipients = configuredRecipients.length ? configuredRecipients : splitRecipients(fallbackRecipient);
    const cc = configuredRecipients.length && fallbackRecipient ? [fallbackRecipient] : undefined;
    const { subject, html, text } = buildEmail(normalizedRequest, eventType);

    if (!recipients.length || !resendApiKey) {
      await logEmail(supabase, {
        freightRequestId: requestId,
        destinatario: recipients.join(', ') || 'sem-destinatario',
        cc: cc?.join(', ') || null,
        assunto: subject,
        eventType,
        status: 'mock',
        erro: !recipients.length ? 'destinatario ausente' : 'RESEND_API_KEY ausente'
      }).catch(() => undefined);

      sendJson(response, 200, {
        ok: true,
        mode: 'mock',
        warning: !recipients.length ? 'destinatario ausente' : 'RESEND_API_KEY ausente'
      });
      return;
    }

    const payload = {
      from: fromEmail,
      to: recipients,
      cc,
      subject,
      html,
      text
    };

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const resendPayload = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      const errorMessage = resendPayload?.message || resendPayload?.error || `Resend HTTP ${resendResponse.status}`;
      await logEmail(supabase, {
        freightRequestId: requestId,
        destinatario: recipients.join(', '),
        cc: cc?.join(', ') || null,
        assunto: subject,
        eventType,
        status: 'erro',
        erro: errorMessage,
        raw: resendPayload
      }).catch(() => undefined);

      sendJson(response, 207, { ok: false, error: errorMessage, raw: resendPayload });
      return;
    }

    await logEmail(supabase, {
      freightRequestId: requestId,
      destinatario: recipients.join(', '),
      cc: cc?.join(', ') || null,
      assunto: subject,
      eventType,
      status: 'enviado',
      providerId: resendPayload?.id,
      raw: resendPayload
    }).catch(() => undefined);

    sendJson(response, 200, { ok: true, mode: 'email', providerId: resendPayload?.id });
  } catch (error: any) {
    sendJson(response, 500, { error: error.message || 'Erro ao enviar e-mail de frete.' });
  }
}
