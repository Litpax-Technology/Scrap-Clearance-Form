const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzxfDJVsVp7gB_fzLqgCvp1I8H7kgKQpeYD5g2eDIhROzGTtGLQewlH1olxYevWaLrAvQ/exec";

const clearanceSelect = document.getElementById("clearanceSelect");
const receiveInput = document.getElementById("receiveInput");
const receiveBtn = document.getElementById("receiveBtn");
const resultLine = document.getElementById("resultLine");
const totalPendingText = document.getElementById("totalPendingText");

let pendingMap = {}; // clearanceId -> balance

async function loadPending() {
  clearanceSelect.innerHTML = `<option value="">Loading...</option>`;
  try {
    const res = await fetch(WEB_APP_URL);
    const result = await res.json();

    if (result.status !== "success") {
      totalPendingText.innerText = "Error";
      clearanceSelect.innerHTML = `<option value="">Error loading</option>`;
      return;
    }

    totalPendingText.innerText = "₹ " + Number(result.totalPending).toFixed(2);

    pendingMap = {};
    const list = result.pendingList || [];

    if (list.length === 0) {
      clearanceSelect.innerHTML = `<option value="">No pending entries 🎉</option>`;
      return;
    }

    let opts = `<option value="">-- Select Clearance ID --</option>`;
    list.forEach(item => {
      const bal = Number(item.balanceAmount) || 0;
      pendingMap[item.clearanceId] = bal;
      opts += `<option value="${item.clearanceId}">${item.clearanceId} (₹${bal.toFixed(2)})</option>`;
    });
    clearanceSelect.innerHTML = opts;

  } catch (e) {
    totalPendingText.innerText = "Error";
    clearanceSelect.innerHTML = `<option value="">Network error. URL check karo.</option>`;
  }
}

async function collect() {
  const clearanceId = clearanceSelect.value;
  const amount = Number(receiveInput.value) || 0;

  if (!clearanceId) { showResult("Pehle Clearance ID select karo.", "error"); return; }
  if (amount <= 0)  { showResult("Valid amount daalo.", "error"); return; }

  const balance = pendingMap[clearanceId] || 0;
  if (amount > balance) {
    showResult("Amount pending (₹" + balance.toFixed(2) + ") se zyada hai.", "error");
    return;
  }

  if (!confirm("₹" + amount.toFixed(2) + " receive kare " + clearanceId + " ke against?")) return;

  receiveBtn.disabled = true;
  receiveBtn.innerText = "...";

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({ action: "collect", clearanceId: clearanceId, receiveNow: amount })
    });
    const result = await res.json();

    if (result.status === "success") {
      const nb = Number(result.newBalance);
      if (nb <= 0) {
        showResult("Complete ✓  " + clearanceId + " poora clear ho gaya.", "success");
      } else {
        showResult("Received ✔  " + clearanceId + " • Ab pending: ₹" + nb.toFixed(2), "success");
      }
      receiveInput.value = "";
      loadPending();   // total + dropdown refresh
    } else {
      showResult("Error: " + result.message, "error");
    }
  } catch (e) {
    showResult("Submit error.", "error");
  }

  receiveBtn.disabled = false;
  receiveBtn.innerText = "Receive Payment";
}

function showResult(text, type) {
  resultLine.innerText = text;
  resultLine.className = "cb-result " + type;
}

receiveBtn.addEventListener("click", collect);
loadPending();
