export const LEVELS = [
  { id: 'sort', number: 1, name: 'Organize a Feira', short: 'Arraste objetos', icon: '🍎', skill: 'Coordenação', skills: ['coordination', 'visual'], color: 'coral', intro: 'Hoje vamos treinar sua coordenação!', steps: ['Escolha uma fruta.', 'Leve até a cesta igual.', 'Você também pode tocar na fruta e na cesta.'], objective: 'Coloque cada fruta na cesta correta.' },
  { id: 'pairs', number: 2, name: 'Pares do Jardim', short: 'Encontre pares', icon: '🌼', skill: 'Memória', skills: ['memory', 'attention'], color: 'yellow', intro: 'Hoje vamos treinar sua memória!', steps: ['Observe as cartas.', 'Toque em duas de cada vez.', 'Encontre as figuras iguais.'], objective: 'Encontre todos os pares.' },
  { id: 'path', number: 3, name: 'Trilha da Borboleta', short: 'Siga uma linha', icon: '🦋', skill: 'Coordenação', skills: ['coordination', 'visual'], color: 'blue', intro: 'Hoje vamos treinar a precisão!', steps: ['Comece na flor.', 'Siga o caminho com o dedo ou escolha avançar com toques.', 'Chegue até a borboleta.'], objective: 'Siga a trilha do início ao fim.' },
  { id: 'sequence', number: 4, name: 'Cores em Festa', short: 'Memorize a sequência', icon: '🎨', skill: 'Memória', skills: ['memory', 'reasoning'], color: 'purple', intro: 'Hoje vamos treinar sua atenção!', steps: ['Leia ou observe a sequência de cores e formas.', 'Depois, repita desde o primeiro símbolo.', 'Selecione os botões na mesma ordem.'], objective: 'Repita a sequência de cores e formas.' },
  { id: 'differences', number: 5, name: 'Dois Jardins', short: 'Encontre diferenças', icon: '👀', skill: 'Atenção', skills: ['attention', 'visual'], color: 'green', intro: 'Hoje vamos observar os detalhes!', steps: ['Veja os dois jardins.', 'Procure o que mudou.', 'Toque no detalhe diferente.'], objective: 'Encontre as diferenças entre os jardins.' }
];
export const SKILLS = {
  memory: { name: 'Memória', icon: '🧠', color: '#a77ce1' },
  coordination: { name: 'Coordenação', icon: '🎯', color: '#ed8b70' },
  attention: { name: 'Atenção', icon: '👁️', color: '#59b9aa' },
  reasoning: { name: 'Raciocínio', icon: '🧩', color: '#e6ad47' },
  visual: { name: 'Percepção visual', icon: '🌈', color: '#75a9df' }
};
const KEY = 'mente-movimento-v1';
let storage = null, storageStatus = 'available';
try { storage = globalThis.localStorage; if (!storage) storageStatus = 'unavailable'; }
catch { storageStatus = 'unavailable'; }
export const getStorageStatus = () => storageStatus;
const day = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const blank = () => ({
  name: 'Maria', xp: 0, minutes: 0, plays: 0, streak: 0, lastDay: '', unlocked: 1,
  settings: { largeText: false, sound: true, highContrast: false, reducedMotion: false, comfortablePace: true, mapList: false },
  levels: Object.fromEntries(LEVELS.map(level => [level.id, { stars: 0, bestScore: 0, plays: 0, support: 0 }])),
  history: [], skills: Object.fromEntries(Object.keys(SKILLS).map(id => [id, { total: 0, count: 0 }]))
});
const bounded = (value, fallback = 0, max = 1000000) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : fallback;
function load() {
  const fresh = blank();
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return fresh;
    fresh.name = typeof saved.name === 'string' && saved.name.trim() ? saved.name.trim().slice(0, 24) : fresh.name;
    for (const key of ['xp', 'minutes', 'plays', 'streak']) fresh[key] = bounded(saved[key]);
    fresh.lastDay = /^\d{4}-\d{2}-\d{2}$/.test(saved.lastDay || '') ? saved.lastDay : '';
    fresh.unlocked = Math.max(1, Math.min(5, bounded(saved.unlocked, 1)));
    for (const key of Object.keys(fresh.settings)) {
      if (typeof saved.settings?.[key] === 'boolean') fresh.settings[key] = saved.settings[key];
    }
    for (const level of LEVELS) {
      const item = saved.levels?.[level.id];
      if (!item) continue;
      fresh.levels[level.id] = {
        stars: Math.min(3, bounded(item.stars)), bestScore: Math.min(100, bounded(item.bestScore)),
        plays: bounded(item.plays), support: Math.max(-2, Math.min(2, Number.isInteger(item.support) ? item.support : 0))
      };
    }
    fresh.history = Array.isArray(saved.history) ? saved.history.filter(item =>
      LEVELS.some(level => level.id === item?.id) && /^\d{4}-\d{2}-\d{2}$/.test(item.date || '')
      && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100
    ).slice(-200).map(({ id, date, score }) => ({ id, date, score })) : [];
    for (const id of Object.keys(SKILLS)) {
      fresh.skills[id].total = bounded(saved.skills?.[id]?.total);
      fresh.skills[id].count = bounded(saved.skills?.[id]?.count);
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
export const getLevel = id => LEVELS.find(level => level.id === id);
export const canPlay = id => Boolean(getLevel(id) && getLevel(id).number <= state.unlocked);
export const nextLevel = () => LEVELS.find(level => level.number === state.unlocked && state.levels[level.id].stars === 0) || LEVELS.find(level => level.number === state.unlocked) || LEVELS[0];
export const getStreak = () => state.lastDay === day(0) || state.lastDay === day(-1) ? state.streak : 0;
export const getTodayPlays = () => state.history.filter(item => item.date === day(0)).length;
export const getPracticedDays = () => new Set(state.history.map(item => item.date)).size;
export const getWeeklyDays = () => Array.from({ length: 7 }, (_, i) => { const offset = i - 6; const d = new Date(); d.setDate(d.getDate() + offset); const date = day(offset); return { date, label: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()], count: state.history.filter(item => item.date === date).length }; });
export const getSkillScore = id => state.skills[id]?.count ? Math.round(state.skills[id].total / state.skills[id].count) : 0;
export function finishLevel(id, { mistakes = 0, elapsedSeconds = 0 } = {}) {
  if (!canPlay(id)) return null;
  const level = getLevel(id), record = state.levels[id], first = record.stars === 0;
  const errors = Number.isFinite(mistakes) ? Math.min(100, Math.max(0, Math.floor(mistakes))) : 100;
  const stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1;
  const score = Math.max(40, 100 - errors * 12), xp = 15 + stars * 10 + (first ? 10 : 0);
  record.stars = Math.max(record.stars, stars); record.bestScore = Math.max(record.bestScore, score); record.plays++;
  record.support = Math.max(-2, Math.min(2, record.support + (errors >= 3 ? -1 : errors === 0 ? 1 : 0)));
  const seconds = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.min(86400, elapsedSeconds)) : 0;
  state.xp += xp; state.plays++; state.minutes += Math.max(1, Math.round(seconds / 60));
  if (first && level.number < LEVELS.length) state.unlocked = Math.max(state.unlocked, level.number + 1);
  const today = day(0);
  if (state.lastDay !== today) { state.streak = state.lastDay === day(-1) ? state.streak + 1 : 1; state.lastDay = today; }
  state.history.push({ id, date: today, score }); state.history = state.history.slice(-200);
  for (const skill of level.skills) { state.skills[skill].total += score; state.skills[skill].count++; }
  save();
  return { stars, score, xp, first, unlocked: first && level.number < LEVELS.length ? level.number + 1 : null };
}
export function updateName(value) { const name = String(value || '').trim().replace(/[<>]/g, '').slice(0, 24); if (!name) return false; state.name = name; save(); return true; }
export function updateSetting(key, value) { if (!Object.prototype.hasOwnProperty.call(state.settings, key) || typeof value !== 'boolean') return false; state.settings[key] = value; save(); return true; }
export function resetProgress() {
  const { name, settings } = state;
  state = blank(); state.name = name; state.settings = { ...settings }; save();
}
