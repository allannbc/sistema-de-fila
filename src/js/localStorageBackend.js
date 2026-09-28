import {pad} from "./utils.js"

export function localStorageInsertPassword(name, type) {
	// Colocar no local storage pra testes
	let pass = localStorage.getItem("pass-count");
	if (pass === null) {
		localStorage.setItem("pass-count", "0");
		pass = "0";
	}
	let tmp = parseInt(pass) + 1;
	localStorage.setItem("pass-count", tmp.toString())

	let password = type + "-" + pad(pass, 3)
	localStorage.setItem(password + "-name", name);
	localStorage.setItem(password + "-attended", "0");
	localStorage.setItem(password + "-time", Date.now().toString());

	let ps = localStorage.getItem("passwords-" + type);
	if (ps === null) {
		ps = "";
	}
	ps = ps + password;
	localStorage.setItem("passwords-" + type, ps);
}
