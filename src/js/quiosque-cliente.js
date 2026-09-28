function savePassword(type) {
	let name = document.querySelector("#nome-cliente").value;
	console.log("Senha registrada: ", name, type);
}

let normal = document.querySelector(".btn.btn--primary");
let preferencial = document.querySelector(".btn.btn--secondary");

normal.addEventListener("click", () => savePassword(0), true);
preferencial.addEventListener("click", () => savePassword(1), true);
