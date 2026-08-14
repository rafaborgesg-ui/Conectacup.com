import {
  buildPendingSummaryEmail,
  getFreightOperationRecipients,
  getSupabaseAdmin,
  logFreightEmail,
  normalizeFreightRequest,
  sendFreightEmail,
  sendJson,
  setCors
} from './_shared.js';

function isAuthorizedCron(request: any) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return true;
  const authorization = request.headers?.authorization || request.headers?.Authorization || '';
  return authorization === `Bearer ${expected}`;
}

function isPendingRequest(request: any) {
  const normalized = String(request?.status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized === 'pendente' || normalized.includes('aguardando') || normalized.includes('cotacao');
}

export default async function handler(request: any, response: any) {
  setCors(response, 'GET, POST, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (!['GET', 'POST'].includes(request.method)) {
    sendJson(response, 405, { error: 'Método não permitido' });
    return;
  }

  if (!isAuthorizedCron(request)) {
    sendJson(response, 401, { error: 'Não autorizado.' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const operationRecipients = await getFreightOperationRecipients(supabase);
    const { data, error } = await supabase
      .from('freight_requests')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1000);

    if (error) throw error;

    const pendingRequests = (data || [])
      .map(normalizeFreightRequest)
      .filter(isPendingRequest);
    const { subject, html, text } = buildPendingSummaryEmail(pendingRequests);
    const result = await sendFreightEmail({
      to: operationRecipients,
      subject,
      html,
      text
    });

    await logFreightEmail(supabase, {
      freightRequestId: null,
      destinatario: operationRecipients.join(', ') || 'sem-destinatario',
      cc: null,
      assunto: subject,
      eventType: 'daily_pending_summary',
      status: result.ok && result.mode === 'email' ? 'enviado' : result.ok ? 'mock' : 'erro',
      providerId: result.providerId,
      erro: result.warning || result.error || null,
      raw: result.raw || { pendingCount: pendingRequests.length }
    }).catch(() => undefined);

    if (!result.ok) {
      sendJson(response, 207, {
        ok: false,
        pendingCount: pendingRequests.length,
        error: result.error,
        raw: result.raw
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      mode: result.mode,
      pendingCount: pendingRequests.length,
      providerId: result.providerId,
      warning: result.warning
    });
  } catch (error: any) {
    sendJson(response, 500, { error: error.message || 'Erro ao enviar resumo diário de pendências.' });
  }
}
