import {pad} from "./utils.js"
import { localStorageInsertPassword, localStorageGetNormalPassword, localStorageGetPriorityPassword } from "./localStorageBackend.js";

export function insertPassword(name, type) {
	localStorageInsertPassword(name, type);
}

export function getNormalPasswords() {
	return localStorageGetNormalPassword();
}

export function getPriorityPasswords() {
	return localStorageGetPriorityPassword();
}
