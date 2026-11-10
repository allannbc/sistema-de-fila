// Gráfico de linhas em SVG puro (sem bibliotecas), com eixo de tempo real.
//
// Uso:
//   const chart = createLineChart(figureElement);
//   chart.render({
//     points: [{ date: "2026-11-09", exemplo: false, values: { normal: 3, preferencial: 1, total: 4 } }],
//     series: [{ key: "normal", name: "Normais", color: "var(--series-normal)" }, ...],
//     ariaLabel: "...", emptyText: "..."
//   });
//
// Interação: linha-guia + tooltip que "gruda" no dia mais próximo (mouse, toque e teclado:
// setas esquerda/direita, Home, End, Esc). Redesenha quando a largura do contêiner muda.
// Textos são inseridos com textContent (nada de innerHTML).

const NS = "http://www.w3.org/2000/svg";
const MARGIN = {top: 16, right: 20, bottom: 32, left: 44};
const MIN_LABEL_GAP_PX = 60;

const fmt = (v) => v.toLocaleString("pt-BR");

function s(tag, attrs = {}) {
	const node = document.createElementNS(NS, tag);
	for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
	return node;
}

function dayNumber(key) {
	const [y, m, d] = key.split("-").map(Number);
	return Date.UTC(y, m - 1, d) / 86400000;
}

function shortDate(key) {
	const [, m, d] = key.split("-");
	return `${d}/${m}`;
}

function longDate(key) {
	const [y, m, d] = key.split("-");
	return `${d}/${m}/${y}`;
}

// Escolhe um passo "redondo" (1, 2, 5 × 10^k) e arredonda o máximo para cima.
function niceScale(max, targetTicks = 4) {
	if (max <= 0) return {step: 1, yMax: 4};
	const raw = max / targetTicks;
	const pow = 10 ** Math.floor(Math.log10(raw));
	const f = raw / pow;
	const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
	const step = Math.max(1, nice * pow);
	return {step, yMax: Math.ceil(max / step) * step};
}

export function renderLegend(el, series) {
	el.replaceChildren(...series.map((se) => {
		const item = document.createElement("span");
		item.className = "chart-legend__item";

		const key = document.createElement("span");
		key.className = "chart-key";
		key.style.borderTopColor = se.color;
		key.setAttribute("aria-hidden", "true");

		const label = document.createElement("span");
		label.textContent = se.name;

		item.append(key, label);
		return item;
	}));
}

export function createLineChart(container) {
	const tooltip = document.createElement("div");
	tooltip.className = "chart__tooltip";
	tooltip.hidden = true;

	const live = document.createElement("p");
	live.className = "visually-hidden";
	live.setAttribute("aria-live", "polite");

	let opts = null;
	let drawnWidth = 0;
	let hide = () => {};

	function draw() {
		const {points, series, ariaLabel, emptyText} = opts;

		hide = () => {};
		tooltip.hidden = true;
		live.textContent = "";

		if (points.length === 0) {
			const p = document.createElement("p");
			p.className = "report-meta";
			p.textContent = emptyText;
			container.replaceChildren(p);
			return;
		}

		const width = Math.max(280, Math.floor(container.clientWidth) || 600);
		const height = width < 520 ? 260 : 320;
		drawnWidth = width;

		const innerW = width - MARGIN.left - MARGIN.right;
		const innerH = height - MARGIN.top - MARGIN.bottom;
		const n = points.length;

		const days = points.map((p) => dayNumber(p.date));
		const x = (i) => n === 1
			? MARGIN.left + innerW / 2
			: MARGIN.left + ((days[i] - days[0]) / (days[n - 1] - days[0])) * innerW;

		const maxValue = Math.max(0, ...points.flatMap((p) => series.map((se) => p.values[se.key])));
		const {step, yMax} = niceScale(maxValue);
		const y = (v) => MARGIN.top + innerH - (v / yMax) * innerH;

		const svg = s("svg", {
			width, height, viewBox: `0 0 ${width} ${height}`,
			role: "img", "aria-label": ariaLabel, tabindex: "0"
		});

		// grade horizontal (hairline) + rótulos do eixo Y
		for (let v = 0; v <= yMax; v += step) {
			svg.append(
				s("line", {class: "chart__grid", x1: MARGIN.left, x2: width - MARGIN.right, y1: y(v), y2: y(v)}),
				Object.assign(s("text", {class: "chart__tick", x: MARGIN.left - 8, y: y(v) + 4, "text-anchor": "end"}),
					{textContent: fmt(v)}));
		}

		// rótulos do eixo X (gulosos, sem sobreposição)
		let lastLabelX = -Infinity;
		for (let i = 0; i < n; i++) {
			if (x(i) - lastLabelX < MIN_LABEL_GAP_PX) continue;
			lastLabelX = x(i);
			svg.append(Object.assign(
				s("text", {class: "chart__tick", x: x(i), y: height - 10, "text-anchor": "middle"}),
				{textContent: shortDate(points[i].date)}));
		}

		// linhas (2px) e marcadores no último ponto (ou em todos, se houver só um dia)
		for (const se of series) {
			const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.values[se.key]).toFixed(1)}`).join(" ");
			const path = s("path", {class: "chart__line", d});
			path.style.stroke = se.color;
			svg.append(path);
		}
		for (const se of series) {
			const idx = n === 1 ? [0] : [n - 1];
			for (const i of idx) {
				const dot = s("circle", {class: "chart__dot", cx: x(i), cy: y(points[i].values[se.key]), r: 5});
				dot.style.fill = se.color;
				svg.append(dot);
			}
		}

		// camada de interação: linha-guia e pontos do dia ativo
		const cross = s("line", {class: "chart__cross", y1: MARGIN.top, y2: MARGIN.top + innerH});
		cross.style.display = "none";
		const hoverDots = series.map((se) => {
			const dot = s("circle", {class: "chart__dot", r: 5});
			dot.style.fill = se.color;
			dot.style.display = "none";
			return dot;
		});
		svg.append(cross, ...hoverDots);

		const overlay = s("rect", {class: "chart__overlay", x: 0, y: 0, width, height});
		svg.append(overlay);

		let active = null;

		function buildTooltip(point) {
			const title = document.createElement("div");
			title.className = "chart__tip-title";
			title.textContent = longDate(point.date) + (point.exemplo ? " (exemplo)" : "");

			const rows = series.map((se) => {
				const row = document.createElement("div");
				row.className = "chart__tip-row";

				const key = document.createElement("span");
				key.className = "chart-key";
				key.style.borderTopColor = se.color;

				const value = document.createElement("strong");
				value.textContent = fmt(point.values[se.key]);

				const name = document.createElement("span");
				name.className = "chart__tip-name";
				name.textContent = se.name;

				row.append(key, value, name);
				return row;
			});

			tooltip.replaceChildren(title, ...rows);
		}

		function setActive(i) {
			active = i;
			const point = points[i];
			const px = x(i);

			cross.setAttribute("x1", px);
			cross.setAttribute("x2", px);
			cross.style.display = "";
			series.forEach((se, k) => {
				hoverDots[k].setAttribute("cx", px);
				hoverDots[k].setAttribute("cy", y(point.values[se.key]));
				hoverDots[k].style.display = "";
			});

			buildTooltip(point);
			tooltip.hidden = false;
			const tw = tooltip.offsetWidth;
			let left = px + 14;
			if (left + tw > width - 4) left = px - 14 - tw;
			tooltip.style.left = Math.max(4, left) + "px";
			tooltip.style.top = MARGIN.top + "px";

			live.textContent = `${longDate(point.date)}: ` +
				series.map((se) => `${se.name} ${fmt(point.values[se.key])}`).join(", ");
		}

		hide = () => {
			active = null;
			cross.style.display = "none";
			hoverDots.forEach((d) => { d.style.display = "none"; });
			tooltip.hidden = true;
		};

		function nearest(clientX) {
			const rect = svg.getBoundingClientRect();
			const px = (clientX - rect.left) * (width / rect.width);
			let best = 0;
			for (let i = 1; i < n; i++) {
				if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
			}
			return best;
		}

		overlay.addEventListener("pointermove", (e) => setActive(nearest(e.clientX)));
		overlay.addEventListener("pointerdown", (e) => setActive(nearest(e.clientX)));
		overlay.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });

		svg.addEventListener("focus", () => {
			if (svg.matches(":focus-visible") && active === null) setActive(n - 1);
		});
		svg.addEventListener("blur", hide);
		svg.addEventListener("keydown", (e) => {
			const moves = {
				ArrowRight: () => Math.min(n - 1, (active ?? -1) + 1),
				ArrowLeft: () => Math.max(0, (active ?? n) - 1),
				Home: () => 0,
				End: () => n - 1
			};
			if (e.key === "Escape") { hide(); return; }
			if (moves[e.key]) {
				e.preventDefault();
				setActive(moves[e.key]());
			}
		});

		container.replaceChildren(svg, tooltip, live);
	}

	new ResizeObserver(() => {
		const w = Math.floor(container.clientWidth);
		if (opts && w && w !== drawnWidth) draw();
	}).observe(container);

	return {
		render(newOpts) {
			opts = newOpts;
			draw();
		}
	};
}
