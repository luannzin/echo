import type { Content } from "@/content/en";

/**
 * O site em português do Brasil.
 *
 * Written to fit rather than translated and then patched. `.label` is mono, uppercase and tracked at
 * `0.18em`, which is the least forgiving specification on either surface, and Portuguese runs twenty
 * to thirty percent longer than English, so a shorter true sentence beats a faithful one that wraps
 * into three lines of tracked capitals.
 *
 * This is the document the copy is written in first, and `en.ts` follows it. Everything here answers
 * one question in one breath: what does echo do with the line I just typed? The long paragraphs this
 * replaces were accurate and nobody finished them. Every claim now runs to two sentences, the
 * metaphors that only ever worked in English are gone ("duas perguntas vestindo um casaco só"), and
 * the jargon that proved nothing to a reader who was not already convinced went with them.
 *
 * The type annotation is the check: a key added to `en.ts` and not answered here does not compile.
 */
export const pt: Content = {
  locale: "pt-BR",
  meta: {
    title: "echo · o bloco de notas que aprende com você",
    description:
      "Escreva uma linha e aperte Enter. echo acha o prazo, a tarefa e as palavras que você repete. Código aberto, e tudo roda na sua máquina: sem conta, sem servidor.",
  },

  other: { label: "English", href: "/", lang: "en" },

  nav: {
    links: [
      { label: "O que faz", href: "#reel" },
      { label: "Como roda", href: "#facts" },
      { label: "GitHub", href: null },
    ],
    open: "Abrir o echo",
  },

  hero: {
    eyebrow: "Sem IA · Código aberto · Roda na sua máquina · Sem conta",
    title: "O bloco de notas que aprende com você",
    lede: "Escreva uma linha e aperte Enter. echo acha o prazo, a tarefa e as palavras que você repete, e devolve isso quando você precisa. Nada sai da sua máquina.",
    open: "Abrir o echo",
    watch: "Ver funcionando ↓",
    run: "Rodar localmente",
  },

  reel: {
    label: "echo sendo escrito, buscado e usado para arquivar uma nota da Entrada",
    play: "Tocar",
    pause: "Pausar",
    demo: "Ver demo",
    close: "Fechar",
  },

  features: {
    label: "O que echo faz",
    title: "Quatro coisas, todas na tela",
    items: [
      {
        label: "Busca",
        title: "Pergunte como você perguntaria a uma pessoa",
        body: "“notas sobre cache em pagamentos” são duas perguntas em uma. echo separa o assunto do projeto, mostra cada filtro como uma etiqueta que sai com um toque, e diz quantas notas ficaram de fora.",
        alt: "A paleta de comandos com “notas sobre cache em pagamentos”: uma etiqueta de Pagamentos tirada da pergunta, o assunto ao lado, a contagem do que ficou de fora, e as notas de pagamentos listadas abaixo.",
      },
      {
        label: "Arquivar",
        title: "Todo palpite mostra o porquê",
        body: "echo sugere onde a nota se encaixa e mostra as notas que levaram até ali, que você pode abrir e contestar. A Entrada resolve a pilha inteira antes e só move quando você manda.",
        alt: "A Entrada com dez notas para guardar. Cada linha oferece uma pasta e, abaixo, o motivo: as notas já guardadas ali e o hábito que echo leu nelas.",
      },
      {
        label: "Relacionadas",
        title: "Abra uma nota e as parecidas vêm junto",
        body: "O painel ao lado diz o motivo em palavras, não em porcentagem: mesmo projeto, mesma época, você costuma abrir as duas juntas. Os conceitos no alto saíram da própria nota.",
        alt: "Uma nota sobre novas tentativas de pagamento aberta no echo, com os conceitos no alto e, ao lado, as notas relacionadas, cada uma dizendo por que está ali.",
      },
      {
        label: "Vocabulário",
        title: "Ele aprende as suas palavras",
        body: "Você digita k8s. Metade das suas notas diz kubernetes e o resto diz o cluster. echo descobre isso sozinho, só pelas suas notas, e buscar uma encontra a outra.",
        alt: "Buscando k8s. O primeiro resultado tem as letras; o segundo é uma nota sobre kubernetes que não tem, encontrada por sentido e não por soletração.",
      },
    ],
  },

  tour: {
    title: "As mesmas notas, quatro jeitos de ler",
    lede: "Fluxo, tarefas, janela própria e página de escrita. Nada aqui é um lugar separado para manter atualizado.",
    legend: "Escolha uma tela",
    points: [
      {
        title: "O fluxo",
        subtitle: "Tudo cai aqui primeiro, na ordem em que você escreveu.",
        alt: "O fluxo: notas marcadas com quando foram escritas e editadas, descendo a tela, com o campo de escrita ancorado no pé.",
      },
      {
        title: "Tarefas",
        subtitle: "echo tira as tarefas de frases comuns, com as datas que elas citam.",
        alt: "A lista de tarefas: as com data agrupadas em A vencer e o resto em Sem data, cada uma mostrando a nota de onde saiu.",
      },
      {
        title: "Nativo",
        subtitle: "As mesmas notas numa janela própria, com abas e um modo que é só escrita.",
        alt: "O aplicativo desktop numa janela própria, sobre o aplicativo completo atrás dele: quatro notas abertas em abas, uma sendo escrita com o menu de barra aberto, e a etiqueta Lê como tarefa no alto.",
      },
      {
        title: "Escrevendo",
        subtitle: "Escreva e veja echo ler: as palavras que ele tirou e as notas de que lembrou.",
        alt: "Uma frase sendo escrita no echo. O campo mostra a contagem de palavras e uma etiqueta Vence sexta, e o painel ao lado já lista as notas ligadas a ela.",
      },
    ],
  },

  runIt: {
    title: "Três comandos e ele é seu",
    body: "Postgres de verdade, compilado para WebAssembly, rodando na sua aba. Não há servidor para apontar nem conta por trás, e por isso a instalação é um clone, um install e um dev server.",
    requirements: [
      ["Bun 1.3 ou mais novo", "É a lista inteira para o app web."],
      ["Sem .env, sem chave, sem servidor", "Nada para provisionar nem para assinar."],
      [
        "Um download, uma vez",
        "O modelo multilíngue tem cerca de 120 MB e chega na primeira busca por sentido. Escrever, arquivar e buscar por palavra funcionam antes disso.",
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
      failed: "Seu navegador não deixou a página copiar. Selecione as linhas acima e copie à mão.",
    },
  },

  facts: {
    lead: {
      title: "A busca acompanha a digitação",
      body: "Índice de verdade, não varredura. Dez mil notas respondem em 21 ms, e as relacionadas em 8 ms. O sentido chega logo depois das palavras e reordena as respostas, sem segurar nada.",
      stat: "21 ms · 10.000 notas",
    },
    rest: [
      {
        title: "Offline é o normal",
        body: "Instale pelo navegador e ele abre sem rede nenhuma. A interface, o banco e todas as notas já estão na máquina.",
      },
      {
        title: "Esquecer é de verdade",
        body: "Regras aprendidas não ficam guardadas: são refeitas das suas correções toda vez que são lidas. Apagou a correção, a regra deixa de existir.",
      },
      {
        title: "O desktop é o mesmo código",
        body: "macOS, Windows e Linux via Tauri, com um modo editor que o site não oferece: suas notas no alto, tela dividida, e nada além disso.",
      },
    ],
  },

  support: {
    label: "Apoie",
    title: "Feito por uma pessoa só",
    body: "echo é gratuito, sem conta e sem plano pago. Vai continuar assim. Se ele te poupou uma tarde, me pague um café.",
    cta: "Me pague um café",
    note: "Uma vez só · sem assinatura",
  },

  footer: {
    title: "Leve com você",
    lede: "Clone, rode, guarde. Sem conta para criar, sem teste para começar, sem nada para desligar depois.",
    open: "Abrir o echo",
    run: "Rodar localmente",
    tagline: "echo · notas local-first",
    coffee: "Me pague um café",
    docs: "Ler a documentação",
  },
};
