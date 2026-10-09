# Mente & Movimento

Aplicativo Android de jogos casuais para praticar coordenação, memória, atenção e percepção visual. Funciona sem internet e guarda o progresso no aparelho. A raiz do projeto inclui uma página simples para baixar o APK.

## Jogar

Instale o APK Android gerado em `release/Mente-e-Movimento-Android-debug.apk`. Para abrir a página de download localmente:

```powershell
npm run dev
```

No computador, visite `http://127.0.0.1:8765`. Para abrir no celular, conecte-o à mesma rede Wi-Fi e use o endereço `http://IP-DO-COMPUTADOR:8765` mostrado pelo comando. Mantenha o servidor em execução enquanto baixa. O `index.html` da raiz serve apenas para baixar o aplicativo; a interface do jogo continua em `mobile/index.html`.

Para publicar a página de download, envie `index.html`, `assets/icon-512.png`, `release/Mente-e-Movimento-Android-debug.apk` e `release/SHA256.txt` ao mesmo servidor, mantendo essas pastas. A página não precisa dos arquivos internos do aplicativo.

## Conteúdo do MVP

## Acessibilidade no aplicativo

O botão **Acessibilidade**, no cabeçalho, abre as opções de texto maior, alto contraste, redução de movimentos, mapa em lista, ritmo de observação e sons. As opções ficam salvas no aparelho e são mantidas ao apagar o progresso. Texto maior e alto contraste mostram as etapas em uma lista com ordem, objetivos e estado de desbloqueio.

O modo **Jogar no meu ritmo** vem ativado: nos pares e nas sequências, as figuras ficam disponíveis até a pessoa decidir começar. A sequência também tem lista de cores e formas, e os jardins apresentam nomes e posições dos objetos. Arrastar e seguir a trilha têm alternativas por botão; os jogos podem ser pausados sem perder a partida.

Leitores de tela recebem nomes, estados e atualizações de progresso. Teclado permite selecionar controles, fechar diálogos com Escape e retomar o foco após uma ação. O Android aceita zoom e aplica a preferência de tamanho de fonte do sistema. As alterações têm testes de navegação, árvore de acessibilidade e telas estreitas; a experiência com TalkBack ainda requer avaliação prática com usuários no aparelho.

## Conteúdo dos jogos

- Início com atividade sugerida, meta diária leve, sequência de dias, estrelas e XP.
- Mapa ilustrado original com caminho sinuoso e cinco etapas circulares distintas: organizar frutas, encontrar pares, seguir uma trilha, repetir cores e encontrar diferenças.
- Tutorial curto antes de cada jogo e tela de resultado com estrelas, XP e habilidades praticadas.
- Complexidade ajustada gradualmente por jogo conforme os erros; sem cronômetro de punição.
- Perfil com medalhas, semana jogada e indicadores de desempenho apenas dentro dos jogos.
- Texto ampliado, sons opcionais, controles grandes e alternativa por toque para arrastar e seguir a trilha.
- Progresso salvo em `localStorage`.

## Android

Requisitos: Node.js 22 ou superior, JDK 21 ou superior e Android SDK com plataforma 36 e Build Tools. Na raiz do projeto:

```powershell
npm ci
npm run apk
```

`npm run build:mobile` apenas prepara a versão web para o Capacitor. `npm run apk` também sincroniza o projeto Android e gera o APK de teste e seu SHA-256 em `release/`. O APK é assinado para desenvolvimento; publicação em loja requer assinatura de lançamento.

Para atualizar o ícone Android após mudar o desenho:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-brand-icon.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-android-assets.ps1
```

## Organização

- `src/state.js`: etapas, desbloqueio, XP, estrelas, adaptação e salvamento.
- `src/games.js`: cinco minijogos independentes.
- `src/app.js`: telas, navegação e fluxo de partida.
- `src/styles.css`: interface responsiva e acessibilidade visual.
- `mobile/index.html`: entrada usada no Android.
- `index.html`: página de download do APK Android.
- `assets/map-meadow.png`: cenário original do mapa.
- `scripts/`: compilação e recursos Android.

Execute `npm run build:mobile` e `npm test` para verificar progresso, armazenamento, download e os cinco jogos. O teste de interface usa Chrome/Edge em modo headless; em outros sistemas, defina `CHROME_PATH` para o executável do navegador.

## Acesso pelo celular e firewall

`npm run dev` inicia o servidor em `0.0.0.0:8765` e informa os IPs atuais. O IP pode mudar ao trocar de rede ou após reconectar. Use **http://**, o IP do Wi-Fi e a porta impressa, nunca `localhost` no celular. Para outra porta, defina `$env:PORT = '8766'` antes de iniciar. `HOST` permite limitar a interface de escuta.

```powershell
npm run network:check
```

O diagnóstico mostra IP, perfil de rede, processo que escuta a porta e regras do Node.js. Se o Windows bloquear a conexão:

1. Somente na sua rede de confiança, selecione **Privada** nas propriedades do Wi-Fi do Windows. Não mude redes públicas ou compartilhadas para privadas.
2. Abra PowerShell **como administrador**, entre na pasta do projeto e execute `npm run network:configure`.
3. Mantenha `npm run dev` ativo e teste o endereço impresso no celular, conectado à mesma rede. Redes de convidados e isolamento de clientes do roteador podem impedir acesso entre aparelhos.

A regra criada permite apenas TCP 8765, no Node.js encontrado, na interface Wi-Fi, no IP atual e para a sub-rede local, em perfil privado. O firewall e os bloqueios em redes públicas são preservados. Se o IP ou o executável do Node mudar, execute a configuração novamente. Para outra interface/porta: `powershell -NoProfile -File scripts/network.ps1 -Action Configure -InterfaceAlias 'Ethernet' -Port 8766`.

Para remover apenas essa regra: `powershell -NoProfile -File scripts/network.ps1 -Action Remove`. Não abra portas no roteador. O servidor oferece somente a página, o ícone, o APK e seu SHA-256.

No XAMPP, a página também fica em `/www/Mente-/` na porta do Apache. O `.htaccess` restringe os arquivos públicos nessa pasta, evitando exposição de código, histórico Git e arquivos Android. Não é necessário ampliar o acesso ao painel do XAMPP para usar o servidor Node.

## Diagnóstico do APK

O pacote permanece `com.jardimdamente.app`, com `minSdk 24` (Android 7.0) e `targetSdk 36`. O APK reúne os arquivos necessários para funcionar offline. A compilação verifica assinatura, alinhamento, manifesto, conteúdo e continuidade do certificado antes de substituir o download. A versão anterior fica em `release/archive/`. O relatório está em `release/apk-report.json` e o hash em `release/SHA256.txt`.

```powershell
npm run apk:diagnose
# Com um aparelho conectado e depuração USB autorizada:
npm run apk:diagnose -- --install
# Compilar e executar o teste Android em aparelho/emulador conectado:
npm run apk -- --device-test
```

O segundo comando tenta instalar/atualizar preservando os dados e apresenta o código real retornado pelo Android. Não desinstala aplicativos, não permite downgrade e não contorna verificações de segurança.

| Código / situação | Ação indicada |
| --- | --- |
| `INSTALL_FAILED_OLDER_SDK` | Use Android 7.0 ou superior. Não reduza o minSdk sem portar e validar as dependências. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Gere com a chave da versão instalada; não apague os dados para contornar o conflito. |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | Use versão com `versionCode` igual ou superior à instalada. |
| `INSTALL_FAILED_INSUFFICIENT_STORAGE` | Libere espaço no aparelho e tente novamente. |
| `INSTALL_FAILED_USER_RESTRICTED` | Confira a autorização de instalação e eventuais políticas do aparelho. |
| Download incompleto / erro de análise | Baixe novamente o APK e compare o SHA-256. |

Guarde a chave de desenvolvimento existente em local seguro para manter atualizações compatíveis. Este APK é para testes; distribuição em loja exige uma chave de lançamento própria. A assinatura não deve ser trocada para tentar resolver uma mensagem genérica do instalador.

## Dependências

As cinco dependências diretas são utilizadas. O `override` de `xcode → uuid@11.1.1` corrige o aviso GHSA-w5hq-g745-h8pq na ferramenta de compilação, preservando a API `uuid.v4()` usada pelo xcode. Não faz parte do código executado no Android. Reavalie o override quando o pacote xcode atualizar sua dependência. Auditoria: `npm audit`.
