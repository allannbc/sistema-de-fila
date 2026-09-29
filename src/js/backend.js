import {pad} from "./utils.js"
import * as st from "./localStorageBackend.js";

// export const Data = {
// 	pass: "",
// 	name: "",
// 	attended: false,
// 	time: 0
// };

const listeners = new Set();

export function insertPassword(name, type) {
	st.localStorageInsertPassword(name, type);
}

export function getNormalPasswords() {
	return st.localStorageGetNormalPasswords();
}

export function getPriorityPasswords() {
	return st.localStorageGetPriorityPasswords();
}

export function getSortedPasswords() {
	let normal = getNormalPasswords();
	let priority = getPriorityPasswords();

	return [...normal, ...priority].toSorted((a, b) => {
		let timea = localStorage.getItem(a + "-time");
		let timeb = localStorage.getItem(b + "-time");

		return parseInt(timea) - parseInt(timeb);
	});
}

export function passToData(pass) {
	return st.localStoragePassToData(pass);
}

export function getPassCount() {
	return st.localStorageGetPassCount();
}

export function onQueueChange(func) {
	st.localStorageOnQueueChange(func);
}
