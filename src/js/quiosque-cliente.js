import {insertPassword} from "./backend.js"

function savePassword(event, type) {
	let name = document.querySelector("#nome-cliente");
	console.log("Senha registrada: ", name.value, type);

	const regex = /^[a-z]{3,30}$/;
	if (!regex.test(name.value)) {
		name.setCustomValidity("Nome inválido, deve conter apenas letras minúsculas.");
		console.log("Nome inválido.");
		return;
	}

	name.setCustomValidity("");

	event.preventDefault();

	let pref = [
		'A',
		'P'
	];

	insertPassword(name.value, pref[type]);

	name.value = "";
}

let normal = document.querySelector(".btn.btn--primary");
let preferencial = document.querySelector(".btn.btn--secondary");

normal.addEventListener("click", (event) => {savePassword(event, 0)}, false);
preferencial.addEventListener("click", (event) => savePassword(event, 1), false);
