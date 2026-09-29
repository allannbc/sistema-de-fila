import * as backend from "./backend.js";

const tbody = document.querySelector(".queue-table tbody");
const totalWaitingEl = document.querySelector(".report-meta strong");
const callingTicketEl = document.querySelector("#calling-ticket");
const nextTicketEl = document.querySelector("#next-ticket");
const summaryWaitingEl = document.querySelector(".queue-summary ul li:nth-child(1) strong");
const summaryPriorityEl = document.querySelector(".queue-summary ul li:nth-child(2) strong");
const summaryAvgEl = document.querySelector(".queue-summary ul li:nth-child(3) strong");
const callButton = document.querySelector(".action-bar .btn--primary");

function formatWaitTime(ms) {
  const min = Math.floor(ms / 60000);
  return `${min} min`;
}

function getTypeLabel(pass) {
  return pass[0] === "P" ? "Preferencial" : "Normal";
}

function getTypeBadgeClass(pass) {
  return pass[0] === "P" ? "badge--preferencial" : "badge--normal";
}

function renderCalling() {
  if (!callingTicketEl) return;

  const calling = backend.getCurrent();
  callingTicketEl.textContent = calling === "-" ? "—" : calling;
}

function renderNext() {
  if (!nextTicketEl) return;

  const next = backend.getNext();
  nextTicketEl.textContent = next === "-" ? "—" : next;
}

function renderQueue() {
  if (!tbody) return;

  const now = Date.now();
  const queue = backend.getSortedPasswords().map(backend.passToData);

  tbody.innerHTML = "";

  for (const data of queue) {
    const tr = document.createElement("tr");

    const tdPass = document.createElement("td");
    tdPass.className = "ticket-code";
    tdPass.textContent = data.pass;
    tr.appendChild(tdPass);

    const tdName = document.createElement("td");
    tdName.textContent = data.name;
    tr.appendChild(tdName);

    const tdType = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${getTypeBadgeClass(data.pass)}`;
    badge.textContent = getTypeLabel(data.pass);
    tdType.appendChild(badge);
    tr.appendChild(tdType);

    const tdTime = document.createElement("td");
    tdTime.textContent = formatWaitTime(now - data.time);
    tr.appendChild(tdTime);

    tbody.appendChild(tr);
  }

  const totalWaiting = queue.length;
  const priorityCount = queue.filter((data) => data.pass[0] === "P").length;

  if (totalWaitingEl) {
    totalWaitingEl.textContent = totalWaiting;
  }

  if (summaryWaitingEl) {
    summaryWaitingEl.textContent = totalWaiting;
  }

  if (summaryPriorityEl) {
    summaryPriorityEl.textContent = priorityCount;
  }

  if (summaryAvgEl) {
    if (queue.length === 0) {
      summaryAvgEl.textContent = "—";
    } else {
      const totalWait = queue.reduce((sum, data) => sum + (now - data.time), 0);
      summaryAvgEl.textContent = formatWaitTime(totalWait / queue.length);
    }
  }
}

function updatePanel() {
  renderCalling();
  renderNext();
  renderQueue();
}

if (callButton) {
  callButton.addEventListener("click", () => {
    backend.popNext();
  });
}

backend.onQueueChange(updatePanel);
updatePanel();

// Atualiza os tempos de espera periodicamente
setInterval(renderQueue, 30000);
