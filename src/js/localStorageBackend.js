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

export function localStorageGetCurrentCount() {
	let tmp = localStorage.getItem("cur-index");
	return tmp === null ? 0 : parseInt(tmp);
}

export function localStorageSetCurrentCount(num) {
	localStorage.setItem("cur-index", num.toString());
}

export function localStorageGetCurrent() {
	return localStorage.getItem("calling-password") ?? "-";
}

function getNext() {
	let priority = localStorageGetPriorityPasswords();
	let index = localStorageGetCurrentCount();

	if (index === 2 || priority.length === 0) {
		let normal = localStorageGetNormalPasswords();

		if (normal.length === 0) {
			return "-";
		}

		return normal[0];
	}

	return priority[0];
}

export function localStoragePopNext() {
	let pass = getNext();

	if (pass === null) {
		localStorage.setItem("calling-password", "-");
		return "-";
	}

	localStorage.setItem("calling-password", pass);

	let co = localStorageGetPassCount();
	let index = localStorageGetCurrentCount();
	if (pass[0] === 'P') {
		let priority = localStorageGetPriorityPasswords();
		let str = "";
		index = Math.min(index + 1, 2);
		for (let i = 1; i < priority.length; i++) {
			str = str + priority[i];
		}

		let pri = co.priority - 1;
		let all = co.all - 1;

		localStorage.setItem("pass-count-P", pri.toString());
		localStorage.setItem("pass-count", all.toString());
		localStorage.setItem("passwords-P", str);
		localStorage.setItem("cur-index", index.toString());
		return pass;
	}

	index = 0;
	let normal = localStorageGetNormalPasswords();
	let str = "";
	for (let i = 1; i < normal.length; i++) {
		str = str + normal[i];
	}

	let nor = co.normal - 1;
	let all = co.all - 1;

	localStorage.setItem("pass-count-P", nor.toString());
	localStorage.setItem("pass-count", all.toString());
	localStorage.setItem("passwords-P", str);
	localStorage.setItem("cur-index", index.toString());
	return pass;
}
