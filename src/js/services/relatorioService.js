// Operações do relatório gerencial.

import {api} from "../api/apiClient.js";

const SEED_URL = "data/historico-exemplo.json";

// CONSULTA (GET): relatório consolidado do período. Datas no formato AAAA-MM-DD.
export function consultarRelatorio({de, ate} = {}) {
	const params = new URLSearchParams();
	if (de) params.set("de", de);
	if (ate) params.set("ate", ate);

	const qs = params.toString();
	return api.get(qs ? `/relatorios?${qs}` : "/relatorios");
}

// Lê o arquivo JSON estático com a Fetch API (dado externo) e ENVIA (POST) ao serviço.
export async function importarDadosExemplo() {
	let dados;
	try {
		const response = await fetch(SEED_URL);
		if (!response.ok) {
			throw new Error(`Arquivo de exemplo indisponível (HTTP ${response.status}).`);
		}
		dados = await response.json();
	} catch (err) {
		if (err instanceof TypeError || err instanceof SyntaxError) {
			throw new Error("Não foi possível carregar o arquivo de dados de exemplo.");
		}
		throw err;
	}

	return api.post("/relatorios/importacao", dados);
}

// DELETE: remove somente os dias importados como exemplo; dados reais são preservados.
export function removerDadosExemplo() {
	return api.delete("/relatorios/exemplos");
}
