import {emitirSenha} from "./services/filaService.js";
import {showFeedback, setBusy, errorMessage} from "./ui/feedback.js";
import {capitalize} from "./utils.js";

const TIPOS = ['A', 'P'];
const LABELS = ['normal', 'preferencial'];

const nameInput = document.querySelector("#nome-cliente");
const normal = document.querySelector(".btn.btn--primary");
const preferencial = document.querySelector(".btn.btn--secondary");
const feedbackEl = document.querySelector("#feedback");

async function savePassword(event, type) {
	console.log("Senha solicitada: ", nameInput.value, TIPOS[type]);

	const regex = /^[a-z]{3,30}$/;
	if (!regex.test(nameInput.value)) {
		nameInput.setCustomValidity("Nome inválido, deve conter apenas letras minúsculas.");
		console.log("Nome inválido.");
		return;
	}

	nameInput.setCustomValidity("");

	event.preventDefault();

	const nome = nameInput.value;

	// carregando
	showFeedback(feedbackEl, "loading", "Emitindo sua senha…");
	setBusy([normal, preferencial], true);

	try {
		// operação enviada ao servidor (simulado)
		const senha = await emitirSenha(nome, TIPOS[type]);

		// sucesso
		showFeedback(feedbackEl, "success",
			`Senha ${LABELS[type]} ${senha.codigo} emitida para ${capitalize(senha.nome)}. Aguarde ser chamado.`);
		nameInput.value = "";
	} catch (err) {
		// erro (campo preservado para o cliente tentar de novo)
		showFeedback(feedbackEl, "error", errorMessage(err));
	} finally {
		setBusy([normal, preferencial], false);
	}
}

normal.addEventListener("click", (event) => {savePassword(event, 0)}, false);
preferencial.addEventListener("click", (event) => savePassword(event, 1), false);
