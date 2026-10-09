const shuffle = list => { const copy = [...list]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
const fruits = [{ icon: '🍎', name: 'Maçã' }, { icon: '🍌', name: 'Banana' }, { icon: '🍊', name: 'Laranja' }, { icon: '🍓', name: 'Morango' }, { icon: '🍐', name: 'Pera' }];

export function startGame({ id, mount, support = 0, settings = {}, onComplete, onFeedback = () => {}, playSound = () => {} }) {
  let closed = false, mistakes = 0, paused = false, pausedAt = 0, pausedMs = 0;
  const started = performance.now(), timers = new Set();
  const schedule = timer => {
    timer.started = performance.now();
    timer.id = setTimeout(() => { timers.delete(timer); if (!closed) timer.fn(); }, timer.remaining);
  };
  const later = (fn, ms) => {
    const timer = { fn, remaining: ms, id: null, started: 0 };
    timers.add(timer); if (!paused) schedule(timer);
    return timer;
  };
  const cancel = timer => { if (timer) { clearTimeout(timer.id); timers.delete(timer); } };
  const error = message => { mistakes++; onFeedback(message, false); playSound(false); };
  const success = message => { onFeedback(message, true); playSound(true); };
  const finish = () => { if (closed) return; closed = true; onComplete({ mistakes, elapsedSeconds: Math.round((performance.now() - started - pausedMs) / 1000) }); };
  const count = Math.max(-2, Math.min(2, support));
  mount.innerHTML = '<div class="game-area" id="gameArea"></div>';
  const area = mount.querySelector('#gameArea');
  const comfortablePace = Boolean(settings.comfortablePace);
  const reducedMotion = Boolean(settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  if (id === 'sort') sortGame();
  if (id === 'pairs') pairsGame();
  if (id === 'path') pathGame();
  if (id === 'sequence') sequenceGame();
  if (id === 'differences') differencesGame();
  const counter = area.querySelector('#counter');
  if (counter) {
    counter.setAttribute('role', 'status');
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-atomic', 'true');
  }
  const cleanup = () => { closed = true; for (const timer of timers) clearTimeout(timer.id); timers.clear(); };
  cleanup.setPaused = value => {
    if (closed || paused === value) return;
    paused = value;
    if (paused) {
      pausedAt = performance.now();
      for (const timer of timers) {
        clearTimeout(timer.id); timer.remaining = Math.max(0, timer.remaining - (pausedAt - timer.started));
      }
    } else {
      pausedMs += performance.now() - pausedAt;
      for (const timer of timers) schedule(timer);
    }
  };
  return cleanup;

  function sortGame() {
    const items = shuffle(fruits.slice(0, count <= -1 ? 3 : count >= 1 ? 5 : 4));
    let selected = null, placed = 0;
    area.innerHTML = `<p class="game-tip">Escolha uma fruta e depois sua cesta. Use toque ou teclado. Se preferir, arraste a fruta.</p>
      <div class="sort-items" id="sortItems"></div><div class="sort-baskets" id="sortBaskets"></div>
      <p class="game-counter" id="counter">0 de ${items.length} objetos organizados</p>`;
    const tray = area.querySelector('#sortItems'), baskets = area.querySelector('#sortBaskets');
    function pick(button) {
      if (closed || paused || button.disabled || selected === button) return;
      tray.querySelectorAll('.fruit-tile').forEach(el => { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false'); });
      selected = button; button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      onFeedback(`Agora escolha a cesta de ${button.dataset.name}.`, true);
    }
    function place(name) {
      if (closed || paused) return;
      if (!selected) { onFeedback('Escolha uma fruta antes de selecionar a cesta.', false); return; }
      if (selected.dataset.name !== name) { error(`Essa é a cesta de ${name}. Escolha a cesta de ${selected.dataset.name}, que é a fruta selecionada.`); return; }
      const basket = [...baskets.children].find(el => el.dataset.name === name);
      basket.classList.add('filled');
      basket.querySelector('.basket-result').textContent = selected.dataset.icon;
      basket.setAttribute('aria-label', `Cesta de ${name}, fruta organizada`);
      const moveFocus = document.activeElement === selected;
      selected.disabled = true; selected.classList.remove('selected');
      selected.setAttribute('aria-pressed', 'false');
      selected.setAttribute('aria-label', `${name}, fruta organizada`);
      if (moveFocus) basket.focus();
      selected = null; placed++;
      area.querySelector('#counter').textContent = `${placed} de ${items.length} objetos organizados`;
      if (placed === items.length) { success('Todas as frutas estão no lugar!'); later(finish, 550); }
      else success(`${name} está na cesta. Escolha a próxima fruta.`);
    }
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'fruit-tile';
      button.dataset.name = item.name; button.dataset.icon = item.icon;
      button.innerHTML = `<span aria-hidden="true">${item.icon}</span><strong>${item.name}</strong>`;
      button.setAttribute('aria-label', `Selecionar ${item.name}`);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => pick(button));
      let start = null;
      button.addEventListener('pointerdown', event => {
        if (event.button !== 0 || closed || paused || button.disabled) return;
        pick(button); start = { x: event.clientX, y: event.clientY };
        button.setPointerCapture(event.pointerId);
      });
      button.addEventListener('pointermove', event => {
        if (!start || button.disabled || closed || paused) return;
        button.style.transform = `translate(${event.clientX - start.x}px,${event.clientY - start.y}px) scale(1.08)`;
        button.style.zIndex = '3';
      });
      button.addEventListener('pointerup', event => {
        if (!start) return;
        button.style.transform = ''; button.style.zIndex = '';
        start = null;
        const target = [...baskets.children].find(basket => {
          const rect = basket.getBoundingClientRect();
          return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        });
        if (target) place(target.dataset.name);
      });
      button.addEventListener('pointercancel', () => { start = null; button.style.transform = ''; button.style.zIndex = ''; });
      tray.appendChild(button);
    });
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'basket'; button.dataset.name = item.name;
      button.innerHTML = `<span class="basket-result" aria-hidden="true">🧺</span><span>${item.icon} ${item.name}</span>`;
      button.setAttribute('aria-label', `Cesta de ${item.name}`);
      button.addEventListener('click', () => place(item.name));
      baskets.appendChild(button);
    });
  }

  function pairsGame() {
    const symbols = [{ icon: '🌼', name: 'Margarida' }, { icon: '🦋', name: 'Borboleta' }, { icon: '🍓', name: 'Morango' }, { icon: '🌻', name: 'Girassol' }, { icon: '🐝', name: 'Abelha' }];
    const pairCount = count <= -1 ? 2 : count >= 1 ? 4 : 3;
    const deck = shuffle([...symbols.slice(0, pairCount), ...symbols.slice(0, pairCount)]);
    let first = null, locked = true, matched = 0, previewing = true, manual = comfortablePace, previewTimer = null, mismatchTimer = null, unmatched = [];
    area.innerHTML = `<p class="game-tip" id="pairTip">Observe as figuras e a posição de cada carta.</p>
      <div class="pairs-grid" id="pairsGrid" role="group" aria-label="Cartas do jogo da memória" aria-describedby="pairTip"></div>
      <div class="game-controls"><button type="button" class="secondary-button" id="pairPace"${manual ? ' hidden' : ''}>Observar no meu ritmo</button>
      <button type="button" class="primary-button" id="pairStart"${manual ? '' : ' hidden'}>Estou pronto para jogar</button>
      <button type="button" class="secondary-button" id="pairContinue" hidden>Virar cartas e continuar</button></div>
      <p class="game-counter" id="counter">0 de ${pairCount} pares encontrados</p>`;
    const grid = area.querySelector('#pairsGrid');
    const start = area.querySelector('#pairStart'), pace = area.querySelector('#pairPace'), next = area.querySelector('#pairContinue');
    const cards = deck.map((symbol, i) => {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'pair-card revealed';
      card.textContent = symbol.icon; card.setAttribute('aria-label', `Carta ${i + 1}, ${symbol.name}, revelada`);
      card.setAttribute('aria-disabled', 'true');
      card.addEventListener('click', () => flip(i)); grid.appendChild(card); return card;
    });
    function updateAvailability() {
      cards.forEach((card, i) => {
        if (locked || card.disabled || first === i) card.setAttribute('aria-disabled', 'true');
        else card.removeAttribute('aria-disabled');
      });
    }
    function hideCard(i) {
      cards[i].textContent = '✿'; cards[i].classList.remove('revealed');
      cards[i].setAttribute('aria-label', `Carta ${i + 1}, fechada. Ative para revelar a figura.`);
      cards[i].removeAttribute('aria-disabled');
    }
    function begin() {
      if (closed || paused || !previewing) return;
      const moveFocus = document.activeElement === start;
      cancel(previewTimer); previewing = false; start.hidden = true; locked = false;
      cards.forEach((_, i) => hideCard(i));
      updateAvailability();
      area.querySelector('#pairTip').textContent = 'Escolha duas cartas para encontrar figuras iguais. Use toque ou teclado.';
      if (moveFocus) cards[0].focus();
    }
    function hideMismatch() {
      if (closed || paused || !unmatched.length) return;
      const moveFocus = document.activeElement === next;
      const previous = unmatched[0];
      cancel(mismatchTimer); unmatched.forEach(hideCard); unmatched = []; next.hidden = true; locked = false;
      updateAvailability();
      if (moveFocus) cards[previous].focus();
    }
    start.addEventListener('click', begin);
    next.addEventListener('click', hideMismatch);
    pace.addEventListener('click', () => {
      if (closed || paused) return;
      manual = true; pace.hidden = true;
      if (previewing) {
        cancel(previewTimer); start.hidden = false;
        area.querySelector('#pairTip').textContent = 'Leia ou observe as cartas com calma. Quando terminar, escolha “Estou pronto para jogar”.';
        start.focus();
      } else if (unmatched.length) {
        cancel(mismatchTimer); next.hidden = false; next.focus();
      } else onFeedback('Cartas diferentes ficarão visíveis até você escolher continuar.', true);
    });
    if (manual) area.querySelector('#pairTip').textContent = 'Leia ou observe as cartas com calma. Quando terminar, escolha “Estou pronto para jogar”.';
    else previewTimer = later(begin, count <= -1 ? 4000 : 2700);
    function flip(i) {
      if (closed || paused || locked || cards[i].disabled || first === i) return;
      cards[i].textContent = deck[i].icon; cards[i].classList.add('revealed');
      cards[i].setAttribute('aria-label', `Carta ${i + 1}, ${deck[i].name}, revelada`);
      if (first === null) { first = i; updateAvailability(); onFeedback(`Carta ${i + 1}: ${deck[i].name}. Escolha outra carta.`, true); return; }
      const previous = first; first = null; locked = true;
      let nextFocus = null;
      if (deck[previous] === deck[i]) {
        const moveFocus = document.activeElement === cards[previous] || document.activeElement === cards[i];
        cards[previous].disabled = cards[i].disabled = true;
        cards[previous].classList.add('matched'); cards[i].classList.add('matched');
        for (const index of [previous, i]) cards[index].setAttribute('aria-label', `Carta ${index + 1}, ${deck[index].name}, par encontrado`);
        matched++; area.querySelector('#counter').textContent = `${matched} de ${pairCount} pares encontrados`;
        success(`Você encontrou o par de ${deck[i].name}!`);
        if (matched === pairCount) later(finish, 600); else locked = false;
        if (moveFocus && matched < pairCount) nextFocus = cards.find(card => !card.disabled);
      } else {
        unmatched = [previous, i];
        error(`Carta ${previous + 1}: ${deck[previous].name}. Carta ${i + 1}: ${deck[i].name}. As figuras são diferentes. ${manual ? 'Observe com calma e escolha “Virar cartas e continuar”.' : 'Tente outro par ou escolha “Observar no meu ritmo”.'}`);
        if (manual) next.hidden = false;
        else mismatchTimer = later(hideMismatch, count <= -1 ? 1700 : 1100);
      }
      updateAvailability();
      nextFocus?.focus({ preventScroll: true });
    }
  }

  function pathGame() {
    const points = Array.from({ length: 28 }, (_, i) => ({ x: 35 + i * 10.6, y: 375 - i * 11.4 + Math.sin(i * 0.6) * (count <= -1 ? 20 : count >= 1 ? 36 : 28) }));
    const coords = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const threshold = count <= -1 ? 45 : count >= 1 ? 29 : 36;
    let index = 0, drawing = false, misses = 0;
    area.innerHTML = `<p class="game-tip" id="pathTip">Siga da flor até a borboleta. Você pode deslizar na trilha ou usar o botão abaixo com toque, Enter ou Espaço.</p>
      <div class="path-wrap"><svg id="pathSvg" viewBox="0 0 360 430" role="img" aria-label="Trilha da flor até a borboleta">
      <polyline class="path-base" points="${coords}"/><polyline id="pathDone" class="path-done" points="${points[0].x},${points[0].y}"/>
      <text x="12" y="409" class="path-emoji">🌼</text><text x="307" y="62" class="path-emoji">🦋</text>
      <circle id="pathMarker" class="path-marker" cx="${points[0].x}" cy="${points[0].y}" r="15"/></svg></div>
      <p class="game-counter" id="counter">Início da trilha: flor. 0 de ${points.length - 1} trechos percorridos.</p>
      <button type="button" class="secondary-button path-assist" id="pathAssist" aria-describedby="pathTip">Avançar pelo botão</button>`;
    const svg = area.querySelector('#pathSvg'), marker = area.querySelector('#pathMarker'), done = area.querySelector('#pathDone');
    const assist = area.querySelector('#pathAssist');
    function position(event) {
      const transform = svg.getScreenCTM();
      if (transform) {
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
        return { x: point.x, y: point.y };
      }
      const rect = svg.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * 360 / rect.width, y: (event.clientY - rect.top) * 430 / rect.height };
    }
    const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= threshold;
    function advance() {
      if (index >= points.length - 1 || closed || paused) return;
      index++; const point = points[index];
      marker.setAttribute('cx', point.x); marker.setAttribute('cy', point.y);
      done.setAttribute('points', points.slice(0, index + 1).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
      const progress = `${index} de ${points.length - 1} trechos percorridos (${Math.round(index / (points.length - 1) * 100)}%).`;
      area.querySelector('#counter').textContent = progress;
      svg.setAttribute('aria-label', `Trilha da flor até a borboleta. ${progress}`);
      if (index === points.length - 1) { assist.disabled = true; success('Você chegou à borboleta!'); later(finish, 500); }
    }
    svg.addEventListener('pointerdown', event => {
      if (closed || paused || index === points.length - 1) return;
      if (near(position(event), points[index])) { drawing = true; svg.setPointerCapture(event.pointerId); }
      else onFeedback(index === 0 ? 'Comece no marcador circular sobre a flor. Para continuar sem deslizar, use “Avançar pelo botão”.' : 'Retome no marcador circular, no fim do trecho preenchido, ou use o botão para avançar.', false);
    });
    svg.addEventListener('pointermove', event => {
      if (!drawing || closed || paused) return;
      const p = position(event);
      const previous = index;
      while (index < points.length - 1 && near(p, points[index + 1])) advance();
      if (index === previous && !near(p, points[index]) && !near(p, points[Math.min(index + 1, points.length - 1)])) {
        drawing = false; misses++; if (misses % 2 === 1) error('Você saiu da trilha. Retome no marcador circular, no fim do trecho preenchido, ou use o botão para avançar.');
      }
    });
    svg.addEventListener('pointerup', () => { drawing = false; });
    svg.addEventListener('pointercancel', () => { drawing = false; });
    let assisted = false;
    assist.addEventListener('click', () => {
      if (closed || paused) return;
      if (!assisted) {
        assisted = true; assist.textContent = 'Avançar dois trechos';
        onFeedback('Use este botão para avançar dois trechos por vez. Também funciona com Enter ou Espaço.', true);
      } else {
        for (let step = 0; step < 2; step++) advance();
      }
    });
  }

  function sequenceGame() {
    const colors = [{ name: 'Rosa', shape: 'Círculo', icon: '●', cls: 'pink' }, { name: 'Azul', shape: 'Losango', icon: '◆', cls: 'blue' }, { name: 'Amarelo', shape: 'Triângulo', icon: '▲', cls: 'yellow' }, { name: 'Verde', shape: 'Estrela', icon: '★', cls: 'green' }];
    const length = count <= -1 ? 3 : count >= 1 ? 5 : 4;
    const sequence = Array.from({ length }, () => Math.floor(Math.random() * 4));
    let position = 0, showing = true, completed = false, manual = comfortablePace, sequenceTimers = [];
    area.innerHTML = `<p class="game-tip" id="seqTip">Memorize a ordem das cores e formas. Depois repita a sequência.</p>
      <div class="sequence-preview" id="sequencePreview" aria-labelledby="sequencePreviewTitle"><h3 id="sequencePreviewTitle">Sequência para memorizar</h3>
      <ol>${sequence.map(item => `<li>${colors[item].name}, ${colors[item].shape.toLowerCase()}</li>`).join('')}</ol></div>
      <div class="sequence-grid" id="sequenceGrid" role="group" aria-label="Cores e formas para repetir a sequência" aria-describedby="seqTip"></div>
      <p class="game-counter" id="counter">Preparando a sequência...</p>
      <div class="game-controls"><button type="button" class="secondary-button" id="sequencePace"${manual ? ' hidden' : ''}>Ver no meu ritmo</button>
      <button type="button" class="primary-button" id="sequenceStart" hidden>Estou pronto para repetir</button>
      <button type="button" class="secondary-button" id="repeatSequence">Ver sequência novamente</button></div>`;
    const grid = area.querySelector('#sequenceGrid');
    const repeat = area.querySelector('#repeatSequence'), preview = area.querySelector('#sequencePreview');
    const start = area.querySelector('#sequenceStart'), pace = area.querySelector('#sequencePace');
    const pads = colors.map((color, i) => {
      const pad = document.createElement('button'); pad.type = 'button'; pad.className = `sequence-pad ${color.cls}`;
      pad.innerHTML = `<span aria-hidden="true">${color.icon}</span><strong>${color.name}<small>${color.shape}</small></strong>`;
      pad.setAttribute('aria-label', `${color.name}, ${color.shape.toLowerCase()}`);
      pad.addEventListener('click', () => press(i)); grid.appendChild(pad); return pad;
    });
    function cancelPresentation() { sequenceTimers.forEach(cancel); sequenceTimers = []; }
    function beginRepeating() {
      if (closed || paused || completed || !showing) return;
      const moveFocus = document.activeElement === start;
      cancelPresentation(); showing = false; repeat.disabled = false; preview.hidden = true; start.hidden = true;
      pads.forEach(pad => { pad.disabled = false; pad.classList.remove('lit'); });
      area.querySelector('#counter').textContent = `Sua vez: 0 de ${length} passos.`;
      area.querySelector('#seqTip').textContent = 'Escolha as cores e formas na mesma ordem. Use toque ou teclado. Você pode rever a sequência.';
      if (moveFocus) pads[0].focus();
    }
    function showSequence() {
      if (closed || paused || completed) return;
      cancelPresentation();
      showing = true; position = 0;
      repeat.disabled = true; preview.hidden = false; start.hidden = !manual;
      area.querySelector('#seqTip').textContent = manual ? 'Leia a lista na ordem, com calma. Quando terminar, escolha “Estou pronto para repetir”.' : 'Observe a lista e as formas. Para ter mais tempo, escolha “Ver no meu ritmo”.';
      area.querySelector('#counter').textContent = manual ? `${length} passos para memorizar. Comece quando estiver pronto.` : `${length} passos para memorizar. Observe a sequência.`;
      pads.forEach(pad => { pad.disabled = true; pad.classList.remove('lit'); });
      if (manual) return;
      const beat = count <= -1 ? 1200 : 950;
      sequence.forEach((item, i) => {
        sequenceTimers.push(later(() => { if (!reducedMotion) pads[item].classList.add('lit'); playSound(true); }, 650 + i * beat));
        sequenceTimers.push(later(() => pads[item].classList.remove('lit'), 650 + i * beat + beat * .62));
      });
      sequenceTimers.push(later(beginRepeating, 650 + length * beat));
    }
    function press(i) {
      if (closed || paused || showing || completed) return;
      if (!reducedMotion) { pads[i].classList.add('lit'); later(() => pads[i].classList.remove('lit'), 240); }
      if (sequence[position] !== i) {
        showing = true; repeat.disabled = true; pads.forEach(pad => { pad.disabled = true; });
        error('A ordem foi diferente. Reveja as cores e formas, depois tente novamente desde o primeiro passo.');
        sequenceTimers.push(later(showSequence, 700)); return;
      }
      position++; playSound(true);
      area.querySelector('#counter').textContent = `Sua vez: ${position} de ${length} passos. Último: ${colors[i].name}, ${colors[i].shape.toLowerCase()}.`;
      if (position === length) { completed = true; repeat.disabled = true; pace.disabled = true; pads.forEach(pad => { pad.disabled = true; }); success('Sequência completa!'); later(finish, 500); }
    }
    start.addEventListener('click', beginRepeating);
    pace.addEventListener('click', () => {
      if (closed || paused || completed) return;
      manual = true; pace.hidden = true; showSequence(); start.focus();
    });
    repeat.addEventListener('click', () => { if (!showing && !closed && !completed) showSequence(); });
    showSequence();
  }

  function differencesGame() {
    const base = [{ icon: '🌞', name: 'Sol' }, { icon: '☁️', name: 'Nuvem' }, { icon: '🌳', name: 'Árvore' }, { icon: '🌷', name: 'Tulipa' }, { icon: '🦋', name: 'Borboleta' }, { icon: '🍄', name: 'Cogumelo' }, { icon: '🐝', name: 'Abelha' }, { icon: '🌼', name: 'Margarida' }, { icon: '🌈', name: 'Arco-íris' }];
    const changed = { 1: { icon: '🌧️', name: 'Chuva' }, 3: { icon: '🌻', name: 'Girassol' }, 4: { icon: '🐞', name: 'Joaninha' }, 5: { icon: '🪨', name: 'Pedra' } };
    const targetCount = count <= -1 ? 2 : count >= 1 ? 4 : 3;
    const targets = [3, 4, 5, 1].slice(0, targetCount);
    const found = new Set();
    area.innerHTML = `<p class="game-tip" id="differencesTip">Compare os objetos na mesma linha e coluna dos jardins A e B. No jardim B, escolha os objetos diferentes. Use toque ou teclado.</p>
      <div class="scene-pair"><div class="scene"><h3 id="sceneATitle">Jardim A</h3><div class="scene-grid" id="sceneA" role="group" aria-labelledby="sceneATitle"></div></div>
      <div class="scene"><h3 id="sceneBTitle">Jardim B</h3><div class="scene-grid" id="sceneB" role="group" aria-labelledby="sceneBTitle" aria-describedby="differencesTip"></div></div></div>
      <p class="game-counter" id="counter">0 de ${targetCount} diferenças encontradas</p>`;
    const left = area.querySelector('#sceneA'), right = area.querySelector('#sceneB');
    base.forEach((item, i) => {
      const location = `linha ${Math.floor(i / 3) + 1}, coluna ${i % 3 + 1}`;
      const other = targets.includes(i) ? changed[i] : item;
      const a = document.createElement('span'); a.className = 'scene-item';
      a.innerHTML = `<span class="scene-symbol" aria-hidden="true">${item.icon}</span><small class="scene-name" aria-hidden="true">${item.name}</small>`;
      a.setAttribute('role', 'img'); a.setAttribute('aria-label', `Jardim A, ${location}: ${item.name}.`); left.appendChild(a);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'scene-item';
      b.innerHTML = `<span class="scene-symbol" aria-hidden="true">${other.icon}</span><small class="scene-name" aria-hidden="true">${other.name}</small>`;
      b.setAttribute('aria-label', `Jardim B, ${location}: ${other.name}. Selecionar se for diferente.`);
      b.addEventListener('click', () => {
        if (closed || paused || found.size === targetCount || found.has(i)) return;
        if (!targets.includes(i)) { error(`${item.name} aparece nos dois jardins na ${location}. Compare outro objeto na mesma posição.`); return; }
        found.add(i); a.classList.add('found'); b.classList.add('found'); b.disabled = true;
        a.setAttribute('aria-label', `Jardim A, ${location}: ${item.name}. Diferença encontrada.`);
        b.setAttribute('aria-label', `Jardim B, ${location}: ${other.name}. Diferença encontrada.`);
        area.querySelector('#counter').textContent = `${found.size} de ${targetCount} diferenças encontradas`;
        if (found.size === targetCount) { success('Você encontrou todos os detalhes!'); later(finish, 600); }
        else success(`Diferença encontrada na ${location}: ${item.name} no jardim A e ${other.name} no jardim B.`);
      });
      right.appendChild(b);
    });
  }
}
