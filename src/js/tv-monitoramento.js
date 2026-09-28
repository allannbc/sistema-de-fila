import {getTime, getDate} from "./utils.js"

let time = document.querySelector("#time");
let date = document.querySelector("#date");

function updateDate() {
	time.innerText = getTime();
	date.innerText = getDate();
}

updateDate()
setInterval(updateDate, 1000);


