import { ArrowRight, Box, Droplets, Layers, Printer, Ruler, Shapes, Sparkles, Flower2, Cat } from 'lucide-react';
import './landing.css';

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;

const STEPS = [
  { n: '01', title: 'Desenhe a peça', text: 'Escolha jarra, vaso, copo ou gatinho e ajuste altura, barriga, boca e alça com controles simples. A peça gira em 3D enquanto você mexe.' },
  { n: '02', title: 'Escolha a matriz', text: 'Peça completa positiva para fazer o seu próprio molde, ou meia peça pronta sobre a placa, com encaixes e poço de barbotina.' },
  { n: '03', title: 'Baixe ou encomende', text: 'Baixe o STL para imprimir em casa, ou peça a matriz já impressa e pronta para receber o gesso.' },
];

const FEATURES = [
  { icon: Ruler, title: 'Medidas da peça queimada', text: 'Você digita o tamanho final. O app aumenta a matriz pela retração da argila (12% por padrão) para a peça sair do forno com a medida certa.' },
  { icon: Layers, title: 'Meia peça com encaixes', text: 'A matriz é cortada no plano da alça, sobre uma placa com quatro chaves de registro, para as duas metades do molde fecharem sem folga.' },
  { icon: Droplets, title: 'Poço, paredes e gesso', text: 'Poço de barbotina, paredes de contenção em STL separado e estimativa de gesso e água para cada molde.' },
  { icon: Sparkles, title: 'Texturas e relevos', text: 'Dezenas de texturas, flores, arabescos, animais e insetos. Você também pode enviar uma imagem sua e transformar em relevo.' },
  { icon: Flower2, title: 'Alças e objetos aplicados', text: 'Alças clássica, argola, pérolas, trançada, cauda e pata. Passarinho, abelha, borboleta e flores aplicados no corpo da peça.' },
  { icon: Cat, title: 'Formas com personalidade', text: 'O gatinho tem orelhas ajustáveis e rosto gravado opcional, que ficam divididos corretamente em cada metade do molde.' },
  { icon: Printer, title: 'Feito para a sua impressora', text: 'O app confere se a matriz cabe na mesa da Bambu Lab A1 antes de exportar e ajusta o tamanho automaticamente.' },
  { icon: Box, title: 'Economia de filamento', text: 'Matriz oca com nervuras em vez de maciça: menos filamento e menos tempo de impressão, com o gasto estimado na hora.' },
];

const FAQ = [
  ['Preciso saber modelagem 3D?', 'Não. Tudo é feito com controles deslizantes e botões, direto no navegador, sem instalar nada.'],
  ['Em qual impressora posso imprimir?', 'O limite padrão é a mesa da Bambu Lab A1 (256 mm). Qualquer impressora FDM que abra o STL serve, desde que a peça caiba.'],
  ['O que é a retração?', 'A argila encolhe na secagem e na queima. A matriz sai maior na proporção certa para a peça final ter o tamanho que você pediu.'],
  ['Posso testar antes de comprar?', 'Sim. O editor é aberto e gratuito para desenhar. O orçamento aparece ao vivo conforme você muda a peça.'],
  ['Como pago?', 'Por Pix, com QR Code e copia e cola gerados no próprio orçamento com o valor da sua peça.'],
  ['O molde de gesso sai pronto?', 'Você recebe a matriz e as paredes de contenção. O app estima o gesso e a água, e o molde é feito por você.'],
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <a className="lp-brand" href="#/"><span className="lp-mark"><Shapes size={18} /></span>forma<i>.</i></a>
        <nav>
          <a href="#como">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#preco">Preços</a>
          <a href="#faq">Dúvidas</a>
          <a className="lp-btn small" href="#/editor">Abrir editor</a>
        </nav>
      </header>

      <section className="lp-hero">
        <p className="lp-eyebrow">MATRIZES PARA CERÂMICA DE BARBOTINA</p>
        <h1>Modele como argila,<br />imprima a matriz do seu molde.</h1>
        <p className="lp-lead">Desenhe jarras, vasos, copos e gatinhos no navegador e gere a matriz em STL para fazer moldes de gesso. Medidas da peça queimada, encaixes e estimativa de gesso inclusos.</p>
        <div className="lp-cta">
          <a className="lp-btn" href="#/editor">Desenhar minha peça <ArrowRight size={16} /></a>
          <a className="lp-btn ghost" href="#como">Ver como funciona</a>
        </div>
        <ul className="lp-badges"><li>Editor gratuito</li><li>Sem instalar</li><li>STL pronto para imprimir</li><li>Pix</li></ul>
      </section>

      <section id="como" className="lp-section">
        <h2>Da ideia ao molde em três passos</h2>
        <div className="lp-grid three">
          {STEPS.map((s) => (
            <article key={s.n} className="lp-card"><span className="lp-num">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></article>
          ))}
        </div>
      </section>

      <section id="recursos" className="lp-section alt">
        <h2>Tudo que um ceramista precisa na matriz</h2>
        <p className="lp-sub">Pensado para quem faz moldes de gesso, não para quem faz modelagem técnica.</p>
        <div className="lp-grid four">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="lp-card"><Icon size={22} strokeWidth={1.6} /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>Dois formatos de matriz</h2>
        <div className="lp-grid two">
          <article className="lp-card big"><h3>Peça completa</h3><p>A peça positiva inteira, para você mesmo montar o molde em duas partes com a sua técnica.</p></article>
          <article className="lp-card big"><h3>Meia peça</h3><p>Metade da peça cortada no plano da alça, sobre placa com chaves de registro, poço de barbotina e paredes de contenção opcionais.</p></article>
        </div>
      </section>

      <section id="preco" className="lp-section alt">
        <h2>Preço claro, calculado na hora</h2>
        <p className="lp-sub">O orçamento muda conforme a sua peça. Você escolhe entre o arquivo ou a matriz impressa.</p>
        <div className="lp-grid two">
          <article className="lp-card big"><h3>Arquivo STL</h3><p className="lp-price">a partir de R$ 29</p><p>Você baixa e imprime onde quiser. Valor sobe com meia peça, alça, objetos e texturas.</p></article>
          <article className="lp-card big featured"><h3>Matriz impressa</h3><p className="lp-price">a partir de R$ 39</p><p>Impressa e embalada por nós, pronta para o gesso. Valor segue o filamento e o tempo reais da sua peça.</p></article>
        </div>
        <p className="lp-note">Pagamento por Pix direto no orçamento. Os valores finais aparecem no editor.</p>
        <a className="lp-btn" href="#/editor">Ver o orçamento da minha peça <ArrowRight size={16} /></a>
      </section>

      <section id="faq" className="lp-section">
        <h2>Perguntas frequentes</h2>
        <div className="lp-faq">
          {FAQ.map(([q, a]) => (<details key={q}><summary>{q}</summary><p>{a}</p></details>))}
        </div>
      </section>

      <section className="lp-final">
        <h2>Pronto para desenhar a sua primeira matriz?</h2>
        <a className="lp-btn light" href="#/editor">Abrir o editor <ArrowRight size={16} /></a>
        {WHATSAPP && <a className="lp-link" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp</a>}
      </section>

      <footer className="lp-foot"><span>© {new Date().getFullYear()} forma. Todos os direitos reservados. Cópia ou reprodução do software sem autorização é proibida.</span><span>Feito para ceramistas</span></footer>
    </div>
  );
}
