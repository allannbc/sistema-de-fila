import {getTime, getDate} from "./utils.js"
import {getSortedPasswords, passToData, getPassCount, onQueueChange} from "./backend.js"

let time = document.querySelector("#time");
let date = document.querySelector("#date");

function updateDate() {
	time.innerText = getTime();
	date.innerText = getDate();
}

function updateQueue() {
	const sortedData = getSortedPasswords().map(passToData);

	document.querySelector(".queue-chips").innerHTML = sortedData.reduce((res, data) => {
		let html = "<li>" + data.pass;
		if (data.pass[0] == 'P') {
			html = html + " <span class=\"badge badge--preferencial\">Pref.</span>";
		}
		html = html + "</li>";
		return res + html;
	}, "");

	document.querySelector(".queue-total").innerText = "Total: " + getPassCount().all.toString() + " aguardando"
}

updateQueue();
updateDate();

setInterval(updateDate, 1000);
onQueueChange(updateQueue);
