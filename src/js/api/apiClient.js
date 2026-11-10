// Cliente HTTP da aplicação.
//
// Recebe um "transporte" com a mesma assinatura do fetch simplificado
// (método, caminho, corpo) -> Promise<Response-like>. Hoje o transporte é o
// serviço simulado; para usar um servidor real basta trocá-lo por uma função
// que chame fetch(), sem mexer em nenhuma tela ou serviço.

import {request} from "./mockServer.js";

export class ApiError extends Error {
	constructor(status, message) {
		super(message);
		this.name = "ApiError";
		this.status = status; // 0 = falha de comunicação (sem resposta)
	}
}

export default class ApiClient {
	constructor(transport) {
		this.transport = transport;
	}

	async #send(method, path, body) {
		let response;
		try {
			response = await this.transport(method, path, body);
		} catch {
			throw new ApiError(0, "Falha de comunicação com o servidor. Verifique a conexão e tente novamente.");
		}

		let data = null;
		try {
			data = await response.json();
		} catch {
			// resposta sem corpo JSON
		}

		if (!response.ok) {
			throw new ApiError(response.status, data?.erro ?? `Erro ${response.status} ao processar a requisição.`);
		}
		return data;
	}

	get(path) {
		return this.#send("GET", path);
	}

	post(path, body) {
		return this.#send("POST", path, body);
	}

	delete(path) {
		return this.#send("DELETE", path);
	}
}

export const api = new ApiClient(request);
