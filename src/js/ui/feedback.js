// Estados de interface para operações assíncronas: carregando, sucesso e erro.

const ICONS = {success: "✔", error: "⚠"};

// type: "loading" | "success" | "error". Retorna o elemento para quem quiser anexar algo (ex.: botão).
export function showFeedback(el, type, text) {
	if (!el) return null;

	el.hidden = false;
	el.className = `feedback feedback--${type}`;
	el.setAttribute("role", type === "error" ? "alert" : "status");
	el.textContent = "";

	const icon = document.createElement("span");
	if (type === "loading") {
		icon.className = "spinner";
		icon.setAttribute("aria-hidden", "true");
	} else {
		icon.textContent = ICONS[type];
		icon.setAttribute("aria-hidden", "true");
	}

	const msg = document.createElement("span");
	msg.textContent = text;

	el.append(icon, msg);
	return el;
}

export function showError(el, text, onRetry) {
	showFeedback(el, "error", text);
	if (el && onRetry) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "btn btn--secondary btn--sm";
		btn.textContent = "Tentar novamente";
		btn.addEventListener("click", onRetry);
		el.appendChild(btn);
	}
}

export function hideFeedback(el) {
	if (!el) return;
	el.hidden = true;
	el.textContent = "";
}

// Desabilita os botões enquanto a operação roda (evita envio duplicado).
export function setBusy(buttons, busy) {
	for (const b of buttons) {
		if (!b) continue;
		b.disabled = busy;
		b.setAttribute("aria-busy", busy ? "true" : "false");
	}
}

// Mensagem amigável para qualquer erro vindo dos serviços.
export function errorMessage(err) {
	return err?.message || "Ocorreu um erro inesperado.";
}
