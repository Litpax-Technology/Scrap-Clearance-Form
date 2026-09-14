const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz5iMArcJmDdpaCjn3RwcgGSSlHMypD09Y87SGXAtP2HG5GNqdBd4ztkextufwUOczn1Q/exec";

const receiveInput = document.getElementById("receiveInput");
const receiveBtn = document.getElementById("receiveBtn");
const resultLine = document.getElementById("resultLine");
const totalPendingText = document.getElementById("totalPendingText");

async function loadPending() {
  totalPendingText.innerText = "Loading...";
  try {
    const res = await fetch(WEB_APP_URL);
    const result = await res.json();
    if (result.status !== "success") { totalPendingText.innerText = "Error"; return; }
    totalPendingText.innerText = "₹ " + Number(result.totalPending).toFixed(2);
  } catch (e) {
    totalPendingText.innerText = "Network error";
  }
}

async function collect() {
  const amount = Number(receiveInput.value) || 0;
  if (amount <= 0) { showResult("Valid amount daalo.", "error"); return; }
  if (!confirm("₹" + amount.toFixed(2) + " receive kare?")) return;

  receiveBtn.disabled = true;
  receiveBtn.innerText = "...";

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({ action: "collect", receiveNow: amount })
    });
    const result = await res.json();

    if (result.status === "success") {
      const np = Number(result.newPending);
      if (np <= 0) showResult("Complete ✓  Sab pending clear ho gaya.", "success");
      else showResult("Received ✔ ₹" + amount.toFixed(2) + " • Ab total pending: ₹" + np.toFixed(2), "success");
      receiveInput.value = "";
      loadPending();
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
