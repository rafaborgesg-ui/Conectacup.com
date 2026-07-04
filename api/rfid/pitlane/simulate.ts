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

  const now = Date.now();
  const readerId = request.body?.readerId || 'FXR90-01';
  const events = ['05249735', '05273958', '05364339', '05368463'].map((barcode, index) => ({
    readerId,
    antennaId: `ANT-0${index + 1}`,
    epc: `SIM${barcode.padStart(21, '0')}`.slice(0, 24),
    barcode,
    rssi: -45 - index * 4,
    seenCount: 4,
    timestamp: new Date(now + index * 120).toISOString(),
    raw: { source: 'api-simulate' }
  }));

  response.status(200).json({
    generated: events.length,
    events,
    note: 'Use estes eventos como payload de teste no módulo Controle Pitlane RFID.'
  });
}
