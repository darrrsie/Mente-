import { SKILLS, MAX_LEVEL, getState, getStorageStatus, getLevel, canPlay, nextLevel, getStreak, getTodayPlays, getPracticedDays, getWeeklyDays, getSkillScore, finishLevel, updateName, updateSetting, completeOnboarding, resetProgress } from './state.js';
import { startGame } from './games.js';
import { renderTutorial } from './tutorials.js';

const view = document.querySelector('#view');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#appDialog');
let route = { page: getState().onboardingComplete ? 'home' : 'welcome' }, cleanup = null, noticeTimer = null, audioContext = null, mapPage = 0;
let dialogTask = null, manualPaused = false, backgroundPaused = false, preferencesReturn = { page: 'home' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const stars = count => `<span class="stars" role="img" aria-label="${count} de 3 estrelas">${'★'.repeat(count)}<span aria-hidden="true">${'★'.repeat(3 - count)}</span></span>`;
const levelRank = () => Math.floor(getState().xp / 200) + 1;
function sound(ok) {
  if (!getState().settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = ok ? 660 : 330;
    gain.gain.setValueAtTime(.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .13);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + .13);
  } catch { /* Audio is optional. */ }
}
function notify(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => toast.classList.remove('show'), 6000);
}
const listMap = () => { const settings = getState().settings; return settings.mapList || settings.largeText || settings.highContrast; };
function syncPause() { cleanup?.setPaused(backgroundPaused || document.hidden || manualPaused || dialog.open); }
function showDialog({ kind, title, description, confirmLabel, onConfirm, restoreFocus = false, returnAction, level }) {
  if (dialog.open) return;
  dialogTask = { kind, onConfirm, restoreFocus, returnAction, opener: document.activeElement };
  dialog.returnValue = '';
  document.querySelector('#dialogTitle').textContent = title;
  document.querySelector('#dialogDescription').textContent = description;
  const guide = document.querySelector('#dialogGuide');
  guide.replaceChildren(); guide.hidden = kind !== 'help';
  dialog.classList.toggle('tutorial-dialog', kind === 'help');
  if (kind === 'help') renderTutorial(guide, level.gameId);
  document.querySelector('#dialogField').hidden = kind !== 'name';
  document.querySelector('#dialogError').textContent = '';
  document.querySelector('#dialogName').removeAttribute('aria-invalid');
  document.querySelector('#dialogName').value = kind === 'name' ? getState().name : '';
  document.querySelector('[data-dialog="confirm"]').textContent = confirmLabel;
  document.querySelector('[data-dialog="cancel"]').textContent = kind === 'exit' ? 'Continuar jogando' : 'Cancelar';
  document.querySelector('[data-dialog="cancel"]').hidden = kind === 'help';
  dialog.showModal(); syncPause();
  if (kind === 'name') { document.querySelector('#dialogName').focus(); document.querySelector('#dialogName').select(); }
  else document.querySelector(`[data-dialog="${kind === 'help' ? 'confirm' : 'cancel'}"]`).focus();
}
document.querySelector('[data-dialog="cancel"]').addEventListener('click', () => dialog.close('cancel'));
document.querySelector('#dialogForm').addEventListener('submit', event => {
  event.preventDefault();
  if (dialogTask?.kind === 'name' && !updateName(document.querySelector('#dialogName').value)) {
    document.querySelector('#dialogError').textContent = 'Digite um nome antes de salvar.';
    document.querySelector('#dialogName').setAttribute('aria-invalid', 'true');
    document.querySelector('#dialogName').focus(); return;
  }
  dialog.close('confirm');
});
dialog.addEventListener('close', () => {
  const task = dialogTask; dialogTask = null; syncPause();
  if (!task) return;
  const confirmed = dialog.returnValue === 'confirm';
  if (confirmed) task.onConfirm();
  if (!confirmed || task.restoreFocus) {
    const target = task.opener?.isConnected ? task.opener : document.querySelector(`[data-action="${task.returnAction}"]`);
    target?.focus({ preventScroll: true });
  }
});
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('input, button')].filter(control => !control.disabled && control.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
function updateShell() {
  const state = getState();
  const storageNotice = document.querySelector('#storageNotice');
  const status = getStorageStatus();
  storageNotice.hidden = status === 'available';
  storageNotice.textContent = status === 'invalid'
    ? 'Não foi possível ler o progresso salvo. Uma nova sessão foi iniciada neste aparelho.'
    : 'Não foi possível salvar neste aparelho. Você pode continuar jogando, mas o progresso poderá ser perdido ao fechar. Confira o espaço disponível e a permissão de armazenamento do navegador.';
  document.documentElement.classList.toggle('large-text', state.settings.largeText);
  document.documentElement.classList.toggle('high-contrast', state.settings.highContrast);
  document.documentElement.classList.toggle('reduced-motion', state.settings.reducedMotion);
  document.documentElement.dataset.hudSize = state.settings.hudSize || 'normal';
  document.querySelector('#xpChip').textContent = `✦ ${state.xp} XP`;
  document.querySelector('#levelChip').textContent = `Nível ${levelRank()}`;
  const accessibilityButton = document.querySelector('.accessibility-link');
  if (route.page === 'preferences') accessibilityButton.setAttribute('aria-current', 'page');
  else accessibilityButton.removeAttribute('aria-current');
  document.querySelectorAll('[data-nav]').forEach(button => {
    const active = button.dataset.nav === route.page || (['play', 'result'].includes(route.page) && button.dataset.nav === 'map');
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.body.classList.toggle('in-game', ['play', 'result'].includes(route.page));
  document.body.classList.toggle('map-screen', route.page === 'map' && !listMap());
  document.body.classList.toggle('onboarding-screen', route.page === 'welcome');
}
function focusHeading() {
  const heading = view.querySelector('h1');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}
function navigate(page, id, confirmed = false) {
  if (route.page === 'play' && page !== 'result' && !confirmed) {
    showDialog({ kind: 'exit', title: 'Sair desta partida?', description: 'O avanço desta partida será perdido. As etapas concluídas continuarão salvas.', confirmLabel: 'Sair da partida', onConfirm: () => navigate(page, id, true) });
    return;
  }
  if (page === 'preferences' && route.page !== 'preferences') preferencesReturn = ['home', 'map', 'profile'].includes(route.page) ? { ...route } : { page: 'map' };
  cleanup?.(); cleanup = null;
  manualPaused = false;
  route = { page, id }; render();
  window.scrollTo(0, 0); focusHeading();
}
window.jardimBack = () => {
  if (dialog.open) { dialog.close('cancel'); return true; }
  if (route.page === 'welcome') return true;
  if (route.page === 'home') return false;
  if (route.page === 'preferences') navigate(preferencesReturn.page, preferencesReturn.id);
  else navigate(route.page === 'profile' || route.page === 'map' ? 'home' : 'map');
  return true;
};
window.jardimPause = paused => { backgroundPaused = paused; syncPause(); };
document.addEventListener('visibilitychange', () => window.jardimPause(document.hidden));

function renderHome() {
  const state = getState(), current = nextLevel(), today = Math.min(getTodayPlays(), 3);
  view.innerHTML = `<section class="hero">
    <div class="hero-top"><span class="eyebrow">SEU CANTINHO DE JOGAR</span><span class="hero-spark">✦</span></div>
    <div class="hero-illustration" aria-hidden="true"><span class="hero-orbit"></span><span class="hero-main">🧠</span><span class="hero-bubble one">🌼</span><span class="hero-bubble two">🦋</span><span class="hero-bubble three">✦</span></div>
    <h1>Olá, ${escapeHtml(state.name)}! <span class="wave">👋</span></h1>
    <p>Vamos movimentar a mente hoje?</p>
    <button type="button" class="primary-button hero-button" data-action="play" data-id="${current.id}">Começar exercício <span aria-hidden="true">→</span></button>
  </section>
  <section class="today-card"><div class="section-heading"><div><span class="eyebrow">UM POUQUINHO POR DIA</span><h2>Seu treino de hoje</h2></div><span class="day-icon" aria-hidden="true">☀️</span></div>
    <div class="today-progress"><span>${today} de 3 atividades</span><strong>${today === 3 ? 'Concluído!' : 'No seu ritmo'}</strong></div>
    <div class="progress-track" role="progressbar" aria-label="Atividades de hoje" aria-valuenow="${today}" aria-valuemin="0" aria-valuemax="3"><span style="width:${today / 3 * 100}%"></span></div>
    <div class="skill-pills"><span>🧠 Memória</span><span>🎯 Coordenação</span><span>👁️ Atenção</span></div>
  </section>
  <section class="home-stats"><div><span>🔥</span><strong>${getStreak()}</strong><small>${getStreak() === 1 ? 'dia seguido' : 'dias seguidos'}</small></div><div><span>⭐</span><strong>${Object.values(state.stageRecords).reduce((sum, record) => sum + record.stars, 0)}</strong><small>estrelas</small></div><div><span>✦</span><strong>${state.xp}</strong><small>pontos XP</small></div></section>
  <div class="section-heading below"><div><span class="eyebrow">PRÓXIMA AVENTURA</span><h2>Continue sua jornada</h2></div><button type="button" class="text-link" data-action="map">Ver mapa →</button></div>
  <button type="button" class="next-card ${current.color}" data-action="play" data-id="${current.id}"><span class="next-icon">${current.icon}</span><span><small>ETAPA ${String(current.number).padStart(2, '0')} • ${current.skill.toUpperCase()}</small><strong>${current.name}</strong><em>${current.objective}</em></span><b aria-hidden="true">→</b></button>
  <p class="soft-note">Cada tentativa conta. Divirta-se no seu tempo! 💛</p>`;
}
function renderWelcome() {
  const settings = getState().settings;
  view.innerHTML = `<section class="welcome-card"><span class="eyebrow">MENTE & MOVIMENTO</span><h1>Vamos deixar do seu jeito?</h1><p>Digite seu nome ou apelido para começar. As outras preferências são opcionais. Tudo fica salvo apenas neste aparelho e pode ser alterado depois no Perfil.</p>
    <form id="welcomeForm" class="welcome-form" novalidate>
      <label class="welcome-name" for="welcomeName"><strong>Como gostaria de ser chamado? (obrigatório)</strong><small>Seu nome ou apelido aparece nas boas-vindas e nas comemorações.</small><input id="welcomeName" name="name" type="text" maxlength="24" autocomplete="given-name" required aria-describedby="welcomeNameError" placeholder="Seu nome ou apelido" value="${escapeHtml(getState().name)}"></label>
      <p id="welcomeNameError" class="dialog-error" role="alert" hidden></p>
      <label class="hud-size-setting" for="welcomeHudSize"><span><strong>Tamanho geral do site</strong><small>Redimensiona textos, jogos, cartões e controles.</small></span><select id="welcomeHudSize" name="hudSize"><option value="compact" ${settings.hudSize === 'compact' ? 'selected' : ''}>Compacto</option><option value="normal" ${settings.hudSize === 'normal' ? 'selected' : ''}>Padrão</option><option value="large" ${settings.hudSize === 'large' ? 'selected' : ''}>Ampliado</option></select></label>
      <label class="welcome-check" for="welcomePace"><span><strong>Quero jogar no meu ritmo</strong><small>Sem pressa para observar as cartas e sequências.</small></span><input id="welcomePace" name="comfortablePace" type="checkbox" ${settings.comfortablePace ? 'checked' : ''}></label>
      <label class="welcome-check" for="welcomeText"><span><strong>Texto maior</strong><small>Facilita a leitura e mostra as fases em lista.</small></span><input id="welcomeText" name="largeText" type="checkbox" ${settings.largeText ? 'checked' : ''}></label>
      <label class="welcome-check" for="welcomeSound"><span><strong>Sons suaves</strong><small>Ativa respostas sonoras durante os jogos.</small></span><input id="welcomeSound" name="sound" type="checkbox" ${settings.sound ? 'checked' : ''}></label>
      <div class="welcome-actions"><button type="submit" class="primary-button">Começar</button></div>
    </form></section>`;
}
function renderMap() {
  const state = getState();
  const inList = listMap(), forcedList = state.settings.largeText || state.settings.highContrast;
  const pageSize = 15, pageStart = mapPage * pageSize + 1;
  const visibleCount = Math.min(pageSize, MAX_LEVEL - pageStart + 1);
  const stages = Array.from({ length: visibleCount }, (_, index) => getLevel(pageStart + index));
  const pageEnd = pageStart + visibleCount - 1;
  const canViewNext = pageEnd < MAX_LEVEL && pageEnd + 1 <= state.unlocked + pageSize - 1;
  const pageControls = `<div class="map-pages"><button type="button" class="secondary-button" data-action="map-page" data-page="${Math.max(0, mapPage - 1)}" ${mapPage === 0 ? 'disabled' : ''}>← Fases anteriores</button><span>Fases ${pageStart}–${pageEnd}</span><button type="button" class="secondary-button" data-action="map-page" data-page="${mapPage + 1}" ${!canViewNext ? 'disabled' : ''}>Próximas fases →</button></div>`;
  const toolbar = `<div class="map-toolbar" role="group" aria-label="Apresentação das atividades"><button type="button" class="secondary-button" data-action="map-mode" data-mode="illustrated" aria-pressed="${!inList}" ${forcedList ? 'disabled' : ''}>Mapa</button><button type="button" class="secondary-button" data-action="map-mode" data-mode="list" aria-pressed="${inList}">Lista</button></div>${forcedList ? '<p class="fine-print">A lista facilita a leitura com texto maior ou alto contraste.</p>' : ''}`;
  if (inList) {
    view.innerHTML = `${toolbar}${pageControls}<section class="level-list"><h1>Uma jornada que continua</h1><p>Os sete jogos voltam em novos ciclos. Cada ciclo exige um pouco mais de foco.</p><ol class="level-list-items">${stages.map(level => {
      const open = canPlay(level.number), record = state.stageRecords[level.number];
      const status = open ? record ? `${record.stars} de 3 estrelas. Jogar novamente.` : 'Disponível para jogar.' : `Conclua a fase ${level.number - 1} para liberar.`;
      return `<li class="level-list-item"><button type="button" class="level-list-button" data-action="play" data-id="${level.number}" aria-disabled="${!open}" aria-label="Fase ${level.number}, ciclo ${level.cycle}: ${level.name}. ${level.objective} ${status}"><span class="level-list-icon" aria-hidden="true">${level.icon}</span><span class="level-list-description"><small>FASE ${level.number} · CICLO ${level.cycle} · ${level.skill}</small><strong>${level.name}</strong><span>${level.objective}</span><span class="level-list-status">${status}</span></span></button></li>`;
    }).join('')}</ol></section>`;
    return;
  }
  const height = visibleCount * 190 + 240;
  const spread = seed => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return value - Math.floor(value);
  };
  const points = stages.map(level => ({
    x: Math.round(90 + spread(level.number) * 180),
    y: Math.round(170 + (level.number - pageStart) * 190 + (spread(level.number + 271) - 0.5) * 48)
  }));
  const route = points.slice(1).reduce((path, point, index) => {
    const previous = points[index], middle = Math.round((previous.y + point.y) / 2);
    return `${path} C${previous.x} ${middle},${point.x} ${middle},${point.x} ${point.y}`;
  }, `M${points[0].x} ${points[0].y}`);
  const earned = Object.values(state.stageRecords).reduce((sum, record) => sum + record.stars, 0);
  view.innerHTML = `${toolbar}${pageControls}<section class="map-world" style="--map-height:${height}px" aria-label="Mapa de fases">
    <div class="map-title"><div><span>SEU CAMINHO</span><h1>Jornada sem fim</h1><p>Sete jogos em ciclos cada vez mais desafiadores</p></div><strong aria-label="${earned} estrelas conquistadas">★ ${earned}</strong></div>
    <svg class="map-route" viewBox="0 0 360 ${height}" preserveAspectRatio="none" aria-hidden="true"><path class="map-route-edge" d="${route}"/><path class="map-route-center" d="${route}"/><path class="map-route-dashes" d="${route}"/></svg>
    ${stages.map((level, index) => {
      const { x, y } = points[index], open = canPlay(level.number);
      const record = state.stageRecords[level.number], active = level.number === state.unlocked;
      return `<div class="map-stage ${level.color} ${open ? 'available' : 'locked'} ${record ? 'complete' : ''} ${active ? 'current' : ''}" style="--stage-x:${x / 360 * 100}%;--stage-y:${y}px">
        <button type="button" class="map-node" data-action="play" data-id="${level.number}" aria-disabled="${!open}" aria-label="Fase ${level.number}, ciclo ${level.cycle}: ${level.name}. ${open ? record ? `${record.stars} estrelas. Jogar novamente.` : 'Disponível para jogar.' : `Bloqueada. Conclua a fase ${level.number - 1}.`}">
          <span class="map-node-number">${String(level.number).padStart(2, '0')}</span><span class="map-node-icon" aria-hidden="true">${open ? level.icon : '🔒'}</span>
        </button>
        <div class="map-stage-label"><strong>Fase ${level.number} · ${level.name}</strong><small>Ciclo ${level.cycle} · ${open ? level.skill : 'Bloqueada'}</small></div>
        ${record ? `<span class="map-earned" aria-label="${record.stars} de 3 estrelas">${'★'.repeat(record.stars)}${'☆'.repeat(3 - record.stars)}</span>` : active ? '<span class="map-play-hint">JOGAR AGORA</span>' : ''}
      </div>`;
    }).join('')}
    <div class="map-start" aria-hidden="true">✦ MAIS DESAFIOS</div>
  </section>`;
}
function renderProfile() {
  const state = getState(), days = getWeeklyDays(), weeklyMax = Math.max(3, ...days.map(d => d.count));
  const medals = [
    { icon: '🌱', label: 'Primeiro passo', earned: state.plays >= 1, goal: 'Conclua uma atividade' },
    { icon: '⭐', label: 'Colecionador', earned: Object.values(state.stageRecords).reduce((sum, item) => sum + item.stars, 0) >= 5, goal: 'Conquiste 5 estrelas' },
    { icon: '🔥', label: '3 dias de jogo', earned: getStreak() >= 3, goal: 'Jogue por 3 dias seguidos' }
  ];
  view.innerHTML = `<section class="profile-hero"><div class="avatar" aria-hidden="true">${escapeHtml(state.name.charAt(0).toUpperCase())}</div><div><span class="eyebrow">SEU PERFIL</span><h1>${escapeHtml(state.name)}</h1><p>Nível ${levelRank()} · ${state.xp} XP</p></div><button type="button" class="icon-button" data-action="edit-name" aria-label="Editar nome">✎</button></section>
    <div class="profile-stats"><div><strong>${state.plays}</strong><span>partidas concluídas</span></div><div><strong>${state.minutes}</strong><span>minutos aproximados</span></div><div><strong>${getPracticedDays()}</strong><span>dias no histórico</span></div><div><strong>${getStreak()}</strong><span>dias seguidos</span></div></div>
    <section class="panel"><div class="section-heading"><div><span class="eyebrow">PASSO A PASSO</span><h2>Sua semana</h2></div><span aria-hidden="true">📅</span></div><div class="week-chart" role="list" aria-label="Atividades dos últimos sete dias">${days.map(d => `<div role="listitem" aria-label="${d.label}, ${d.date}: ${d.count} atividades concluídas"><div class="week-bar" aria-hidden="true"><span style="height:${Math.max(8, d.count / weeklyMax * 100)}%" class="${d.count ? 'played' : ''}"></span></div><small aria-hidden="true">${d.label}</small><b aria-hidden="true">${d.count}</b></div>`).join('')}</div><p class="fine-print">Cada barra mostra atividades concluídas no site.</p></section>
    <section class="panel"><span class="eyebrow">SUAS CONQUISTAS</span><h2>Medalhas</h2><div class="medal-list">${medals.map(medal => `<div class="${medal.earned ? '' : 'pending'}"><span aria-hidden="true">${medal.icon}</span><strong>${medal.label}</strong><small>${medal.earned ? 'Conquistada' : medal.goal}</small></div>`).join('')}</div></section>
    <section class="panel"><span class="eyebrow">NO SEU RITMO</span><h2>Habilidades jogadas</h2><div class="skill-bars">${Object.entries(SKILLS).map(([id, skill]) => `<div class="skill-row"><span id="skill-${id}"><span aria-hidden="true">${skill.icon}</span> ${skill.name}</span><strong>${getSkillScore(id)}%</strong><div class="progress-track" role="progressbar" aria-labelledby="skill-${id}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${getSkillScore(id)}"><span style="width:${getSkillScore(id)}%;background:${skill.color}"></span></div></div>`).join('')}</div><p class="fine-print">Os números mostram seu desempenho nos jogos. Não são uma avaliação de saúde.</p></section>
    <section class="panel settings"><span class="eyebrow">AJUSTES DO SITE</span><h2>Configuração geral</h2>
      <p>Personalize a interface e o tamanho dos controles para ficar confortável para você.</p>
      <label class="hud-size-setting" for="hudSize"><span><strong>Tamanho geral do site</strong><small>Redimensiona textos, jogos, cartões e controles.</small></span><select id="hudSize" data-setting="hudSize"><option value="compact" ${state.settings.hudSize === 'compact' ? 'selected' : ''}>Compacto</option><option value="normal" ${state.settings.hudSize === 'normal' ? 'selected' : ''}>Padrão</option><option value="large" ${state.settings.hudSize === 'large' ? 'selected' : ''}>Ampliado</option></select></label>
      <button type="button" class="secondary-button" data-action="welcome-edit">Personalizar minha experiência</button>
      <button type="button" class="secondary-button" data-action="preferences">Mais preferências e acessibilidade</button>
      <p class="fine-print">O progresso fica salvo neste navegador e neste dispositivo. O histórico reúne as últimas 200 partidas. Limpar os dados do navegador pode apagar seu progresso.</p>
      <button type="button" class="text-link reset-link" data-action="reset">Apagar meu progresso</button></section>`;
}
function renderPreferences() {
  const settings = getState().settings;
  const options = [
    ['largeText', 'Texto maior', 'Amplia o texto e organiza as atividades em lista para facilitar a leitura.'],
    ['highContrast', 'Alto contraste', 'Aumenta a distinção entre textos, botões e fundos. As atividades são mostradas em lista.'],
    ['reducedMotion', 'Reduzir movimentos', 'Desativa animações decorativas e transições. A preferência do aparelho também é respeitada.'],
    ['comfortablePace', 'Jogar no meu ritmo', 'Nos pares e nas sequências, você decide quando terminar de observar. Pode repetir sem perder pontos.'],
    ['mapList', 'Mapa em lista', 'Mostra as próximas fases em ordem, com instruções e situação de desbloqueio.'],
    ['sound', 'Sons do jogo', 'Ativa respostas sonoras suaves. As instruções e os resultados também aparecem em texto.']
  ];
  view.innerHTML = `<button type="button" class="back-button" data-action="preferences-back">← Voltar</button><section class="panel settings"><span class="eyebrow">DO SEU JEITO</span><h1>Acessibilidade e preferências</h1><p>Escolha o que deixa a experiência mais confortável. Você pode mudar estas opções quando quiser.</p>${options.map(([key, title, description]) => `<label for="setting-${key}"><span><strong id="setting-title-${key}">${title}</strong><small id="setting-help-${key}">${description}</small></span><input id="setting-${key}" type="checkbox" data-setting="${key}" aria-labelledby="setting-title-${key}" aria-describedby="setting-help-${key}" ${settings[key] ? 'checked' : ''}></label>`).join('')}<p class="fine-print">Suas preferências ficam neste aparelho e são mantidas quando você apaga o progresso dos jogos.</p></section>`;
}
function renderPlay(id) {
  const level = getLevel(id); if (!level || !canPlay(id)) return navigate('map');
  view.innerHTML = `<div class="play-top"><button type="button" class="back-button" data-action="map">← Mapa</button><span>FASE ${level.number} · CICLO ${level.cycle}</span></div>
    <div class="play-heading"><div class="play-icon ${level.color}" aria-hidden="true">${level.icon}</div><div><span class="eyebrow">${level.skill.toUpperCase()}</span><h1>${level.name}</h1></div></div>
    <div class="instruction-banner"><span aria-hidden="true">👉</span><strong>${level.objective}</strong></div>
    <p class="feedback" id="feedback" role="status" aria-live="polite" aria-atomic="true">Você consegue. Vá no seu ritmo!</p><div class="game-controls"><button type="button" class="secondary-button pause-button" data-action="pause" aria-pressed="false">Pausar partida</button><button type="button" class="secondary-button" data-action="help">Ver tutorial</button></div><p id="pauseNotice" class="instruction-banner" role="status" hidden>Partida pausada. Selecione Retomar partida para continuar do mesmo ponto.</p><div id="gameMount"></div>`;
  cleanup = startGame({
    id: level.gameId, mount: view.querySelector('#gameMount'), support: getState().levels[level.gameId].support, difficulty: level.difficulty, settings: { ...getState().settings },
    playSound: sound,
    onFeedback: (message, ok) => { const feedback = view.querySelector('#feedback'); if (feedback) { feedback.textContent = message; feedback.classList.toggle('positive', ok); } },
    onComplete: outcome => {
      const result = finishLevel(id, outcome);
      cleanup?.(); cleanup = null;
      manualPaused = false;
      route = { page: 'result', id, result }; render(); window.scrollTo(0, 0); focusHeading();
    }
  });
  syncPause();
}
function renderResult(id, result) {
  const level = getLevel(id), next = getLevel(level.number + 1);
  view.innerHTML = `<section class="result-card"><div class="confetti" aria-hidden="true">✦ 🌼 ✦</div><div class="result-trophy" aria-hidden="true">🏆</div><span class="eyebrow">ETAPA CONCLUÍDA</span>
    <h1>Muito bem, ${escapeHtml(getState().name)}!</h1><p>Você completou ${level.name}.</p>
    <div class="result-stars">${stars(result.stars)}</div>
    <div class="reward-grid"><div><strong>+${result.xp}</strong><span>XP ganhos</span></div><div><strong>${result.score}%</strong><span>no jogo</span></div></div>
    <div class="trained"><span>${level.icon}</span><div><small>VOCÊ PRATICOU</small><strong>${level.skills.map(skill => SKILLS[skill].name).join(' e ')}</strong></div></div>
    ${result.unlocked ? `<p class="unlocked-note">🔓 Nova etapa liberada!</p>` : '<p class="unlocked-note">Você pode jogar novamente quando quiser.</p>'}
    <div class="result-actions">${next && canPlay(next.id) ? `<button type="button" class="primary-button" data-action="play" data-id="${next.id}">Próxima etapa →</button>` : ''}
      <button type="button" class="secondary-button" data-action="map">Ver meu mapa</button><button type="button" class="text-link" data-action="play" data-id="${id}">Jogar de novo</button></div></section>`;
}
function render() {
  updateShell();
  if (route.page === 'welcome') renderWelcome();
  else if (route.page === 'home') renderHome();
  else if (route.page === 'map') renderMap();
  else if (route.page === 'profile') renderProfile();
  else if (route.page === 'preferences') renderPreferences();
  else if (route.page === 'play') renderPlay(route.id);
  else if (route.page === 'result') renderResult(route.id, route.result);
  else renderHome();
  const heading = view.querySelector('h1');
  if (heading) { heading.tabIndex = -1; document.title = `${heading.textContent} · Mente & Movimento`; }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const { action, id } = button.dataset;
  if (action === 'welcome-edit') { route = { page: 'welcome' }; render(); window.scrollTo(0, 0); focusHeading(); return; }
  if (route.page === 'welcome') return;
  if (action === 'help' && route.page === 'play') {
    const level = getLevel(route.id);
    showDialog({ kind: 'help', title: `Como jogar: ${level.name}`, description: 'A partida está pausada. Consulte as instruções ou experimente o exemplo.', confirmLabel: 'Voltar à partida', level, onConfirm: () => {}, restoreFocus: true, returnAction: 'help' });
    return;
  }
  if (action === 'play' && !canPlay(id)) { notify(`Conclua a etapa ${getLevel(id)?.number - 1} para liberar esta atividade.`); return; }
  if (['home', 'map', 'profile', 'preferences', 'play'].includes(action)) navigate(action, id);
  if (action === 'preferences-back') navigate(preferencesReturn.page, preferencesReturn.id);
  if (action === 'map-mode') {
    updateSetting('mapList', button.dataset.mode === 'list'); render();
    view.querySelector(`[data-action="map-mode"][data-mode="${button.dataset.mode}"]`)?.focus({ preventScroll: true });
  }
  if (action === 'map-page') {
    mapPage = Number(button.dataset.page);
    render(); window.scrollTo(0, 0); focusHeading();
  }
  if (action === 'pause' && route.page === 'play') {
    manualPaused = !manualPaused; syncPause();
    view.querySelector('#gameMount').hidden = manualPaused;
    view.querySelector('#pauseNotice').hidden = !manualPaused;
    button.setAttribute('aria-pressed', String(manualPaused));
    button.textContent = manualPaused ? 'Retomar partida' : 'Pausar partida';
  }
  if (action === 'edit-name') {
    showDialog({ kind: 'name', title: 'Editar seu nome', description: 'Este nome aparece na tela inicial e no seu perfil. Use até 24 caracteres.', confirmLabel: 'Salvar nome', restoreFocus: true, returnAction: 'edit-name', onConfirm: () => { render(); notify(getStorageStatus() === 'available' ? 'Nome atualizado.' : 'Nome alterado nesta sessão. Não foi possível salvar.'); } });
  }
  if (action === 'reset') showDialog({ kind: 'reset', title: 'Apagar seu progresso?', description: 'As estrelas, etapas liberadas e o histórico serão apagados neste aparelho. Seu nome e suas preferências de acessibilidade serão mantidos. Esta ação não pode ser desfeita.', confirmLabel: 'Apagar progresso', onConfirm: () => { resetProgress(); mapPage = 0; navigate('home'); notify(getStorageStatus() === 'available' ? 'Seu progresso foi reiniciado. Suas preferências foram mantidas.' : 'Progresso reiniciado nesta sessão. Não foi possível salvar a alteração.'); } });
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'welcomeForm') return;
  event.preventDefault();
  const form = event.target;
  const completed = completeOnboarding({
    name: form.querySelector('[name="name"]').value,
    hudSize: form.querySelector('[name="hudSize"]').value,
    comfortablePace: form.querySelector('[name="comfortablePace"]').checked,
    largeText: form.querySelector('[name="largeText"]').checked,
    sound: form.querySelector('[name="sound"]').checked
  });
  if (!completed) {
    const input = form.querySelector('[name="name"]'), error = form.querySelector('#welcomeNameError');
    error.textContent = 'Digite seu nome ou apelido para começar.';
    error.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus();
    return;
  }
  route = { page: 'home' }; render(); window.scrollTo(0, 0); focusHeading();
  notify(getStorageStatus() === 'available' ? 'Preferências salvas. Aproveite sua jornada!' : 'Preferências aplicadas nesta sessão.');
});
document.addEventListener('input', event => {
  if (event.target.id !== 'welcomeName') return;
  event.target.removeAttribute('aria-invalid');
  document.querySelector('#welcomeNameError').hidden = true;
});
document.addEventListener('change', event => { const key = event.target.dataset.setting; const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value; if (key && updateSetting(key, value)) { updateShell(); notify(getStorageStatus() === 'available' ? 'Preferência salva.' : 'Preferência alterada nesta sessão. Não foi possível salvar.'); } });
render();
