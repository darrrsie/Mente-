(() => {
  // src/state.js
  var LEVELS = [
    { id: "sort", number: 1, name: "Organize a Feira", short: "Arraste objetos", icon: "🍎", skill: "Coordenação", skills: ["coordination", "visual"], color: "coral", intro: "Hoje vamos treinar sua coordenação!", steps: ["Escolha uma fruta.", "Leve até a cesta igual.", "Você também pode tocar na fruta e na cesta."], objective: "Coloque cada fruta na cesta correta." },
    { id: "pairs", number: 2, name: "Pares do Jardim", short: "Encontre pares", icon: "🌼", skill: "Memória", skills: ["memory", "attention"], color: "yellow", intro: "Hoje vamos treinar sua memória!", steps: ["Observe as cartas.", "Toque em duas de cada vez.", "Encontre as figuras iguais."], objective: "Encontre todos os pares." },
    { id: "path", number: 3, name: "Trilha da Borboleta", short: "Siga uma linha", icon: "🦋", skill: "Coordenação", skills: ["coordination", "visual"], color: "blue", intro: "Hoje vamos treinar a precisão!", steps: ["Comece na flor.", "Siga o caminho com o dedo ou escolha avançar com toques.", "Chegue até a borboleta."], objective: "Siga a trilha do início ao fim." },
    { id: "sequence", number: 4, name: "Cores em Festa", short: "Memorize a sequência", icon: "🎨", skill: "Memória", skills: ["memory", "reasoning"], color: "purple", intro: "Hoje vamos treinar sua atenção!", steps: ["Leia ou observe a sequência de cores e formas.", "Depois, repita desde o primeiro símbolo.", "Selecione os botões na mesma ordem."], objective: "Repita a sequência de cores e formas." },
    { id: "differences", number: 5, name: "Dois Jardins", short: "Encontre diferenças", icon: "👀", skill: "Atenção", skills: ["attention", "visual"], color: "green", intro: "Hoje vamos observar os detalhes!", steps: ["Veja os dois jardins.", "Procure o que mudou.", "Toque no detalhe diferente."], objective: "Encontre as diferenças entre os jardins." },
    { id: "oddone", number: 6, name: "Intruso no Jardim", short: "Encontre o diferente", icon: "🔎", skill: "Atenção", skills: ["attention", "visual"], color: "coral", intro: "Hoje vamos procurar um detalhe que não combina!", steps: ["Observe todos os símbolos.", "Compare um por um.", "Toque no diferente em cada uma das três rodadas."], objective: "Encontre o símbolo diferente nas três rodadas." },
    { id: "counting", number: 7, name: "Contagem da Colheita", short: "Conte os objetos", icon: "🧺", skill: "Raciocínio", skills: ["reasoning", "attention"], color: "yellow", intro: "Hoje vamos contar com atenção!", steps: ["Observe os objetos espalhados.", "Conte apenas o símbolo indicado.", "Escolha a quantidade correta nas três rodadas."], objective: "Conte os objetos pedidos nas três rodadas." }
  ];
  var SKILLS = {
    memory: { name: "Memória", icon: "🧠", color: "#a77ce1" },
    coordination: { name: "Coordenação", icon: "🎯", color: "#ed8b70" },
    attention: { name: "Atenção", icon: "👁️", color: "#59b9aa" },
    reasoning: { name: "Raciocínio", icon: "🧩", color: "#e6ad47" },
    visual: { name: "Percepção visual", icon: "🌈", color: "#75a9df" }
  };
  var KEY = "mente-movimento-v1";
  var cleanName = (value) => typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, 24).trim() : "";
  var MAX_LEVEL = 999999999;
  var storage = null;
  var storageStatus = "available";
  try {
    storage = globalThis.localStorage;
    if (!storage) storageStatus = "unavailable";
  } catch {
    storageStatus = "unavailable";
  }
  var getStorageStatus = () => storageStatus;
  var day = (offset) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  var blank = () => ({
    name: "",
    onboardingComplete: false,
    xp: 0,
    minutes: 0,
    plays: 0,
    streak: 0,
    lastDay: "",
    unlocked: 1,
    stageRecords: {},
    settings: { largeText: false, sound: true, highContrast: false, reducedMotion: false, comfortablePace: true, mapList: false, hudSize: "normal" },
    levels: Object.fromEntries(LEVELS.map((level) => [level.id, { stars: 0, bestScore: 0, plays: 0, support: 0 }])),
    history: [],
    skills: Object.fromEntries(Object.keys(SKILLS).map((id) => [id, { total: 0, count: 0 }]))
  });
  var bounded = (value, fallback = 0, max = 1e6) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : fallback;
  function load() {
    const fresh = blank();
    try {
      const saved = JSON.parse(storage?.getItem(KEY) || "null");
      if (!saved || typeof saved !== "object") return fresh;
      fresh.name = cleanName(saved.name);
      fresh.onboardingComplete = Boolean(fresh.name) && saved.onboardingComplete !== false;
      for (const key of ["xp", "minutes", "plays", "streak"]) fresh[key] = bounded(saved[key], 0, MAX_LEVEL * 100);
      fresh.lastDay = /^\d{4}-\d{2}-\d{2}$/.test(saved.lastDay || "") ? saved.lastDay : "";
      fresh.unlocked = Math.max(1, Math.min(MAX_LEVEL, bounded(saved.unlocked, 1, MAX_LEVEL)));
      for (const key of Object.keys(fresh.settings)) {
        if (typeof saved.settings?.[key] === "boolean") fresh.settings[key] = saved.settings[key];
      }
      if (["compact", "normal", "large"].includes(saved.settings?.hudSize)) fresh.settings.hudSize = saved.settings.hudSize;
      for (const level of LEVELS) {
        const item = saved.levels?.[level.id];
        if (!item) continue;
        fresh.levels[level.id] = {
          stars: Math.min(3, bounded(item.stars)),
          bestScore: Math.min(100, bounded(item.bestScore)),
          plays: bounded(item.plays, 0, MAX_LEVEL),
          support: Math.max(-2, Math.min(2, Number.isInteger(item.support) ? item.support : 0))
        };
      }
      if (saved.stageRecords && typeof saved.stageRecords === "object") {
        for (const [number, item] of Object.entries(saved.stageRecords)) {
          const stage = Number(number);
          if (Number.isSafeInteger(stage) && stage > 0 && stage <= MAX_LEVEL && item && typeof item === "object") {
            fresh.stageRecords[stage] = { stars: Math.min(3, bounded(item.stars)), bestScore: Math.min(100, bounded(item.bestScore)) };
          }
        }
      }
      for (let stage = 1; stage <= Math.min(5, fresh.unlocked); stage++) {
        const template = LEVELS[(stage - 1) % LEVELS.length], record = fresh.levels[template.id];
        if (record.plays && !fresh.stageRecords[stage]) {
          fresh.stageRecords[stage] = { stars: record.stars, bestScore: record.bestScore };
        }
      }
      if (fresh.stageRecords[5]?.stars) fresh.unlocked = Math.max(fresh.unlocked, 6);
      fresh.history = Array.isArray(saved.history) ? saved.history.filter(
        (item) => LEVELS.some((level) => level.id === item?.id) && /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100
      ).slice(-200).map(({ id, date, score }) => ({ id, date, score })) : [];
      for (const id of Object.keys(SKILLS)) {
        fresh.skills[id].total = bounded(saved.skills?.[id]?.total, 0, MAX_LEVEL * 100);
        fresh.skills[id].count = bounded(saved.skills?.[id]?.count, 0, MAX_LEVEL);
      }
    } catch (error) {
      storageStatus = error instanceof SyntaxError ? "invalid" : "unavailable";
    }
    return fresh;
  }
  var state = load();
  var save = () => {
    try {
      if (!storage) throw new Error("Storage unavailable");
      storage.setItem(KEY, JSON.stringify(state));
      storageStatus = "available";
    } catch {
      storageStatus = "unavailable";
    }
  };
  var getState = () => state;
  function getLevel(id) {
    const template = LEVELS.find((level) => level.id === id);
    const number = template ? template.number : Number(id);
    if (!Number.isSafeInteger(number) || number < 1 || number > MAX_LEVEL) return void 0;
    const base = LEVELS[(number - 1) % LEVELS.length];
    const cycle = Math.floor((number - 1) / LEVELS.length) + 1;
    return { ...base, id: number, gameId: base.id, number, cycle, difficulty: cycle - 1 };
  }
  var canPlay = (id) => {
    const level = getLevel(id);
    return Boolean(level && level.number <= state.unlocked);
  };
  var nextLevel = () => getLevel(state.unlocked) || getLevel(MAX_LEVEL);
  var getStreak = () => state.lastDay === day(0) || state.lastDay === day(-1) ? state.streak : 0;
  var getTodayPlays = () => state.history.filter((item) => item.date === day(0)).length;
  var getPracticedDays = () => new Set(state.history.map((item) => item.date)).size;
  var getWeeklyDays = () => Array.from({ length: 7 }, (_, i) => {
    const offset = i - 6;
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + offset);
    const date = day(offset);
    return { date, label: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()], count: state.history.filter((item) => item.date === date).length };
  });
  var getSkillScore = (id) => state.skills[id]?.count ? Math.round(state.skills[id].total / state.skills[id].count) : 0;
  function finishLevel(id, { mistakes = 0, elapsedSeconds = 0 } = {}) {
    const level = getLevel(id);
    if (!level || !canPlay(level.number)) return null;
    const record = state.levels[level.gameId || level.id];
    const stageRecord = state.stageRecords[level.number];
    const first = !stageRecord;
    const errors = Number.isFinite(mistakes) ? Math.min(100, Math.max(0, Math.floor(mistakes))) : 100;
    const stars2 = errors === 0 ? 3 : errors <= 2 ? 2 : 1;
    const score = Math.max(40, 100 - errors * 12), xp = 15 + stars2 * 10 + (first ? 10 : 0);
    record.stars = Math.max(record.stars, stars2);
    record.bestScore = Math.max(record.bestScore, score);
    record.plays++;
    record.support = Math.max(-2, Math.min(2, record.support + (errors >= 3 ? -1 : errors === 0 ? 1 : 0)));
    state.stageRecords[level.number] = { stars: Math.max(stageRecord?.stars || 0, stars2), bestScore: Math.max(stageRecord?.bestScore || 0, score) };
    const seconds = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.min(86400, elapsedSeconds)) : 0;
    state.xp += xp;
    state.plays++;
    state.minutes += Math.max(1, Math.round(seconds / 60));
    const previousUnlocked = state.unlocked;
    state.unlocked = Math.max(state.unlocked, Math.min(MAX_LEVEL, level.number + 1));
    const today = day(0);
    if (state.lastDay !== today) {
      state.streak = state.lastDay === day(-1) ? state.streak + 1 : 1;
      state.lastDay = today;
    }
    state.history.push({ id: level.gameId || level.id, date: today, score });
    state.history = state.history.slice(-200);
    for (const skill of level.skills) {
      state.skills[skill].total += score;
      state.skills[skill].count++;
    }
    save();
    return { stars: stars2, score, xp, first, unlocked: level.number >= previousUnlocked && level.number < MAX_LEVEL ? level.number + 1 : null };
  }
  function updateName(value) {
    const name = cleanName(value);
    if (!name) return false;
    state.name = name;
    save();
    return true;
  }
  function completeOnboarding({ name, hudSize, comfortablePace, sound: sound2, largeText } = {}) {
    const normalizedName = cleanName(name);
    if (!normalizedName) return false;
    state.name = normalizedName;
    if (["compact", "normal", "large"].includes(hudSize)) state.settings.hudSize = hudSize;
    for (const [key, value] of Object.entries({ comfortablePace, sound: sound2, largeText })) {
      if (typeof value === "boolean") state.settings[key] = value;
    }
    state.onboardingComplete = true;
    save();
    return true;
  }
  function updateSetting(key, value) {
    if (!Object.prototype.hasOwnProperty.call(state.settings, key)) return false;
    if (key === "hudSize" ? !["compact", "normal", "large"].includes(value) : typeof value !== "boolean") return false;
    state.settings[key] = value;
    save();
    return true;
  }
  function resetProgress() {
    const { name, settings, onboardingComplete } = state;
    state = blank();
    state.name = name;
    state.settings = { ...settings };
    state.onboardingComplete = onboardingComplete;
    save();
  }

  // src/games.js
  var shuffle = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  var fruits = [{ icon: "🍎", name: "Maçã" }, { icon: "🍌", name: "Banana" }, { icon: "🍊", name: "Laranja" }, { icon: "🍓", name: "Morango" }, { icon: "🍐", name: "Pera" }, { icon: "🍇", name: "Uva" }, { icon: "🍑", name: "Pêssego" }, { icon: "🍉", name: "Melancia" }, { icon: "🍍", name: "Abacaxi" }, { icon: "🥝", name: "Kiwi" }];
  function startGame({ id, mount, support = 0, difficulty = 0, settings = {}, onComplete, onFeedback = () => {
  }, playSound = () => {
  } }) {
    let closed = false, mistakes = 0, paused = false, pausedAt = 0, pausedMs = 0;
    const started = performance.now(), timers = /* @__PURE__ */ new Set();
    const schedule = (timer) => {
      timer.started = performance.now();
      timer.id = setTimeout(() => {
        timers.delete(timer);
        if (!closed) timer.fn();
      }, timer.remaining);
    };
    const later = (fn, ms) => {
      const timer = { fn, remaining: ms, id: null, started: 0 };
      timers.add(timer);
      if (!paused) schedule(timer);
      return timer;
    };
    const cancel = (timer) => {
      if (timer) {
        clearTimeout(timer.id);
        timers.delete(timer);
      }
    };
    let streak = 0, round = 1, changingRound = false, previousTarget = null, celebrationTimer;
    const totalRounds = ["oddone", "counting"].includes(id) ? 3 : 1;
    const error = (message) => {
      mistakes++;
      streak = 0;
      updateStreak();
      onFeedback(message, false);
      playSound(false);
    };
    const success = (message) => {
      streak++;
      updateStreak();
      onFeedback(message, true);
      playSound(true);
      if (!reducedMotion) {
        cancel(celebrationTimer);
        area.classList.remove("game-celebrate");
        void area.offsetWidth;
        area.classList.add("game-celebrate");
        celebrationTimer = later(() => area.classList.remove("game-celebrate"), 350);
      }
    };
    const finish = () => {
      if (closed) return;
      closed = true;
      onComplete({ mistakes, elapsedSeconds: Math.round((performance.now() - started - pausedMs) / 1e3) });
    };
    const count = Math.max(-2, Math.min(96, Math.floor(support + difficulty)));
    mount.innerHTML = '<div class="game-hud"><div class="game-hud-labels"><strong id="roundLabel"></strong><span id="gameStreak" role="status" aria-live="polite">Vamos lá!</span></div><progress id="gameProgress" max="1" value="0" aria-label="Progresso da partida"></progress></div><div class="game-area" id="gameArea"></div>';
    const area = mount.querySelector("#gameArea");
    const comfortablePace = Boolean(settings.comfortablePace);
    const reducedMotion = Boolean(settings.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    mount.classList.toggle("game-motion", !reducedMotion);
    mount.classList.remove("game-paused");
    function progress(value, max) {
      const bar = mount.querySelector("#gameProgress");
      bar.max = max;
      bar.value = value;
    }
    function updateStreak() {
      mount.querySelector("#gameStreak").textContent = streak > 1 ? `✦ ${streak} acertos seguidos!` : streak === 1 ? "✦ Boa jogada!" : "Vamos tentar de novo!";
    }
    function prepareRound() {
      mount.querySelector("#roundLabel").textContent = totalRounds > 1 ? `Rodada ${round} de ${totalRounds}` : "Cada acerto conta";
      const counter = area.querySelector("#counter");
      if (counter) {
        counter.setAttribute("role", "status");
        counter.setAttribute("aria-live", "polite");
        counter.setAttribute("aria-atomic", "true");
      }
      if (round > 1) {
        const tip = area.querySelector(".game-tip");
        tip.tabIndex = -1;
        tip.focus({ preventScroll: true });
      }
    }
    function finishRound() {
      if (changingRound || closed || paused) return;
      changingRound = true;
      progress(round, totalRounds);
      if (round === totalRounds) {
        later(finish, 550);
        return;
      }
      const next = document.createElement("button");
      next.type = "button";
      next.className = "primary-button next-round";
      next.textContent = "Próxima rodada →";
      const moveOn = () => {
        if (closed || paused || !changingRound) return;
        cancel(automaticNext);
        cancel(celebrationTimer);
        area.classList.remove("game-celebrate");
        round++;
        changingRound = false;
        if (id === "oddone") oddOneGame();
        else countingGame();
        prepareRound();
      };
      const automaticNext = comfortablePace ? null : later(moveOn, 1e3);
      next.addEventListener("click", moveOn);
      area.appendChild(next);
      if (comfortablePace) next.focus({ preventScroll: true });
    }
    if (id === "sort") sortGame();
    if (id === "pairs") pairsGame();
    if (id === "path") pathGame();
    if (id === "sequence") sequenceGame();
    if (id === "differences") differencesGame();
    if (id === "oddone") oddOneGame();
    if (id === "counting") countingGame();
    prepareRound();
    const cleanup2 = () => {
      closed = true;
      for (const timer of timers) clearTimeout(timer.id);
      timers.clear();
      mount.classList.remove("game-motion", "game-paused");
    };
    cleanup2.setPaused = (value) => {
      if (closed || paused === value) return;
      paused = value;
      mount.classList.toggle("game-paused", paused);
      if (paused) {
        pausedAt = performance.now();
        for (const timer of timers) {
          clearTimeout(timer.id);
          timer.remaining = Math.max(0, timer.remaining - (pausedAt - timer.started));
        }
      } else {
        pausedMs += performance.now() - pausedAt;
        for (const timer of timers) schedule(timer);
      }
    };
    return cleanup2;
    function sortGame() {
      const itemCount = Math.max(3, Math.min(fruits.length, 4 + count));
      const items = shuffle(fruits).slice(0, itemCount);
      progress(0, items.length);
      let selected = null, placed = 0;
      area.innerHTML = `<p class="game-tip">Escolha uma fruta e depois sua cesta. Use toque ou teclado. Se preferir, arraste a fruta.</p>
      <div class="sort-items" id="sortItems"></div><div class="sort-baskets" id="sortBaskets"></div>
      <p class="game-counter" id="counter">0 de ${items.length} objetos organizados</p>`;
      const tray = area.querySelector("#sortItems"), baskets = area.querySelector("#sortBaskets");
      function pick(button) {
        if (closed || paused || button.disabled || selected === button) return;
        tray.querySelectorAll(".fruit-tile").forEach((el) => {
          el.classList.remove("selected");
          el.setAttribute("aria-pressed", "false");
        });
        selected = button;
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
        onFeedback(`Agora escolha a cesta de ${button.dataset.name}.`, true);
      }
      function place(name) {
        if (closed || paused) return;
        if (!selected) {
          onFeedback("Escolha uma fruta antes de selecionar a cesta.", false);
          return;
        }
        if (selected.dataset.name !== name) {
          error(`Essa é a cesta de ${name}. Escolha a cesta de ${selected.dataset.name}, que é a fruta selecionada.`);
          return;
        }
        const basket = [...baskets.children].find((el) => el.dataset.name === name);
        basket.classList.add("filled");
        basket.querySelector(".basket-result").textContent = selected.dataset.icon;
        basket.setAttribute("aria-label", `Cesta de ${name}, fruta organizada`);
        const moveFocus = document.activeElement === selected || document.activeElement === basket;
        selected.disabled = true;
        selected.classList.remove("selected");
        selected.setAttribute("aria-pressed", "false");
        selected.setAttribute("aria-label", `${name}, fruta organizada`);
        basket.disabled = true;
        selected = null;
        placed++;
        progress(placed, items.length);
        area.querySelector("#counter").textContent = `${placed} de ${items.length} objetos organizados`;
        if (placed === items.length) {
          success("Todas as frutas estão no lugar!");
          later(finish, 550);
        } else success(`${name} está na cesta. Escolha a próxima fruta.`);
        if (moveFocus) tray.querySelector(".fruit-tile:not(:disabled)")?.focus({ preventScroll: true });
      }
      items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fruit-tile";
        button.dataset.name = item.name;
        button.dataset.icon = item.icon;
        button.innerHTML = `<span aria-hidden="true">${item.icon}</span><strong>${item.name}</strong>`;
        button.setAttribute("aria-label", `Selecionar ${item.name}`);
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => pick(button));
        let start = null;
        button.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 || closed || paused || button.disabled) return;
          pick(button);
          start = { x: event.clientX, y: event.clientY };
          button.setPointerCapture(event.pointerId);
        });
        button.addEventListener("pointermove", (event) => {
          if (!start || button.disabled || closed || paused) return;
          button.style.transform = `translate(${event.clientX - start.x}px,${event.clientY - start.y}px) scale(1.08)`;
          button.style.zIndex = "3";
        });
        button.addEventListener("pointerup", (event) => {
          if (!start) return;
          button.style.transform = "";
          button.style.zIndex = "";
          start = null;
          const target = [...baskets.children].find((basket) => {
            const rect = basket.getBoundingClientRect();
            return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
          });
          if (target) place(target.dataset.name);
        });
        button.addEventListener("pointercancel", () => {
          start = null;
          button.style.transform = "";
          button.style.zIndex = "";
        });
        tray.appendChild(button);
      });
      shuffle(items).forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "basket";
        button.dataset.name = item.name;
        button.innerHTML = `<span class="basket-result" aria-hidden="true">🧺</span><span>${item.icon} ${item.name}</span>`;
        button.setAttribute("aria-label", `Cesta de ${item.name}`);
        button.addEventListener("click", () => place(item.name));
        baskets.appendChild(button);
      });
    }
    function pairsGame() {
      const symbols = [{ icon: "🌼", name: "Margarida" }, { icon: "🦋", name: "Borboleta" }, { icon: "🍓", name: "Morango" }, { icon: "🌻", name: "Girassol" }, { icon: "🐝", name: "Abelha" }, { icon: "🐞", name: "Joaninha" }, { icon: "🍄", name: "Cogumelo" }, { icon: "🌈", name: "Arco-íris" }, { icon: "🐢", name: "Tartaruga" }, { icon: "🐸", name: "Sapo" }, { icon: "🌷", name: "Tulipa" }, { icon: "🐌", name: "Caracol" }, { icon: "🦔", name: "Ouriço" }, { icon: "🍒", name: "Cereja" }, { icon: "🌺", name: "Hibisco" }, { icon: "🐠", name: "Peixe" }, { icon: "🪷", name: "Lótus" }, { icon: "🦜", name: "Arara" }, { icon: "🍋", name: "Limão" }, { icon: "🐿️", name: "Esquilo" }];
      const pairCount = Math.max(2, Math.min(8, 3 + count));
      const selectedSymbols = shuffle(symbols).slice(0, pairCount);
      const deck = shuffle([...selectedSymbols, ...selectedSymbols]);
      progress(0, pairCount);
      let first = null, locked = true, matched = 0, previewing = true, manual = comfortablePace, previewTimer = null, mismatchTimer = null, unmatched = [];
      area.innerHTML = `<p class="game-tip" id="pairTip">Observe as figuras e a posição de cada carta.</p>
      <div class="pairs-grid" id="pairsGrid" role="group" aria-label="Cartas do jogo da memória" aria-describedby="pairTip"></div>
      <div class="game-controls"><button type="button" class="secondary-button" id="pairPace"${manual ? " hidden" : ""}>Observar no meu ritmo</button>
      <button type="button" class="primary-button" id="pairStart"${manual ? "" : " hidden"}>Estou pronto para jogar</button>
      <button type="button" class="secondary-button" id="pairContinue" hidden>Virar cartas e continuar</button></div>
      <p class="game-counter" id="counter">0 de ${pairCount} pares encontrados</p>`;
      const grid = area.querySelector("#pairsGrid");
      const start = area.querySelector("#pairStart"), pace = area.querySelector("#pairPace"), next = area.querySelector("#pairContinue");
      const cards = deck.map((symbol, i) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "pair-card revealed";
        card.textContent = symbol.icon;
        card.setAttribute("aria-label", `Carta ${i + 1}, ${symbol.name}, revelada`);
        card.setAttribute("aria-disabled", "true");
        card.addEventListener("click", () => flip(i));
        grid.appendChild(card);
        return card;
      });
      function updateAvailability() {
        cards.forEach((card, i) => {
          if (locked || card.disabled || first === i) card.setAttribute("aria-disabled", "true");
          else card.removeAttribute("aria-disabled");
        });
      }
      function hideCard(i) {
        cards[i].textContent = "✿";
        cards[i].classList.remove("revealed");
        cards[i].setAttribute("aria-label", `Carta ${i + 1}, fechada. Ative para revelar a figura.`);
        cards[i].removeAttribute("aria-disabled");
      }
      function begin() {
        if (closed || paused || !previewing) return;
        const moveFocus = document.activeElement === start;
        cancel(previewTimer);
        previewing = false;
        start.hidden = true;
        locked = false;
        cards.forEach((_, i) => hideCard(i));
        updateAvailability();
        area.querySelector("#pairTip").textContent = "Escolha duas cartas para encontrar figuras iguais. Use toque ou teclado.";
        if (moveFocus) cards[0].focus();
      }
      function hideMismatch() {
        if (closed || paused || !unmatched.length) return;
        const moveFocus = document.activeElement === next;
        const previous = unmatched[0];
        cancel(mismatchTimer);
        unmatched.forEach(hideCard);
        unmatched = [];
        next.hidden = true;
        locked = false;
        updateAvailability();
        if (moveFocus) cards[previous].focus();
      }
      start.addEventListener("click", begin);
      next.addEventListener("click", hideMismatch);
      pace.addEventListener("click", () => {
        if (closed || paused) return;
        manual = true;
        pace.hidden = true;
        if (previewing) {
          cancel(previewTimer);
          start.hidden = false;
          area.querySelector("#pairTip").textContent = "Leia ou observe as cartas com calma. Quando terminar, escolha “Estou pronto para jogar”.";
          start.focus();
        } else if (unmatched.length) {
          cancel(mismatchTimer);
          next.hidden = false;
          next.focus();
        } else onFeedback("Cartas diferentes ficarão visíveis até você escolher continuar.", true);
      });
      if (manual) area.querySelector("#pairTip").textContent = "Leia ou observe as cartas com calma. Quando terminar, escolha “Estou pronto para jogar”.";
      else previewTimer = later(begin, count <= -1 ? 4e3 : 2700);
      function flip(i) {
        if (closed || paused || locked || cards[i].disabled || first === i) return;
        cards[i].textContent = deck[i].icon;
        cards[i].classList.add("revealed");
        cards[i].setAttribute("aria-label", `Carta ${i + 1}, ${deck[i].name}, revelada`);
        if (first === null) {
          first = i;
          updateAvailability();
          onFeedback(`Carta ${i + 1}: ${deck[i].name}. Escolha outra carta.`, true);
          return;
        }
        const previous = first;
        first = null;
        locked = true;
        let nextFocus = null;
        if (deck[previous] === deck[i]) {
          const moveFocus = document.activeElement === cards[previous] || document.activeElement === cards[i];
          cards[previous].disabled = cards[i].disabled = true;
          cards[previous].classList.add("matched");
          cards[i].classList.add("matched");
          for (const index of [previous, i]) cards[index].setAttribute("aria-label", `Carta ${index + 1}, ${deck[index].name}, par encontrado`);
          matched++;
          area.querySelector("#counter").textContent = `${matched} de ${pairCount} pares encontrados`;
          progress(matched, pairCount);
          success(`Você encontrou o par de ${deck[i].name}!`);
          if (matched === pairCount) later(finish, 600);
          else locked = false;
          if (moveFocus && matched < pairCount) nextFocus = cards.find((card) => !card.disabled);
        } else {
          unmatched = [previous, i];
          error(`Carta ${previous + 1}: ${deck[previous].name}. Carta ${i + 1}: ${deck[i].name}. As figuras são diferentes. ${manual ? "Observe com calma e escolha “Virar cartas e continuar”." : "Tente outro par ou escolha “Observar no meu ritmo”."}`);
          if (manual) next.hidden = false;
          else mismatchTimer = later(hideMismatch, count <= -1 ? 1700 : 1100);
        }
        updateAvailability();
        nextFocus?.focus({ preventScroll: true });
      }
    }
    function pathGame() {
      const segmentCount = Math.min(70, 28 + Math.max(0, count) * 3);
      const amplitude = Math.min(56, 28 + Math.max(0, count) * 2);
      const phase = Math.random() * Math.PI * 2, curves = 2 + Math.floor(Math.random() * 3);
      const points = Array.from({ length: segmentCount }, (_, i) => {
        const progress2 = i / (segmentCount - 1);
        return { x: 35 + progress2 * 290, y: 375 - progress2 * 315 + Math.sin(progress2 * Math.PI * curves + phase) * amplitude * Math.sin(Math.PI * progress2) };
      });
      const coords = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const threshold = Math.max(14, 36 - Math.max(0, count) * 1.7);
      let index = 0, drawing = false, misses = 0;
      progress(0, points.length - 1);
      area.innerHTML = `<p class="game-tip" id="pathTip">Siga da flor até a borboleta. Você pode deslizar na trilha ou usar o botão abaixo com toque, Enter ou Espaço.</p>
      <div class="path-wrap"><svg id="pathSvg" viewBox="0 0 360 430" role="img" aria-label="Trilha da flor até a borboleta">
      <polyline class="path-base" points="${coords}"/><polyline id="pathDone" class="path-done" points="${points[0].x},${points[0].y}"/>
      <text x="12" y="409" class="path-emoji">🌼</text><text x="307" y="62" class="path-emoji">🦋</text>
      <circle id="pathMarker" class="path-marker" cx="${points[0].x}" cy="${points[0].y}" r="15"/></svg></div>
      <p class="game-counter" id="counter">Início da trilha: flor. 0 de ${points.length - 1} trechos percorridos.</p>
      <button type="button" class="secondary-button path-assist" id="pathAssist" aria-describedby="pathTip">Avançar pelo botão</button>`;
      const svg = area.querySelector("#pathSvg"), marker = area.querySelector("#pathMarker"), done = area.querySelector("#pathDone");
      const assist = area.querySelector("#pathAssist");
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
        index++;
        const point = points[index];
        updatePathProgress();
        marker.setAttribute("cx", point.x);
        marker.setAttribute("cy", point.y);
        done.setAttribute("points", points.slice(0, index + 1).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
        const progress2 = `${index} de ${points.length - 1} trechos percorridos (${Math.round(index / (points.length - 1) * 100)}%).`;
        area.querySelector("#counter").textContent = progress2;
        svg.setAttribute("aria-label", `Trilha da flor até a borboleta. ${progress2}`);
        if (index === points.length - 1) {
          assist.disabled = true;
          success("Você chegou à borboleta!");
          later(finish, 500);
        } else if (index === Math.ceil((points.length - 1) / 3) || index === Math.ceil((points.length - 1) * 2 / 3)) success("Mais um trecho conquistado! Continue até a borboleta.");
      }
      function updatePathProgress() {
        progress(index, points.length - 1);
      }
      svg.addEventListener("pointerdown", (event) => {
        if (closed || paused || index === points.length - 1) return;
        if (near(position(event), points[index])) {
          drawing = true;
          svg.setPointerCapture(event.pointerId);
        } else onFeedback(index === 0 ? "Comece no marcador circular sobre a flor. Para continuar sem deslizar, use “Avançar pelo botão”." : "Retome no marcador circular, no fim do trecho preenchido, ou use o botão para avançar.", false);
      });
      svg.addEventListener("pointermove", (event) => {
        if (!drawing || closed || paused) return;
        const p = position(event);
        const previous = index;
        while (index < points.length - 1 && near(p, points[index + 1])) advance();
        if (index === previous && !near(p, points[index]) && !near(p, points[Math.min(index + 1, points.length - 1)])) {
          drawing = false;
          misses++;
          if (misses % 2 === 1) error("Você saiu da trilha. Retome no marcador circular, no fim do trecho preenchido, ou use o botão para avançar.");
        }
      });
      svg.addEventListener("pointerup", () => {
        drawing = false;
      });
      svg.addEventListener("pointercancel", () => {
        drawing = false;
      });
      assist.addEventListener("click", () => {
        if (closed || paused) return;
        assist.textContent = "Avançar dois trechos";
        for (let step = 0; step < 2; step++) advance();
      });
    }
    function sequenceGame() {
      const colors = [{ name: "Rosa", shape: "Círculo", icon: "●", cls: "pink" }, { name: "Azul", shape: "Losango", icon: "◆", cls: "blue" }, { name: "Amarelo", shape: "Triângulo", icon: "▲", cls: "yellow" }, { name: "Verde", shape: "Estrela", icon: "★", cls: "green" }];
      const length = Math.max(3, Math.min(10, 4 + count));
      progress(0, length);
      const sequence = Array.from({ length }, () => Math.floor(Math.random() * 4));
      let position = 0, showing = true, completed = false, manual = comfortablePace, sequenceTimers = [];
      area.innerHTML = `<p class="game-tip" id="seqTip">Memorize a ordem das cores e formas. Depois repita a sequência.</p>
      <div class="sequence-preview" id="sequencePreview" aria-labelledby="sequencePreviewTitle"><h3 id="sequencePreviewTitle">Sequência para memorizar</h3>
      <ol>${sequence.map((item) => `<li>${colors[item].name}, ${colors[item].shape.toLowerCase()}</li>`).join("")}</ol></div>
      <div class="sequence-grid" id="sequenceGrid" role="group" aria-label="Cores e formas para repetir a sequência" aria-describedby="seqTip"></div>
      <p class="game-counter" id="counter">Preparando a sequência...</p>
      <div class="game-controls"><button type="button" class="secondary-button" id="sequencePace"${manual ? " hidden" : ""}>Ver no meu ritmo</button>
      <button type="button" class="primary-button" id="sequenceStart" hidden>Estou pronto para repetir</button>
      <button type="button" class="secondary-button" id="repeatSequence">Ver sequência novamente</button></div>`;
      const grid = area.querySelector("#sequenceGrid");
      const repeat = area.querySelector("#repeatSequence"), preview = area.querySelector("#sequencePreview");
      const start = area.querySelector("#sequenceStart"), pace = area.querySelector("#sequencePace");
      const pads = colors.map((color, i) => {
        const pad = document.createElement("button");
        pad.type = "button";
        pad.className = `sequence-pad ${color.cls}`;
        pad.innerHTML = `<span aria-hidden="true">${color.icon}</span><strong>${color.name}<small>${color.shape}</small></strong>`;
        pad.setAttribute("aria-label", `${color.name}, ${color.shape.toLowerCase()}`);
        pad.addEventListener("click", () => press(i));
        grid.appendChild(pad);
        return pad;
      });
      function cancelPresentation() {
        sequenceTimers.forEach(cancel);
        sequenceTimers = [];
      }
      function beginRepeating() {
        if (closed || paused || completed || !showing) return;
        const moveFocus = document.activeElement === start;
        cancelPresentation();
        showing = false;
        repeat.disabled = false;
        preview.hidden = true;
        start.hidden = true;
        pads.forEach((pad) => {
          pad.disabled = false;
          pad.classList.remove("lit");
        });
        area.querySelector("#counter").textContent = `Sua vez: 0 de ${length} passos.`;
        area.querySelector("#seqTip").textContent = "Escolha as cores e formas na mesma ordem. Use toque ou teclado. Você pode rever a sequência.";
        if (moveFocus) pads[0].focus();
      }
      function showSequence() {
        if (closed || paused || completed) return;
        cancelPresentation();
        showing = true;
        position = 0;
        progress(0, length);
        repeat.disabled = true;
        preview.hidden = false;
        start.hidden = !manual;
        area.querySelector("#seqTip").textContent = manual ? "Leia a lista na ordem, com calma. Quando terminar, escolha “Estou pronto para repetir”." : "Observe a lista e as formas. Para ter mais tempo, escolha “Ver no meu ritmo”.";
        area.querySelector("#counter").textContent = manual ? `${length} passos para memorizar. Comece quando estiver pronto.` : `${length} passos para memorizar. Observe a sequência.`;
        pads.forEach((pad) => {
          pad.disabled = true;
          pad.classList.remove("lit");
        });
        if (manual) return;
        const beat = count <= -1 ? 1200 : 950;
        sequence.forEach((item, i) => {
          sequenceTimers.push(later(() => {
            if (!reducedMotion) pads[item].classList.add("lit");
            playSound(true);
          }, 650 + i * beat));
          sequenceTimers.push(later(() => pads[item].classList.remove("lit"), 650 + i * beat + beat * 0.62));
        });
        sequenceTimers.push(later(beginRepeating, 650 + length * beat));
      }
      function press(i) {
        if (closed || paused || showing || completed) return;
        if (!reducedMotion) {
          pads[i].classList.add("lit");
          later(() => pads[i].classList.remove("lit"), 240);
        }
        if (sequence[position] !== i) {
          showing = true;
          repeat.disabled = true;
          pads.forEach((pad) => {
            pad.disabled = true;
          });
          error("A ordem foi diferente. Reveja as cores e formas, depois tente novamente desde o primeiro passo.");
          sequenceTimers.push(later(showSequence, 700));
          return;
        }
        position++;
        playSound(true);
        progress(position, length);
        area.querySelector("#counter").textContent = `Sua vez: ${position} de ${length} passos. Último: ${colors[i].name}, ${colors[i].shape.toLowerCase()}.`;
        if (position === length) {
          completed = true;
          repeat.disabled = true;
          pace.disabled = true;
          pads.forEach((pad) => {
            pad.disabled = true;
          });
          success("Sequência completa!");
          later(finish, 500);
        }
      }
      start.addEventListener("click", beginRepeating);
      pace.addEventListener("click", () => {
        if (closed || paused || completed) return;
        manual = true;
        pace.hidden = true;
        showSequence();
        start.focus();
      });
      repeat.addEventListener("click", () => {
        if (!showing && !closed && !completed) showSequence();
      });
      showSequence();
    }
    function differencesGame() {
      const base = [{ icon: "🌞", name: "Sol" }, { icon: "☁️", name: "Nuvem" }, { icon: "🌳", name: "Árvore" }, { icon: "🌷", name: "Tulipa" }, { icon: "🦋", name: "Borboleta" }, { icon: "🍄", name: "Cogumelo" }, { icon: "🐝", name: "Abelha" }, { icon: "🌼", name: "Margarida" }, { icon: "🌈", name: "Arco-íris" }];
      const changed = {
        0: { icon: "❄️", name: "Floco de neve" },
        1: { icon: "🌧️", name: "Chuva" },
        2: { icon: "🌲", name: "Pinheiro" },
        3: { icon: "🌻", name: "Girassol" },
        4: { icon: "🐞", name: "Joaninha" },
        5: { icon: "🪨", name: "Pedra" },
        6: { icon: "🌙", name: "Lua" },
        7: { icon: "🪻", name: "Lavanda" },
        8: { icon: "🌤️", name: "Sol entre nuvens" }
      };
      const targetCount = Math.max(2, Math.min(8, 3 + count));
      const targets = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, targetCount);
      const found = /* @__PURE__ */ new Set();
      progress(0, targetCount);
      area.innerHTML = `<p class="game-tip" id="differencesTip">Compare os objetos na mesma linha e coluna dos jardins A e B. No jardim B, escolha os objetos diferentes. Use toque ou teclado.</p>
      <div class="scene-pair"><div class="scene"><h3 id="sceneATitle">Jardim A</h3><div class="scene-grid" id="sceneA" role="group" aria-labelledby="sceneATitle"></div></div>
      <div class="scene"><h3 id="sceneBTitle">Jardim B</h3><div class="scene-grid" id="sceneB" role="group" aria-labelledby="sceneBTitle" aria-describedby="differencesTip"></div></div></div>
      <p class="game-counter" id="counter">0 de ${targetCount} diferenças encontradas</p>`;
      const left = area.querySelector("#sceneA"), right = area.querySelector("#sceneB");
      base.forEach((item, i) => {
        const location = `linha ${Math.floor(i / 3) + 1}, coluna ${i % 3 + 1}`;
        const other = targets.includes(i) ? changed[i] : item;
        const a = document.createElement("span");
        a.className = "scene-item";
        a.innerHTML = `<span class="scene-symbol" aria-hidden="true">${item.icon}</span><small class="scene-name" aria-hidden="true">${item.name}</small>`;
        a.setAttribute("role", "img");
        a.setAttribute("aria-label", `Jardim A, ${location}: ${item.name}.`);
        left.appendChild(a);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "scene-item";
        b.innerHTML = `<span class="scene-symbol" aria-hidden="true">${other.icon}</span><small class="scene-name" aria-hidden="true">${other.name}</small>`;
        b.setAttribute("aria-label", `Jardim B, ${location}: ${other.name}. Selecionar se for diferente.`);
        b.addEventListener("click", () => {
          if (closed || paused || found.size === targetCount || found.has(i)) return;
          if (!targets.includes(i)) {
            error(`${item.name} aparece nos dois jardins na ${location}. Compare outro objeto na mesma posição.`);
            return;
          }
          found.add(i);
          a.classList.add("found");
          b.classList.add("found");
          b.disabled = true;
          progress(found.size, targetCount);
          a.setAttribute("aria-label", `Jardim A, ${location}: ${item.name}. Diferença encontrada.`);
          b.setAttribute("aria-label", `Jardim B, ${location}: ${other.name}. Diferença encontrada.`);
          area.querySelector("#counter").textContent = `${found.size} de ${targetCount} diferenças encontradas`;
          if (found.size === targetCount) {
            success("Você encontrou todos os detalhes!");
            later(finish, 600);
          } else success(`Diferença encontrada na ${location}: ${item.name} no jardim A e ${other.name} no jardim B.`);
        });
        right.appendChild(b);
      });
    }
    function oddOneGame() {
      const symbols = [{ icon: "🌼", name: "flor" }, { icon: "🍃", name: "folha" }, { icon: "🍄", name: "cogumelo" }, { icon: "🦋", name: "borboleta" }, { icon: "🐞", name: "joaninha" }, { icon: "🍓", name: "morango" }];
      const candidates = symbols.filter((item) => item.icon !== previousTarget);
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      previousTarget = target.icon;
      const alternatives = symbols.filter((item) => item !== target), different = alternatives[Math.floor(Math.random() * alternatives.length)];
      const tileCount = Math.min(30, 9 + (round - 1) * 3 + Math.floor(Math.max(0, count) / 3) * 3), oddIndex = Math.floor(Math.random() * tileCount);
      progress(round - 1, totalRounds);
      area.innerHTML = `<p class="game-tip" id="oddTip">Observe a grade e toque no único símbolo que não se repete.</p><div class="focus-grid" id="focusGrid" role="group" aria-label="Símbolos para encontrar o diferente"></div><p class="game-counter" id="counter">Encontre o símbolo diferente.</p>`;
      const grid = area.querySelector("#focusGrid");
      for (let i = 0; i < tileCount; i++) {
        const item = i === oddIndex ? different : target;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "focus-tile";
        button.textContent = item.icon;
        button.setAttribute("aria-label", `Símbolo ${i + 1}: ${item.name}. Selecionar se for o diferente.`);
        button.addEventListener("click", () => {
          if (closed || paused || button.disabled) return;
          if (i !== oddIndex) {
            error(`${item.name} aparece repetido. Continue procurando o único símbolo diferente.`);
            return;
          }
          button.classList.add("found");
          grid.querySelectorAll("button").forEach((tile) => {
            tile.disabled = true;
          });
          area.querySelector("#counter").textContent = `Encontrado: ${different.name}.`;
          success("Boa observação! Você encontrou o símbolo diferente.");
          finishRound();
        });
        grid.appendChild(button);
      }
    }
    function countingGame() {
      const symbols = [...fruits, { icon: "🍋", name: "Limão" }, { icon: "🍒", name: "Cereja" }, { icon: "🥕", name: "Cenoura" }, { icon: "🌽", name: "Milho" }, { icon: "🥦", name: "Brócolis" }, { icon: "🧅", name: "Cebola" }, { icon: "🥔", name: "Batata" }, { icon: "🥒", name: "Pepino" }];
      const candidates = symbols.filter((item) => item.icon !== previousTarget);
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      previousTarget = target.icon;
      const maxTargetCount = Math.min(12, 3 + round - 1 + Math.floor(Math.max(0, count) / 4));
      const targetCount = maxTargetCount - 1 + Math.floor(Math.random() * 2);
      const distractorCount = Math.min(18, 8 + Math.floor(Math.max(0, count) / 4));
      const distractors = symbols.filter((item) => item !== target);
      const board = shuffle([...Array(targetCount).fill(target), ...Array.from({ length: distractorCount }, () => distractors[Math.floor(Math.random() * distractors.length)])]);
      const answers = shuffle([targetCount - 1, targetCount, targetCount + 1]);
      progress(round - 1, totalRounds);
      area.innerHTML = `<p class="game-tip" id="countTip">Conte quantas vezes aparece <strong>${target.icon} ${target.name}</strong>. Toque nos objetos para marcar os que já contou, se quiser. Depois escolha a quantidade.</p><div class="count-grid" role="group" aria-label="${board.length} objetos para contar">${board.map((item, i) => `<button type="button" class="count-object" aria-pressed="false" aria-label="Objeto ${i + 1}: ${item.name}">${item.icon}</button>`).join("")}</div><div class="answer-grid" role="group" aria-label="Escolha a quantidade de ${target.name}">${answers.map((answer) => `<button type="button" class="secondary-button" data-answer="${answer}">${answer}</button>`).join("")}</div><p class="game-counter" id="counter">Quantas vezes aparece ${target.name}?</p>`;
      const marked = /* @__PURE__ */ new Set();
      area.querySelectorAll(".count-object").forEach((button, index) => button.addEventListener("click", () => {
        if (closed || paused || button.disabled) return;
        if (marked.has(index)) marked.delete(index);
        else marked.add(index);
        button.setAttribute("aria-pressed", String(marked.has(index)));
        area.querySelector("#counter").textContent = `${marked.size} ${marked.size === 1 ? "objeto marcado" : "objetos marcados"}. Escolha a quantidade de ${target.name}.`;
      }));
      area.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => {
        if (closed || paused || button.disabled) return;
        const answer = Number(button.dataset.answer);
        if (answer !== targetCount) {
          error(`Não foram ${answer}. Conte novamente apenas os objetos: ${target.name}.`);
          return;
        }
        area.querySelectorAll("[data-answer]").forEach((option) => {
          option.disabled = true;
        });
        button.classList.add("answer-correct");
        area.querySelectorAll(".count-object").forEach((item, index) => {
          item.disabled = true;
          item.setAttribute("aria-pressed", String(board[index] === target));
          if (board[index] === target) item.classList.add("count-found");
        });
        area.querySelector("#counter").textContent = `Isso mesmo: ${target.name} aparece ${targetCount} vezes.`;
        success("Contagem correta!");
        finishRound();
      }));
    }
  }

  // src/tutorials.js
  var tutorials = {
    sort: {
      steps: ["Toque em uma fruta para selecioná-la.", "Toque na cesta com a mesma fruta, ou arraste até ela.", "Organize todas as frutas para concluir."],
      tip: "As frutas e as cestas mudam de posição. Compare a figura e o nome.",
      example: "Exemplo: maçã → cesta de maçãs.",
      tasks: [
        { prompt: "Primeiro, selecione a maçã.", choices: ["🍎 Maçã", "🍌 Banana"], answer: 0 },
        { prompt: "Agora, escolha a cesta da maçã.", choices: ["🧺 Banana", "🧺 Maçã"], answer: 1 }
      ]
    },
    pairs: {
      steps: ["Observe as figuras e onde cada carta está.", "Depois de esconder as cartas, abra duas de cada vez.", "Figuras iguais ficam abertas. Encontre todos os pares."],
      tip: "No ritmo confortável, você escolhe quando esconder as cartas e quando virar um par diferente.",
      example: "Você abriu uma carta com 🌼 Margarida. Procure outra margarida.",
      tasks: [{ prompt: "Qual carta forma o par?", choices: ["🦋 Borboleta", "🌼 Margarida", "🍓 Morango"], answer: 1 }]
    },
    path: {
      steps: ["Comece no círculo perto da flor.", "Deslize seguindo a linha até a borboleta.", "Se preferir, use “Avançar pelo botão” com toque, Enter ou Espaço."],
      tip: "Se sair da linha, retome no círculo. Você mantém os trechos já percorridos.",
      example: "🌼 Flor → caminho → 🦋 Borboleta",
      tasks: [
        { prompt: "Experimente avançar a partir da flor.", choices: ["Avançar um trecho →"], answer: 0 },
        { prompt: "Mais um trecho até a borboleta.", choices: ["Chegar à borboleta 🦋"], answer: 0 }
      ]
    },
    sequence: {
      steps: ["Observe a ordem das cores e das formas.", "Quando chegar sua vez, repita desde o primeiro símbolo.", "Se precisar, use “Ver sequência novamente”."],
      tip: "Rever não tira pontos. Uma escolha fora da ordem reinicia a sequência; você pode tentar de novo.",
      example: "Memorize este exemplo: Rosa ● → Azul ◆.",
      tasks: [
        { prompt: "Qual é o primeiro símbolo?", choices: ["● Rosa", "◆ Azul", "▲ Amarelo"], answer: 0 },
        { prompt: "E qual vem depois do rosa?", choices: ["● Rosa", "◆ Azul", "▲ Amarelo"], answer: 1 }
      ]
    },
    differences: {
      steps: ["Compare a mesma posição nos jardins A e B.", "No jardim B, toque apenas nos objetos que mudaram.", "Encontre todas as diferenças indicadas no contador."],
      tip: "Compare uma linha por vez. Cada diferença encontrada fica marcada nos dois jardins.",
      example: "Jardim A: 🌼 Flor · ☀️ Sol. Jardim B: 🌼 Flor · 🌙 Lua.",
      tasks: [{ prompt: "O que mudou no jardim B?", choices: ["🌼 Flor", "🌙 Lua"], answer: 1 }]
    },
    oddone: {
      steps: ["Procure o único símbolo que não se repete.", "Toque nele para acertar a rodada.", "Complete três rodadas, com figuras novas."],
      tip: "No ritmo confortável, use “Próxima rodada” quando estiver pronto. Não há limite de tempo.",
      example: "Duas folhas e um cogumelo: 🍃 🍄 🍃.",
      tasks: [{ prompt: "Toque no símbolo diferente.", choices: ["🍃 Folha à esquerda", "🍄 Cogumelo", "🍃 Folha à direita"], answer: 1 }]
    },
    counting: {
      steps: ["Leia qual objeto deve contar.", "Toque nos objetos para marcar os que já contou, se quiser.", "Escolha a quantidade. Complete as três rodadas."],
      tip: "As marcações ajudam a contar e podem ser desfeitas. Só a resposta escolhida vale como tentativa.",
      example: "Conte apenas as maçãs: 🍎 🍐 🍎 🍎.",
      tasks: [{ prompt: "Quantas maçãs há no exemplo?", choices: ["2 maçãs", "3 maçãs", "4 maçãs"], answer: 1 }]
    }
  };
  function renderTutorial(container, gameId) {
    const guide = tutorials[gameId];
    container.innerHTML = '<ol class="instruction-list"></ol><p class="tutorial-tip"></p><section class="tutorial-practice" aria-label="Exemplo para experimentar"><h3>Experimente sem compromisso</h3><p class="tutorial-example"></p><p class="tutorial-prompt"></p><div class="tutorial-choices"></div><p class="tutorial-feedback" role="status" aria-live="polite"></p><small>Este exemplo não altera seus pontos. Você pode começar o jogo quando quiser.</small></section>';
    const list = container.querySelector("ol");
    guide.steps.forEach((step2, index) => {
      const item = document.createElement("li"), number = document.createElement("span");
      number.textContent = index + 1;
      item.append(number, document.createTextNode(step2));
      list.appendChild(item);
    });
    container.querySelector(".tutorial-tip").textContent = guide.tip;
    container.querySelector(".tutorial-example").textContent = guide.example;
    const prompt = container.querySelector(".tutorial-prompt"), choices = container.querySelector(".tutorial-choices"), feedback = container.querySelector(".tutorial-feedback");
    let step = 0;
    function draw(focus = false) {
      const task = guide.tasks[step];
      prompt.textContent = task.prompt;
      choices.replaceChildren();
      task.choices.forEach((label, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-button";
        button.textContent = label;
        button.addEventListener("click", () => {
          if (index !== task.answer) {
            feedback.textContent = "Tente novamente. " + task.prompt;
            return;
          }
          if (step < guide.tasks.length - 1) {
            step++;
            feedback.textContent = "Isso! Agora experimente o próximo passo.";
            draw(true);
          } else {
            button.classList.add("tutorial-correct");
            button.setAttribute("aria-pressed", "true");
            choices.querySelectorAll("button").forEach((choice) => {
              choice.disabled = true;
            });
            feedback.textContent = "Muito bem! Você entendeu como jogar.";
            feedback.tabIndex = -1;
            feedback.focus({ preventScroll: true });
          }
        });
        choices.appendChild(button);
      });
      if (focus) choices.querySelector("button").focus({ preventScroll: true });
    }
    draw();
  }

  // src/app.js
  var view = document.querySelector("#view");
  var toast = document.querySelector("#toast");
  var dialog = document.querySelector("#appDialog");
  var route = { page: getState().onboardingComplete ? "home" : "welcome" };
  var cleanup = null;
  var noticeTimer = null;
  var audioContext = null;
  var mapPage = 0;
  var dialogTask = null;
  var manualPaused = false;
  var backgroundPaused = false;
  var preferencesReturn = { page: "home" };
  var escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  var stars = (count) => `<span class="stars" role="img" aria-label="${count} de 3 estrelas">${"★".repeat(count)}<span aria-hidden="true">${"★".repeat(3 - count)}</span></span>`;
  var levelRank = () => Math.floor(getState().xp / 200) + 1;
  function sound(ok) {
    if (!getState().settings.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {
      });
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = ok ? 660 : 330;
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, audioContext.currentTime + 0.13);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.13);
    } catch {
    }
  }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => toast.classList.remove("show"), 6e3);
  }
  var listMap = () => {
    const settings = getState().settings;
    return settings.mapList || settings.largeText || settings.highContrast;
  };
  function syncPause() {
    cleanup?.setPaused(backgroundPaused || document.hidden || manualPaused || dialog.open);
  }
  function showDialog({ kind, title, description, confirmLabel, onConfirm, restoreFocus = false, returnAction, level }) {
    if (dialog.open) return;
    dialogTask = { kind, onConfirm, restoreFocus, returnAction, opener: document.activeElement };
    dialog.returnValue = "";
    document.querySelector("#dialogTitle").textContent = title;
    document.querySelector("#dialogDescription").textContent = description;
    const guide = document.querySelector("#dialogGuide");
    guide.replaceChildren();
    guide.hidden = kind !== "help";
    dialog.classList.toggle("tutorial-dialog", kind === "help");
    if (kind === "help") renderTutorial(guide, level.gameId);
    document.querySelector("#dialogField").hidden = kind !== "name";
    document.querySelector("#dialogError").textContent = "";
    document.querySelector("#dialogName").removeAttribute("aria-invalid");
    document.querySelector("#dialogName").value = kind === "name" ? getState().name : "";
    document.querySelector('[data-dialog="confirm"]').textContent = confirmLabel;
    document.querySelector('[data-dialog="cancel"]').textContent = kind === "exit" ? "Continuar jogando" : "Cancelar";
    document.querySelector('[data-dialog="cancel"]').hidden = kind === "help";
    dialog.showModal();
    syncPause();
    if (kind === "name") {
      document.querySelector("#dialogName").focus();
      document.querySelector("#dialogName").select();
    } else document.querySelector(`[data-dialog="${kind === "help" ? "confirm" : "cancel"}"]`).focus();
  }
  document.querySelector('[data-dialog="cancel"]').addEventListener("click", () => dialog.close("cancel"));
  document.querySelector("#dialogForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (dialogTask?.kind === "name" && !updateName(document.querySelector("#dialogName").value)) {
      document.querySelector("#dialogError").textContent = "Digite um nome antes de salvar.";
      document.querySelector("#dialogName").setAttribute("aria-invalid", "true");
      document.querySelector("#dialogName").focus();
      return;
    }
    dialog.close("confirm");
  });
  dialog.addEventListener("close", () => {
    const task = dialogTask;
    dialogTask = null;
    syncPause();
    if (!task) return;
    const confirmed = dialog.returnValue === "confirm";
    if (confirmed) task.onConfirm();
    if (!confirmed || task.restoreFocus) {
      const target = task.opener?.isConnected ? task.opener : document.querySelector(`[data-action="${task.returnAction}"]`);
      target?.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll("input, button")].filter((control) => !control.disabled && control.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  function updateShell() {
    const state2 = getState();
    const storageNotice = document.querySelector("#storageNotice");
    const status = getStorageStatus();
    storageNotice.hidden = status === "available";
    storageNotice.textContent = status === "invalid" ? "Não foi possível ler o progresso salvo. Uma nova sessão foi iniciada neste aparelho." : "Não foi possível salvar neste aparelho. Você pode continuar jogando, mas o progresso poderá ser perdido ao fechar. Confira o espaço disponível e a permissão de armazenamento do navegador.";
    document.documentElement.classList.toggle("large-text", state2.settings.largeText);
    document.documentElement.classList.toggle("high-contrast", state2.settings.highContrast);
    document.documentElement.classList.toggle("reduced-motion", state2.settings.reducedMotion);
    document.documentElement.dataset.hudSize = state2.settings.hudSize || "normal";
    document.querySelector("#xpChip").textContent = `✦ ${state2.xp} XP`;
    document.querySelector("#levelChip").textContent = `Nível ${levelRank()}`;
    const accessibilityButton = document.querySelector(".accessibility-link");
    if (route.page === "preferences") accessibilityButton.setAttribute("aria-current", "page");
    else accessibilityButton.removeAttribute("aria-current");
    document.querySelectorAll("[data-nav]").forEach((button) => {
      const active = button.dataset.nav === route.page || ["play", "result"].includes(route.page) && button.dataset.nav === "map";
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.body.classList.toggle("in-game", ["play", "result"].includes(route.page));
    document.body.classList.toggle("map-screen", route.page === "map" && !listMap());
    document.body.classList.toggle("onboarding-screen", route.page === "welcome");
  }
  function focusHeading() {
    const heading = view.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  function navigate(page, id, confirmed = false) {
    if (route.page === "play" && page !== "result" && !confirmed) {
      showDialog({ kind: "exit", title: "Sair desta partida?", description: "O avanço desta partida será perdido. As etapas concluídas continuarão salvas.", confirmLabel: "Sair da partida", onConfirm: () => navigate(page, id, true) });
      return;
    }
    if (page === "preferences" && route.page !== "preferences") preferencesReturn = ["home", "map", "profile"].includes(route.page) ? { ...route } : { page: "map" };
    cleanup?.();
    cleanup = null;
    manualPaused = false;
    route = { page, id };
    render();
    window.scrollTo(0, 0);
    focusHeading();
  }
  window.jardimBack = () => {
    if (dialog.open) {
      dialog.close("cancel");
      return true;
    }
    if (route.page === "welcome") return true;
    if (route.page === "home") return false;
    if (route.page === "preferences") navigate(preferencesReturn.page, preferencesReturn.id);
    else navigate(route.page === "profile" || route.page === "map" ? "home" : "map");
    return true;
  };
  window.jardimPause = (paused) => {
    backgroundPaused = paused;
    syncPause();
  };
  document.addEventListener("visibilitychange", () => window.jardimPause(document.hidden));
  function renderHome() {
    const state2 = getState(), current = nextLevel(), today = Math.min(getTodayPlays(), 3);
    view.innerHTML = `<section class="hero">
    <div class="hero-top"><span class="eyebrow">SEU CANTINHO DE JOGAR</span><span class="hero-spark">✦</span></div>
    <div class="hero-illustration" aria-hidden="true"><span class="hero-orbit"></span><span class="hero-main">🧠</span><span class="hero-bubble one">🌼</span><span class="hero-bubble two">🦋</span><span class="hero-bubble three">✦</span></div>
    <h1>Olá, ${escapeHtml(state2.name)}! <span class="wave">👋</span></h1>
    <p>Vamos movimentar a mente hoje?</p>
    <button type="button" class="primary-button hero-button" data-action="play" data-id="${current.id}">Começar exercício <span aria-hidden="true">→</span></button>
  </section>
  <section class="today-card"><div class="section-heading"><div><span class="eyebrow">UM POUQUINHO POR DIA</span><h2>Seu treino de hoje</h2></div><span class="day-icon" aria-hidden="true">☀️</span></div>
    <div class="today-progress"><span>${today} de 3 atividades</span><strong>${today === 3 ? "Concluído!" : "No seu ritmo"}</strong></div>
    <div class="progress-track" role="progressbar" aria-label="Atividades de hoje" aria-valuenow="${today}" aria-valuemin="0" aria-valuemax="3"><span style="width:${today / 3 * 100}%"></span></div>
    <div class="skill-pills"><span>🧠 Memória</span><span>🎯 Coordenação</span><span>👁️ Atenção</span></div>
  </section>
  <section class="home-stats"><div><span>🔥</span><strong>${getStreak()}</strong><small>${getStreak() === 1 ? "dia seguido" : "dias seguidos"}</small></div><div><span>⭐</span><strong>${Object.values(state2.stageRecords).reduce((sum, record) => sum + record.stars, 0)}</strong><small>estrelas</small></div><div><span>✦</span><strong>${state2.xp}</strong><small>pontos XP</small></div></section>
  <div class="section-heading below"><div><span class="eyebrow">PRÓXIMA AVENTURA</span><h2>Continue sua jornada</h2></div><button type="button" class="text-link" data-action="map">Ver mapa →</button></div>
  <button type="button" class="next-card ${current.color}" data-action="play" data-id="${current.id}"><span class="next-icon">${current.icon}</span><span><small>ETAPA ${String(current.number).padStart(2, "0")} • ${current.skill.toUpperCase()}</small><strong>${current.name}</strong><em>${current.objective}</em></span><b aria-hidden="true">→</b></button>
  <p class="soft-note">Cada tentativa conta. Divirta-se no seu tempo! 💛</p>`;
  }
  function renderWelcome() {
    const settings = getState().settings;
    view.innerHTML = `<section class="welcome-card"><span class="eyebrow">MENTE & MOVIMENTO</span><h1>Vamos deixar do seu jeito?</h1><p>Digite seu nome ou apelido para começar. As outras preferências são opcionais. Tudo fica salvo apenas neste aparelho e pode ser alterado depois no Perfil.</p>
    <form id="welcomeForm" class="welcome-form" novalidate>
      <label class="welcome-name" for="welcomeName"><strong>Como gostaria de ser chamado? (obrigatório)</strong><small>Seu nome ou apelido aparece nas boas-vindas e nas comemorações.</small><input id="welcomeName" name="name" type="text" maxlength="24" autocomplete="given-name" required aria-describedby="welcomeNameError" placeholder="Seu nome ou apelido" value="${escapeHtml(getState().name)}"></label>
      <p id="welcomeNameError" class="dialog-error" role="alert" hidden></p>
      <label class="hud-size-setting" for="welcomeHudSize"><span><strong>Tamanho geral do site</strong><small>Redimensiona textos, jogos, cartões e controles.</small></span><select id="welcomeHudSize" name="hudSize"><option value="compact" ${settings.hudSize === "compact" ? "selected" : ""}>Compacto</option><option value="normal" ${settings.hudSize === "normal" ? "selected" : ""}>Padrão</option><option value="large" ${settings.hudSize === "large" ? "selected" : ""}>Ampliado</option></select></label>
      <label class="welcome-check" for="welcomePace"><span><strong>Quero jogar no meu ritmo</strong><small>Sem pressa para observar as cartas e sequências.</small></span><input id="welcomePace" name="comfortablePace" type="checkbox" ${settings.comfortablePace ? "checked" : ""}></label>
      <label class="welcome-check" for="welcomeText"><span><strong>Texto maior</strong><small>Facilita a leitura e mostra as fases em lista.</small></span><input id="welcomeText" name="largeText" type="checkbox" ${settings.largeText ? "checked" : ""}></label>
      <label class="welcome-check" for="welcomeSound"><span><strong>Sons suaves</strong><small>Ativa respostas sonoras durante os jogos.</small></span><input id="welcomeSound" name="sound" type="checkbox" ${settings.sound ? "checked" : ""}></label>
      <div class="welcome-actions"><button type="submit" class="primary-button">Começar</button></div>
    </form></section>`;
  }
  function renderMap() {
    const state2 = getState();
    const inList = listMap(), forcedList = state2.settings.largeText || state2.settings.highContrast;
    const pageSize = 15, pageStart = mapPage * pageSize + 1;
    const visibleCount = Math.min(pageSize, MAX_LEVEL - pageStart + 1);
    const stages = Array.from({ length: visibleCount }, (_, index) => getLevel(pageStart + index));
    const pageEnd = pageStart + visibleCount - 1;
    const canViewNext = pageEnd < MAX_LEVEL && pageEnd + 1 <= state2.unlocked + pageSize - 1;
    const pageControls = `<div class="map-pages"><button type="button" class="secondary-button" data-action="map-page" data-page="${Math.max(0, mapPage - 1)}" ${mapPage === 0 ? "disabled" : ""}>← Fases anteriores</button><span>Fases ${pageStart}–${pageEnd}</span><button type="button" class="secondary-button" data-action="map-page" data-page="${mapPage + 1}" ${!canViewNext ? "disabled" : ""}>Próximas fases →</button></div>`;
    const toolbar = `<div class="map-toolbar" role="group" aria-label="Apresentação das atividades"><button type="button" class="secondary-button" data-action="map-mode" data-mode="illustrated" aria-pressed="${!inList}" ${forcedList ? "disabled" : ""}>Mapa</button><button type="button" class="secondary-button" data-action="map-mode" data-mode="list" aria-pressed="${inList}">Lista</button></div>${forcedList ? '<p class="fine-print">A lista facilita a leitura com texto maior ou alto contraste.</p>' : ""}`;
    if (inList) {
      view.innerHTML = `${toolbar}${pageControls}<section class="level-list"><h1>Uma jornada que continua</h1><p>Os sete jogos voltam em novos ciclos. Cada ciclo exige um pouco mais de foco.</p><ol class="level-list-items">${stages.map((level) => {
        const open = canPlay(level.number), record = state2.stageRecords[level.number];
        const status = open ? record ? `${record.stars} de 3 estrelas. Jogar novamente.` : "Disponível para jogar." : `Conclua a fase ${level.number - 1} para liberar.`;
        return `<li class="level-list-item"><button type="button" class="level-list-button" data-action="play" data-id="${level.number}" aria-disabled="${!open}" aria-label="Fase ${level.number}, ciclo ${level.cycle}: ${level.name}. ${level.objective} ${status}"><span class="level-list-icon" aria-hidden="true">${level.icon}</span><span class="level-list-description"><small>FASE ${level.number} · CICLO ${level.cycle} · ${level.skill}</small><strong>${level.name}</strong><span>${level.objective}</span><span class="level-list-status">${status}</span></span></button></li>`;
      }).join("")}</ol></section>`;
      return;
    }
    const height = visibleCount * 190 + 240;
    const spread = (seed) => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
      return value - Math.floor(value);
    };
    const points = stages.map((level) => ({
      x: Math.round(90 + spread(level.number) * 180),
      y: Math.round(170 + (level.number - pageStart) * 190 + (spread(level.number + 271) - 0.5) * 48)
    }));
    const route2 = points.slice(1).reduce((path, point, index) => {
      const previous = points[index], middle = Math.round((previous.y + point.y) / 2);
      return `${path} C${previous.x} ${middle},${point.x} ${middle},${point.x} ${point.y}`;
    }, `M${points[0].x} ${points[0].y}`);
    const earned = Object.values(state2.stageRecords).reduce((sum, record) => sum + record.stars, 0);
    view.innerHTML = `${toolbar}${pageControls}<section class="map-world" style="--map-height:${height}px" aria-label="Mapa de fases">
    <div class="map-title"><div><span>SEU CAMINHO</span><h1>Jornada sem fim</h1><p>Sete jogos em ciclos cada vez mais desafiadores</p></div><strong aria-label="${earned} estrelas conquistadas">★ ${earned}</strong></div>
    <svg class="map-route" viewBox="0 0 360 ${height}" preserveAspectRatio="none" aria-hidden="true"><path class="map-route-edge" d="${route2}"/><path class="map-route-center" d="${route2}"/><path class="map-route-dashes" d="${route2}"/></svg>
    ${stages.map((level, index) => {
      const { x, y } = points[index], open = canPlay(level.number);
      const record = state2.stageRecords[level.number], active = level.number === state2.unlocked;
      return `<div class="map-stage ${level.color} ${open ? "available" : "locked"} ${record ? "complete" : ""} ${active ? "current" : ""}" style="--stage-x:${x / 360 * 100}%;--stage-y:${y}px">
        <button type="button" class="map-node" data-action="play" data-id="${level.number}" aria-disabled="${!open}" aria-label="Fase ${level.number}, ciclo ${level.cycle}: ${level.name}. ${open ? record ? `${record.stars} estrelas. Jogar novamente.` : "Disponível para jogar." : `Bloqueada. Conclua a fase ${level.number - 1}.`}">
          <span class="map-node-number">${String(level.number).padStart(2, "0")}</span><span class="map-node-icon" aria-hidden="true">${open ? level.icon : "🔒"}</span>
        </button>
        <div class="map-stage-label"><strong>Fase ${level.number} · ${level.name}</strong><small>Ciclo ${level.cycle} · ${open ? level.skill : "Bloqueada"}</small></div>
        ${record ? `<span class="map-earned" aria-label="${record.stars} de 3 estrelas">${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)}</span>` : active ? '<span class="map-play-hint">JOGAR AGORA</span>' : ""}
      </div>`;
    }).join("")}
    <div class="map-start" aria-hidden="true">✦ MAIS DESAFIOS</div>
  </section>`;
  }
  function renderProfile() {
    const state2 = getState(), days = getWeeklyDays(), weeklyMax = Math.max(3, ...days.map((d) => d.count));
    const medals = [
      { icon: "🌱", label: "Primeiro passo", earned: state2.plays >= 1, goal: "Conclua uma atividade" },
      { icon: "⭐", label: "Colecionador", earned: Object.values(state2.stageRecords).reduce((sum, item) => sum + item.stars, 0) >= 5, goal: "Conquiste 5 estrelas" },
      { icon: "🔥", label: "3 dias de jogo", earned: getStreak() >= 3, goal: "Jogue por 3 dias seguidos" }
    ];
    view.innerHTML = `<section class="profile-hero"><div class="avatar" aria-hidden="true">${escapeHtml(state2.name.charAt(0).toUpperCase())}</div><div><span class="eyebrow">SEU PERFIL</span><h1>${escapeHtml(state2.name)}</h1><p>Nível ${levelRank()} · ${state2.xp} XP</p></div><button type="button" class="icon-button" data-action="edit-name" aria-label="Editar nome">✎</button></section>
    <div class="profile-stats"><div><strong>${state2.plays}</strong><span>partidas concluídas</span></div><div><strong>${state2.minutes}</strong><span>minutos aproximados</span></div><div><strong>${getPracticedDays()}</strong><span>dias no histórico</span></div><div><strong>${getStreak()}</strong><span>dias seguidos</span></div></div>
    <section class="panel"><div class="section-heading"><div><span class="eyebrow">PASSO A PASSO</span><h2>Sua semana</h2></div><span aria-hidden="true">📅</span></div><div class="week-chart" role="list" aria-label="Atividades dos últimos sete dias">${days.map((d) => `<div role="listitem" aria-label="${d.label}, ${d.date}: ${d.count} atividades concluídas"><div class="week-bar" aria-hidden="true"><span style="height:${Math.max(8, d.count / weeklyMax * 100)}%" class="${d.count ? "played" : ""}"></span></div><small aria-hidden="true">${d.label}</small><b aria-hidden="true">${d.count}</b></div>`).join("")}</div><p class="fine-print">Cada barra mostra atividades concluídas no site.</p></section>
    <section class="panel"><span class="eyebrow">SUAS CONQUISTAS</span><h2>Medalhas</h2><div class="medal-list">${medals.map((medal) => `<div class="${medal.earned ? "" : "pending"}"><span aria-hidden="true">${medal.icon}</span><strong>${medal.label}</strong><small>${medal.earned ? "Conquistada" : medal.goal}</small></div>`).join("")}</div></section>
    <section class="panel"><span class="eyebrow">NO SEU RITMO</span><h2>Habilidades jogadas</h2><div class="skill-bars">${Object.entries(SKILLS).map(([id, skill]) => `<div class="skill-row"><span id="skill-${id}"><span aria-hidden="true">${skill.icon}</span> ${skill.name}</span><strong>${getSkillScore(id)}%</strong><div class="progress-track" role="progressbar" aria-labelledby="skill-${id}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${getSkillScore(id)}"><span style="width:${getSkillScore(id)}%;background:${skill.color}"></span></div></div>`).join("")}</div><p class="fine-print">Os números mostram seu desempenho nos jogos. Não são uma avaliação de saúde.</p></section>
    <section class="panel settings"><span class="eyebrow">AJUSTES DO SITE</span><h2>Configuração geral</h2>
      <p>Personalize a interface e o tamanho dos controles para ficar confortável para você.</p>
      <label class="hud-size-setting" for="hudSize"><span><strong>Tamanho geral do site</strong><small>Redimensiona textos, jogos, cartões e controles.</small></span><select id="hudSize" data-setting="hudSize"><option value="compact" ${state2.settings.hudSize === "compact" ? "selected" : ""}>Compacto</option><option value="normal" ${state2.settings.hudSize === "normal" ? "selected" : ""}>Padrão</option><option value="large" ${state2.settings.hudSize === "large" ? "selected" : ""}>Ampliado</option></select></label>
      <button type="button" class="secondary-button" data-action="welcome-edit">Personalizar minha experiência</button>
      <button type="button" class="secondary-button" data-action="preferences">Mais preferências e acessibilidade</button>
      <p class="fine-print">O progresso fica salvo neste navegador e neste dispositivo. O histórico reúne as últimas 200 partidas. Limpar os dados do navegador pode apagar seu progresso.</p>
      <button type="button" class="text-link reset-link" data-action="reset">Apagar meu progresso</button></section>`;
  }
  function renderPreferences() {
    const settings = getState().settings;
    const options = [
      ["largeText", "Texto maior", "Amplia o texto e organiza as atividades em lista para facilitar a leitura."],
      ["highContrast", "Alto contraste", "Aumenta a distinção entre textos, botões e fundos. As atividades são mostradas em lista."],
      ["reducedMotion", "Reduzir movimentos", "Desativa animações decorativas e transições. A preferência do aparelho também é respeitada."],
      ["comfortablePace", "Jogar no meu ritmo", "Nos pares e nas sequências, você decide quando terminar de observar. Pode repetir sem perder pontos."],
      ["mapList", "Mapa em lista", "Mostra as próximas fases em ordem, com instruções e situação de desbloqueio."],
      ["sound", "Sons do jogo", "Ativa respostas sonoras suaves. As instruções e os resultados também aparecem em texto."]
    ];
    view.innerHTML = `<button type="button" class="back-button" data-action="preferences-back">← Voltar</button><section class="panel settings"><span class="eyebrow">DO SEU JEITO</span><h1>Acessibilidade e preferências</h1><p>Escolha o que deixa a experiência mais confortável. Você pode mudar estas opções quando quiser.</p>${options.map(([key, title, description]) => `<label for="setting-${key}"><span><strong id="setting-title-${key}">${title}</strong><small id="setting-help-${key}">${description}</small></span><input id="setting-${key}" type="checkbox" data-setting="${key}" aria-labelledby="setting-title-${key}" aria-describedby="setting-help-${key}" ${settings[key] ? "checked" : ""}></label>`).join("")}<p class="fine-print">Suas preferências ficam neste aparelho e são mantidas quando você apaga o progresso dos jogos.</p></section>`;
  }
  function renderPlay(id) {
    const level = getLevel(id);
    if (!level || !canPlay(id)) return navigate("map");
    view.innerHTML = `<div class="play-top"><button type="button" class="back-button" data-action="map">← Mapa</button><span>FASE ${level.number} · CICLO ${level.cycle}</span></div>
    <div class="play-heading"><div class="play-icon ${level.color}" aria-hidden="true">${level.icon}</div><div><span class="eyebrow">${level.skill.toUpperCase()}</span><h1>${level.name}</h1></div></div>
    <div class="instruction-banner"><span aria-hidden="true">👉</span><strong>${level.objective}</strong></div>
    <p class="feedback" id="feedback" role="status" aria-live="polite" aria-atomic="true">Você consegue. Vá no seu ritmo!</p><div class="game-controls"><button type="button" class="secondary-button pause-button" data-action="pause" aria-pressed="false">Pausar partida</button><button type="button" class="secondary-button" data-action="help">Ver tutorial</button></div><p id="pauseNotice" class="instruction-banner" role="status" hidden>Partida pausada. Selecione Retomar partida para continuar do mesmo ponto.</p><div id="gameMount"></div>`;
    cleanup = startGame({
      id: level.gameId,
      mount: view.querySelector("#gameMount"),
      support: getState().levels[level.gameId].support,
      difficulty: level.difficulty,
      settings: { ...getState().settings },
      playSound: sound,
      onFeedback: (message, ok) => {
        const feedback = view.querySelector("#feedback");
        if (feedback) {
          feedback.textContent = message;
          feedback.classList.toggle("positive", ok);
        }
      },
      onComplete: (outcome) => {
        const result = finishLevel(id, outcome);
        cleanup?.();
        cleanup = null;
        manualPaused = false;
        route = { page: "result", id, result };
        render();
        window.scrollTo(0, 0);
        focusHeading();
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
    <div class="trained"><span>${level.icon}</span><div><small>VOCÊ PRATICOU</small><strong>${level.skills.map((skill) => SKILLS[skill].name).join(" e ")}</strong></div></div>
    ${result.unlocked ? `<p class="unlocked-note">🔓 Nova etapa liberada!</p>` : '<p class="unlocked-note">Você pode jogar novamente quando quiser.</p>'}
    <div class="result-actions">${next && canPlay(next.id) ? `<button type="button" class="primary-button" data-action="play" data-id="${next.id}">Próxima etapa →</button>` : ""}
      <button type="button" class="secondary-button" data-action="map">Ver meu mapa</button><button type="button" class="text-link" data-action="play" data-id="${id}">Jogar de novo</button></div></section>`;
  }
  function render() {
    updateShell();
    if (route.page === "welcome") renderWelcome();
    else if (route.page === "home") renderHome();
    else if (route.page === "map") renderMap();
    else if (route.page === "profile") renderProfile();
    else if (route.page === "preferences") renderPreferences();
    else if (route.page === "play") renderPlay(route.id);
    else if (route.page === "result") renderResult(route.id, route.result);
    else renderHome();
    const heading = view.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      document.title = `${heading.textContent} · Mente & Movimento`;
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const { action, id } = button.dataset;
    if (action === "welcome-edit") {
      route = { page: "welcome" };
      render();
      window.scrollTo(0, 0);
      focusHeading();
      return;
    }
    if (route.page === "welcome") return;
    if (action === "help" && route.page === "play") {
      const level = getLevel(route.id);
      showDialog({ kind: "help", title: `Como jogar: ${level.name}`, description: "A partida está pausada. Consulte as instruções ou experimente o exemplo.", confirmLabel: "Voltar à partida", level, onConfirm: () => {
      }, restoreFocus: true, returnAction: "help" });
      return;
    }
    if (action === "play" && !canPlay(id)) {
      notify(`Conclua a etapa ${getLevel(id)?.number - 1} para liberar esta atividade.`);
      return;
    }
    if (["home", "map", "profile", "preferences", "play"].includes(action)) navigate(action, id);
    if (action === "preferences-back") navigate(preferencesReturn.page, preferencesReturn.id);
    if (action === "map-mode") {
      updateSetting("mapList", button.dataset.mode === "list");
      render();
      view.querySelector(`[data-action="map-mode"][data-mode="${button.dataset.mode}"]`)?.focus({ preventScroll: true });
    }
    if (action === "map-page") {
      mapPage = Number(button.dataset.page);
      render();
      window.scrollTo(0, 0);
      focusHeading();
    }
    if (action === "pause" && route.page === "play") {
      manualPaused = !manualPaused;
      syncPause();
      view.querySelector("#gameMount").hidden = manualPaused;
      view.querySelector("#pauseNotice").hidden = !manualPaused;
      button.setAttribute("aria-pressed", String(manualPaused));
      button.textContent = manualPaused ? "Retomar partida" : "Pausar partida";
    }
    if (action === "edit-name") {
      showDialog({ kind: "name", title: "Editar seu nome", description: "Este nome aparece na tela inicial e no seu perfil. Use até 24 caracteres.", confirmLabel: "Salvar nome", restoreFocus: true, returnAction: "edit-name", onConfirm: () => {
        render();
        notify(getStorageStatus() === "available" ? "Nome atualizado." : "Nome alterado nesta sessão. Não foi possível salvar.");
      } });
    }
    if (action === "reset") showDialog({ kind: "reset", title: "Apagar seu progresso?", description: "As estrelas, etapas liberadas e o histórico serão apagados neste aparelho. Seu nome e suas preferências de acessibilidade serão mantidos. Esta ação não pode ser desfeita.", confirmLabel: "Apagar progresso", onConfirm: () => {
      resetProgress();
      mapPage = 0;
      navigate("home");
      notify(getStorageStatus() === "available" ? "Seu progresso foi reiniciado. Suas preferências foram mantidas." : "Progresso reiniciado nesta sessão. Não foi possível salvar a alteração.");
    } });
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id !== "welcomeForm") return;
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
      const input = form.querySelector('[name="name"]'), error = form.querySelector("#welcomeNameError");
      error.textContent = "Digite seu nome ou apelido para começar.";
      error.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    route = { page: "home" };
    render();
    window.scrollTo(0, 0);
    focusHeading();
    notify(getStorageStatus() === "available" ? "Preferências salvas. Aproveite sua jornada!" : "Preferências aplicadas nesta sessão.");
  });
  document.addEventListener("input", (event) => {
    if (event.target.id !== "welcomeName") return;
    event.target.removeAttribute("aria-invalid");
    document.querySelector("#welcomeNameError").hidden = true;
  });
  document.addEventListener("change", (event) => {
    const key = event.target.dataset.setting;
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (key && updateSetting(key, value)) {
      updateShell();
      notify(getStorageStatus() === "available" ? "Preferência salva." : "Preferência alterada nesta sessão. Não foi possível salvar.");
    }
  });
  render();
})();
