import {pad} from "./utils.js"
import * as st from "./localStorageBackend.js";

// export const Data = {
// 	pass: "",
// 	name: "",
// 	attended: false,
// 	time: 0
// };

const QUEUE_CHANGE = "Queue-change1982782898"

function dispatchChange() {
	window.dispatchEvent(new CustomEvent(QUEUE_CHANGE));
}

export function insertPassword(name, type) {
	st.localStorageInsertPassword(name, type);
	dispatchChange();
}

export function getNormalPasswords() {
	return st.localStorageGetNormalPasswords();
}

export function getPriorityPasswords() {
	return st.localStorageGetPriorityPasswords();
}

function getCurrentCount() {
	return st.localStorageGetCurrentCount();
}

function setCurrentCount(num) {
	st.localStorageSetCurrentCount(num);
}

export function getSortedPasswords() {
	let normal = getNormalPasswords();
	let priority = getPriorityPasswords();

	let passwords = [];
	let index = getCurrentCount();

	let i = 0;
	let j = 0;

	while (i < normal.length && j < priority.length) {
		if (index == 2) {
			index = 0;
			passwords = [...passwords, normal[i]];
			i++;
			continue;
		}

		passwords = [...passwords, priority[j]];
		index++;
		j++;
	}

	while (i < normal.length) {
		index = 0;
		passwords = [...passwords, normal[i]];
		i++;
	}

	while (j < priority.length) {
		index = Math.min(index + 1, 2);
		passwords = [...passwords, priority[j]];
		j++;
	}

	return passwords;
}

export function getNext() {
	let priority = getPriorityPasswords();
	let index = getCurrentCount();

	if (index === 2 || priority.length === 0) {
		let normal = getNormalPasswords();

		if (normal.length === 0) {
			return "-";
		}

		return normal[0];
	}

	return priority[0];
}

export function passToData(pass) {
	return st.localStoragePassToData(pass);
}

export function getPassCount() {
	return st.localStorageGetPassCount();
}

export function onQueueChange(func) {
	st.localStorageOnQueueChange(func);
	window.addEventListener(QUEUE_CHANGE, func);
}

export function getCurrent() {
	return st.localStorageGetCurrent();
}

export function popNext() {
	let tmp = st.localStoragePopNext();
	dispatchChange();
	return tmp;
}

export function getLastPasswords() {
	return st.localStorageGetLastPasswords();
}
