# Mente & Movimento

Site de jogos casuais para praticar memória, atenção, coordenação e percepção visual. Abre em navegadores de computador e celular, sem instalação. O progresso e as preferências ficam salvos no armazenamento local do navegador, neste dispositivo.

## Jogar no computador ou celular

Requisitos: Node.js 18 ou superior. Na raiz do projeto:

```powershell
npm install
npm run dev
```

No computador, abra `http://127.0.0.1:8765`. Para jogar no celular, conecte-o à mesma rede Wi-Fi e abra o endereço `http://IP-DO-COMPUTADOR:8765` informado no terminal. Mantenha o servidor ligado enquanto usa o site. Para alterar a porta, defina `$env:PORT = '8766'` antes de executar `npm run dev`.

Para publicar em hospedagem estática ou Apache, envie `index.html`, a pasta `src/` e `assets/icon-512.png`, mantendo os caminhos. O `.htaccess` permite somente esses arquivos do site e bloqueia o restante do projeto quando usado no Apache.

## O que há no site

- Início com atividade sugerida, meta diária, sequência de dias, estrelas e XP.
- Mapa de fases geradas em ciclos: os sete jogos retornam com desafios progressivamente mais exigentes e quase um bilhão de etapas possíveis.
- Tutorial antes de cada jogo, resultado com estrelas e habilidades praticadas, e dificuldade ajustada gradualmente.
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
- `src/state.js`: etapas, desbloqueio, pontuação e salvamento local.
- `src/styles.css`: layout responsivo e acessibilidade visual.
- `assets/`: ícone do site.
- `scripts/serve.mjs`: servidor de desenvolvimento local com lista restrita de arquivos públicos.
- `scripts/network.ps1`: diagnóstico e configuração opcional do acesso na rede local do Windows.

Os testes automatizados são executados com `npm test`. O teste de navegador usa Chrome/Edge em modo headless; em outros sistemas, defina `CHROME_PATH` para o executável do navegador.
