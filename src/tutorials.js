const tutorials = {
  sort: {
    steps: ['Toque em uma fruta para selecioná-la.', 'Toque na cesta com a mesma fruta, ou arraste até ela.', 'Organize todas as frutas para concluir.'],
    tip: 'As frutas e as cestas mudam de posição. Compare a figura e o nome.',
    example: 'Exemplo: maçã → cesta de maçãs.',
    tasks: [
      { prompt: 'Primeiro, selecione a maçã.', choices: ['🍎 Maçã', '🍌 Banana'], answer: 0 },
      { prompt: 'Agora, escolha a cesta da maçã.', choices: ['🧺 Banana', '🧺 Maçã'], answer: 1 }
    ]
  },
  pairs: {
    steps: ['Observe as figuras e onde cada carta está.', 'Depois de esconder as cartas, abra duas de cada vez.', 'Figuras iguais ficam abertas. Encontre todos os pares.'],
    tip: 'No ritmo confortável, você escolhe quando esconder as cartas e quando virar um par diferente.',
    example: 'Você abriu uma carta com 🌼 Margarida. Procure outra margarida.',
    tasks: [{ prompt: 'Qual carta forma o par?', choices: ['🦋 Borboleta', '🌼 Margarida', '🍓 Morango'], answer: 1 }]
  },
  path: {
    steps: ['Comece no círculo perto da flor.', 'Deslize seguindo a linha até a borboleta.', 'Se preferir, use “Avançar pelo botão” com toque, Enter ou Espaço.'],
    tip: 'Se sair da linha, retome no círculo. Você mantém os trechos já percorridos.',
    example: '🌼 Flor → caminho → 🦋 Borboleta',
    tasks: [
      { prompt: 'Experimente avançar a partir da flor.', choices: ['Avançar um trecho →'], answer: 0 },
      { prompt: 'Mais um trecho até a borboleta.', choices: ['Chegar à borboleta 🦋'], answer: 0 }
    ]
  },
  sequence: {
    steps: ['Observe a ordem das cores e das formas.', 'Quando chegar sua vez, repita desde o primeiro símbolo.', 'Se precisar, use “Ver sequência novamente”.'],
    tip: 'Rever não tira pontos. Uma escolha fora da ordem reinicia a sequência; você pode tentar de novo.',
    example: 'Memorize este exemplo: Rosa ● → Azul ◆.',
    tasks: [
      { prompt: 'Qual é o primeiro símbolo?', choices: ['● Rosa', '◆ Azul', '▲ Amarelo'], answer: 0 },
      { prompt: 'E qual vem depois do rosa?', choices: ['● Rosa', '◆ Azul', '▲ Amarelo'], answer: 1 }
    ]
  },
  differences: {
    steps: ['Compare a mesma posição nos jardins A e B.', 'No jardim B, toque apenas nos objetos que mudaram.', 'Encontre todas as diferenças indicadas no contador.'],
    tip: 'Compare uma linha por vez. Cada diferença encontrada fica marcada nos dois jardins.',
    example: 'Jardim A: 🌼 Flor · ☀️ Sol. Jardim B: 🌼 Flor · 🌙 Lua.',
    tasks: [{ prompt: 'O que mudou no jardim B?', choices: ['🌼 Flor', '🌙 Lua'], answer: 1 }]
  },
  oddone: {
    steps: ['Procure o único símbolo que não se repete.', 'Toque nele para acertar a rodada.', 'Complete três rodadas, com figuras novas.'],
    tip: 'No ritmo confortável, use “Próxima rodada” quando estiver pronto. Não há limite de tempo.',
    example: 'Duas folhas e um cogumelo: 🍃 🍄 🍃.',
    tasks: [{ prompt: 'Toque no símbolo diferente.', choices: ['🍃 Folha à esquerda', '🍄 Cogumelo', '🍃 Folha à direita'], answer: 1 }]
  },
  counting: {
    steps: ['Leia qual objeto deve contar.', 'Toque nos objetos para marcar os que já contou, se quiser.', 'Escolha a quantidade. Complete as três rodadas.'],
    tip: 'As marcações ajudam a contar e podem ser desfeitas. Só a resposta escolhida vale como tentativa.',
    example: 'Conte apenas as maçãs: 🍎 🍐 🍎 🍎.',
    tasks: [{ prompt: 'Quantas maçãs há no exemplo?', choices: ['2 maçãs', '3 maçãs', '4 maçãs'], answer: 1 }]
  }
};

export function renderTutorial(container, gameId) {
  const guide = tutorials[gameId];
  container.innerHTML = '<ol class="instruction-list"></ol><p class="tutorial-tip"></p><section class="tutorial-practice" aria-label="Exemplo para experimentar"><h3>Experimente sem compromisso</h3><p class="tutorial-example"></p><p class="tutorial-prompt"></p><div class="tutorial-choices"></div><p class="tutorial-feedback" role="status" aria-live="polite"></p><small>Este exemplo não altera seus pontos. Você pode começar o jogo quando quiser.</small></section>';
  const list = container.querySelector('ol');
  guide.steps.forEach((step, index) => {
    const item = document.createElement('li'), number = document.createElement('span');
    number.textContent = index + 1; item.append(number, document.createTextNode(step)); list.appendChild(item);
  });
  container.querySelector('.tutorial-tip').textContent = guide.tip;
  container.querySelector('.tutorial-example').textContent = guide.example;
  const prompt = container.querySelector('.tutorial-prompt'), choices = container.querySelector('.tutorial-choices'), feedback = container.querySelector('.tutorial-feedback');
  let step = 0;
  function draw(focus = false) {
    const task = guide.tasks[step];
    prompt.textContent = task.prompt; choices.replaceChildren();
    task.choices.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'secondary-button'; button.textContent = label;
      button.addEventListener('click', () => {
        if (index !== task.answer) { feedback.textContent = 'Tente novamente. ' + task.prompt; return; }
        if (step < guide.tasks.length - 1) { step++; feedback.textContent = 'Isso! Agora experimente o próximo passo.'; draw(true); }
        else {
          button.classList.add('tutorial-correct'); button.setAttribute('aria-pressed', 'true');
          choices.querySelectorAll('button').forEach(choice => { choice.disabled = true; });
          feedback.textContent = 'Muito bem! Você entendeu como jogar.';
          feedback.tabIndex = -1; feedback.focus({ preventScroll: true });
        }
      });
      choices.appendChild(button);
    });
    if (focus) choices.querySelector('button').focus({ preventScroll: true });
  }
  draw();
}
