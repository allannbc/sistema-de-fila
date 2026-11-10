// Gera as capturas de tela de docs/etapa-05/ e valida o fluxo principal.
// Uso (com o servidor em src/ rodando em http://localhost:8765/):
//   npm i playwright && node tests/capturar-evidencias-etapa-05.js
const { chromium } = require('playwright');
const path = require('path');
const B = process.env.BASE_URL || 'http://localhost:8765/';
const OUT = path.join(__dirname, '..', 'docs', 'etapa-05');
const shot = (p, name, full = false) => p.screenshot({ path: path.join(OUT, name), fullPage: full });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const kiosk = await ctx.newPage(), painel = await ctx.newPage(), rel = await ctx.newPage();
  await kiosk.goto(B + 'quiosque-cliente.html');
  await painel.goto(B + 'painel-atendente.html');

  const emitir = async (nome, pref) => {
    await kiosk.fill('#nome-cliente', nome);
    await kiosk.click(pref ? '.btn.btn--secondary' : '.btn.btn--primary');
    await kiosk.waitForSelector('.feedback--success');
  };

  // quiosque: carregando -> sucesso
  await kiosk.fill('#nome-cliente', 'ana');
  await kiosk.click('.btn.btn--primary');
  await kiosk.waitForSelector('.feedback--loading');
  await shot(kiosk, '01-quiosque-carregando.png');
  await kiosk.waitForSelector('.feedback--success');
  await shot(kiosk, '02-quiosque-sucesso.png');

  await emitir('bia', false); await emitir('caio', true); await emitir('davi', true);

  // quiosque: erro de comunicação
  await kiosk.evaluate(() => localStorage.setItem('api-simulate-failure', '1'));
  await kiosk.fill('#nome-cliente', 'edu');
  await kiosk.click('.btn.btn--primary');
  await kiosk.waitForSelector('.feedback--error');
  await shot(kiosk, '03-quiosque-erro.png');
  await kiosk.evaluate(() => localStorage.removeItem('api-simulate-failure'));

  // painel: chamando
  for (let i = 0; i < 3; i++) {
    await painel.click('.action-bar .btn--primary');
    if (i === 0) { await painel.waitForSelector('.feedback--loading'); await shot(painel, '04-painel-carregando.png'); }
    await painel.waitForSelector('.feedback--success');
  }
  await shot(painel, '05-painel-chamando.png');

  // relatórios: carregando, dados do dia, erro, exemplo
  await rel.goto(B + 'relatorios.html');
  await rel.waitForSelector('.feedback--loading');
  await shot(rel, '06-relatorio-carregando.png');
  await rel.waitForSelector('.feedback--success');
  await shot(rel, '07-relatorio-dados-do-dia.png', true);

  await rel.check('#simular-falha');
  await rel.click('#btn-gerar');
  await rel.waitForSelector('.feedback--error');
  await shot(rel, '08-relatorio-erro.png');
  await rel.uncheck('#simular-falha');

  await rel.click('#btn-importar');
  await rel.waitForFunction(() => document.querySelector('#feedback').textContent.includes('importado'));
  await shot(rel, '09-relatorio-dados-exemplo.png', true);
  // gráfico de senhas por dia (emitidas e atendidas), com tooltip
  const bloco = await rel.$('.chart-block');
  const svgEl = await rel.$('#grafico svg');
  await svgEl.scrollIntoViewIfNeeded();
  const box = await svgEl.boundingBox();
  await rel.mouse.move(box.x + box.width * 0.5, box.y + 150);
  await rel.waitForSelector('.chart__tooltip:not([hidden])');
  await bloco.screenshot({ path: path.join(OUT, '10-grafico-emitidas.png') });
  await rel.click('.segmented label:nth-child(2)');
  await rel.mouse.move(box.x + box.width * 0.5, box.y + 150);
  await bloco.screenshot({ path: path.join(OUT, '11-grafico-atendidas.png') });
  await rel.click('.segmented label:nth-child(1)');

  await rel.click('#btn-remover');
  await rel.waitForFunction(() => document.querySelector('#feedback').textContent.includes('removido'));

  const dia = await rel.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('daily-')).map(([k, v]) => [k, JSON.parse(v)])));
  const d = Object.values(dia)[0];
  const ok = d.emitidas.A === 2 && d.emitidas.P === 2 && d.atendidas.P === 2 && d.atendidas.A === 1;
  console.log(ok ? 'OK: histórico diário correto' : 'FALHOU', JSON.stringify(d));
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
