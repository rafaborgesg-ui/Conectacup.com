import { readBody, sendJson, setCors } from './_shared.js';

type RouteProvider = 'google_distance_matrix' | 'distancematrix_ai';

function formatSeconds(value?: number) {
  if (!value || !Number.isFinite(value)) return undefined;
  const minutes = Math.round(value / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function distanceMatrixKey() {
  return (
    process.env.DISTANCEMATRIX_API_KEY ||
    process.env.DISTANCEMATRIX_ACCURATE_API_KEY ||
    process.env.DISTANCE_MATRIX_AI_API_KEY ||
    ''
  ).trim();
}

function googleMapsKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_DISTANCE_MATRIX_API_KEY ||
    process.env.MAPS_API_KEY ||
    ''
  ).trim();
}

function formatProviderError(provider: RouteProvider, message: string, raw?: unknown) {
  return {
    status: 'ERROR',
    provider,
    message,
    raw
  };
}

function normalizeMode(value: string) {
  const normalized = value.toLowerCase();
  if (['walking', 'bicycling', 'transit', 'driving'].includes(normalized)) return normalized;
  return 'driving';
}

function routeResponse(provider: RouteProvider, payload: any, origin: string, destination: string) {
  const element = payload?.rows?.[0]?.elements?.[0];
  if (payload?.status !== 'OK' || !element || element.status !== 'OK') {
    return formatProviderError(
      provider,
      element?.status || payload?.error_message || payload?.status || 'Não foi possível calcular a rota.',
      payload
    );
  }

  return {
    status: 'OK',
    provider,
    distanceText: element.distance?.text || undefined,
    distanceMeters: element.distance?.value || undefined,
    durationText: element.duration?.text || formatSeconds(element.duration?.value),
    durationSeconds: element.duration?.value || undefined,
    trafficText: element.duration_in_traffic?.text || element.duration?.text || formatSeconds(element.duration?.value),
    trafficSeconds: element.duration_in_traffic?.value || element.duration?.value || undefined,
    origin: payload.origin_addresses?.[0] || origin,
    destination: payload.destination_addresses?.[0] || destination
  };
}

async function fetchGoogleRoute(input: {
  origin: string;
  destination: string;
  mode: string;
  departure: Date;
  key: string;
}) {
  const params = new URLSearchParams({
    origins: input.origin,
    destinations: input.destination,
    mode: input.mode,
    language: 'pt-BR',
    units: 'metric',
    departure_time: String(Math.floor(input.departure.getTime() / 1000)),
    traffic_model: 'best_guess',
    key: input.key
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return formatProviderError('google_distance_matrix', payload?.error_message || `Google Distance Matrix HTTP ${response.status}`, payload);
  }

  return routeResponse('google_distance_matrix', payload, input.origin, input.destination);
}

async function fetchDistanceMatrixAiRoute(input: {
  origin: string;
  destination: string;
  mode: string;
  departure: Date;
  key: string;
}) {
  const params = new URLSearchParams({
    origins: input.origin,
    destinations: input.destination,
    mode: input.mode,
    language: 'pt-BR',
    units: 'metric',
    departure_time: String(Math.floor(input.departure.getTime() / 1000)),
    traffic_model: 'best_guess',
    key: input.key
  });
  const baseUrl = (process.env.DISTANCEMATRIX_BASE_URL || 'https://api.distancematrix.ai').replace(/\/+$/, '');

  const response = await fetch(`${baseUrl}/maps/api/distancematrix/json?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return formatProviderError('distancematrix_ai', payload?.error_message || `DistanceMatrix.ai HTTP ${response.status}`, payload);
  }

  return routeResponse('distancematrix_ai', payload, input.origin, input.destination);
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
    const mode = normalizeMode(String(body.mode || 'driving').trim() || 'driving');
    const googleKey = googleMapsKey();
    const distancematrixKey = distanceMatrixKey();

    if (!origin || !destination) {
      sendJson(response, 400, { status: 'MISSING_FIELDS', message: 'Informe retirada e entrega.' });
      return;
    }

    if (!googleKey && !distancematrixKey) {
      sendJson(response, 200, {
        status: 'ERROR',
        provider: 'distancematrix_ai',
        message: 'Configure DISTANCEMATRIX_API_KEY ou GOOGLE_MAPS_API_KEY no Vercel para calcular distância e tempo.'
      });
      return;
    }

    const requestedDeparture = body.departureAt ? new Date(String(body.departureAt)) : new Date();
    const now = new Date();
    const departure = Number.isNaN(requestedDeparture.getTime()) || requestedDeparture < now ? now : requestedDeparture;
    const result = distancematrixKey
      ? await fetchDistanceMatrixAiRoute({ origin, destination, mode, departure, key: distancematrixKey })
      : await fetchGoogleRoute({ origin, destination, mode, departure, key: googleKey });

    sendJson(response, 200, result);
  } catch (error: any) {
    sendJson(response, 500, { status: 'ERROR', message: error.message || 'Erro ao calcular rota.' });
  }
}
