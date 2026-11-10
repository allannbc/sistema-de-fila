// Operações de escrita da fila, expostas como funções assíncronas.
// As telas só conhecem estas funções — não sabem se o dado vem de um servidor real
// ou do serviço simulado.

import {api} from "../api/apiClient.js";

// tipo: "A" (normal) ou "P" (preferencial). Resolve com { codigo, nome, tipo }.
export function emitirSenha(nome, tipo) {
	return api.post("/senhas", {nome, tipo});
}

// Resolve com { senha, nome, tipo } ou { senha: null } quando não há ninguém para chamar.
export function chamarProximo() {
	return api.post("/atendimentos");
}
