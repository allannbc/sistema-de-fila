export function pad(num, size) {
    while (num.length < size) num = "0" + num;
    return num;
}

export function getTime() {
	return new Date().toLocaleTimeString("pt-BR", {timeZone: "America/Sao_Paulo"});
}

export function getDate() {
	return new Date().toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
}
