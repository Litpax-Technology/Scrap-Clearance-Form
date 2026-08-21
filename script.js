const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbybnj2DamECVKCWSPgCoojCQE-fhG2PPc5Zh3oSsBQMysNK9AXcjg4qk3ElrfC1UNFrUg/exec";

const itemsBox = document.getElementById("itemsBox");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");

function addItem() {
  const row = document.createElement("div");
  row.className = "item-row";

  row.innerHTML = `
    <div>
      <label>Scrap Type</label>
      <select class="scrapType" required>
        <option value="">Select</option>
        <option>Metal Scrap</option>
        <option>Plastic Scrap</option>
        <option>E-Waste</option>
        <option>Mixed Scrap</option>
        <option>Other</option>
      </select>
    </div>

    <div>
      <label>Quantity / Weight</label>
      <input type="number" class="qty" min="0" step="0.01" placeholder="Kg" required />
    </div>

    <div>
      <label>Rate</label>
      <input type="number" class="rate" min="0" step="0.01" placeholder="₹ / Kg" required />
    </div>

    <div>
      <label>Amount</label>
      <input type="text" class="amount" value="₹ 0.00" readonly />
    </div>

    <button type="button" class="remove-btn" onclick="removeItem(this)">X</button>
  `;

  itemsBox.appendChild(row);

  row.querySelector(".qty").addEventListener("input", calculateTotal);
  row.querySelector(".rate").addEventListener("input", calculateTotal);
}

function removeItem(btn) {
  if (document.querySelectorAll(".item-row").length === 1) return;

  btn.closest(".item-row").remove();
  calculateTotal();
}

function calculateTotal() {
  let totalWeight = 0;
  let totalAmount = 0;

  document.querySelectorAll(".item-row").forEach(row => {
    const qty = Number(row.querySelector(".qty").value) || 0;
    const rate = Number(row.querySelector(".rate").value) || 0;
    const amount = qty * rate;

    row.querySelector(".amount").value = "₹ " + amount.toFixed(2);

    totalWeight += qty;
    totalAmount += amount;
  });

  document.getElementById("totalWeightText").innerText =
    totalWeight.toFixed(2) + " Kg";

  document.getElementById("totalAmountText").innerText =
    "₹ " + totalAmount.toFixed(2);
}

document.getElementById("scrapForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="loader"></span>Submitting...`;

  const items = [];

  document.querySelectorAll(".item-row").forEach(row => {
    const type = row.querySelector(".scrapType").value;
    const qty = Number(row.querySelector(".qty").value) || 0;
    const rate = Number(row.querySelector(".rate").value) || 0;
    const amount = qty * rate;

    if (type && qty > 0 && rate > 0) {
      items.push({ type, qty, rate, amount });
    }
  });

  const totalWeight = items.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  if (items.length === 0) {
    showMsg("Please add at least one valid scrap item.", "error");
    resetSubmitButton();
    return;
  }

  const payload = {
    items,
    totalWeight,
    totalAmount,
    amountReceived: document.getElementById("amountReceived").value || 0,
    paymentMode: document.getElementById("paymentMode").value,
    clearedBy: document.getElementById("clearedBy").value,
    remarks: document.getElementById("remarks").value
  };

  showMsg("Saving...", "");

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await res.json();

        if (result.status === "success") {
      showMsg("Saved Successfully. ID: " + result.clearanceId, "success");

      document.getElementById("scrapForm").reset();
      itemsBox.innerHTML = "";
      addItem();
      calculateTotal();
      loadPending();
    } else {
      showMsg("Error: " + result.message, "error");
    }

  } catch (error) {
    showMsg("Submit error. Web App URL check karo.", "error");
  }

  resetSubmitButton();
});

function resetSubmitButton() {
  submitBtn.disabled = false;
  submitBtn.innerHTML = "Submit Clearance";
}

function showMsg(text, type) {
  msg.innerText = text;
  msg.className = type;
}

async function loadPending() {
  try {
    const res = await fetch(WEB_APP_URL);
    const result = await res.json();
    if (result.status === "success") {
      document.getElementById("pendingText").innerText =
        "₹ " + Number(result.totalPending).toFixed(2);
    } else {
      document.getElementById("pendingText").innerText = "—";
    }
  } catch (e) {
    document.getElementById("pendingText").innerText = "—";
  }
}

addItem();
calculateTotal();
loadPending();
