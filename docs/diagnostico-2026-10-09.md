# Diagnóstico e alterações — 09/10/2026

## Conexão pela rede local

No início, não havia processo escutando a porta 8765. O servidor já estava configurado para `0.0.0.0`, portanto mudar esse endereço não resolveria o problema. O Windows também tinha duas regras de bloqueio de entrada do Node.js no perfil público, que é o perfil ativo do Wi-Fi.

O servidor foi iniciado. O IP observado mudou de `192.168.0.106` para `192.168.10.37` durante a sessão. O endereço atual é **http://192.168.10.37:8765**. A página respondeu HTTP 200 pelo próprio computador usando seu IP de rede. Esse teste não comprova acesso de outro aparelho através do firewall.

**Pendência:** a sessão não tem privilégios de administrador. O firewall permanece ativo, assim como as regras públicas de bloqueio. Foi preparado `scripts/network.ps1`: na rede de confiança configurada como privada, `npm run network:configure` em PowerShell administrativo libera exclusivamente TCP 8765 para o Node.js, no IP e interface escolhidos, a partir da sub-rede local. As instruções e o comando de reversão estão no README. Não houve alteração de perfil de rede, desativação de firewall ou abertura de portas no roteador.

O servidor agora usa a pasta do projeto independentemente do diretório de execução; filtra interfaces virtuais e endereços automáticos inválidos; explica erros de porta ocupada; transfere arquivos por streaming; oferece retomada por byte range e valida `If-Range`; evita cache de versões antigas; fornece MIME, tamanho e nome do APK. A lista de arquivos permitidos continua restrita. O `.htaccess` também protege os arquivos internos quando o projeto é servido pelo XAMPP: página pública com HTTP 200, `package.json` com HTTP 403.

## APK

Os dois APKs anteriores passaram no `apksigner verify`. Ambos têm o mesmo identificador, certificado, versão 1.1/código 2, minSdk 24 e targetSdk 36. O APK publicado não tinha `testOnly` e não continha bibliotecas `.so` restritas a uma arquitetura. A assinatura v2 é válida para a faixa de Android declarada; ausência de v1 não demonstrou defeito.

O usuário informou que não havia versão anterior instalada. Não foi disponibilizado um aparelho físico, sua versão do Android ou o código de erro do instalador. **A causa exata da recusa original no celular permanece não comprovada.** Não foi alterado `applicationId`, minSdk, targetSdk ou certificado para tentar contornar uma causa desconhecida.

Foi gerado `release/Mente-e-Movimento-Android-debug.apk`, versão **1.2**, código **3**, com as correções desta revisão. Mantém `com.jardimdamente.app`, Android mínimo **7.0/API 24**, target **36** e o certificado SHA-256:

```text
f083e701cc98222a12873252fb2452d5a4546e436d05966cbf65f2c4e3aaec9d
```

O pacote não inclui bibliotecas nativas específicas de CPU nem exige APKs divididos. O processo verifica assinatura, alinhamento de arquivos, manifesto, presença dos recursos offline, continuidade do certificado e ausência de downgrade antes da entrega. As versões anteriores são preservadas em `release/archive/`. Tamanho e hash do arquivo final ficam em `release/apk-report.json` e `release/SHA256.txt`.

Android 7.0 é o requisito do sistema operacional; a interface também requer Android System WebView/Chrome atualizado. Não foi alegada compatibilidade com todos os WebViews antigos de fábrica.

O ambiente possui `JAVA_HOME` apontando para JDK 17. A seleção de Java agora verifica a versão e utiliza um JDK compatível, como o fornecido pelo Android Studio, sem modificar a configuração global do Windows. O Capacitor deste projeto compila fontes Java 21.

O APK foi instalado com `adb install -r`, sem `-t` nem bypass de verificações, em emulador **Android 14/API 34, x86_64**: resultado `Success`. A tela inicial foi confirmada na WebView Android em `https://localhost/`, sem aviso de falha de armazenamento. Isso valida o pacote no ambiente testado, mas não substitui a verificação no celular de destino. Houve lentidão e uma reinicialização do sistema emulado durante a inicialização; a tela foi verificada após a recuperação.

`npm run apk:diagnose` verifica o APK e consulta versão, modelo, arquiteturas e espaço do aparelho conectado. `npm run apk:diagnose -- --install` tenta a instalação preservando dados e apresenta o erro real do Android, se houver.

## Código e experiência

- O jogo de sequência bloqueia novos toques e repetição após a vitória; eles podiam adicionar erros no intervalo anterior à tela de resultado. A mesma proteção foi aplicada ao jogo de diferenças.
- Temporizadores de apresentação e conclusão são suspensos em segundo plano; o tempo fora do aplicativo não entra na duração da partida.
- Mais de 100 erros não são mais convertidos em zero erros. Durações inválidas não tornam o total de minutos `NaN`/`Infinity`.
- Acesso bloqueado ao `localStorage` não impede a inicialização. Falha de leitura ou gravação é apresentada ao usuário, sem prometer que uma preferência foi salva quando isso falhou.
- Os textos explicam saída da partida, instalação, downloads incompletos e armazenamento local. O perfil identifica minutos aproximados e o limite das últimas 200 partidas do histórico.
- A feira usa apenas frutas, em acordo com o tutorial. Preferências, cinco jogos, mapa, desbloqueio e progresso foram preservados.
- Os listeners do Capacitor são registrados apenas no ambiente nativo; falhas de registro são tratadas. O teste Android herdado do modelo, que verificava um pacote incorreto, foi substituído por verificação do pacote real e dos recursos offline. O teste de exemplo `2 + 2` foi removido.

As cinco dependências diretas têm uso identificado. A auditoria encontrou um problema transitivo em `xcode → uuid`, usado pela CLI. Um override específico para `uuid@11.1.1` removeu o alerta, com validação de `xcode.generateUuid()` e sincronização Android. `npm audit` passou com **zero vulnerabilidades conhecidas** nesta execução.

## Verificações

- `npm test`: **8 testes aprovados**, incluindo os cinco jogos em Chrome com viewport móvel, pausa, cliques após conclusão, navegação, armazenamento bloqueado/corrompido, pontuação, download íntegro, retomada e proteção dos arquivos internos.
- `httpd -t`: `Syntax OK`; acesso à página e bloqueio dos arquivos internos conferidos por HTTP.
- Assinatura e alinhamento: aprovados com ferramentas do Android SDK.
- Instalação e tela inicial: confirmadas no emulador Android 14.
- `npm run apk -- --device-test`: compilação aprovada e **1 teste nativo aprovado** no Android 14, verificando o pacote real e os recursos offline.
- Download final pelo IP local: HTTP 200, **6.125.207 bytes**, conteúdo idêntico ao APK em disco. SHA-256: `d2ad354298b78586a52d59ca69756ae898af2a258e9bf1f427f96ac579185ed5`.

## Referências técnicas

- [Verificação de APK com apksigner — Android Developers](https://developer.android.com/tools/apksigner).
- [Requisitos de ambiente — Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).
- [Aviso de segurança e versões corrigidas do uuid](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).
