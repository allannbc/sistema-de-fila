// Serviço simulado (mock server) — Etapa 05.
//
// Imita uma API REST: recebe (método, URL, corpo) e devolve uma Promise com um objeto
// parecido com o Response do fetch ({ ok, status, json() }). Tem latência artificial
// e pode simular falha de comunicação, para que as telas exercitem os estados de
// carregamento, sucesso e erro.
//
// Rotas (recursos no plural, verbos HTTP definem a operação):
//   POST   /senhas                  emite uma senha        { nome, tipo: "A" | "P" }
//   POST   /atendimentos            chama a próxima senha
//   GET    /relatorios?de=&ate=     relatório consolidado por dia / hora
//   POST   /relatorios/importacao   importa dias de exemplo { dias: [...] }
//   DELETE /relatorios/exemplos     remove os dias de exemplo
//
// Os dados continuam no localStorage (via backend.js / historicoDiario.js).

import * as backend from "../backend.js";
import {consolidar, listDays, importExampleDays, removeExampleDays} from "../historicoDiario.js";
import {isValidDateKey} from "../utils.js";

const FAILURE_KEY = "api-simulate-failure";
const LATENCY_MIN_MS = 300;
const LATENCY_MAX_MS = 700;

export function isFailureSimulated() {
	try {
		return localStorage.getItem(FAILURE_KEY) === "1";
	} catch {
		return false;
	}
}

export function setFailureSimulated(enabled) {
	if (enabled) localStorage.setItem(FAILURE_KEY, "1");
	else localStorage.removeItem(FAILURE_KEY);
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function reply(status, data) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => structuredClone(data)
	};
}

const NOME_REGEX = /^[a-z]{3,30}$/;

const routes = [
	{
		method: "POST",
		path: /^\/senhas$/,
		handler: ({body}) => {
			const nome = body?.nome;
			const tipo = body?.tipo;

			if (typeof nome !== "string" || !NOME_REGEX.test(nome)) {
				return reply(400, {erro: "Nome inválido: use de 3 a 30 letras minúsculas."});
			}
			if (tipo !== "A" && tipo !== "P") {
				return reply(422, {erro: "Tipo de senha inválido."});
			}

			const codigo = backend.insertPassword(nome, tipo);
			return reply(201, {codigo, nome, tipo});
		}
	},
	{
		method: "POST",
		path: /^\/atendimentos$/,
		handler: () => {
			const codigo = backend.popNext();
			if (codigo === "-") {
				return reply(200, {senha: null});
			}
			const data = backend.passToData(codigo);
			return reply(201, {senha: codigo, nome: data.name, tipo: codigo[0]});
		}
	},
	{
		method: "GET",
		path: /^\/relatorios$/,
		handler: ({query}) => {
			const de = query.get("de") ?? undefined;
			const ate = query.get("ate") ?? undefined;

			if ((de && !isValidDateKey(de)) || (ate && !isValidDateKey(ate))) {
				return reply(400, {erro: "Datas devem estar no formato AAAA-MM-DD."});
			}
			if (de && ate && de > ate) {
				return reply(400, {erro: "A data inicial não pode ser maior que a data final."});
			}

			const dados = consolidar(listDays({de, ate}));
			return reply(200, {periodo: {de: de ?? null, ate: ate ?? null}, ...dados});
		}
	},
	{
		method: "POST",
		path: /^\/relatorios\/importacao$/,
		handler: ({body}) => {
			if (!Array.isArray(body?.dias)) {
				return reply(400, {erro: "Arquivo de dados inválido: campo \"dias\" ausente."});
			}
			return reply(201, {importados: importExampleDays(body.dias)});
		}
	},
	{
		method: "DELETE",
		path: /^\/relatorios\/exemplos$/,
		handler: () => reply(200, {removidos: removeExampleDays()})
	}
];

export async function request(method, url, body) {
	await delay(LATENCY_MIN_MS + Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS));

	// Igual ao fetch: falha de rede rejeita a Promise (não devolve status HTTP).
	if (isFailureSimulated()) {
		throw new TypeError("Failed to fetch");
	}

	const parsed = new URL(url, "http://mock.local");
	const route = routes.find((r) => r.method === method && r.path.test(parsed.pathname));

	if (!route) {
		return reply(404, {erro: `Recurso não encontrado: ${method} ${parsed.pathname}`});
	}

	try {
		return await route.handler({query: parsed.searchParams, body});
	} catch (err) {
		console.error("Erro interno no serviço simulado:", err);
		return reply(500, {erro: "Erro interno do servidor."});
	}
}
