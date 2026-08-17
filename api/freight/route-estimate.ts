import { readBody, sendJson, setCors } from './_shared.js';

function formatSeconds(value?: number) {
  if (!value || !Number.isFinite(value)) return undefined;
  const minutes = Math.round(value / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
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
    const origin = String(body.origin || '').trim();
    const destination = String(body.destination || '').trim();
    const mode = String(body.mode || 'driving').trim() || 'driving';
    const key = (
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_DISTANCE_MATRIX_API_KEY ||
      process.env.MAPS_API_KEY ||
      ''
    ).trim();

    if (!origin || !destination) {
      sendJson(response, 400, { status: 'MISSING_FIELDS', message: 'Informe retirada e entrega.' });
      return;
    }

    if (!key) {
      sendJson(response, 200, {
        status: 'ERROR',
        provider: 'google_distance_matrix',
        message: 'Configure GOOGLE_MAPS_API_KEY no Vercel para calcular distância e tempo.'
      });
      return;
    }

    const requestedDeparture = body.departureAt ? new Date(String(body.departureAt)) : new Date();
    const now = new Date();
    const departure = Number.isNaN(requestedDeparture.getTime()) || requestedDeparture < now ? now : requestedDeparture;
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode,
      language: 'pt-BR',
      units: 'metric',
      departure_time: String(Math.floor(departure.getTime() / 1000)),
      traffic_model: 'best_guess',
      key
    });
    const googleResponse = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    const payload = await googleResponse.json().catch(() => ({}));
    const element = payload?.rows?.[0]?.elements?.[0];

    if (!googleResponse.ok || payload.status !== 'OK' || !element || element.status !== 'OK') {
      sendJson(response, 200, {
        status: 'ERROR',
        provider: 'google_distance_matrix',
        message: element?.status || payload?.error_message || payload?.status || 'Não foi possível calcular a rota.',
        raw: payload
      });
      return;
    }

    sendJson(response, 200, {
      status: 'OK',
      provider: 'google_distance_matrix',
      distanceText: element.distance?.text || undefined,
      distanceMeters: element.distance?.value || undefined,
      durationText: element.duration?.text || formatSeconds(element.duration?.value),
      durationSeconds: element.duration?.value || undefined,
      trafficText: element.duration_in_traffic?.text || undefined,
      trafficSeconds: element.duration_in_traffic?.value || undefined,
      origin: payload.origin_addresses?.[0] || origin,
      destination: payload.destination_addresses?.[0] || destination
    });
  } catch (error: any) {
    sendJson(response, 500, { status: 'ERROR', message: error.message || 'Erro ao calcular rota.' });
  }
}
