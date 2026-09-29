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

	let passt = localStorage.getItem("pass-count-" + type);
	if (passt === null) {
		localStorage.setItem("pass-count-" + type, "0");
		passt = "0";
	}
	tmp = parseInt(passt) + 1;
	localStorage.setItem("pass-count-" + type, tmp.toString());

	let password = type + "-" + pad(passt, 3)
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

export function localStorageGetNormalPasswords() {
	let passwords = localStorage.getItem("passwords-A");
	let ps = [];

	if (passwords === null) {
		return ps;
	}

	for (let i = 0; i < passwords.length; i += 5) {
		ps = [...ps, passwords.substring(i, i + 5)]
	}

	return ps;
}

export function localStorageGetPriorityPasswords() {
	let passwords = localStorage.getItem("passwords-P");
	let ps = [];

	if (passwords === null) {
		return ps;
	}

	for (let i = 0; i < passwords.length; i += 5) {
		ps = [...ps, passwords.substring(i, i + 5)]
	}

	return ps;
}

export function localStoragePassToData(pass) {
	return {
        	pass: pass,
        	name: localStorage.getItem(pass + "-name"),
        	attended: Boolean(localStorage.getItem(pass + "-attended") === "1"),
        	time: parseInt(localStorage.getItem(pass + "-time"))
    	};
}

export function localStorageGetPassCount() {
	return {
		get normal() {
			let ans = localStorage.getItem("pass-count-A");
			if (ans === null) {
				return 0;
			}
			return parseInt(ans);
		},
		get priority() {
			let ans = localStorage.getItem("pass-count-P");
			if (ans === null) {
				return 0;
			}
			return parseInt(ans);
		},
		get all() {
			let ans = localStorage.getItem("pass-count");
			if (ans === null) {
				return 0;
			}
			return parseInt(ans);
		}
	}
}

export function localStorageOnQueueChange(func) {
	window.addEventListener("storage", () => {
		func();
	});
}
