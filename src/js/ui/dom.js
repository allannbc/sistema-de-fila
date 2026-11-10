// Pequeno helper para montar elementos sem usar innerHTML com dados do usuário.

export function el(tag, props = {}, ...children) {
	const node = document.createElement(tag);
	for (const [k, v] of Object.entries(props)) {
		if (v === undefined || v === null) continue;
		if (k === "text") node.textContent = v;
		else if (k === "class") node.className = v;
		else node.setAttribute(k, v);
	}
	for (const child of children) {
		if (child !== null && child !== undefined) node.append(child);
	}
	return node;
}
