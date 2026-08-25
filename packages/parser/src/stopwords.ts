/**
 * Notes are written in whatever language the writer thinks in, so the stopword list covers the two
 * this product is used in today. Adding a language means adding its list, not changing the parser.
 */
const ENGLISH = `a about after all also an and any are as at be because been before being but by can
could did do does doing for from had has have having he her here him his how i if in into is it its
just me more most my no nor not of on once only or other our out over own same she should so some
such than that the their them then there these they this those through to too under until up very
was we were what when where which while who why will with would you your`;

const PORTUGUESE = `a agora ainda ao aos apos aquela aquele as ate com como da das de dela dele
depois do dos e ela ele eles em entre era essa esse esta este eu fazer foi for foram há isso isto ja
la lhe mais mas me mesmo meu minha muito na nao nas nem no nos nossa nosso num numa o os ou para
pela pelo por porque qual quando que quem se sem ser seu sua tambem te tem tenho ter teu tua um uma
voce vos`;

export const STOPWORDS: ReadonlySet<string> = new Set(
  `${ENGLISH} ${PORTUGUESE}`.split(/\s+/).filter(Boolean),
);
