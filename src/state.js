export const LEVELS = [
  { id: 'sort', number: 1, name: 'Organize a Feira', short: 'Arraste objetos', icon: '🍎', skill: 'Coordenação', skills: ['coordination', 'visual'], color: 'coral', intro: 'Hoje vamos treinar sua coordenação!', steps: ['Escolha uma fruta.', 'Leve até a cesta igual.', 'Você também pode tocar na fruta e na cesta.'], objective: 'Leve cada fruta à cesta certa.' },
  { id: 'pairs', number: 2, name: 'Pares do Jardim', short: 'Encontre pares', icon: '🌼', skill: 'Memória', skills: ['memory', 'attention'], color: 'yellow', intro: 'Hoje vamos treinar sua memória!', steps: ['Observe as cartas.', 'Toque em duas de cada vez.', 'Encontre as figuras iguais.'], objective: 'Encontre as figuras iguais.' },
  { id: 'path', number: 3, name: 'Trilha da Borboleta', short: 'Siga uma linha', icon: '🦋', skill: 'Coordenação', skills: ['coordination', 'visual'], color: 'blue', intro: 'Hoje vamos treinar a precisão!', steps: ['Comece na flor.', 'Siga o caminho com o dedo ou escolha avançar com toques.', 'Chegue até a borboleta.'], objective: 'Siga o caminho até a borboleta.' },
  { id: 'sequence', number: 4, name: 'Cores em Festa', short: 'Memorize a sequência', icon: '🎨', skill: 'Memória', skills: ['memory', 'reasoning'], color: 'purple', intro: 'Hoje vamos treinar sua atenção!', steps: ['Leia ou observe a sequência de cores e formas.', 'Depois, repita desde o primeiro símbolo.', 'Selecione os botões na mesma ordem.'], objective: 'Repita a sequência.' },
  { id: 'differences', number: 5, name: 'Dois Jardins', short: 'Encontre diferenças', icon: '👀', skill: 'Atenção', skills: ['attention', 'visual'], color: 'green', intro: 'Hoje vamos observar os detalhes!', steps: ['Veja os dois jardins.', 'Procure o que mudou.', 'Toque no detalhe diferente.'], objective: 'Encontre o que mudou nos jardins.' },
  { id: 'oddone', number: 6, name: 'Intruso no Jardim', short: 'Encontre o diferente', icon: '🔎', skill: 'Atenção', skills: ['attention', 'visual'], color: 'coral', intro: 'Hoje vamos procurar um detalhe que não combina!', steps: ['Observe todos os símbolos.', 'Compare um por um.', 'Toque no diferente em cada uma das três rodadas.'], objective: 'Toque no símbolo diferente.' },
  { id: 'counting', number: 7, name: 'Contagem da Colheita', short: 'Conte os objetos', icon: '🧺', skill: 'Raciocínio', skills: ['reasoning', 'attention'], color: 'yellow', intro: 'Hoje vamos contar com atenção!', steps: ['Observe os objetos espalhados.', 'Conte apenas o símbolo indicado.', 'Escolha a quantidade correta nas três rodadas.'], objective: 'Conte os objetos indicados.' }
];
export const SKILLS = {
  memory: { name: 'Memória', icon: '🧠', color: '#a77ce1' },
  coordination: { name: 'Coordenação', icon: '🎯', color: '#ed8b70' },
  attention: { name: 'Atenção', icon: '👁️', color: '#59b9aa' },
  reasoning: { name: 'Raciocínio', icon: '🧩', color: '#e6ad47' },
  visual: { name: 'Percepção visual', icon: '🌈', color: '#75a9df' }
};
const KEY = 'mente-movimento-v1';
const cleanName = value => typeof value === 'string' ? value.replace(/[<>]/g, '').trim().slice(0, 24).trim() : '';
export const MAX_LEVEL = 999_999_999;
let storage = null, storageStatus = 'available';
try { storage = globalThis.localStorage; if (!storage) storageStatus = 'unavailable'; }
catch { storageStatus = 'unavailable'; }
export const getStorageStatus = () => storageStatus;
const day = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const blank = () => ({
  name: '', onboardingComplete: false, xp: 0, minutes: 0, plays: 0, streak: 0, lastDay: '', unlocked: 1, stageRecords: {},
  settings: { largeText: false, sound: true, highContrast: false, reducedMotion: false, comfortablePace: true, mapList: false, voiceGuidance: false, colorblindMode: false, hudSize: 'normal' },
  levels: Object.fromEntries(LEVELS.map(level => [level.id, { stars: 0, bestScore: 0, plays: 0, support: 0 }])),
  history: [], skills: Object.fromEntries(Object.keys(SKILLS).map(id => [id, { total: 0, count: 0 }]))
});
const bounded = (value, fallback = 0, max = 1000000) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : fallback;
function load() {
  const fresh = blank();
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return fresh;
    fresh.name = cleanName(saved.name);
    fresh.onboardingComplete = Boolean(fresh.name) && saved.onboardingComplete !== false;
    for (const key of ['xp', 'minutes', 'plays', 'streak']) fresh[key] = bounded(saved[key], 0, MAX_LEVEL * 100);
    fresh.lastDay = /^\d{4}-\d{2}-\d{2}$/.test(saved.lastDay || '') ? saved.lastDay : '';
    fresh.unlocked = Math.max(1, Math.min(MAX_LEVEL, bounded(saved.unlocked, 1, MAX_LEVEL)));
    for (const key of Object.keys(fresh.settings)) {
      if (typeof fresh.settings[key] === 'boolean' && typeof saved.settings?.[key] === 'boolean') fresh.settings[key] = saved.settings[key];
    }
    if (['compact', 'normal', 'large'].includes(saved.settings?.hudSize)) fresh.settings.hudSize = saved.settings.hudSize;
    for (const level of LEVELS) {
      const item = saved.levels?.[level.id];
      if (!item) continue;
      fresh.levels[level.id] = {
        stars: Math.min(3, bounded(item.stars)), bestScore: Math.min(100, bounded(item.bestScore)),
        plays: bounded(item.plays, 0, MAX_LEVEL), support: Math.max(-2, Math.min(2, Number.isInteger(item.support) ? item.support : 0))
      };
    }
    if (saved.stageRecords && typeof saved.stageRecords === 'object') {
      for (const [number, item] of Object.entries(saved.stageRecords)) {
        const stage = Number(number);
        if (Number.isSafeInteger(stage) && stage > 0 && stage <= MAX_LEVEL && item && typeof item === 'object') {
          fresh.stageRecords[stage] = { stars: Math.min(3, bounded(item.stars)), bestScore: Math.min(100, bounded(item.bestScore)) };
        }
      }
    }
    // Convert the original five-stage progress into stage-specific records.
    for (let stage = 1; stage <= Math.min(5, fresh.unlocked); stage++) {
      const template = LEVELS[(stage - 1) % LEVELS.length], record = fresh.levels[template.id];
      if (record.plays && !fresh.stageRecords[stage]) {
        fresh.stageRecords[stage] = { stars: record.stars, bestScore: record.bestScore };
      }
    }
    if (fresh.stageRecords[5]?.stars) fresh.unlocked = Math.max(fresh.unlocked, 6);
    fresh.history = Array.isArray(saved.history) ? saved.history.filter(item =>
      LEVELS.some(level => level.id === item?.id) && /^\d{4}-\d{2}-\d{2}$/.test(item.date || '')
      && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100
    ).slice(-200).map(({ id, date, score }) => ({ id, date, score })) : [];
    for (const id of Object.keys(SKILLS)) {
      fresh.skills[id].total = bounded(saved.skills?.[id]?.total, 0, MAX_LEVEL * 100);
      fresh.skills[id].count = bounded(saved.skills?.[id]?.count, 0, MAX_LEVEL);
    }
  } catch (error) { storageStatus = error instanceof SyntaxError ? 'invalid' : 'unavailable'; }
  return fresh;
}
let state = load();
const save = () => {
  try {
    if (!storage) throw new Error('Storage unavailable');
    storage.setItem(KEY, JSON.stringify(state)); storageStatus = 'available';
  } catch { storageStatus = 'unavailable'; }
};
export const getState = () => state;
export function getLevel(id) {
  const template = LEVELS.find(level => level.id === id);
  const number = template ? template.number : Number(id);
  if (!Number.isSafeInteger(number) || number < 1 || number > MAX_LEVEL) return undefined;
  const base = LEVELS[(number - 1) % LEVELS.length];
  const cycle = Math.floor((number - 1) / LEVELS.length) + 1;
  return { ...base, id: number, gameId: base.id, number, cycle, difficulty: cycle - 1 };
}
export const canPlay = id => { const level = getLevel(id); return Boolean(level && level.number <= state.unlocked); };
export const nextLevel = () => getLevel(state.unlocked) || getLevel(MAX_LEVEL);
export const getStreak = () => state.lastDay === day(0) || state.lastDay === day(-1) ? state.streak : 0;
export const getTodayPlays = () => state.history.filter(item => item.date === day(0)).length;
export const getPracticedDays = () => new Set(state.history.map(item => item.date)).size;
export const getWeeklyDays = () => Array.from({ length: 7 }, (_, i) => { const offset = i - 6; const d = new Date(); d.setDate(d.getDate() + offset); const date = day(offset); return { date, label: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()], count: state.history.filter(item => item.date === date).length }; });
export const getSkillScore = id => state.skills[id]?.count ? Math.round(state.skills[id].total / state.skills[id].count) : 0;
export function finishLevel(id, { mistakes = 0, elapsedSeconds = 0 } = {}) {
  const level = getLevel(id);
  if (!level || !canPlay(level.number)) return null;
  const record = state.levels[level.gameId || level.id];
  const stageRecord = state.stageRecords[level.number];
  const first = !stageRecord;
  const errors = Number.isFinite(mistakes) ? Math.min(100, Math.max(0, Math.floor(mistakes))) : 100;
  const stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1;
  const score = Math.max(40, 100 - errors * 12), xp = 15 + stars * 10 + (first ? 10 : 0);
  record.stars = Math.max(record.stars, stars); record.bestScore = Math.max(record.bestScore, score); record.plays++;
  record.support = Math.max(-2, Math.min(2, record.support + (errors >= 3 ? -1 : errors === 0 ? 1 : 0)));
  state.stageRecords[level.number] = { stars: Math.max(stageRecord?.stars || 0, stars), bestScore: Math.max(stageRecord?.bestScore || 0, score) };
  const seconds = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.min(86400, elapsedSeconds)) : 0;
  state.xp += xp; state.plays++; state.minutes += Math.max(1, Math.round(seconds / 60));
  const previousUnlocked = state.unlocked;
  state.unlocked = Math.max(state.unlocked, Math.min(MAX_LEVEL, level.number + 1));
  const today = day(0);
  if (state.lastDay !== today) { state.streak = state.lastDay === day(-1) ? state.streak + 1 : 1; state.lastDay = today; }
  state.history.push({ id: level.gameId || level.id, date: today, score }); state.history = state.history.slice(-200);
  for (const skill of level.skills) { state.skills[skill].total += score; state.skills[skill].count++; }
  save();
  return { stars, score, xp, first, unlocked: level.number >= previousUnlocked && level.number < MAX_LEVEL ? level.number + 1 : null };
}
export function updateName(value) { const name = cleanName(value); if (!name) return false; state.name = name; save(); return true; }
export function completeOnboarding({ name, hudSize, comfortablePace, sound, largeText } = {}) {
  const normalizedName = cleanName(name);
  if (!normalizedName) return false;
  state.name = normalizedName;
  if (['compact', 'normal', 'large'].includes(hudSize)) state.settings.hudSize = hudSize;
  for (const [key, value] of Object.entries({ comfortablePace, sound, largeText, voiceGuidance })) {
    if (typeof value === 'boolean') state.settings[key] = value;
  }
  state.onboardingComplete = true;
  save();
  return true;
}
export function updateSetting(key, value) {
  if (!Object.prototype.hasOwnProperty.call(state.settings, key)) return false;
  const choices = { hudSize: ['compact', 'normal', 'large'] };
  if (choices[key] ? !choices[key].includes(value) : typeof value !== 'boolean') return false;
  state.settings[key] = value; save(); return true;
}
export function resetProgress() {
  const { name, settings, onboardingComplete } = state;
  state = blank(); state.name = name; state.settings = { ...settings }; state.onboardingComplete = onboardingComplete; save();
}
