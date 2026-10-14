# Mente & Movimento

## Manual de uso

O **Mente & Movimento** é um site de minijogos casuais para exercitar memória, atenção, coordenação, raciocínio e percepção visual. A proposta é oferecer atividades curtas, acessíveis e sem pressão: não há cronômetro de punição, e cada pessoa pode jogar no próprio ritmo.

O site funciona em navegadores de computador e celular e não exige a criação de uma conta. O progresso fica salvo localmente no navegador e no dispositivo usados para jogar.

## Como começar

1. Abra o site no navegador.
2. No primeiro acesso, informe um nome ou apelido (até 24 caracteres).
3. Se quiser, escolha o tamanho geral do site e ative o ritmo confortável, o texto maior ou os sons suaves.
4. Selecione **Começar**.

As preferências podem ser alteradas depois no **Perfil** ou no botão **Acessibilidade**, no alto da página.

## Navegação

- **Início:** mostra a atividade sugerida, o progresso da meta diária e um resumo de dias seguidos, estrelas e XP. Use **Começar exercício** para abrir a próxima etapa.
- **Mapa:** apresenta as etapas disponíveis e bloqueadas. Concluir uma etapa libera a seguinte. Os sete jogos se repetem em novos ciclos, com desafios gradualmente mais exigentes. Use **Mapa** ou **Lista** para escolher como visualizar as etapas; texto maior e alto contraste usam a lista automaticamente.
- **Perfil:** reúne partidas concluídas, minutos aproximados, dias jogados, sequência, medalhas e indicadores de desempenho por habilidade. Esses indicadores descrevem o desempenho nos jogos e não são uma avaliação de saúde.
- **Acessibilidade:** permite ajustar leitura, visual, movimento, ritmo e sons.

## Os jogos

| Atividade | Como jogar | Habilidade em destaque |
| --- | --- | --- |
| **Organize a Feira** | Leve cada fruta até a cesta correspondente. Você pode arrastar ou tocar na fruta e depois na cesta. | Coordenação |
| **Pares do Jardim** | Vire duas cartas por vez e encontre as figuras iguais. | Memória |
| **Trilha da Borboleta** | Siga o caminho da flor até a borboleta. Use o dedo ou o mouse na trilha, ou avance pelos trechos com o botão. | Coordenação e percepção visual |
| **Cores em Festa** | Observe a sequência de cores e formas e repita os símbolos na mesma ordem. | Memória e raciocínio |
| **Dois Jardins** | Compare as figuras nas mesmas posições e selecione no segundo jardim as que mudaram. | Atenção e percepção visual |
| **Intruso no Jardim** | Em cada rodada, encontre o único símbolo diferente. São três rodadas. | Atenção e percepção visual |
| **Contagem da Colheita** | Conte apenas o objeto indicado. Se ajudar, marque os objetos enquanto conta e escolha a quantidade. São três rodadas. | Raciocínio e atenção |

As partidas variam a disposição dos objetos e podem mudar de dificuldade conforme o ciclo e o desempenho. Dentro de uma partida, **Ver tutorial** abre instruções e um exemplo; a partida fica pausada enquanto o tutorial está aberto. **Pausar partida** interrompe e retoma a atividade. Para sair pelo botão **Mapa**, confirme a saída: o progresso daquela partida não será contado.

## Resultados e progresso

Ao concluir uma etapa, a tela de resultado mostra estrelas, XP recebidos, desempenho registrado e habilidades praticadas. Estrelas e XP são recompensas do jogo; repetir uma atividade é permitido. Uma etapa já concluída pode ser jogada novamente pelo mapa ou pelo resultado. A meta de três atividades por dia é um incentivo visual, não uma exigência para continuar.

O mapa tem até 999.999.999 etapas geradas a partir dos sete jogos. As etapas futuras são desbloqueadas uma por vez, ao concluir a anterior.

## Acessibilidade e conforto

Abra **Acessibilidade** para ajustar estas opções a qualquer momento:

- **Texto maior:** amplia a leitura e apresenta as etapas em lista.
- **Alto contraste:** aumenta a distinção visual e apresenta as etapas em lista.
- **Modo para daltonismo:** mostra o nome da cor nos marcadores do mapa e nos botões coloridos do jogo. Os rótulos extras aparecem apenas enquanto a opção estiver ativada.
- **Mapa em lista:** organiza as etapas em ordem e informa quais estão disponíveis.
- **Reduzir movimentos:** desativa animações decorativas; o site também respeita a preferência de movimento do dispositivo.
- **Jogar no meu ritmo:** nos jogos de pares e sequência, permite decidir quando terminar de observar. Na sequência, também é possível rever antes de responder.
- **Sons do jogo:** ativa respostas sonoras suaves. As instruções e os resultados também aparecem por escrito.
- **Leitura em voz alta:** lê as instruções ao abrir uma tela ou jogo e os nomes dos controles ao navegar. O texto permanece visível; a opção depende do suporte de voz do navegador.
- **Tamanho geral do site:** escolha compacto, padrão ou ampliado no início ou no Perfil.

O site adapta os controles a telas pequenas e grandes. Algumas ações também têm alternativas por toque ou teclado, e os botões podem ser usados sem arrastar.

## Dados e privacidade

O nome, as preferências e o progresso são guardados no armazenamento local do navegador. O site não envia esse progresso a um servidor nem sincroniza os dados entre dispositivos. Ao usar outro navegador ou aparelho, o histórico pode não aparecer. Limpar os dados do navegador pode apagar o progresso.

No **Perfil**, **Apagar meu progresso** reinicia etapas, estrelas e histórico deste aparelho. O nome e as preferências são mantidos. Essa ação não pode ser desfeita.

Se o navegador não permitir salvar os dados, o site ainda pode funcionar durante a sessão, mas o progresso poderá se perder ao fechar a página.

## Executar o site no computador

Para abrir a versão já incluída no projeto, abra `index.html` em um navegador. Também é possível iniciar o servidor local. Para isso, é necessário ter Node.js 18 ou superior instalado. No terminal, na pasta do projeto, execute:

```powershell
npm install
npm run dev
```

Abra `http://127.0.0.1:8765` no computador. Mantenha o terminal com o servidor aberto enquanto estiver usando o site.

### Acessar pelo celular na mesma rede Wi-Fi

Inicie `npm run dev` no computador e, no celular conectado à mesma rede Wi-Fi, abra o endereço de rede informado no terminal. O servidor precisa permanecer aberto. Redes de convidados ou configurações do roteador podem impedir que os dispositivos se comuniquem.

No Windows, `npm run network:check` verifica a configuração de rede. Se o firewall impedir a conexão, `npm run network:configure` configura uma regra local restrita; execute esse comando em um PowerShell como administrador e somente em uma rede de confiança. Para remover a regra, use:

```powershell
powershell -NoProfile -File scripts/network.ps1 -Action Remove
```

## Publicação e manutenção

Para atualizar o JavaScript empacotado após alterações nos arquivos de `src/`, execute:

```powershell
npm run build
```

Para publicar em hospedagem estática ou Apache, gere o pacote com o comando acima e envie `index.html`, as pastas `src/` e `assets/`, preservando os caminhos. No Apache, inclua também `.htaccess`.

## Arquivos do projeto

- `index.html`: estrutura e entrada do site.
- `src/app.js`: telas, navegação, preferências e fluxo das partidas.
- `src/games.js`: lógica dos sete minijogos.
- `src/tutorials.js`: instruções e exemplos interativos.
- `src/state.js`: progresso, desbloqueios, pontuação e armazenamento local.
- `src/styles.css`: apresentação visual, layout responsivo e recursos de acessibilidade.
- `src/app.bundle.js`: JavaScript empacotado usado pelo site.
- `assets/`: ícone e recursos visuais.
- `scripts/serve.mjs`: servidor local de desenvolvimento.
- `scripts/network.ps1`: verificação e configuração opcional de acesso pela rede local no Windows.
