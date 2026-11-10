import {consultarRelatorio, importarDadosExemplo, removerDadosExemplo} from "./services/relatorioService.js";
import {isFailureSimulated, setFailureSimulated} from "./api/mockServer.js";
import {showFeedback, showError, hideFeedback, setBusy, errorMessage} from "./ui/feedback.js";
import {el} from "./ui/dom.js";
import {createLineChart, renderLegend} from "./ui/graficoLinhas.js";
import {getDateKey, shiftDateKey, formatDateBR, formatDuration, getTime} from "./utils.js";

const DEFAULT_RANGE_DAYS = 30;

const form = document.querySelector(".toolbar-form");
const inputDe = document.querySelector("#data-de");
const inputAte = document.querySelector("#data-ate");
const btnGerar = document.querySelector("#btn-gerar");
const btnPdf = document.querySelector("#btn-pdf");
const btnImportar = document.querySelector("#btn-importar");
const btnRemover = document.querySelector("#btn-remover");
const chkFalha = document.querySelector("#simular-falha");
const feedbackEl = document.querySelector("#feedback");
const reportEl = document.querySelector(".report");
const metaEl = document.querySelector("#periodo");
const resumoEl = document.querySelector("#resumo");
const distribuicaoEl = document.querySelector("#distribuicao");
const diasEl = document.querySelector("#por-dia");
const horasEl = document.querySelector("#por-hora");

const graficoEl = document.querySelector("#grafico");
const legendaEl = document.querySelector("#grafico-legenda");
const metricaInputs = document.querySelectorAll('input[name="metrica"]');

const actionButtons = [btnGerar, btnImportar, btnRemover];

// Séries do gráfico (as cores são variáveis CSS definidas em admin.css)
const SERIES = [
	{key: "normal", name: "Normais", color: "var(--series-normal)"},
	{key: "preferencial", name: "Preferenciais", color: "var(--series-preferencial)"},
	{key: "total", name: "Total", color: "var(--series-total)"}
];

const chart = createLineChart(graficoEl);
let diasAtuais = [];

// Evita que uma resposta antiga sobrescreva uma consulta mais recente.
let requestId = 0;

// ---------------------------------------------------------------- helpers

function pct(part, total) {
	return total > 0 ? Math.round((part / total) * 100) : 0;
}

function n(value) {
	return value.toLocaleString("pt-BR");
}

function setDefaultRange() {
	const today = getDateKey();
	inputAte.value = today;
	inputDe.value = shiftDateKey(today, -(DEFAULT_RANGE_DAYS - 1));
}

function statCard(value, label) {
	return el("li", {class: "stat-card"},
		el("span", {class: "stat-value", text: value}),
		el("span", {class: "stat-label", text: label}));
}

function row(label, value) {
	return el("li", {}, el("span", {text: label}), el("span", {text: value}));
}

function emptyNote(text) {
	return el("p", {class: "report-meta", text});
}

// ---------------------------------------------------------------- render

function renderResumo(resumo) {
	const {atendidas, esperaMediaMs} = resumo;

	resumoEl.replaceChildren(
		statCard(n(atendidas.total), "Total de Atendimentos"),
		statCard(n(atendidas.A), "Normais"),
		statCard(n(atendidas.P), "Preferenciais"),
		statCard(formatDuration(esperaMediaMs.geral), "Tempo Médio de Espera"),
		statCard(formatDuration(esperaMediaMs.A), "Espera Média — Normal"),
		statCard(formatDuration(esperaMediaMs.P), "Espera Média — Preferencial")
	);
}

function renderDistribuicao(resumo) {
	const {atendidas, emitidas} = resumo;

	distribuicaoEl.replaceChildren(
		row("Atendimentos normais", `${n(atendidas.A)} (${pct(atendidas.A, atendidas.total)}%)`),
		row("Atendimentos preferenciais", `${n(atendidas.P)} (${pct(atendidas.P, atendidas.total)}%)`),
		row("Senhas emitidas (normal / preferencial)", `${n(emitidas.A)} / ${n(emitidas.P)}`)
	);
}

function renderDias(dias, resumo) {
	if (dias.length === 0) {
		diasEl.replaceChildren(emptyNote("Sem registros diários no período."));
		return;
	}

	const head = el("thead", {}, el("tr", {},
		...["Data", "Emitidas (N)", "Emitidas (P)", "Atendidas (N)", "Atendidas (P)",
			"Espera média (N)", "Espera média (P)", "Espera média geral"]
			.map((t) => el("th", {scope: "col", text: t}))));

	const body = el("tbody", {}, ...dias.map((d) => {
		const data = el("td", {text: formatDateBR(d.date)});
		if (d.exemplo) data.append(" ", el("span", {class: "badge badge--normal", text: "exemplo"}));

		return el("tr", {},
			data,
			el("td", {text: n(d.emitidas.A)}),
			el("td", {text: n(d.emitidas.P)}),
			el("td", {text: n(d.atendidas.A)}),
			el("td", {text: n(d.atendidas.P)}),
			el("td", {text: formatDuration(d.esperaMediaMs.A)}),
			el("td", {text: formatDuration(d.esperaMediaMs.P)}),
			el("td", {text: formatDuration(d.esperaMediaMs.geral)}));
	}));

	const foot = el("tfoot", {}, el("tr", {},
		el("th", {scope: "row", text: "Total"}),
		el("th", {text: n(resumo.emitidas.A)}),
		el("th", {text: n(resumo.emitidas.P)}),
		el("th", {text: n(resumo.atendidas.A)}),
		el("th", {text: n(resumo.atendidas.P)}),
		el("th", {text: formatDuration(resumo.esperaMediaMs.A)}),
		el("th", {text: formatDuration(resumo.esperaMediaMs.P)}),
		el("th", {text: formatDuration(resumo.esperaMediaMs.geral)})));

	diasEl.replaceChildren(
		el("div", {class: "table-wrap"}, el("table", {class: "report-table"}, head, body, foot)));
}

function renderHoras(horas) {
	if (horas.length === 0) {
		horasEl.replaceChildren(emptyNote("Nenhum atendimento registrado no período."));
		return;
	}

	const list = el("ul", {}, ...horas.map((h) => {
		const next = String((Number(h.hora) + 1) % 24).padStart(2, "0");
		return row(`${h.hora}:00 - ${next}:00`,
			`${n(h.total)} atendimentos (${n(h.A)} normais, ${n(h.P)} preferenciais)`);
	}));
	horasEl.replaceChildren(list);
}

// Gráfico: por dia, senhas normais, preferenciais e total (emitidas ou atendidas).
function renderGrafico() {
	const metrica = document.querySelector('input[name="metrica"]:checked').value; // "emitidas" | "atendidas"

	const points = diasAtuais.map((d) => ({
		date: d.date,
		exemplo: d.exemplo,
		values: {
			normal: d[metrica].A,
			preferencial: d[metrica].P,
			total: d[metrica].A + d[metrica].P
		}
	}));

	renderLegend(legendaEl, SERIES);
	chart.render({
		points,
		series: SERIES,
		ariaLabel: `Gráfico de linhas: senhas ${metrica} por dia, normais, preferenciais e total.`,
		emptyText: "Sem registros diários no período para montar o gráfico."
	});
}

function renderRelatorio(dados) {
	const {de, ate} = dados.periodo;
	metaEl.textContent = `Período: ${formatDateBR(de)} a ${formatDateBR(ate)}`;
	if (dados.resumo.diasExemplo > 0) {
		metaEl.textContent += ` — inclui ${dados.resumo.diasExemplo} dia(s) de dados de exemplo`;
	}

	renderResumo(dados.resumo);
	renderDistribuicao(dados.resumo);
	diasAtuais = dados.dias;
	renderGrafico();
	renderDias(dados.dias, dados.resumo);
	renderHoras(dados.porHora);
}

// ---------------------------------------------------------------- ações

function validarPeriodo() {
	if (!inputDe.value || !inputAte.value) {
		return "Informe a data inicial e a data final.";
	}
	if (inputDe.value > inputAte.value) {
		return "A data inicial não pode ser maior que a data final.";
	}
	return null;
}

async function gerarRelatorio() {
	const invalido = validarPeriodo();
	if (invalido) {
		showFeedback(feedbackEl, "error", invalido);
		return;
	}

	const myId = ++requestId;
	showFeedback(feedbackEl, "loading", "Carregando relatório…");
	reportEl.setAttribute("aria-busy", "true");
	setBusy(actionButtons, true);

	try {
		const dados = await consultarRelatorio({de: inputDe.value, ate: inputAte.value});
		if (myId !== requestId) return; // chegou uma consulta mais nova; descarta esta

		renderRelatorio(dados);
		const vazio = dados.resumo.dias === 0;
		showFeedback(feedbackEl, "success",
			vazio
				? "Consulta concluída, mas não há registros no período. Emita e chame senhas ou importe dados de exemplo."
				: `Relatório atualizado às ${getTime()}.`);
	} catch (err) {
		if (myId !== requestId) return;
		showError(feedbackEl, errorMessage(err), gerarRelatorio);
	} finally {
		if (myId === requestId) {
			reportEl.setAttribute("aria-busy", "false");
			setBusy(actionButtons, false);
		}
	}
}

async function executarEAtualizar(mensagemCarregando, operacao, mensagemSucesso) {
	showFeedback(feedbackEl, "loading", mensagemCarregando);
	setBusy(actionButtons, true);

	try {
		const resultado = await operacao();
		await gerarRelatorio();
		// gerarRelatorio já mostra o estado final; se tiver dado certo, destacamos a operação
		if (feedbackEl.classList.contains("feedback--success")) {
			showFeedback(feedbackEl, "success", mensagemSucesso(resultado));
		}
	} catch (err) {
		showError(feedbackEl, errorMessage(err));
		setBusy(actionButtons, false);
	}
}

function importar() {
	return executarEAtualizar(
		"Importando dados de exemplo…",
		importarDadosExemplo,
		(r) => `${r.importados} dia(s) de exemplo importado(s). Dias com dados reais foram preservados.`);
}

function remover() {
	return executarEAtualizar(
		"Removendo dados de exemplo…",
		removerDadosExemplo,
		(r) => `${r.removidos} dia(s) de exemplo removido(s).`);
}

// ---------------------------------------------------------------- eventos

form.addEventListener("submit", (event) => {
	event.preventDefault();
	gerarRelatorio();
});

form.addEventListener("reset", () => {
	// o reset nativo roda depois deste handler; reaplicamos o período padrão em seguida
	setTimeout(() => {
		setDefaultRange();
		gerarRelatorio();
	}, 0);
});

metricaInputs.forEach((input) => input.addEventListener("change", renderGrafico));

btnPdf.addEventListener("click", () => window.print());
btnImportar.addEventListener("click", importar);
btnRemover.addEventListener("click", remover);

chkFalha.checked = isFailureSimulated();
chkFalha.addEventListener("change", () => {
	setFailureSimulated(chkFalha.checked);
	if (chkFalha.checked) {
		showFeedback(feedbackEl, "error", "Simulação de falha ativada: as próximas requisições vão falhar.");
	} else {
		hideFeedback(feedbackEl);
	}
});

// ---------------------------------------------------------------- início

setDefaultRange();
gerarRelatorio();
