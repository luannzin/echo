<p align="center">
  <img src="assets/banner.svg" alt="echo" width="100%">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Português (Brasil)</b>
</p>

# echo

<p align="center">
  <a href="https://app.useecho.dev"><b>Testar o echo</b></a> · <a href="https://github.com/luannzin/echo/releases/latest">App desktop</a> · <a href="https://useecho.dev">Site</a>
</p>

<p align="center">
  <a href="https://app.useecho.dev"><img src="https://img.shields.io/badge/Testar-app.useecho.dev-1A1AFF?style=for-the-badge" alt="Testar o echo no navegador"></a>
  <a href="https://github.com/luannzin/echo/releases/latest"><img src="https://img.shields.io/badge/Desktop-macOS%2C%20Windows%2C%20Linux-1A1AFF?style=for-the-badge" alt="Versões desktop"></a>
  <a href="docs/"><img src="https://img.shields.io/badge/Docs-neste%20reposit%C3%B3rio-1A1AFF?style=for-the-badge" alt="Documentação"></a>
  <img src="https://img.shields.io/badge/Chave%20de%20IA-n%C3%A3o%20precisa-F2F4FF?style=for-the-badge&labelColor=1A1AFF" alt="Não precisa de chave de API de IA">
  <img src="https://img.shields.io/badge/Funciona-offline-1A1AFF?style=for-the-badge" alt="Funciona offline">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.3+-1A1AFF?style=for-the-badge&logo=bun&logoColor=white" alt="Bun 1.3+"></a>
  <a href="https://buymeacoffee.com/luannzin"><img src="https://img.shields.io/badge/Me%20pague%20um%20caf%C3%A9-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=000000" alt="Me pague um café"></a>
  <img src="https://img.shields.io/badge/Licen%C3%A7a-a%20definir-8A8A8A?style=for-the-badge" alt="Licença: a definir">
</p>

**O bloco de notas que aprende com você.** Escreva uma linha e aperte Enter. echo acha o prazo, a tarefa e as palavras que você repete, e devolve isso quando você precisa. Nada sai da sua máquina.

Não há provedor de modelo por trás disso. Busca, arquivamento e aprendizado são código comum rodando sobre as suas próprias notas, então **nenhum recurso essencial precisa de chave de API de IA**. Postgres de verdade, compilado para WebAssembly, roda no seu navegador e guarda as notas ali.

<!-- Um WebP animado, e não o mp4: o GitHub serve vídeo em `raw` como anexo, então uma tag <video>
     baixa o arquivo em vez de tocar, e o conteúdo alternativo de <video> nunca aparece quando é só
     a *fonte* que falhou. Este anima na página e, onde não animar, vira o próprio primeiro quadro.
     O link vai para a visualização de arquivo do GitHub, que toca o arquivo 2560x1440 de verdade. -->

<p align="center">
  <a href="https://github.com/luannzin/echo/blob/main/apps/www/public/reel/echo.mp4">
    <img src="assets/reel.webp" alt="echo em uso: uma linha é digitada no campo e echo lê dali a contagem de palavras, uma etiqueta Vence sexta e quatro notas relacionadas; a paleta separa a pergunta notas sobre cache em pagamentos numa etiqueta de Pagamentos e um assunto; a Entrada sugere uma pasta e nomeia as notas que levaram até ela." width="100%">
  </a>
</p>

<p align="center"><sub><a href="https://github.com/luannzin/echo/blob/main/apps/www/public/reel/echo.mp4">Ver em tamanho real (2560&times;1440, 29s)</a></sub></p>

---

## O que ele faz

| | |
| --- | --- |
| **Nada para assinar** | Sem conta, sem chave, sem servidor, sem telemetria. Uma única coisa cruza a rede: um modelo de 120 MB, baixado uma vez, na primeira busca por sentido. |
| **A busca separa a pergunta** | "notas sobre cache em pagamentos" são duas perguntas em uma. echo separa o assunto do projeto e mostra cada filtro como uma etiqueta que sai com um toque, e diz quantas notas ficaram de fora. |
| **Todo palpite mostra o porquê** | A pasta sugerida vem acompanhada das notas que levaram até ela, que você pode abrir e contestar. A Entrada resolve a pilha inteira antes e só move quando você manda. |
| **Ele aprende as suas palavras** | Você digita `k8s`. Metade das suas notas diz *kubernetes* e o resto diz *o cluster*. echo descobre isso só pelas suas notas, e buscar uma encontra a outra. |
| **Uma pilha, quatro leituras** | Fluxo, lista de tarefas, linha do tempo e uma página para escrever. As tarefas e as datas saem de frases comuns, e a tarefa só existe onde você concordou com a etiqueta. |
| **Feito para escrever** | Um campo que nunca sai da tela, Enter para salvar, `Ctrl/Cmd Z` para desfazer, comandos com barra, uma paleta de comandos, e um atalho de teclado para tudo que o mouse faz. |
| **Seu em qualquer máquina** | Um PWA instalável que abre sem rede, e a mesma build numa janela Tauri no macOS, Windows e Linux, com um modo editor que o site nunca oferece. |
| **Seu assistente pode usar** | A versão desktop pode servir MCP no loopback, então um assistente na sua máquina lê e escreve notas pelas ferramentas do próprio echo. Desligado por padrão, ativo só enquanto o echo está aberto, e nada vai para um servidor. |
| **Fala português e inglês** | Cada palavra da interface vem de um dicionário lido na renderização, e `bun run typecheck` é a checagem de tradução completa. |

---

## Instalação

**[Abra o echo no navegador](https://app.useecho.dev).** Nada para instalar, sem conta. Para rodar por conta própria você precisa do [Bun](https://bun.sh) 1.3 ou mais novo, e é a lista inteira para o app web.

```bash
git clone https://github.com/luannzin/echo.git
cd echo && bun install
bun run dev
```

O app fica em http://localhost:3000 e o site em http://localhost:3001. Não há `.env` para preencher nem conta para criar.

Para a versão desktop, `bun run dev:desktop` abre a janela Tauri e `bun run build:desktop` empacota. Ela também pede uma toolchain Rust e, no Linux, `webkit2gtk-4.1`, `gtk+-3.0` e `libsoup-3.0`. As builds com tag ficam em [Releases](https://github.com/luannzin/echo/releases/latest).

**O único download.** O `multilingual-e5-small` (cerca de 120 MB) vem do Hugging Face na primeira busca por sentido e depois fica no cache do navegador. Escrever, arquivar e buscar por palavra funcionam antes disso. Ele é multilíngue de propósito: notas em pt-BR precisam ser encontradas tão bem quanto notas em inglês.

---

## Telas

### Pergunte como você perguntaria a uma pessoa

<img src="apps/www/public/shots/search.webp" alt="A paleta de comandos com a busca notas sobre cache em pagamentos. Uma etiqueta removível de Pagamentos foi tirada da pergunta, dezesseis notas estão marcadas como deixadas de lado, e as quatro notas de pagamentos aparecem abaixo." width="100%">

A paleta separa o assunto do projeto e devolve cada filtro como uma etiqueta que você pode tirar. A contagem do que ficou de fora fica ao lado da pergunta que causou isso.

### Todo palpite mostra o porquê

<img src="apps/www/public/shots/inbox.webp" alt="A Entrada com notas para guardar. Cada linha oferece uma pasta e, abaixo, as frases por trás dela: as notas já guardadas ali e o hábito que echo leu nelas." width="100%">

As pastas são decididas por um voto entre as notas vizinhas, não por um classificador. Nada é treinado: cada nota que você arquiva é mais um voto.

### Uma nota chega com as notas às quais pertence

<img src="apps/www/public/shots/note.webp" alt="Uma nota sobre novas tentativas de pagamento aberta no echo, com os conceitos no alto e um painel de notas relacionadas ao lado, cada uma dizendo por que está ali." width="100%">

Mesmo projeto, mesma época, costumam ser abertas juntas: o motivo é uma frase e não uma porcentagem, e os conceitos no alto saíram da própria nota.

### Ele aprende as suas palavras, não as de um dicionário

<img src="apps/www/public/shots/meaning.webp" alt="Buscando k8s. O primeiro resultado tem as letras; o segundo é uma nota sobre um rollout de kubernetes que não tem, encontrada por sentido e não por soletração." width="100%">

Duas palavras são a mesma palavra quando você escreve uma *no lugar* da outra, então os apelidos vêm do uso quase exclusivo e não da semelhança. As suas próprias notas são toda a evidência.

### As mesmas notas, quatro jeitos de ler

| | |
| --- | --- |
| <img src="apps/www/public/shots/stream.webp" alt="O fluxo: notas marcadas com quando foram escritas e editadas, com o campo de escrita ancorado no pé da tela." width="100%"> | <img src="apps/www/public/shots/tasks.webp" alt="A lista de tarefas: tarefas em aberto agrupadas em A vencer e Sem data, cada uma mostrando a nota de onde saiu." width="100%"> |
| **O fluxo.** Tudo cai aqui primeiro, na ordem em que você escreveu. | **Tarefas.** Tiradas de frases comuns, com as datas que essas frases citam. |
| <img src="apps/www/public/shots/timeline.webp" alt="A linha do tempo: uma faixa Esta semana com os prazos que echo encontrou, e abaixo os dias, cada um com as palavras que passaram por ele." width="100%"> | <img src="apps/www/public/shots/write.webp" alt="Uma frase sendo escrita no echo. O campo mostra a contagem de palavras e uma etiqueta Vence sexta, e o painel ao lado já lista as notas ligadas a ela." width="100%"> |
| **Linha do tempo.** Por dia e por semana, com o que vem aí no alto. | **Escrevendo.** Escreva uma linha e veja ela sendo lida, ao lado das notas que ele lembrou. |

---

## Como ele roda

| | |
| --- | --- |
| **A busca acompanha a digitação** | Um índice GIN sobre um `tsvector` guardado, não uma varredura. Dez mil notas respondem em 21 ms, e as relacionadas em 8 ms. O sentido chega um instante depois e reordena as respostas, sem segurar nada. |
| **Offline é o caso normal** | O service worker não faz precache: o documento vem da rede primeiro, então uma interface velha nunca prende você a uma build antiga, e o resto vem do cache primeiro porque é endereçado por conteúdo. |
| **Esquecer é de verdade** | As regras aprendidas são refeitas na leitura e nunca ficam guardadas, então "esquecer isso" é apagar e não marcar uma bandeira que alguma outra parte ainda consulta. |
| **A versão desktop é o mesmo código** | Tauri v2 em volta do mesmo export estático. O lado Rust é uma janela e nada mais: o banco, a busca e o aprendizado rodam no app web em qualquer host. |
| **O banco é Postgres de verdade** | PGlite no navegador agora, as mesmas migrations num servidor depois. Nada fora do `@echo/db` escreve SQL. |

O desenvolvimento roda no Turbopack e a produção no webpack (`next build --webpack`): o Turbopack compila errado o módulo de runtime do PGlite, e o resultado é um app que carrega e não consegue abrir o próprio banco, visível só num export buildado. O `apps/web/next.config.ts` registra os detalhes.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `bun run dev` | App na 3000, site na 3001 |
| `bun run dev:web` / `dev:www` / `dev:desktop` | Uma superfície de cada vez |
| `bun run build` | Builda tudo pelo Turborepo |
| `bun run build:desktop` | Empacota o app desktop |
| `bun run start` | Serve o export estático, depois do `bun run build` |
| `bun run typecheck` | `tsc --noEmit` em todo pacote, e a checagem de tradução |
| `bun run lint` / `lint:fix` | Biome: lint, formatação e ordem de imports numa passada |
| `bun run test` | Testes de unidade e integração, contra PGlite de verdade |
| `bun run --cwd packages/db db:generate` | Regera as migrations depois de mudar o schema |

---

## Estrutura

```text
apps/www            Site: app Next próprio, tokens próprios, deploy próprio, sem código de domínio
apps/web            Aplicação Next.js (PWA)
  app/              entradas de rota e os componentes que guardam o estado da aplicação
  app/postit/       o post-it do desktop: janela própria, dono próprio, sem banco
  modules/          uma pasta por recurso, cada uma com seus _components
  shared/           componentes, helpers e o dicionário que mais de um módulo usa
apps/desktop        Casca Tauri em volta da mesma build web; sem regra de negócio em Rust
packages/types      Contratos de domínio (schemas zod, tipos inferidos)
packages/core       Lógica de domínio, serviços, barramento de eventos. Sem IO, sem React
packages/db         Repositórios e migrations (PGlite local, Postgres num servidor)
packages/parser     Análise determinística de conteúdo: datas, tarefas, palavras-chave
packages/embeddings Runtime local de embeddings atrás de uma interface trocável
packages/search     Busca léxica e semântica, ranking híbrido, sugestão de destino
packages/learning   Eventos de aprendizado entram, regras aprendidas saem
packages/sync       Protocolo de sync e resolução de conflito
packages/ui         Primitivos de UI compartilhados (alvo de promoção; coss vive em apps/web por ora)
packages/config     Configuração de runtime compartilhada
packages/test-utils Fixtures e helpers de teste
tooling/tsconfig    Presets de TypeScript compartilhados
```

Um pacote de domínio nunca guarda uma frase: o `@echo/search` devolve códigos de motivo, e a interface é dona das palavras.

---

## Situação

**Funciona hoje.** Captura, busca, notas relacionadas, pastas aninhadas, triagem na Entrada, tarefas, linha do tempo, configurações, modo editor, a superfície de escrita e os comandos com barra, dois idiomas, o PWA e a casca desktop. Tudo local, na sua máquina.

**A seguir: sync.** Um protocolo de log de mudanças, um servidor Postgres rodando as mesmas migrations, tratamento explícito de conflito e autenticação. Não entrega nada até estar pronto, então fica por último.

**Ainda não construído.** Projetos como entidade própria, e CI. O [docs/STATE.md](docs/STATE.md) mantém a lista honesta de lacunas e dívidas, e é a primeira coisa a ler antes de mexer em qualquer coisa.

---

## Documentação

A documentação do repositório é escrita em inglês, porque é a língua em que o código e os contratos estão.

| Documento | O que cobre |
| --- | --- |
| [docs/STATE.md](docs/STATE.md) | Onde a build está, cada decisão tomada, e as lacunas conhecidas |
| [docs/PLAN.md](docs/PLAN.md) | O plano de implementação e seus checkpoints |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | As camadas, e as regras de fronteira que as sustentam |
| [docs/DESIGN.md](docs/DESIGN.md) | Direção visual: as duas superfícies, tokens, tipografia, anatomia da casca, movimento |
| [AGENTS.md](AGENTS.md) | O contrato de trabalho do repositório, e o índice dos que ficam abaixo dele |

---

## Contribuindo

```bash
git clone https://github.com/luannzin/echo.git
cd echo && bun install
bun run typecheck && bun run lint && bun run test
```

Leia o [AGENTS.md](AGENTS.md) primeiro. É o contrato de trabalho, e toda pasta que tem um próprio está indexada no fim dele. A versão curta: só TypeScript, arrow functions, um componente por arquivo, o Biome decide a formatação, mudança de schema passa por `bun run --cwd packages/db db:generate`, e cada palavra da interface vem de `apps/web/shared/lib/i18n`.

---

## Apoie

echo é gratuito, sem conta e sem plano pago. Vai continuar assim, e é feito por uma pessoa só, em aberto.

Se ele te poupou uma tarde, [me pague um café](https://buymeacoffee.com/luannzin). Uma vez só, sem assinatura.

<a href="https://buymeacoffee.com/luannzin"><img src="https://img.shields.io/badge/Me%20pague%20um%20caf%C3%A9-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=000000" alt="Me pague um café"></a>

---

## Licença

A definir, com código aberto permissivo como intenção. Veja [docs/STATE.md](docs/STATE.md#open-decisions).
