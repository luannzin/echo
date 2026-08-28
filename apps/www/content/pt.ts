import type { Content } from "@/content/en";

/**
 * O site em português do Brasil.
 *
 * Written to fit rather than translated and then patched. `.label` is mono, uppercase and tracked at
 * `0.18em`, which is the least forgiving specification on either surface, and Portuguese runs twenty
 * to thirty percent longer than English — so a shorter true sentence beats a faithful one that wraps
 * into three lines of tracked capitals.
 *
 * The type annotation is the check: a key added to `en.ts` and not answered here does not compile.
 */
export const pt: Content = {
  locale: "pt-BR",
  meta: {
    title: "echo · o bloco de notas que aprende com você",
    description:
      "Escreva uma linha e aperte Enter. echo lê o prazo, a tarefa e as palavras que você repete, e vai ficando melhor em devolver tudo isso. Código aberto, e tudo roda na sua máquina: sem conta, sem chave de API, sem servidor.",
  },

  other: { label: "English", href: "/" },

  nav: {
    links: [
      { label: "O que ele faz", href: "#reel" },
      { label: "Como ele roda", href: "#facts" },
      { label: "GitHub", href: null },
    ],
    run: "Rodar localmente",
  },

  hero: {
    eyebrow: "Sem IA · Código aberto · Roda na sua máquina · Sem conta",
    title: "O bloco de notas que aprende com você",
    lede: "Você escreve uma linha e aperta Enter. echo lê o que você escreveu: o prazo que você citou de passagem, a tarefa escondida ali, as palavras que você repete. Ele fica melhor em devolver tudo isso, e nada nunca sai da sua máquina.",
    watch: "Veja funcionando ↓",
    run: "Rodar localmente",
    source: "Ler o código no GitHub",
  },

  reel: {
    label: "echo sendo escrito, buscado, e usado para arquivar uma nota da Entrada",
    play: "Tocar",
    pause: "Pausar",
  },

  features: {
    label: "O que ele faz com o que você escreveu",
    title: "Quatro coisas, todas na tela",
    items: [
      {
        label: "Busca",
        title: "Pergunte como você perguntaria a uma pessoa",
        body: "“notas sobre cache em pagamentos” são duas perguntas vestindo um casaco só. echo separa o assunto do projeto, filtra cada um, e mostra cada filtro como uma etiqueta que sai com um toque. Ele diz quantas notas deixou de lado, porque uma busca que ignora calada metade do que você digitou é uma busca em que você para de confiar.",
        alt: "A paleta de comandos com “notas sobre cache em pagamentos”. Uma etiqueta removível de Pagamentos foi tirada da pergunta, as palavras “notas sobre” ficaram como assunto, dezesseis notas estão marcadas como deixadas de lado, e as quatro notas de pagamentos aparecem abaixo.",
      },
      {
        label: "Arquivar",
        title: "Todo palpite mostra a conta",
        body: "echo sugere onde uma nota se encaixa e então nomeia as notas que defenderam aquilo: notas que você pode abrir e contestar, em vez de uma porcentagem que você só pode aceitar. E como arquivar dez notas errado é uma tarde muito pior do que arquivar uma de cada vez, a Entrada resolve a pilha inteira antes e não move nada até você mandar.",
        alt: "A Entrada com dez notas para guardar. Cada linha oferece uma pasta e, abaixo, as frases por trás dela — as notas já guardadas ali, e o hábito que echo leu nelas.",
      },
      {
        label: "Vizinhas",
        title: "Uma nota chega com as notas às quais pertence",
        body: "Abra uma e o painel ao lado se enche das notas ligadas a ela, cada uma com o motivo em palavras e não em nota de corte: está no mesmo projeto, você escreveu as duas na mesma época, você costuma abrir as duas juntas. Os conceitos no alto saíram da própria nota, e qualquer um deles pode ser tirado.",
        alt: "Uma nota sobre novas tentativas de pagamento aberta no echo, com conceitos no alto e um painel de notas relacionadas ao lado, cada uma dizendo por que está ali.",
      },
      {
        label: "Vocabulário",
        title: "Ele aprende as suas palavras, não as de um dicionário",
        body: "Você digita k8s. Metade das suas notas diz kubernetes e o resto diz o cluster. echo descobre isso pela companhia que as suas palavras andam, então buscar uma encontra a outra — inclusive notas que não têm nem as letras nem o som do que você digitou. Nada foi treinado em nada: as suas próprias notas são toda a evidência.",
        alt: "Buscando k8s. O primeiro resultado tem as letras; o segundo é uma nota sobre um rollout de kubernetes que não tem, encontrada por sentido e não por soletração.",
      },
    ],
  },

  tour: {
    title: "Tudo o que você escreve, guardado de quatro jeitos",
    lede: "Uma pilha de notas, lida de volta como fluxo, lista de tarefas, linha do tempo e página para escrever. Nada aqui é um lugar separado para manter atualizado.",
    legend: "Escolha uma tela",
    points: [
      {
        title: "O fluxo",
        subtitle:
          "Tudo cai aqui primeiro, na ordem em que você escreveu, e a caixa onde você escreve nunca sai da tela.",
        alt: "O fluxo: notas marcadas com quando foram escritas e editadas, descendo a tela, com o campo de escrita ancorado no pé.",
      },
      {
        title: "Tarefas",
        subtitle:
          "echo tira as coisas a fazer de dentro de frases comuns, e traz junto as datas que essas frases citaram.",
        alt: "A lista de tarefas: cinco em aberto, as com data agrupadas em A vencer e o resto em Sem data, cada uma mostrando a nota de onde saiu.",
      },
      {
        title: "Linha do tempo",
        subtitle:
          "As mesmas notas lidas de volta por dia e por semana, com o que está chegando puxado para o alto.",
        alt: "A linha do tempo: uma faixa Esta semana com os prazos que echo encontrou, e abaixo os dias, cada um com as palavras que passaram por ele e as notas escritas ali.",
      },
      {
        title: "Escrevendo",
        subtitle:
          "Escreva uma linha e veja ela sendo lida: as palavras que echo tirou da frase, e as notas de que ele já se lembrou.",
        alt: "Uma frase sendo escrita no echo. O campo mostra a contagem de palavras e uma etiqueta Vence sexta, e o painel ao lado já lista quatro notas ligadas a ela.",
      },
    ],
  },

  runIt: {
    title: "Três comandos e ele é seu",
    body: "Postgres de verdade, compilado para WebAssembly, rodando na sua aba e guardado no seu navegador. Não há servidor para apontar nem conta por trás, e é por isso que a instalação inteira é um clone, um install e um servidor de desenvolvimento.",
    requirements: [
      ["Bun 1.3 ou mais novo", "Essa é a lista inteira para o app web."],
      ["Sem .env, sem chave, sem servidor", "Nada para provisionar e nada para assinar."],
      [
        "Um download, uma vez",
        "O modelo multilíngue tem cerca de 120 MB e chega na primeira vez que você busca por sentido. Escrever, arquivar e buscar por palavras funcionam antes disso.",
      ],
    ],
    install: {
      web: "Web",
      desktop: "Desktop",
      copy: "Copiar",
      copied: "Copiado",
      copyWebLabel: "Copiar os comandos web",
      copyDesktopLabel: "Copiar os comandos desktop",
      webAfter: "Abra http://localhost:3000. Não há .env para preencher nem conta para criar.",
      desktopAfter:
        "Precisa de uma toolchain Rust. No Linux, também webkit2gtk-4.1, gtk+-3.0 e libsoup-3.0.",
      failed:
        "Seu navegador não deixou a página usar a área de transferência. Selecione as linhas acima e copie.",
    },
  },

  facts: {
    lead: {
      title: "A busca acompanha a digitação",
      body: "O texto completo é um índice GIN sobre um tsvector guardado, não uma varredura. Dez mil notas respondem a uma busca em 21 ms, e as notas relacionadas em 8 ms. O sentido chega um instante atrás das palavras e reordena as respostas, em vez de segurá-las.",
      stat: "21 ms · 10.000 notas",
    },
    rest: [
      {
        title: "Offline é o caso normal",
        body: "Instale pelo navegador e, depois da primeira visita, ele abre sem rede nenhuma. A interface, o banco e todas as notas já estão na máquina. Não há aviso de offline, porque não há o que avisar.",
      },
      {
        title: "Esquecer é de verdade",
        body: "Regras aprendidas nunca são guardadas. Elas são refeitas a partir das suas correções toda vez que são lidas, então apagar a correção é a única forma de a regra existir. “Esquecer” não é uma marca que alguém pode deixar ligada.",
      },
      {
        title: "A versão desktop é o mesmo código",
        body: "macOS, Windows e Linux via Tauri, mais um modo editor que o site nunca oferece: suas notas abertas no alto, uma tela dividida, e nada além disso.",
      },
    ],
  },

  footer: {
    title: "Leve com você",
    lede: "Clone, rode, guarde. Não há conta para criar, teste para começar, nem nada para desligar depois.",
    run: "Rodar localmente",
    source: "Ler o código no GitHub",
    tagline: "echo · notas local-first",
    docs: "Ler a documentação",
  },
};
