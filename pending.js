const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbybnj2DamECVKCWSPgCoojCQE-fhG2PPc5Zh3oSsBQMysNK9AXcjg4qk3ElrfC1UNFrUg/exec";

const listBox = document.getElementById("listBox");
const totalPendingText = document.getElementById("totalPendingText");
const pageMsg = document.getElementById("pageMsg");

async function loadPending() {
  listBox.innerHTML = `<div class="loading-row">Loading pending entries...</div>`;
  try {
    const res = await fetch(WEB_APP_URL);
    const result = await res.json();

    if (result.status !== "success") {
      listBox.innerHTML = `<div class="loading-row">Error loading data.</div>`;
      return;
    }

    totalPendingText.innerText = "₹ " + Number(result.totalPending).toFixed(2);

    if (!result.pendingList || result.pendingList.length === 0) {
      listBox.innerHTML = `<div class="loading-row">No pending amount. All cleared 🎉</div>`;
      return;
    }

    listBox.innerHTML = "";
    result.pendingList.forEach(item => {
      const row = document.createElement("div");
      row.className = "pending-row";
      row.innerHTML = `
        <div class="pr-info">
          <div class="pr-id">${item.clearanceId}</div>
          <div class="pr-meta">Cleared By: ${item.clearedBy || "-"} ${item.remarks ? "• " + item.remarks : ""}</div>
          <div class="pr-amounts">
            Total: ₹${Number(item.totalAmount).toFixed(2)} &nbsp;|&nbsp;
            Received: ₹${Number(item.amountReceived).toFixed(2)} &nbsp;|&nbsp;
            <span class="pr-balance">Pending: ₹${Number(item.balanceAmount).toFixed(2)}</span>
          </div>
        </div>
        <div class="pr-action">
          <input type="number" min="0" step="0.01" class="receiveInput" placeholder="Amount" />
          <button class="receive-btn">Receive</button>
        </div>
      `;

      const input = row.querySelector(".receiveInput");
      const btn = row.querySelector(".receive-btn");
      btn.addEventListener("click", () => collect(item, input, btn));

      listBox.appendChild(row);
    });

  } catch (e) {
    listBox.innerHTML = `<div class="loading-row">Network error. URL check karo.</div>`;
  }
}

async function collect(item, input, btn) {
  const amount = Number(input.value) || 0;
  const balance = Number(item.balanceAmount) || 0;

  if (amount <= 0) {
    showMsg("Valid amount daalo.", "error");
    return;
  }

  // Option B: frontend check (backend bhi rokta hai)
  if (amount > balance) {
    showMsg("Amount pending (₹" + balance.toFixed(2) + ") se zyada hai.", "error");
    return;
  }

  if (!confirm("₹" + amount.toFixed(2) + " receive kare " + item.clearanceId + " ke against?")) return;

  btn.disabled = true;
  btn.innerText = "...";

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "collect",
        clearanceId: item.clearanceId,
        receiveNow: amount
      })
    });
    const result = await res.json();

    if (result.status === "success") {
      showMsg("Received ✔ " + item.clearanceId + " • New Balance: ₹" + Number(result.newBalance).toFixed(2), "success");
      loadPending();
    } else {
      showMsg("Error: " + result.message, "error");
      btn.disabled = false;
      btn.innerText = "Receive";
    }
  } catch (e) {
    showMsg("Submit error.", "error");
    btn.disabled = false;
    btn.innerText = "Receive";
  }
}

function showMsg(text, type) {
  pageMsg.innerText = text;
  pageMsg.className = type;
}

loadPending();
