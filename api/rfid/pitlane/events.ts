import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendCors(response: any) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(request: any, response: any) {
  sendCors(response);

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const body = request.body || {};
  const events = Array.isArray(body) ? body : [body];
  const normalizedEvents = events.map((event: any) => ({
    reader_id: event.readerId || event.reader_id || 'FXR90-01',
    antenna_id: event.antennaId || event.antenna_id || null,
    epc: String(event.epc || '').replace(/\s/g, '').toUpperCase(),
    rssi: typeof event.rssi === 'number' ? event.rssi : null,
    seen_count: event.seenCount || event.seen_count || 1,
    timestamp: event.timestamp || new Date().toISOString(),
    payload_original: event.raw || event
  })).filter((event: any) => event.epc);

  if (normalizedEvents.length === 0) {
    response.status(400).json({ error: 'Payload sem EPC válido' });
    return;
  }

  if (!supabaseUrl || !serviceKey) {
    response.status(202).json({
      accepted: normalizedEvents.length,
      mode: 'mock',
      warning: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente da função.'
    });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  const { error } = await supabase
    .from('rfid_raw_events')
    .insert(normalizedEvents);

  if (error) {
    response.status(500).json({ error: error.message });
    return;
  }

  response.status(202).json({
    accepted: normalizedEvents.length,
    status: 'recebido'
  });
}
