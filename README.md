# Mente & Movimento

Site de jogos casuais para praticar memória, atenção, coordenação e percepção visual. Abre em navegadores de computador e celular, sem instalação. O progresso e as preferências ficam salvos no armazenamento local do navegador, neste dispositivo.

## Jogar no computador ou celular

Para jogar neste computador, você também pode abrir `index.html` diretamente no navegador. O arquivo `src/app.bundle.js`, incluído no projeto, permite essa abertura sem servidor.

Requisitos: Node.js 18 ou superior. Na raiz do projeto:

```powershell
npm install
npm run dev
```

No computador, abra `http://127.0.0.1:8765`. Para jogar no celular, conecte-o à mesma rede Wi-Fi e abra o endereço `http://IP-DO-COMPUTADOR:8765` informado no terminal. Mantenha o servidor ligado enquanto usa o site. Para alterar a porta, defina `$env:PORT = '8766'` antes de executar `npm run dev`.

Depois de alterar o JavaScript em `src/`, execute `npm run build` para atualizar `src/app.bundle.js`. Os comandos `npm run dev` e `npm test` fazem isso automaticamente antes de iniciar.

Para publicar em hospedagem estática ou Apache, execute `npm run build` e envie `index.html`, as pastas `src/` e `assets/`, mantendo os caminhos. Inclua também `.htaccess` no Apache: ele permite somente os arquivos do site e bloqueia o restante do projeto.

## O que há no site

- Entrada com nome ou apelido obrigatório e preferências opcionais. Perfis já salvos com nome continuam disponíveis.
- Início com atividade sugerida, meta diária, sequência de dias, estrelas e XP.
- Mapa de fases geradas em ciclos: os sete jogos retornam com desafios progressivamente mais exigentes e quase um bilhão de etapas possíveis.
- Os jogos abrem diretamente. Dentro de cada partida, **Ver tutorial** pausa o jogo e mostra instruções e um exemplo interativo.
- Resultado com estrelas e habilidades praticadas, e dificuldade ajustada gradualmente.
- Intruso e Contagem com três rodadas; no ritmo confortável, você escolhe quando avançar. Barra de progresso e acertos seguidos acompanham a partida.
- Frutas, cartas, diferenças e trilhas variadas a cada partida, com animações que respeitam a redução de movimentos.
- Perfil com medalhas, semana jogada e indicadores do próprio jogo.
- Acessibilidade com texto maior, alto contraste, redução de movimentos, mapa em lista, ritmo confortável e sons opcionais.
- Alternativas por toque e teclado para ações de arrastar e seguir a trilha; partidas podem ser pausadas.
- Layout responsivo para telas pequenas e grandes, sem cronômetro de punição.

O progresso não é enviado a um servidor nem sincronizado entre dispositivos. Limpar os dados do navegador ou trocar de navegador/dispositivo pode apagar ou não mostrar o histórico anterior.

## Acesso pelo celular e firewall

`npm run dev` inicia o servidor em `0.0.0.0:8765` e informa os endereços locais disponíveis. Use o endereço da mesma rede Wi-Fi, começando com `http://`, e mantenha essa janela aberta. Redes de convidados e isolamento de clientes do roteador podem bloquear a comunicação entre aparelhos.

```powershell
npm run network:check
```

Se o Windows bloquear o acesso, na sua rede de confiança configure o Wi-Fi como **Privado** e execute `npm run network:configure` em um PowerShell como administrador. A regra criada é restrita à porta, ao Node.js, à interface e à sub-rede local. Não desative o firewall nem abra portas no roteador. Para remover somente essa regra: `powershell -NoProfile -File scripts/network.ps1 -Action Remove`.

No XAMPP, copie os arquivos de publicação para `/www/Mente-/`. O servidor Node é opcional quando o site está em uma hospedagem web.

## Organização

- `index.html`: entrada do site.
- `src/app.js`: telas, navegação e fluxo das partidas.
- `src/games.js`: sete minijogos.
- `src/tutorials.js`: instruções e exemplos interativos dos jogos.
- `src/state.js`: etapas, desbloqueio, pontuação e salvamento local.
- `src/styles.css`: layout responsivo e acessibilidade visual.
- `assets/`: ícone do site.
- `scripts/serve.mjs`: servidor de desenvolvimento local com lista restrita de arquivos públicos.
- `scripts/network.ps1`: diagnóstico e configuração opcional do acesso na rede local do Windows.

Os testes automatizados são executados com `npm test`. O teste de navegador usa Chrome/Edge em modo headless; em outros sistemas, defina `CHROME_PATH` para o executável do navegador.
