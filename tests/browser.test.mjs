import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(existsSync);

test('navegador: jogos, acessibilidade, teclado e navegação móvel', { skip: !chrome && 'Defina CHROME_PATH para executar.', timeout: 90000 }, async t => {
  const profile = await mkdtemp(join(tmpdir(), 'mente-browser-test-'));
  const files = new Map([
    ['/', ['index.html', 'text/html']], ['/src/app.js', ['src/app.js', 'text/javascript']],
    ['/src/app.bundle.js', ['src/app.bundle.js', 'text/javascript']],
    ['/src/state.js', ['src/state.js', 'text/javascript']], ['/src/games.js', ['src/games.js', 'text/javascript']],
    ['/src/styles.css', ['src/styles.css', 'text/css']], ['/assets/icon-512.png', ['assets/icon-512.png', 'image/png']],
    ['/test-games.js', ['src/games.js', 'text/javascript']],
    ['/test-tutorials.js', ['src/tutorials.js', 'text/javascript']]
  ]);
  const requests = [];
  const server = createServer(async (req, res) => {
    requests.push(req.url);
    const file = files.get(req.url);
    if (!file) return res.writeHead(404).end();
    try { res.writeHead(200, { 'Content-Type': file[1] }).end(await readFile(resolve(file[0]))); }
    catch { res.writeHead(500).end(); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  t.after(async () => {
    socket?.close(); browser.kill();
    if (browser.exitCode === null) await Promise.race([once(browser, 'exit'), delay(5000)]);
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.equal(dirname(profile), tmpdir());
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });
  let debugPort;
  for (let i = 0; i < 150; i++) {
    try { debugPort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(100); }
  }
  assert.ok(debugPort, 'Chrome não iniciou a depuração local.');
  const page = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl); await once(socket, 'open');
  let sequence = 0; const pending = new Map(), errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.id) { const callback = pending.get(message.id); pending.delete(message.id); callback?.(message); }
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, response => response.error ? reject(new Error(JSON.stringify(response.error))) : resolve(response.result));
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const value = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.equal(value.exceptionDetails, undefined, JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  const closeDialog = expression => evaluate(`new Promise(resolve => {
    document.querySelector('#appDialog').addEventListener('close', () => queueMicrotask(resolve), { once: true });
    ${expression};
  })`);
  const expectReflow = async (width, label) => {
    const fits = await evaluate(`document.documentElement.scrollWidth <= ${width}`);
    const details = fits ? '' : await evaluate(`JSON.stringify({ width: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(element => element.getClientRects().length && element.getBoundingClientRect().right > ${width} + 1).slice(0, 12).map(element => ({ tag: element.tagName, id: element.id, className: element.className, right: Math.round(element.getBoundingClientRect().right), font: getComputedStyle(element).fontSize })) })`);
    assert.equal(fits, true, `${label}: ${details || 'sem rolagem horizontal'}`);
  };
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.bringToFront');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  const navigation = await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  assert.equal(navigation.errorText, undefined, JSON.stringify({ navigation, requests }));
  for (let i = 0; i < 150; i++) {
    if (await evaluate('!!document.querySelector("#welcomeForm")')) break;
    await delay(100);
  }
  assert.equal(await evaluate('!!document.querySelector("#welcomeForm")'), true, JSON.stringify({ errors, requests, navigation, page: await evaluate('({url:location.href,html:document.documentElement.outerHTML.slice(0,1000)})') }));
  await t.test('nome é obrigatório e não pode ser ignorado pela navegação', async () => {
    assert.equal(await evaluate('document.querySelector("#welcomeName").required'), true);
    assert.equal(await evaluate('document.querySelector("[data-action=welcome-skip]")'), null);
    for (const name of ['', '   ', '< >']) {
      await evaluate(`document.querySelector('#welcomeName').value = ${JSON.stringify(name)}; document.querySelector('#welcomeForm button[type=submit]').click()`);
      assert.equal(await evaluate('!!document.querySelector("#welcomeForm")'), true);
      assert.equal(await evaluate('document.activeElement.id'), 'welcomeName');
      assert.equal(await evaluate('document.querySelector("#welcomeName").getAttribute("aria-invalid")'), 'true');
      assert.equal(await evaluate('document.querySelector("#welcomeNameError").hidden'), false);
      await evaluate('document.querySelector("[data-nav=map]").click()');
      assert.equal(await evaluate('!!document.querySelector("#welcomeForm")'), true);
    }
  });
  await evaluate('document.querySelector("#welcomeName").value = "Maria"; document.querySelector("#welcomeForm").requestSubmit()');
  assert.equal(await evaluate('!!document.querySelector(".hero")'), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= 360'), true);
  assert.equal(await evaluate('document.querySelector("#storageNotice").hidden'), true);
  await evaluate('document.querySelector("[data-nav=map]").click()');
  assert.equal(await evaluate('document.querySelectorAll(".map-node").length'), 15);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".map-node")].map(button => Number(button.dataset.id))'), Array.from({ length: 15 }, (_, index) => index + 1));
  await evaluate('document.querySelector("[data-action=preferences]").click()');
  assert.equal(await evaluate('document.activeElement === document.querySelector("#view h1")'), true);
  assert.equal(await evaluate('document.querySelector("[data-setting=comfortablePace]").checked'), true);
  await evaluate('document.querySelector("[data-setting=largeText]").focus(); document.activeElement.click()');
  assert.equal(await evaluate('document.documentElement.classList.contains("large-text")'), true);
  assert.equal(await evaluate('document.activeElement === document.querySelector("[data-setting=largeText]")'), true, 'Alterar texto maior preserva o controle de teclado.');
  await evaluate('document.querySelector("[data-setting=highContrast]").click(); document.querySelector("[data-setting=reducedMotion]").click(); document.querySelector("[data-setting=mapList]").click()');
  assert.equal(await evaluate('document.documentElement.classList.contains("high-contrast")'), true);
  assert.equal(await evaluate('document.documentElement.classList.contains("reduced-motion")'), true);
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("mente-movimento-v1")).settings'), {
    largeText: true, sound: true, highContrast: true, reducedMotion: true, comfortablePace: true, mapList: true, hudSize: 'normal'
  });

  await t.test('diálogos aceitam Escape, preservam dados e devolvem foco', async () => {
    const escape = async () => {
      await evaluate('void (window.__dialogClosed = new Promise(resolve => document.querySelector("#appDialog").addEventListener("close", () => queueMicrotask(resolve), { once: true })))');
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await evaluate('window.__dialogClosed.then(() => { delete window.__dialogClosed; })');
    };
    await evaluate('document.querySelector("[data-nav=profile]").click(); document.querySelector("[data-action=edit-name]").focus(); document.activeElement.click()');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), true);
    assert.equal(await evaluate('document.activeElement === document.querySelector("#dialogName")'), true);
    const dialogTree = await cdp('Accessibility.getFullAXTree');
    assert.ok(dialogTree.nodes.some(node => node.role?.value === 'dialog' && node.name?.value), 'Diálogo expõe um nome acessível.');
    for (let i = 0; i < 8; i++) {
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      assert.equal(await evaluate('document.querySelector("#appDialog").contains(document.activeElement)'), true, 'Tab mantém o foco dentro do diálogo.');
    }
    await evaluate('document.querySelector("#dialogName").value = "Nome descartado"');
    await escape();
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), false);
    assert.equal(await evaluate('document.activeElement === document.querySelector("[data-action=edit-name]")'), true);
    assert.equal(await evaluate('document.querySelector(".profile-hero h1").textContent'), 'Maria');
    await evaluate('document.activeElement.click(); document.querySelector("#dialogName").value = ""; document.querySelector("#dialogForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), true);
    assert.equal(await evaluate('document.querySelector("#dialogError").textContent.length > 0'), true, 'Nome vazio informa como corrigir.');
    await closeDialog('document.querySelector("#dialogName").value = "Ana"; document.querySelector("#dialogForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), false);
    assert.equal(await evaluate('document.querySelector(".profile-hero h1").textContent'), 'Ana');
    assert.equal(await evaluate('document.activeElement === document.querySelector("[data-action=edit-name]")'), true);
    await evaluate('document.querySelector("[data-nav=profile]").click(); document.querySelector("[data-action=reset]").focus(); document.activeElement.click()');
    await escape();
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), false);
    assert.equal(await evaluate('document.activeElement === document.querySelector("[data-action=reset]")'), true);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("mente-movimento-v1")).name'), 'Ana');
    await evaluate('document.activeElement.click()');
    await closeDialog('document.querySelector("[data-dialog=cancel]").click()');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), false);
    assert.equal(await evaluate('document.activeElement === document.querySelector("[data-action=reset]")'), true);
  });

  await t.test('texto ampliado e alto contraste mantêm telas sem rolagem horizontal', async () => {
    try {
      for (const width of [320, 360]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
        for (const fontSize of ['', '40px']) {
          await evaluate(`document.documentElement.style.fontSize = ${JSON.stringify(fontSize)}`);
          for (const page of ['home', 'profile', 'preferences', 'map']) {
            await evaluate(`document.querySelector('[data-action="${page}"], [data-nav="${page}"]').click()`);
            await expectReflow(width, `${page}, ${width}px, fonte ${fontSize || 'normal'}`);
            assert.equal(await evaluate('document.activeElement === document.querySelector("#view h1")'), true, `${page}: título recebe foco.`);
          }
          assert.equal(await evaluate('!!document.querySelector(".level-list")'), true, 'Mapa acessível oferece lista em ordem de etapas.');
          assert.deepEqual(await evaluate('[...document.querySelectorAll("#view [data-action=play]")].map(button => Number(button.dataset.id))'), Array.from({ length: 15 }, (_, index) => index + 1));
          await evaluate('document.querySelector("#view [data-action=play][data-id]").click()');
          await expectReflow(width, `jogo, ${width}px, fonte ${fontSize || 'normal'}`);
          await evaluate('document.querySelector("[data-nav=map]").click()');
          await closeDialog('document.querySelector("[data-dialog=confirm]").click()');
        }
      }
    } finally { await evaluate('document.documentElement.style.fontSize = ""'); }
  });

  await t.test('sair pausa a partida e concluir anuncia a próxima tela', async () => {
    await evaluate('document.querySelector("[data-nav=map]").click(); document.querySelector("#view [data-action=play][data-id]").click(); document.querySelector(".fruit-tile").click(); document.querySelector("[data-nav=map]").focus(); document.activeElement.click()');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), true);
    const gameBefore = await evaluate('document.querySelector("#gameMount").innerHTML');
    await evaluate('document.querySelectorAll(".fruit-tile")[1].click()');
    assert.equal(await evaluate('document.querySelector("#gameMount").innerHTML'), gameBefore, 'Diálogo de saída mantém a partida pausada.');
    await closeDialog('document.querySelector("[data-dialog=cancel]").click()');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), false);
    assert.equal(await evaluate('document.activeElement === document.querySelector("[data-nav=map]")'), true);
    await evaluate(`(() => {
      for (const fruit of document.querySelectorAll('.fruit-tile')) {
        fruit.click(); [...document.querySelectorAll('.basket')].find(basket => basket.dataset.name === fruit.dataset.name).click();
      }
    })()`);
    for (let i = 0; i < 20 && !await evaluate('!!document.querySelector(".result-card")'); i++) await delay(100);
    assert.equal(await evaluate('!!document.querySelector(".result-card")'), true);
    assert.equal(await evaluate('document.activeElement === document.querySelector("#view h1")'), true, 'Leitor de tela recebe foco no resultado da partida.');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("mente-movimento-v1")).plays'), 1);
    await evaluate('document.querySelector(".result-actions .text-link").click()');
    assert.equal(await evaluate('!!document.querySelector("#gameMount") && !document.querySelector(".intro-card")'), true, 'Jogar de novo abre a partida diretamente.');
    await evaluate('document.querySelector(".fruit-tile").click(); document.querySelector("[data-action=help]").focus(); document.activeElement.click()');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), true);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 320, height: 800, deviceScaleFactor: 1, mobile: true });
    await evaluate('document.documentElement.style.fontSize = "40px"');
    await expectReflow(320, 'ajuda aberta com texto ampliado');
    assert.equal(await evaluate('document.querySelector("#appDialog").scrollWidth <= document.querySelector("#appDialog").clientWidth + 1'), true);
    await evaluate('document.documentElement.style.fontSize = ""');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
    const beforeHelp = await evaluate('document.querySelector("#gameMount").innerHTML');
    const savedBeforeHelp = await evaluate('localStorage.getItem("mente-movimento-v1")');
    await evaluate('document.querySelectorAll(".fruit-tile")[1].click(); document.querySelectorAll(".tutorial-choices button")[0].click(); document.querySelectorAll(".tutorial-choices button")[1].click()');
    assert.equal(await evaluate('document.querySelector("#gameMount").innerHTML'), beforeHelp, 'Ajuda mantém a partida pausada.');
    assert.equal(await evaluate('localStorage.getItem("mente-movimento-v1")'), savedBeforeHelp, 'Exemplo não altera progresso.');
    assert.match(await evaluate('document.querySelector(".tutorial-feedback").textContent'), /Muito bem/);
    await closeDialog('document.querySelector("[data-dialog=confirm]").click()');
    assert.equal(await evaluate('document.activeElement.dataset.action'), 'help');
    assert.equal(await evaluate('document.querySelector("#gameMount").innerHTML'), beforeHelp);
    await evaluate('document.querySelector("[data-nav=map]").click()');
    await closeDialog('document.querySelector("[data-dialog=confirm]").click()');
    await evaluate('document.querySelectorAll("#view [data-action=play]")[1].click()');
    assert.equal(await evaluate('!!document.querySelector("#pairsGrid") && !document.querySelector(".intro-card")'), true, 'Outro jogo também abre diretamente.');
    assert.equal(await evaluate('document.querySelector("[data-action=help]").textContent'), 'Ver tutorial');
    await evaluate('document.querySelector("[data-nav=map]").click()');
    await closeDialog('document.querySelector("[data-dialog=confirm]").click()');
    assert.equal(await evaluate('document.querySelector("#appDialog").open'), false);
    assert.equal(await evaluate('!!document.querySelector(".level-list")'), true);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("mente-movimento-v1")).plays'), 1, 'Sair de partida incompleta preserva apenas o progresso concluído.');
  });

  await t.test('recarregar mantém preferências de leitura e movimento', async () => {
    await cdp('Page.reload');
    for (let i = 0; i < 50 && !await evaluate('!!document.querySelector(".hero")'); i++) await delay(100);
    assert.equal(await evaluate('!!document.querySelector(".hero")'), true);
    assert.equal(await evaluate('["large-text", "high-contrast", "reduced-motion"].every(name => document.documentElement.classList.contains(name))'), true);
    await evaluate('document.querySelector("[data-nav=map]").click(); document.querySelectorAll("#view [data-action=play]")[1].click()');
    assert.equal(await evaluate('!!document.querySelector("#pairsGrid") && !document.querySelector(".intro-card")'), true, 'Um jogo abre direto após recarregar.');
    await evaluate('document.querySelector("[data-action=pause]").click(); document.querySelector("[data-action=help]").click()');
    await closeDialog('document.querySelector("#appDialog").close("cancel")');
    assert.equal(await evaluate('document.querySelector("#gameMount").hidden'), true, 'Fechar ajuda preserva a pausa manual.');
    await evaluate('document.querySelector("[data-nav=map]").click()');
    await closeDialog('document.querySelector("[data-dialog=confirm]").click()');
    await evaluate('document.querySelector("[data-action=preferences]").click()');
    assert.equal(await evaluate('["largeText", "highContrast", "reducedMotion", "comfortablePace", "mapList"].every(key => document.querySelector(`[data-setting="${key}"]`).checked)'), true);
  });

  await t.test('sete tutoriais permitem experimentar sem pontuar e funcionam com texto ampliado', async () => {
    const unchanged = await evaluate('localStorage.getItem("mente-movimento-v1")');
    for (const [id, answers] of Object.entries({ sort: [0, 1], pairs: [1], path: [0, 0], sequence: [0, 1], differences: [1], oddone: [1], counting: [1] })) {
      await evaluate(`(async () => {
        const { renderTutorial } = await import('/test-tutorials.js');
        let mount = document.querySelector('#tutorialTest');
        if (!mount) { mount = document.createElement('div'); mount.id = 'tutorialTest'; document.querySelector('#view').appendChild(mount); }
        renderTutorial(mount, ${JSON.stringify(id)});
      })()`);
      await expectReflow(360, id + ': tutorial cabe na tela');
      if (id !== 'path') {
        await evaluate(`document.querySelectorAll('#tutorialTest .tutorial-choices button')[${answers[0] === 0 ? 1 : 0}].click()`);
        assert.match(await evaluate('document.querySelector("#tutorialTest .tutorial-feedback").textContent'), /Tente novamente/);
      }
      for (const answer of answers) await evaluate(`document.querySelectorAll('#tutorialTest .tutorial-choices button')[${answer}].click()`);
      assert.match(await evaluate('document.querySelector("#tutorialTest .tutorial-feedback").textContent'), /Muito bem/);
    }
    assert.equal(await evaluate('localStorage.getItem("mente-movimento-v1")'), unchanged);
    await evaluate('document.querySelector("#tutorialTest").remove()');
  });

  const result = await evaluate(`(async () => {
    const { startGame } = await import('/test-games.js');
    const mount = document.createElement('div'); document.body.appendChild(mount);
    let now = 0, serial = 0; const timers = new Map();
    const original = { timeout: window.setTimeout, clear: window.clearTimeout, random: Math.random, now: performance.now };
    window.setTimeout = (fn, ms) => { const id = ++serial; timers.set(id, { fn, at: now + ms }); return id; };
    window.clearTimeout = id => timers.delete(id);
    Math.random = () => .1; performance.now = () => now;
    const tick = ms => {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn();
      }
      now = end;
    };
    const outcomes = {}; let cleanup;
    const start = id => {
      cleanup?.(); mount.innerHTML = '';
      cleanup = startGame({ id, mount, onComplete: result => { if (outcomes[id]) throw Error('Conclusão duplicada'); outcomes[id] = result; cleanup(); } });
    };
    try {
      start('sort');
      for (const fruit of mount.querySelectorAll('.fruit-tile')) {
        fruit.click(); [...mount.querySelectorAll('.basket')].find(b => b.dataset.name === fruit.dataset.name).click();
      }
      tick(600);
      start('pairs');
      const cards = [...mount.querySelectorAll('.pair-card')];
      const symbols = cards.map(card => card.textContent); tick(2800);
      for (const symbol of new Set(symbols)) cards.filter((_, i) => symbols[i] === symbol).forEach(card => card.click());
      tick(700);
      start('path'); const assist = mount.querySelector('#pathAssist');
      for (let i = 0; i < 15; i++) assist.click(); tick(600);
      start('sequence'); tick(500); cleanup.setPaused(true); tick(10000);
      if (!mount.querySelector('.sequence-pad').disabled) throw Error('Sequência avançou durante a pausa');
      cleanup.setPaused(false); tick(4500);
      for (let i = 0; i < 4; i++) mount.querySelector('.sequence-pad').click();
      mount.querySelectorAll('.sequence-pad')[1].click(); mount.querySelector('#repeatSequence').click(); tick(600);
      if (outcomes.sequence.elapsedSeconds > 7) throw Error('Tempo pausado foi contado');
      start('differences'); const items = mount.querySelectorAll('#sceneB button');
      items.forEach((button, i) => { if (button.querySelector('.scene-name').textContent !== mount.querySelectorAll('#sceneA .scene-name')[i].textContent) button.click(); }); tick(700);
      start('oddone');
      for (let round = 0; round < 3; round++) {
        const tiles = [...mount.querySelectorAll('.focus-tile')];
        tiles.find(tile => tiles.filter(other => other.textContent === tile.textContent).length === 1).click(); tick(1100);
      }
      start('counting');
      for (let round = 0; round < 3; round++) {
        const targetName = mount.querySelector('#countTip strong').textContent.split(' ').slice(1).join(' ');
        const quantity = [...mount.querySelectorAll('.count-grid .count-object')].filter(item => item.getAttribute('aria-label').endsWith(': ' + targetName)).length;
        [...mount.querySelectorAll('[data-answer]')].find(button => Number(button.dataset.answer) === quantity).click(); tick(1100);
      }
      return outcomes;
    } finally {
      cleanup?.(); mount.remove(); window.setTimeout = original.timeout; window.clearTimeout = original.clear;
      Math.random = original.random; performance.now = original.now;
    }
  })()`);
  assert.deepEqual(Object.keys(result), ['sort', 'pairs', 'path', 'sequence', 'differences', 'oddone', 'counting']);
  for (const [id, outcome] of Object.entries(result)) assert.equal(outcome.mistakes, 0, id);

  await t.test('leitores de tela recebem figuras reveladas e posições dos jardins', async accessibilityTest => {
    await evaluate(`(async () => {
      const { startGame } = await import('/test-games.js');
      const mount = document.createElement('div'); mount.id = 'accessibilityTestMount'; document.querySelector('#view').appendChild(mount);
      let now = 0, serial = 0, cleanup; const timers = new Map(), outcomes = [];
      const original = { timeout: window.setTimeout, clear: window.clearTimeout, random: Math.random, now: performance.now };
      window.setTimeout = (fn, ms) => { const id = ++serial; timers.set(id, { fn, at: now + ms }); return id; };
      window.clearTimeout = id => timers.delete(id); Math.random = () => .1; performance.now = () => now;
      window.__gameTest = {
        mount, outcomes,
        start(id, settings = { comfortablePace: true }, options = {}) {
          cleanup?.(); mount.innerHTML = ''; outcomes.length = 0;
          cleanup = startGame({ id, mount, settings, ...options, onComplete: result => outcomes.push(result) });
        },
        tick(ms) {
          const end = now + ms;
          for (;;) {
            const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            now = next[1].at; timers.delete(next[0]); next[1].fn();
          }
          now = end;
        },
        pause(value) { cleanup.setPaused(value); },
        restore() {
          cleanup?.(); mount.remove(); window.setTimeout = original.timeout; window.clearTimeout = original.clear;
          Math.random = original.random; performance.now = original.now; delete window.__gameTest;
        }
      };
      window.__gameTest.start('pairs');
    })()`);
    const cardNames = async () => (await cdp('Accessibility.getFullAXTree')).nodes
      .filter(node => node.role?.value === 'button' && /^Carta \d+/.test(node.name?.value || ''))
      .map(node => node.name.value);
    try {
      const preview = await cardNames();
      assert.equal(preview.length, 6);
      assert.equal(preview.every(name => /^Carta \d+, .+, revelada$/.test(name)), true, 'Cartas reveladas expõem o nome da figura, sem depender de emoji.');
      await evaluate('window.__gameTest.tick(100000)');
      assert.deepEqual(await cardNames(), preview, 'Ritmo confortável aguarda a pessoa observar as figuras.');
      await evaluate('document.querySelector("#pairStart").click()');
      const hidden = await cardNames();
      assert.equal(hidden.length, 6);
      assert.equal(hidden.every(name => /^Carta \d+, fechada\./.test(name)), true, 'Cartas fechadas não revelam os pares pela árvore de acessibilidade.');
      await evaluate(`(() => {
        const game = window.__gameTest, cards = [...game.mount.querySelectorAll('.pair-card')];
        game.pause(true); cards[0].click(); game.tick(10000);
      })()`);
      assert.deepEqual(await cardNames(), hidden, 'Pausa bloqueia ações nas cartas.');
      await evaluate('window.__gameTest.pause(false); document.querySelector(".pair-card").click()');
      const first = await cardNames();
      assert.equal(first[0], preview[0]);
      await evaluate(`(() => {
        const cards = [...window.__gameTest.mount.querySelectorAll('.pair-card')];
        const firstName = cards[0].getAttribute('aria-label').split(',')[1];
        const index = ${JSON.stringify(preview)}.findIndex((name, i) => i > 0 && name.split(',')[1] !== firstName);
        cards[index].click(); window.__gameTest.tick(100000);
      })()`);
      assert.equal((await cardNames()).filter(name => /revelada/.test(name)).length, 2, 'Par diferente permanece legível até a confirmação.');
      await evaluate('document.querySelector("#pairContinue").click()');
      assert.deepEqual(await cardNames(), hidden);
      await evaluate('window.__gameTest.start("differences")');
      const gardenTree = await cdp('Accessibility.getFullAXTree');
      const reference = gardenTree.nodes.filter(node => node.role?.value === 'image' && /^Jardim A, linha/.test(node.name?.value || ''));
      const choices = gardenTree.nodes.filter(node => node.role?.value === 'button' && /^Jardim B, linha/.test(node.name?.value || ''));
      assert.equal(reference.length, 9, 'Jardim de referência descreve os nove objetos.');
      assert.equal(choices.length, 9, 'Jardim interativo descreve os nove objetos.');
      for (const node of [...reference, ...choices]) assert.match(node.name.value, /linha [123], coluna [123]: [^\s.]+/);
      assert.match(reference[0].name.value, /Sol/);
      await evaluate(`(() => {
        const left = [...document.querySelectorAll('#sceneA .scene-name')];
        [...document.querySelectorAll('#sceneB button')].find((button, i) => button.querySelector('.scene-name').textContent !== left[i].textContent).click();
      })()`);
      const foundTree = await cdp('Accessibility.getFullAXTree');
      assert.ok(foundTree.nodes.some(node => node.role?.value === 'button' && /Jardim B, linha \d, coluna \d:.*Diferença encontrada/.test(node.name?.value || '')));

      await evaluate('window.__gameTest.start("sequence")');
      assert.equal(await evaluate('document.querySelectorAll("#sequencePreview li").length'), 4);
      assert.equal(await evaluate('[...document.querySelectorAll("#sequencePreview li")].every(item => /Rosa/.test(item.textContent) && /círculo/i.test(item.textContent))'), true, 'Sequência tem cor e forma para leitura.');
      await evaluate('window.__gameTest.tick(100000)');
      assert.equal(await evaluate('[...document.querySelectorAll(".sequence-pad")].every(pad => pad.disabled)'), true, 'Sequência confortável aguarda confirmação.');
      await evaluate('document.querySelector("#sequenceStart").click(); window.__gameTest.pause(true); document.querySelector(".sequence-pad").click(); window.__gameTest.tick(10000)');
      assert.equal(await evaluate('window.__gameTest.outcomes.length'), 0);
      assert.equal(await evaluate('document.querySelector("#counter").textContent.includes("0 de 4")'), true, 'Sequência não aceita jogadas pausadas.');
      await evaluate('window.__gameTest.pause(false); for (let i = 0; i < 8; i++) document.querySelector(".sequence-pad").click(); window.__gameTest.tick(700)');
      assert.equal(await evaluate('window.__gameTest.outcomes.length'), 1, 'Cliques extras não repetem a conclusão.');
      assert.equal(await evaluate('window.__gameTest.outcomes[0].mistakes'), 0);

      await evaluate('window.__gameTest.start("path"); document.querySelector("#pathAssist").focus()');
      for (let i = 0; i < 15; i++) {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      }
      await evaluate('window.__gameTest.tick(600)');
      assert.equal(await evaluate('window.__gameTest.outcomes.length'), 1, await evaluate('JSON.stringify({ counter: document.querySelector("#counter").textContent, focus: document.activeElement.outerHTML })'));
      assert.equal(await evaluate('window.__gameTest.outcomes[0].mistakes'), 0);

      await accessibilityTest.test('sete jogos aceitam pausa, erros e conclusão nas dificuldades mínima e máxima', async () => {
        const checked = await evaluate(`(() => {
          const game = window.__gameTest;
          let checked = 0;
          const check = (condition, message) => { if (!condition) throw new Error(message); };
          for (const difficulty of [-2, 0, 6, 96]) {
            for (const comfortablePace of [false, true]) {
              for (const id of ['sort', 'pairs', 'path', 'sequence', 'differences', 'oddone', 'counting']) {
                const label = id + ', dificuldade ' + difficulty + ', ritmo ' + comfortablePace;
                game.start(id, { comfortablePace }, { difficulty });
                const mount = game.mount, all = selector => [...mount.querySelectorAll(selector)];
                const cards = all('.pair-card'), symbols = cards.map(card => card.textContent);
                const before = mount.innerHTML;
                game.pause(true);
                all('button').forEach(button => button.click()); game.tick(150000);
                check(mount.innerHTML === before && game.outcomes.length === 0, label + ': pausa alterou a partida');
                game.pause(false);
                if (id === 'sort') {
                  const fruits = all('.fruit-tile'), baskets = all('.basket');
                  fruits[0].click(); baskets.find(b => b.dataset.name !== fruits[0].dataset.name).click();
                  for (const fruit of fruits) { fruit.click(); baskets.find(b => b.dataset.name === fruit.dataset.name).click(); }
                } else if (id === 'pairs') {
                  if (comfortablePace) mount.querySelector('#pairStart').click(); else game.tick(5000);
                  cards[0].click(); cards[symbols.findIndex(symbol => symbol !== symbols[0])].click();
                  if (comfortablePace) mount.querySelector('#pairContinue').click(); else game.tick(2000);
                  for (const symbol of new Set(symbols)) cards.filter((_, i) => symbols[i] === symbol).forEach(card => card.click());
                } else if (id === 'path') {
                  const points = mount.querySelector('.path-base').points;
                  for (let i = 0; i < points.numberOfItems; i++) {
                    const p = points.getItem(i);
                    check(p.x >= 15 && p.x <= 345 && p.y >= 15 && p.y <= 415, label + ': trilha fora da área visível');
                  }
                  const assist = mount.querySelector('#pathAssist');
                  assist.click();
                  check(!mount.querySelector('#counter').textContent.startsWith('Início'), label + ': primeiro clique não avança');
                  for (let i = 0; i < points.numberOfItems; i++) assist.click();
                  check(assist.disabled, label + ': trilha incompleta');
                } else if (id === 'sequence') {
                  if (comfortablePace) mount.querySelector('#sequenceStart').click(); else game.tick(150000);
                  all('.sequence-pad')[1].click(); game.tick(150000);
                  if (comfortablePace) mount.querySelector('#sequenceStart').click();
                  const length = all('#sequencePreview li').length;
                  for (let i = 0; i < length; i++) all('.sequence-pad')[0].click();
                } else if (id === 'differences') {
                  const left = all('#sceneA .scene-name'), right = all('#sceneB button');
                  const different = right.filter((button, i) => button.querySelector('.scene-name').textContent !== left[i].textContent);
                  right.find(button => !different.includes(button)).click();
                  different.forEach(button => button.click());
                } else if (id === 'oddone' || id === 'counting') {
                  let lastTarget;
                  for (let round = 1; round <= 3; round++) {
                    check(mount.querySelector('#roundLabel').textContent === 'Rodada ' + round + ' de 3', label + ': rodada errada');
                    if (id === 'oddone') {
                      const tiles = all('.focus-tile');
                      const odd = tiles.find(tile => tiles.filter(other => other.textContent === tile.textContent).length === 1);
                      const regular = tiles.find(tile => tile !== odd);
                      check(regular.textContent !== lastTarget, label + ': figuras não mudaram'); lastTarget = regular.textContent;
                      if (round === 1) regular.click();
                      odd.click();
                    } else {
                      const target = mount.querySelector('#countTip strong').textContent.split(' ').slice(1).join(' ');
                      check(target !== lastTarget, label + ': objeto não mudou'); lastTarget = target;
                      const quantity = all('.count-grid .count-object').filter(item => item.getAttribute('aria-label').endsWith(': ' + target)).length;
                      check(quantity >= 2 && quantity <= 12, label + ': quantidade inválida');
                      const answers = all('[data-answer]');
                      check(new Set(answers.map(button => button.dataset.answer)).size === 3, label + ': respostas repetidas');
                      if (round === 1) answers.find(button => Number(button.dataset.answer) !== quantity).click();
                      answers.find(button => Number(button.dataset.answer) === quantity).click();
                      check(all('.count-found').length === quantity, label + ': destaque incorreto');
                    }
                    check(mount.querySelector('#gameProgress').value === round, label + ': progresso errado');
                    if (round < 3) {
                      game.pause(true); mount.querySelector('.next-round').click(); game.tick(5000);
                      check(mount.querySelector('#roundLabel').textContent === 'Rodada ' + round + ' de 3', label + ': avançou durante pausa');
                      game.pause(false);
                      if (comfortablePace) {
                        game.tick(5000);
                        check(mount.querySelector('#roundLabel').textContent === 'Rodada ' + round + ' de 3', label + ': não respeitou ritmo confortável');
                        mount.querySelector('.next-round').click();
                      } else game.tick(1100);
                      check(game.outcomes.length === 0, label + ': concluiu antes da última rodada');
                    }
                  }
                }
                all('button').forEach(button => button.click());
                game.pause(true); game.tick(5000);
                check(game.outcomes.length === 0, label + ': concluiu durante a pausa');
                game.pause(false); game.tick(1000);
                check(game.outcomes.length === 1, label + ': conclusão ausente ou duplicada');
                check(game.outcomes[0].mistakes === (id === 'path' ? 0 : 1), label + ': erros incorretos');
                all('button').forEach(button => button.click()); game.tick(1000);
                check(game.outcomes.length === 1, label + ': cliques extras repetiram a conclusão');
                checked++;
              }
            }
          }
          return checked;
        })()`);
        assert.equal(checked, 56);
      });

      await accessibilityTest.test('sair entre rodadas cancela a transição automática', async () => {
        for (const id of ['oddone', 'counting']) {
          await evaluate(`(() => {
            const game = window.__gameTest;
            game.start(${JSON.stringify(id)}, { comfortablePace: false, reducedMotion: true });
            const mount = game.mount;
            if (${JSON.stringify(id)} === 'oddone') {
              const tiles = [...mount.querySelectorAll('.focus-tile')];
              tiles.find(tile => tiles.filter(other => other.textContent === tile.textContent).length === 1).click();
            } else {
              const target = mount.querySelector('#countTip strong').textContent.split(' ').slice(1).join(' ');
              const quantity = [...mount.querySelectorAll('.count-grid .count-object')].filter(item => item.getAttribute('aria-label').endsWith(': ' + target)).length;
              [...mount.querySelectorAll('[data-answer]')].find(button => Number(button.dataset.answer) === quantity).click();
            }
            if (mount.classList.contains('game-motion') || mount.querySelector('.game-celebrate')) throw Error('Redução de movimentos ignorada');
            if (!mount.querySelector('.next-round')) throw Error('Transição não foi preparada');
            game.start('sort'); game.tick(5000);
          })()`);
          assert.equal(await evaluate('window.__gameTest.mount.querySelectorAll(".fruit-tile").length'), 4);
          assert.equal(await evaluate('window.__gameTest.outcomes.length'), 0);
        }
      });

      await evaluate('window.__gameTest.start("counting")');
      const countingTree = await cdp('Accessibility.getFullAXTree');
      const countObjects = countingTree.nodes.filter(node => node.role?.value === 'button' && /^Objeto \d+:/.test(node.name?.value || ''));
      assert.equal(countObjects.length, await evaluate('document.querySelectorAll(".count-grid .count-object").length'), 'Cada objeto da contagem pode ser lido individualmente.');
      assert.ok(countObjects.every(node => /: [^\s]+/.test(node.name.value)));
      await evaluate('document.querySelector(".count-object").click()');
      assert.equal(await evaluate('document.querySelector(".count-object").getAttribute("aria-pressed")'), 'true');
      assert.match(await evaluate('document.querySelector("#counter").textContent'), /1 objeto marcado/);
      await evaluate('document.querySelector(".count-object").click()');
      assert.equal(await evaluate('document.querySelector(".count-object").getAttribute("aria-pressed")'), 'false');
      assert.match(await evaluate('document.querySelector("#counter").textContent'), /0 objetos marcados/);

      for (const width of [320, 360]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
        for (const fontSize of ['', '40px']) {
          await evaluate(`document.documentElement.style.fontSize = ${JSON.stringify(fontSize)}`);
          for (const id of ['sort', 'pairs', 'path', 'sequence', 'differences', 'oddone', 'counting']) {
            await evaluate(`window.__gameTest.start(${JSON.stringify(id)})`);
            await expectReflow(width, `${id}, ${width}px, fonte ${fontSize || 'normal'}`);
          }
        }
      }
    } finally { await evaluate('window.__gameTest?.restore(); document.documentElement.style.fontSize = ""'); }
  });
  assert.deepEqual(errors, []);
  await t.test('abrir index.html diretamente carrega a tela e responde aos cliques', async () => {
    await cdp('Page.navigate', { url: pathToFileURL(resolve('index.html')).href });
    for (let i = 0; i < 50; i++) {
      if (await evaluate('!!document.querySelector("#welcomeForm")')) break;
      await delay(100);
    }
    assert.equal(await evaluate('!!document.querySelector("#welcomeForm")'), true, 'A abertura direta não pode deixar o conteúdo em branco.');
    await evaluate('document.querySelector("#welcomeName").value = "Ana"; document.querySelector("#welcomeForm").requestSubmit(); document.querySelector("[data-nav=map]").click()');
    assert.equal(await evaluate('document.querySelectorAll(".map-node").length'), 15);
    await evaluate('document.querySelector(".map-node").click()');
    assert.ok(await evaluate('document.querySelectorAll(".fruit-tile").length') > 0);
  });
});
