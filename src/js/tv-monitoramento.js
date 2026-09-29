import {getTime, getDate} from "./utils.js"
import * as backend from "./backend.js"

let time = document.querySelector("#time");
let date = document.querySelector("#date");

function updateDate() {
	time.innerText = getTime();
	date.innerText = getDate();
}

function updateQueue() {
	const sortedData = backend.getSortedPasswords().map(backend.passToData);

	document.querySelector(".queue-chips").innerHTML = sortedData.reduce((res, data) => {
		let html = "<li>" + data.pass;
		if (data.pass[0] == 'P') {
			html = html + " <span class=\"badge badge--preferencial\">Pref.</span>";
		}
		html = html + "</li>";
		return res + html;
	}, "");

	const total = backend.getPassCount().all - backend.getPassCount().rem;
	document.querySelector(".queue-total").innerText = "Total: " + total.toString() + " aguardando"
}

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function updateCalling() {
	let pass = backend.getCurrent();

	let calling = document.querySelector(".ticket-code");

	if (pass === "-") {
		calling.innerText = "-";
		return;
	}

	let data = backend.passToData(pass);
	calling.innerText = pass + " - " + capitalizeFirstLetter(data.name);
}

function updateNext() {
	let pass = backend.getNext();

	const next = document.querySelector(".next-up");

	if (pass === "-") {
		next.innerText = "-";
		return;
	}

	let html = "Próximo: <strong>" + pass.toString() + "</strong>";
	if (pass[0] === 'P') {
		html = html + "<span class=\"badge badge--preferencial\">Preferencial</span>";
	}

	next.innerHTML = html;
}

function updateTime() {
	let co = backend.getPassCount();
	const time = new Date(co.rem === 0 ? 0 : co.timeSum / co.rem).getMinutes();

	const place = document.querySelector(".stat-value");
	place.innerText = time.toString() + " min";
}

function updateNotices() {
	let notices = document.querySelector(".tv-panel.tv-panel--alerts");
	let html = "<h3>Avisos</h3>";
	let pass = backend.getLastPasswords();

	for (let i = 0; i < pass.length; i++) {
		html = html + "<p>Senha " + pass[i] + " chamada</p>"
	}

	notices.innerHTML = html;
}

function updateMonitor() {
	updateQueue();
	updateCalling();
	updateNext();
	updateTime();
	updateNotices();
}

updateMonitor();
updateDate();

setInterval(updateDate, 1000);
backend.onQueueChange(updateMonitor);
