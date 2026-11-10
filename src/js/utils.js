const TZ = "America/Sao_Paulo";

export function pad(num, size) {
    while (num.length < size) num = "0" + num;
    return num;
}

export function getTime() {
	return new Date().toLocaleTimeString("pt-BR", {timeZone: TZ});
}

export function getDate() {
	return new Date().toLocaleDateString("pt-BR", {timeZone: TZ});
}

// ---- Etapa 05: datas, horas e durações usadas pelo histórico diário ----

// Chave do dia no formato AAAA-MM-DD (fuso de São Paulo).
export function getDateKey(ts = Date.now()) {
	return new Date(ts).toLocaleDateString("en-CA", {timeZone: TZ});
}

// Hora cheia ("00" a "23") no fuso de São Paulo.
export function getHourKey(ts = Date.now()) {
	const h = new Intl.DateTimeFormat("pt-BR", {timeZone: TZ, hour: "2-digit", hourCycle: "h23"})
		.format(new Date(ts));
	return h.padStart(2, "0");
}

// Soma (ou subtrai) dias de uma chave AAAA-MM-DD.
export function shiftDateKey(key, days) {
	const [y, m, d] = key.split("-").map(Number);
	const date = new Date(Date.UTC(y, m - 1, d + days));
	return date.toISOString().slice(0, 10);
}

export function isValidDateKey(key) {
	return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(Date.parse(key));
}

// "2026-11-09" -> "09/11/2026"
export function formatDateBR(key) {
	const [y, m, d] = key.split("-");
	return `${d}/${m}/${y}`;
}

// Duração em ms -> "45 s" ou "8,2 min". null/undefined -> "—".
export function formatDuration(ms) {
	if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
	if (ms < 60000) return Math.round(ms / 1000) + " s";
	return (ms / 60000).toLocaleString("pt-BR", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + " min";
}

export function capitalize(val) {
	const s = String(val);
	return s.charAt(0).toUpperCase() + s.slice(1);
}
