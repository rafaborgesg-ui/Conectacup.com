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

const carTag = {
  id: 'car-223',
  epc: 'C0DEC0DEC0DEC0DEC0DEC0DE',
  piloto: 'Enrico Pedrosa',
  carro: '992.1',
  numeroCarro: '223',
  ativo: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function eventsFor(tires) {
  return [
    pitlane.buildPitlaneCarTagRawEvent(carTag, 0),
    ...tires.map((tire, index) => pitlane.buildPitlaneRawEvent(tire, index + 1))
  ];
}

function context(tires, extra = {}) {
  return {
    tires,
    carTags: [carTag],
    ...extra
  };
}

test('classifica passagem com tag do carro e 4 pneus do mesmo piloto como Validado', () => {
  const passage = pitlane.createPitlanePassageFromEvents(eventsFor(samePilotTires), context(samePilotTires));

  assert.equal(passage.status, 'Validado');
  assert.equal(passage.leituraPercentual, 100);
  assert.equal(passage.piloto, 'Enrico Pedrosa');
  assert.equal(passage.numeroCarro, '223');
  assert.equal(passage.carTagEpc, carTag.epc);
  assert.equal(passage.tires.length, 4);
});

test('classifica menos de 4 pneus conhecidos como Incompleto', () => {
  const passage = pitlane.createPitlanePassageFromEvents(eventsFor(samePilotTires.slice(0, 3)), context(samePilotTires));

  assert.equal(passage.status, 'Incompleto');
  assert.equal(passage.leituraPercentual, 75);
});

test('classifica pneus de pilotos diferentes como Conflito', () => {
  const conflictTires = [
    ...samePilotTires.slice(0, 3),
    { pneuId: 't5', barcode: '05410678', piloto: 'Gustavo Zanon', carro: '992.1', numeroCarro: '54', modelo: 'Slick 992', lado: 'TD' }
  ];
  const passage = pitlane.createPitlanePassageFromEvents(eventsFor(conflictTires), context(conflictTires));

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
  const passage = pitlane.createPitlanePassageFromEvents(events, context(samePilotTires));

  assert.equal(passage.status, 'Tag desconhecida');
});

test('sem tag do carro cadastrada a passagem fica pendente mesmo com 4 pneus conhecidos', () => {
  const tireOnlyEvents = samePilotTires.map((tire, index) => pitlane.buildPitlaneRawEvent(tire, index));
  const passage = pitlane.createPitlanePassageFromEvents(tireOnlyEvents, { tires: samePilotTires, carTags: [] });

  assert.equal(passage.status, 'Pendente validação');
  assert.equal(passage.piloto, undefined);
});

test('modelo do pneu vem do CAI decodificado quando tire_models contem o CAI', () => {
  const epc = '301854AAE059B800014A3DDB';
  const decoded = pitlane.decodePitlaneRFID(epc);
  assert.ok(decoded);

  const tireFromStock = {
    ...samePilotTires[0],
    barcode: decoded.barcode,
    modelo: 'Modelo antigo do estoque'
  };
  const events = [
    pitlane.buildPitlaneCarTagRawEvent(carTag, 0),
    pitlane.buildPitlaneRawEvent(tireFromStock, 1, { epc, barcode: undefined }),
    ...samePilotTires.slice(1).map((tire, index) => pitlane.buildPitlaneRawEvent(tire, index + 2))
  ];
  const passage = pitlane.createPitlanePassageFromEvents(events, context([tireFromStock, ...samePilotTires.slice(1)], {
    tireModels: [{ id: 'model-cai', name: 'Modelo vindo do CAI', code: 'FIA-CAI', type: 'Slick', cai: decoded.cai }]
  }));

  assert.equal(passage.tires[0].tire.modelo, 'Modelo vindo do CAI');
  assert.equal(passage.tires[0].barcode, decoded.barcode);
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

test('extrai tag curta cadastrada do carro junto com EPCs dos pneus', () => {
  const epcs = [
    '301854AAE059B8000151C877',
    '301854AACEFC7C0001479C93',
    '301854AAE059B8000151E5AB',
    '301854AACEFC7C00014B7663'
  ];
  const expected = ['00001', ...epcs];

  assert.deepEqual(
    pitlane.extractPitlaneRfidTokens(['00001', ...epcs].join('\n'), ['00001']),
    expected
  );
  assert.deepEqual(
    pitlane.extractPitlaneRfidTokens(['00001', ...epcs].join(''), ['00001']),
    expected
  );
});

test('valida passagem quando tag curta do carro cadastrada chega no buffer', () => {
  const shortCarTag = { ...carTag, epc: '00001', piloto: 'Rafael', numeroCarro: '11', carro: 'Carrera' };
  const epcs = [
    '301854AAE059B8000151C877',
    '301854AACEFC7C0001479C93',
    '301854AAE059B8000151E5AB',
    '301854AACEFC7C00014B7663'
  ];
  const tires = samePilotTires.map(tire => ({
    ...tire,
    piloto: 'Rafael',
    numeroCarro: '11',
    carro: 'Carrera'
  }));
  const tokens = pitlane.extractPitlaneRfidTokens(
    ['00001', ...epcs].join('\n'),
    ['00001']
  );
  const events = tokens.map((epc, index) => ({
    readerId: 'TC22-RFD40',
    antennaId: 'RFD40',
    epc,
    barcode: index === 0 ? undefined : tires[index - 1]?.barcode,
    seenCount: 1,
    timestamp: new Date(Date.now() + index * 20).toISOString()
  }));
  const passage = pitlane.createPitlanePassageFromEvents(events, {
    tires,
    carTags: [shortCarTag]
  });

  assert.equal(passage.status, 'Validado');
  assert.equal(passage.piloto, 'Rafael');
  assert.equal(passage.carTagEpc, '00001');
});
