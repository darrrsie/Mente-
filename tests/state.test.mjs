import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const state = await import('../src/state.js');

test('mapa libera um jogo diferente por etapa e guarda a melhor pontuação', () => {
  state.resetProgress();
  assert.equal(state.LEVELS.length, 5);
  assert.equal(new Set(state.LEVELS.map(level => level.id)).size, 5);
  assert.equal(state.canPlay('pairs'), false);
  assert.equal(state.finishLevel('pairs'), null);
  const first = state.finishLevel('sort', { mistakes: 3, elapsedSeconds: 70 });
  assert.equal(first.stars, 1);
  assert.equal(first.unlocked, 2);
  assert.equal(state.canPlay('pairs'), true);
  const repeat = state.finishLevel('sort', { mistakes: 0, elapsedSeconds: 20 });
  assert.equal(repeat.stars, 3);
  assert.equal(state.getState().levels.sort.stars, 3);
  assert.equal(state.getState().minutes, 2);
  assert.equal(state.getTodayPlays(), 2);
  assert.equal(state.getPracticedDays(), 1);
  assert.equal(state.getStreak(), 1);
});

test('dificuldade muda aos poucos e preferências sobrevivem ao recarregamento', async () => {
  state.resetProgress();
  for (let i = 0; i < 5; i++) state.finishLevel('sort', { mistakes: 4 });
  assert.equal(state.getState().levels.sort.support, -2);
  for (let i = 0; i < 6; i++) state.finishLevel('sort', { mistakes: 0 });
  assert.equal(state.getState().levels.sort.support, 2);
  state.updateName('  Ana  ');
  state.updateSetting('largeText', true);
  state.updateSetting('sound', false);
  state.updateSetting('highContrast', true);
  state.updateSetting('reducedMotion', true);
  state.updateSetting('comfortablePace', false);
  state.updateSetting('mapList', true);
  assert.equal(state.updateSetting('unknown', true), false);
  assert.equal(state.updateSetting('highContrast', 'false'), false);
  const loaded = await import('../src/state.js?reload=1');
  assert.equal(loaded.getState().name, 'Ana');
  assert.deepEqual(loaded.getState().settings, {
    largeText: true, sound: false, highContrast: true, reducedMotion: true,
    comfortablePace: false, mapList: true
  });
  assert.equal(loaded.getState().levels.sort.support, 2);
  assert.ok(loaded.getSkillScore('coordination') > 0);
});

test('preferências acessíveis têm defaults seguros ao migrar progresso antigo', async () => {
  const working = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ name: 'Ana', settings: { largeText: true, sound: false }, unlocked: 2 }),
    setItem: () => {}
  };
  try {
    const migrated = await import('../src/state.js?accessible-migration');
    assert.equal(migrated.getState().unlocked, 2);
    assert.deepEqual(migrated.getState().settings, {
      largeText: true, sound: false, highContrast: false, reducedMotion: false,
      comfortablePace: true, mapList: false
    });
  } finally { globalThis.localStorage = working; }
});

test('reiniciar partidas preserva nome e preferências de acessibilidade', () => {
  state.updateName('Ana');
  state.updateSetting('largeText', true);
  state.updateSetting('highContrast', true);
  state.updateSetting('reducedMotion', true);
  state.updateSetting('comfortablePace', false);
  state.updateSetting('mapList', true);
  const settings = { ...state.getState().settings };
  state.finishLevel('sort');
  assert.ok(state.getState().plays > 0);
  state.resetProgress();
  assert.equal(state.getState().name, 'Ana');
  assert.deepEqual(state.getState().settings, settings);
  assert.equal(state.getState().plays, 0);
  assert.equal(state.getState().unlocked, 1);
  assert.equal(state.getState().levels.sort.stars, 0);
  assert.deepEqual(state.getState().history, []);
});

test('mais de cem erros não viram uma partida perfeita e tempo inválido não corrompe o progresso', () => {
  state.resetProgress();
  assert.equal(state.finishLevel('sort', { mistakes: 101, elapsedSeconds: NaN }).stars, 1);
  assert.equal(state.finishLevel('sort', { mistakes: Infinity, elapsedSeconds: Infinity }).stars, 1);
  assert.ok(Number.isSafeInteger(state.getState().minutes));
});

test('falha de gravação é informada e uma nova tentativa pode recuperar o salvamento', async () => {
  const working = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } };
  const failing = await import('../src/state.js?quota');
  failing.finishLevel('sort');
  assert.equal(failing.getStorageStatus(), 'unavailable');
  assert.equal(failing.getState().plays, 1);
  globalThis.localStorage.setItem = () => {};
  failing.updateName('Ana');
  assert.equal(failing.getStorageStatus(), 'available');
  globalThis.localStorage = working;
});

test('armazenamento bloqueado não impede o aplicativo de iniciar', async () => {
  const working = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    const blocked = await import('../src/state.js?blocked');
    assert.equal(blocked.getStorageStatus(), 'unavailable');
    assert.equal(blocked.getState().plays, 0);
    assert.ok(blocked.finishLevel('sort'));
  } finally { Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: working }); }
});

test('progresso corrompido é sinalizado sem derrubar o app', async () => {
  const working = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => '{invalid', setItem: () => {} };
  try {
    const corrupt = await import('../src/state.js?corrupt');
    assert.equal(corrupt.getStorageStatus(), 'invalid');
    assert.equal(corrupt.getState().plays, 0);
  } finally { globalThis.localStorage = working; }
});
