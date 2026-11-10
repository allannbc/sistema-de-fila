// Histórico diário da fila (Etapa 05).
//
// Guarda, para cada dia, um registro único em localStorage (chave "daily-AAAA-MM-DD"):
//
//   {
//     date: "2026-11-09",
//     exemplo: false,                    // true = veio da importação de dados de exemplo
//     emitidas:      { A: 12, P: 4 },    // senhas emitidas no dia (normal / preferencial)
//     atendidas:     { A: 10, P: 4 },    // senhas chamadas no dia
//     esperaTotalMs: { A: 5400000, P: 900000 },  // soma dos tempos de espera (ms)
//     porHora:       { "09": { A: 3, P: 1 }, ... } // chamadas por hora cheia
//   }
//
// O tempo médio de espera NÃO é guardado pronto: guardamos a soma e a quantidade
// e dividimos na leitura. Assim a média continua correta ao agregar vários dias.

import {getDateKey, getHourKey, isValidDateKey} from "./utils.js";

const PREFIX = "daily-";
const TIPOS = ["A", "P"];

function emptyDay(date) {
	return {
		date,
		exemplo: false,
		emitidas: {A: 0, P: 0},
		atendidas: {A: 0, P: 0},
		esperaTotalMs: {A: 0, P: 0},
		porHora: {}
	};
}

function num(v) {
	const n = Number(v);
	return Number.isFinite(n) && n >= 0 ? n : 0;
}

function pair(obj) {
	return {A: num(obj?.A), P: num(obj?.P)};
}

// Garante o formato do registro mesmo que o dado salvo esteja incompleto/corrompido.
function normalizeDay(date, raw) {
	const day = emptyDay(date);
	if (!raw || typeof raw !== "object") return day;

	day.exemplo = raw.exemplo === true;
	day.emitidas = pair(raw.emitidas);
	day.atendidas = pair(raw.atendidas);
	day.esperaTotalMs = pair(raw.esperaTotalMs);

	for (const [hora, v] of Object.entries(raw.porHora ?? {})) {
		if (/^\d{2}$/.test(hora)) day.porHora[hora] = pair(v);
	}
	return day;
}

function readDay(date) {
	try {
		const raw = localStorage.getItem(PREFIX + date);
		return raw ? normalizeDay(date, JSON.parse(raw)) : emptyDay(date);
	} catch {
		return emptyDay(date);
	}
}

function saveDay(day) {
	localStorage.setItem(PREFIX + day.date, JSON.stringify(day));
}

// ---------------- Registro (chamado pelo localStorageBackend) ----------------

export function registerIssued(type, ts = Date.now()) {
	if (!TIPOS.includes(type)) return;
	const day = readDay(getDateKey(ts));
	day.emitidas[type] += 1;
	saveDay(day);
}

export function registerCalled(type, waitMs, ts = Date.now()) {
	if (!TIPOS.includes(type)) return;
	const day = readDay(getDateKey(ts));
	const hour = getHourKey(ts);

	day.atendidas[type] += 1;
	day.esperaTotalMs[type] += Math.max(0, waitMs);
	day.porHora[hour] = day.porHora[hour] ?? {A: 0, P: 0};
	day.porHora[hour][type] += 1;
	saveDay(day);
}

// ---------------- Consulta ----------------

export function listDays({de = "0000-00-00", ate = "9999-99-99"} = {}) {
	const days = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key || !key.startsWith(PREFIX)) continue;

		const date = key.slice(PREFIX.length);
		if (!isValidDateKey(date) || date < de || date > ate) continue;
		days.push(readDay(date));
	}
	return days.sort((a, b) => a.date.localeCompare(b.date));
}

function avg(total, count) {
	return count > 0 ? total / count : null;
}

// Agrega vários dias no formato usado pela tela de relatórios.
export function consolidar(days) {
	const emitidas = {A: 0, P: 0};
	const atendidas = {A: 0, P: 0};
	const espera = {A: 0, P: 0};
	const horas = {};

	const dias = days.map((d) => {
		for (const t of TIPOS) {
			emitidas[t] += d.emitidas[t];
			atendidas[t] += d.atendidas[t];
			espera[t] += d.esperaTotalMs[t];
		}
		for (const [h, v] of Object.entries(d.porHora)) {
			horas[h] = horas[h] ?? {A: 0, P: 0};
			horas[h].A += v.A;
			horas[h].P += v.P;
		}

		const totalAtend = d.atendidas.A + d.atendidas.P;
		return {
			date: d.date,
			exemplo: d.exemplo,
			emitidas: d.emitidas,
			atendidas: d.atendidas,
			esperaMediaMs: {
				A: avg(d.esperaTotalMs.A, d.atendidas.A),
				P: avg(d.esperaTotalMs.P, d.atendidas.P),
				geral: avg(d.esperaTotalMs.A + d.esperaTotalMs.P, totalAtend)
			}
		};
	});

	const totalAtendidas = atendidas.A + atendidas.P;

	return {
		resumo: {
			dias: dias.length,
			diasExemplo: dias.filter((d) => d.exemplo).length,
			emitidas: {...emitidas, total: emitidas.A + emitidas.P},
			atendidas: {...atendidas, total: totalAtendidas},
			esperaMediaMs: {
				A: avg(espera.A, atendidas.A),
				P: avg(espera.P, atendidas.P),
				geral: avg(espera.A + espera.P, totalAtendidas)
			}
		},
		dias,
		porHora: Object.keys(horas).sort().map((h) => ({
			hora: h,
			A: horas[h].A,
			P: horas[h].P,
			total: horas[h].A + horas[h].P
		}))
	};
}

// ---------------- Importação / remoção de dados de exemplo ----------------

// Importa dias de exemplo SEM sobrescrever dias com dados reais.
export function importExampleDays(rawDays) {
	let imported = 0;
	for (const raw of rawDays) {
		if (!raw || !isValidDateKey(raw.date)) continue;

		const existing = localStorage.getItem(PREFIX + raw.date);
		if (existing && readDay(raw.date).exemplo !== true) continue;

		const day = normalizeDay(raw.date, raw);
		day.exemplo = true;
		saveDay(day);
		imported++;
	}
	return imported;
}

export function removeExampleDays() {
	const toRemove = listDays().filter((d) => d.exemplo).map((d) => PREFIX + d.date);
	toRemove.forEach((k) => localStorage.removeItem(k));
	return toRemove.length;
}
