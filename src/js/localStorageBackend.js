import {pad} from "./utils.js"

function setItem(item, v) {
	localStorage.setItem(item, v.toString());
}

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
	let passwords = localStorage.getItem("passwords-A") ?? "";
	let ps = [];

	for (let i = 0; i < passwords.length; i += 5) {
		ps = [...ps, passwords.substring(i, i + 5)]
	}

	return ps;
}

export function localStorageGetLastPasswords() {
	let passwords = localStorage.getItem("last-passwords") ?? "";
	let ps = [];

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
		},
		get remNormal() {
			let ans = localStorage.getItem("pass-rem-A");
			if (ans === null) {
				return 0;
			}
			return parseInt(ans);
		},
		get remPriority() {
			let ans = localStorage.getItem("pass-rem-P");
			if (ans === null) {
				return 0;
			}
			return parseInt(ans);
		},
		get rem() {
			let ans = localStorage.getItem("pass-rem");
			if (ans === null) {
				return 0;
			}
			return parseInt(ans);
		},
		get timeSum() {
			let ans = localStorage.getItem("time-sum");
			if (ans === null) {
				return 0;
			}
			return parseInt(ans);
		}
	}
}

export function localStorageOnQueueChange(func) {
	window.addEventListener("storage", func);
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

const REMEMBER = 5;

function addToTmp(pass) {
	let str = localStorage.getItem("last-passwords") ?? "";
	if (str.length == REMEMBER * 5) {
		str = str.substring(0, (REMEMBER - 1) * 5);
	}

	str = pass + str;
	setItem("last-passwords", str);
}

export function localStoragePopNext() {
	let pass = getNext();

	if (pass === "-") {
		setItem("calling-password", "-");
		return "-";
	}

	setItem("calling-password", pass);
	addToTmp(pass);

	let co = localStorageGetPassCount();
	let index = localStorageGetCurrentCount();
	if (pass[0] === 'P') {
		let priority = localStorageGetPriorityPasswords();
		let str = "";
		index = Math.min(index + 1, 2);
		for (let i = 1; i < priority.length; i++) {
			str = str + priority[i];
		}

		setItem("pass-rem-P", co.remPriority + 1);
		setItem("pass-rem", co.rem + 1);
		setItem("passwords-P", str);
		setItem("cur-index", index);
		setItem("time-sum", co.timeSum + Date.now() - localStoragePassToData(pass).time);
		return pass;
	}

	index = 0;
	let normal = localStorageGetNormalPasswords();
	let str = "";
	for (let i = 1; i < normal.length; i++) {
		str = str + normal[i];
	}

	setItem("pass-rem-A", co.remNormal + 1);
	setItem("pass-rem", co.rem + 1);
	setItem("passwords-A", str);
	setItem("cur-index", index);
	setItem("time-sum", co.timeSum + Date.now() - localStoragePassToData(pass).time);
	return pass;
}
