import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

async function loadPitlaneModule() {
  const result = await build({
    entryPoints: ['src/app/utils/pitlaneRfid.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    external: ['./storage']
  });

  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`);
}

const pitlane = await loadPitlaneModule();

const samePilotTires = [
  { pneuId: 't1', barcode: '05249735', piloto: 'Enrico Pedrosa', carro: '992.1', numeroCarro: '223', modelo: 'Slick 992', lado: 'DD' },
  { pneuId: 't2', barcode: '05273958', piloto: 'Enrico Pedrosa', carro: '992.1', numeroCarro: '223', modelo: 'Slick 992', lado: 'DE' },
  { pneuId: 't3', barcode: '05364339', piloto: 'Enrico Pedrosa', carro: '992.1', numeroCarro: '223', modelo: 'Slick 992', lado: 'TE' },
  { pneuId: 't4', barcode: '05368463', piloto: 'Enrico Pedrosa', carro: '992.1', numeroCarro: '223', modelo: 'Slick 992', lado: 'TD' }
];

function eventsFor(tires) {
  return tires.map((tire, index) => pitlane.buildPitlaneRawEvent(tire, index));
}

test('classifica passagem com 4 pneus conhecidos do mesmo piloto como Validado', () => {
  const passage = pitlane.createPitlanePassageFromEvents(eventsFor(samePilotTires), samePilotTires);

  assert.equal(passage.status, 'Validado');
  assert.equal(passage.leituraPercentual, 100);
  assert.equal(passage.piloto, 'Enrico Pedrosa');
  assert.equal(passage.numeroCarro, '223');
  assert.equal(passage.tires.length, 4);
});

test('classifica menos de 4 pneus conhecidos como Incompleto', () => {
  const passage = pitlane.createPitlanePassageFromEvents(eventsFor(samePilotTires.slice(0, 3)), samePilotTires);

  assert.equal(passage.status, 'Incompleto');
  assert.equal(passage.leituraPercentual, 75);
});

test('classifica pneus de pilotos diferentes como Conflito', () => {
  const conflictTires = [
    ...samePilotTires.slice(0, 3),
    { pneuId: 't5', barcode: '05410678', piloto: 'Gustavo Zanon', carro: '992.1', numeroCarro: '54', modelo: 'Slick 992', lado: 'TD' }
  ];
  const passage = pitlane.createPitlanePassageFromEvents(eventsFor(conflictTires), conflictTires);

  assert.equal(passage.status, 'Conflito');
});

test('classifica EPC sem cadastro como Tag desconhecida', () => {
  const events = [
    ...eventsFor(samePilotTires.slice(0, 3)),
    {
      readerId: 'FXR90-01',
      antennaId: 'ANT-04',
      epc: '0001CA1F0000000000435893',
      rssi: -42,
      seenCount: 3,
      timestamp: new Date().toISOString(),
      raw: {}
    }
  ];
  const passage = pitlane.createPitlanePassageFromEvents(events, samePilotTires);

  assert.equal(passage.status, 'Tag desconhecida');
});

test('extrai EPCs do DataWedge separados por quebra de linha ou concatenados', () => {
  const epcs = [
    '301854AACECF7C0001406B1F',
    '301854AACECF7C000141E59B',
    '301854AAE059B800014A3DDB',
    '301854AACECF7C00014769CF'
  ];

  assert.deepEqual(pitlane.extractPitlaneRfidTokens(epcs.join('\n')), epcs);
  assert.deepEqual(pitlane.extractPitlaneRfidTokens(epcs.join('')), epcs);
});
