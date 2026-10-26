// =====================================
// RECYCLECHAIN - PROTOTYPE APLIKASI
// Semua angka di layar dihitung dari DATA (js/data.js).
// =====================================

const MINUS = "−";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const VIEWS = {
  beranda: "Beranda",
  setor: "Setor sampah",
  tukar: "Tukar poin",
  riwayat: "Riwayat",
  paket: "Paket membership"
};

// Kalimat di bawah judul tiap layar; yang berisi angka diisi saat render
const screenSubs = {
  setor: "Ajukan setoran, lalu serahkan sampahnya. Poin masuk setelah mitra menimbang.",
  paket: "Kamu memakai Basic, gratis tanpa biaya langganan. Premium dan Super menambah reward barang refurbish."
};

let currentView = "beranda";

// =====================================
// FORMAT
// =====================================

const integerFormat = new Intl.NumberFormat("id-ID");
const kgFormat = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

function formatPoints(value) {
  return integerFormat.format(value);
}

function formatSigned(value) {
  const sign = value > 0 ? "+" : value < 0 ? MINUS : "";
  return sign + integerFormat.format(Math.abs(value));
}

function formatKg(value) {
  return `${kgFormat.format(value)} kg`;
}

function formatRupiah(value) {
  return `Rp${integerFormat.format(value)}`;
}

function parseDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(iso, days) {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

// "23 Okt" atau "23 Okt 2026"
function formatDate(iso, withYear) {
  const date = parseDate(iso);
  const text = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return withYear ? `${text} ${date.getFullYear()}` : text;
}

// "Sabtu, 31 Okt"
function formatDay(iso) {
  const date = parseDate(iso);
  return `${DAYS[date.getDay()]}, ${formatDate(iso)}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function roundKg(value) {
  return Math.round(value * 10) / 10;
}

function icon(id) {
  return `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
}

// =====================================
// STATE DAN PERHITUNGAN
// =====================================

let sequence = 0;

const state = {
  deposits: DATA.deposits.map((item) => ({ ...item, seq: ++sequence })),
  redemptions: DATA.redemptions.map((item) => ({ ...item, seq: ++sequence })),
  ledgerFilter: "all"
};

function material(id) {
  return DATA.materials[id];
}

function reward(id) {
  return DATA.rewards.find((item) => item.id === id);
}

function depositPoints(deposit) {
  return Math.round(deposit.kg * material(deposit.material).rate);
}

// Cara menyerahkan sampah, semuanya menuju satu jadwal penimbangan
function handover(methodId) {
  const day = formatDay(DATA.weighing.date);

  if (methodId === "jemput") {
    return `Mitra menjemput ke rumah ${day}, ${DATA.weighing.pickupWindow}.`;
  }
  if (methodId === "dropbox") {
    return `Masukkan ke drop-box terdekat. Isinya ditimbang ${day}.`;
  }
  return `Serahkan di titik kumpul RT/RW. Ditimbang ${day}.`;
}

function summarize() {
  const done = state.deposits.filter((item) => item.status === "done");
  const pending = state.deposits.filter((item) => item.status === "pending");
  const earned = sum(done.map(depositPoints));
  const spent = sum(state.redemptions.map((item) => reward(item.reward).cost));
  const weekStart = addDays(DATA.asOf, -7);

  const weekChange =
    sum(done.filter((item) => item.date > weekStart).map(depositPoints)) -
    sum(state.redemptions.filter((item) => item.date > weekStart).map((item) => reward(item.reward).cost));

  const byMaterial = Object.keys(DATA.materials).map((id) => {
    const rows = done.filter((item) => item.material === id);
    return {
      id,
      count: rows.length,
      kg: roundKg(sum(rows.map((item) => item.kg))),
      points: sum(rows.map(depositPoints))
    };
  });

  return {
    done,
    pending,
    earned,
    spent,
    balance: earned - spent,
    weighedKg: roundKg(sum(done.map((item) => item.kg))),
    pendingKg: roundKg(sum(pending.map((item) => item.kg))),
    pendingPoints: sum(pending.map(depositPoints)),
    weekChange,
    byMaterial
  };
}

// Reward Basic dikelompokkan per harga, untuk tangga reward
function rewardSteps(balance) {
  const basic = DATA.rewards.filter((item) => item.plan === "basic");
  const costs = [...new Set(basic.map((item) => item.cost))].sort((a, b) => a - b);

  return costs.map((cost) => {
    const phrase = joinNames(basic.filter((item) => item.cost === cost).map((item) => item.short));
    return {
      cost,
      phrase,
      label: phrase.charAt(0).toUpperCase() + phrase.slice(1),
      ready: balance >= cost,
      short: Math.max(0, cost - balance)
    };
  });
}

function joinNames(names) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} atau ${names[names.length - 1]}`;
}

// Gabungan setoran dan penukaran, terbaru di atas
function ledger() {
  const deposits = state.deposits.map((item) => ({
    kind: "deposit",
    date: item.date,
    seq: item.seq,
    title: material(item.material).name,
    detail: DATA.methods[item.method].name,
    kg: item.kg,
    points: item.status === "done" ? depositPoints(item) : null,
    estimate: depositPoints(item),
    pending: item.status === "pending"
  }));

  const redemptions = state.redemptions.map((item) => ({
    kind: "redeem",
    date: item.date,
    seq: item.seq,
    title: reward(item.reward).name,
    detail: "Penukaran poin",
    kg: null,
    points: -reward(item.reward).cost,
    pending: false
  }));

  return [...deposits, ...redemptions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.seq - a.seq
  );
}

// Data contoh harus cocok dengan angka yang ditulis di catatan desain
(function checkSampleData() {
  const totals = summarize();
  console.assert(totals.weighedKg === 12.5, "Berat tertimbang harus 12,5 kg", totals.weighedKg);
  console.assert(totals.earned === 2520, "Poin terkumpul harus 2.520", totals.earned);
  console.assert(totals.balance === 1320, "Saldo harus 1.320", totals.balance);
  console.assert(
    roundKg(sum(totals.byMaterial.map((row) => row.kg))) === totals.weighedKg,
    "Berat per material harus sama dengan total"
  );
  console.assert(
    sum(totals.byMaterial.map((row) => row.points)) === totals.earned,
    "Poin per material harus sama dengan total"
  );

  // Saldo tidak pernah minus pada urutan waktu
  let running = 0;
  ledger().reverse().forEach((row) => {
    running += row.points || 0;
    console.assert(running >= 0, "Saldo minus pada", row);
  });
})();

// =====================================
// RENDER: BERANDA
// =====================================

function renderBeranda(totals) {
  const steps = rewardSteps(totals.balance);
  const next = steps.find((step) => !step.ready);
  const top = steps[steps.length - 1].cost;

  // Temuan di bawah judul
  screenSubs.beranda = next
    ? `Kurang ${formatPoints(next.short)} poin lagi untuk ${next.phrase}.`
    : "Saldomu cukup untuk semua reward Basic.";

  document.getElementById("balanceValue").textContent = formatPoints(totals.balance);

  const change = document.getElementById("balanceChange");
  if (totals.weekChange === 0) {
    change.textContent = "Belum ada perubahan dalam 7 hari terakhir";
  } else {
    const tone = totals.weekChange > 0 ? "pos" : "";
    change.innerHTML =
      `<span class="${tone}">${formatSigned(totals.weekChange)} poin</span> dalam 7 hari terakhir`;
  }

  document.getElementById("balanceSources").textContent =
    `Terkumpul ${formatPoints(totals.earned)} poin, sudah ditukar ${formatPoints(totals.spent)} poin.`;

  // Tangga reward: lintasan sepanjang harga reward Basic termahal
  const fill = Math.min(totals.balance, top) / top * 100;
  const pendingEnd = Math.min(totals.balance + totals.pendingPoints, top) / top * 100;

  const ticks = steps.map((step) => {
    const left = step.cost / top * 100;
    const ahead = step.cost > totals.balance ? " ahead" : "";
    const tick = left < 100 ? `<span class="ladder-tick${ahead}" style="left:${left}%"></span>` : "";
    const edge = left >= 100 ? " end" : "";
    return {
      tick,
      label: `<span class="ladder-value num${edge}" style="left:${left}%">${formatPoints(step.cost)}</span>`
    };
  });

  const ladder = document.getElementById("ladder");
  ladder.innerHTML =
    `<div class="ladder-track" role="img" aria-label="Saldo ${formatPoints(totals.balance)} dari ${formatPoints(top)} poin">` +
      `<span class="ladder-fill" style="width:${fill}%"></span>` +
      (pendingEnd > fill ? `<span class="ladder-pending" style="left:${fill}%;width:${pendingEnd - fill}%"></span>` : "") +
      ticks.map((item) => item.tick).join("") +
    `</div>` +
    `<span class="ladder-value start num" style="left:0">0</span>` +
    ticks.map((item) => item.label).join("");

  document.getElementById("ladderList").innerHTML = steps.map((step) => `
    <li>
      ${step.ready ? `<svg class="check" aria-hidden="true"><use href="#i-check"/></svg>` : `<span class="dot" aria-hidden="true"></span>`}
      <span>${escapeHtml(step.label)}</span>
      <span class="cost num">${formatPoints(step.cost)} poin</span>
      <span class="state num${step.ready ? " ready" : ""}">${step.ready ? "Bisa ditukar" : `Kurang ${formatPoints(step.short)} poin`}</span>
    </li>`).join("");

  const note = document.getElementById("ladderNote");
  if (totals.pending.length) {
    const first = totals.pending[0];
    const more = totals.pending.length > 1 ? ` dan ${totals.pending.length - 1} setoran lain` : "";
    const covers = next && totals.pendingPoints >= next.short ? ", cukup untuk menutup kekurangannya" : "";
    note.innerHTML =
      `<span class="legend-dot" aria-hidden="true"></span>` +
      `<span>Setoran ${escapeHtml(material(first.material).name.toLowerCase())} ${formatKg(first.kg)}${more} ` +
      `yang ditimbang ${formatDay(DATA.weighing.date)} diperkirakan ` +
      `+${formatPoints(totals.pendingPoints)} poin${covers}.</span>`;
  } else {
    note.textContent = "Tidak ada setoran yang menunggu penimbangan.";
  }

  // Sampah yang sudah ditimbang, per material
  document.getElementById("materialsMeta").textContent =
    `${formatKg(totals.weighedKg)} dari ${totals.done.length} setoran`;

  document.getElementById("materialRows").innerHTML = totals.byMaterial.map((row) => `
    <div class="mat-row">
      <span class="row-main">
        <strong><span class="tag t-${row.id}">${escapeHtml(material(row.id).name)}</span></strong>
        <span>${row.count === 0 ? "Belum ada setoran" : `${row.count} setoran`}</span>
      </span>
      <span class="mat-rate num">${formatPoints(material(row.id).rate)} poin/kg</span>
      <span class="row-value num">
        <strong>${formatPoints(row.points)} poin</strong>
        <span>${formatKg(row.kg)}</span>
      </span>
    </div>`).join("");

  // Penimbangan berikutnya
  const weigh = document.getElementById("nextWeighing");
  if (totals.pending.length) {
    weigh.innerHTML = `
      <p class="weigh-date">${formatDay(DATA.weighing.date)}</p>
      <p class="weigh-time">Jemput ${DATA.weighing.pickupWindow}</p>
      <div class="rows weigh-list">
        ${totals.pending.map((item) => `
          <div class="row">
            <span class="row-main">
              <strong>${escapeHtml(material(item.material).name)}</strong>
              <span>${escapeHtml(DATA.methods[item.method].name)}</span>
            </span>
            <span class="row-value num">
              <strong>${formatKg(item.kg)}</strong>
              <span>perkiraan +${formatPoints(depositPoints(item))} poin</span>
            </span>
          </div>`).join("")}
      </div>`;
  } else {
    weigh.innerHTML = `
      <p class="weigh-date">${formatDay(DATA.weighing.date)}</p>
      <p class="empty">Belum ada setoran yang menunggu.
        <a href="#setor" data-view="setor">Ajukan setoran</a> agar ikut ditimbang.</p>`;
  }

  // Aktivitas terbaru: lima baris, sisanya di Riwayat
  const rows = ledger();
  document.getElementById("activityAll").textContent = `Lihat semua ${rows.length}`;
  document.getElementById("recentRows").innerHTML = rows.slice(0, 5).map(activityRow).join("");

  // Paket kamu, dengan paket berikutnya yang paling murah
  const current = DATA.plans.find((plan) => plan.id === DATA.member.plan);
  const upgrade = DATA.plans.find((plan) => plan.monthly > current.monthly);
  document.getElementById("planTitle").textContent = `Paket kamu: ${current.name}`;
  document.getElementById("planText").textContent = upgrade
    ? `Reward barang refurbish dan jemput gratis untuk setoran di atas 5 kg ada di ${upgrade.name}, ` +
      `mulai ${formatRupiah(upgrade.monthly)} per bulan.`
    : "Kamu sudah memakai paket tertinggi.";
}

function activityRow(row) {
  let value;
  if (row.pending) {
    value = `<strong class="none">Menunggu</strong><span>perkiraan +${formatPoints(row.estimate)}</span>`;
  } else {
    const tone = row.points > 0 ? "earned" : "";
    const sub = row.kg === null ? "poin" : formatKg(row.kg);
    value = `<strong class="${tone}">${formatSigned(row.points)}</strong><span>${sub}</span>`;
  }

  return `
    <div class="row">
      <span class="row-main">
        <strong>${escapeHtml(row.title)}</strong>
        <span>${formatDate(row.date)}, ${escapeHtml(row.detail.toLowerCase())}</span>
      </span>
      <span class="row-value num">${value}</span>
    </div>`;
}

// =====================================
// RENDER: SETOR SAMPAH
// =====================================

const depositForm = document.getElementById("depositForm");
const weightInput = document.getElementById("weight");
const methodSelect = document.getElementById("depositMethod");

function buildDepositForm() {
  document.getElementById("materialChoices").innerHTML = Object.entries(DATA.materials)
    .map(([id, item], index) => `
      <label class="choice t-${id}">
        <input type="radio" name="material" value="${id}"${index === 0 ? " checked" : ""}>
        <span class="choice-body">
          <span>
            <strong>${escapeHtml(item.name)}</strong>
            <span class="num">${formatPoints(item.rate)} poin/kg</span>
          </span>
          <svg class="check" aria-hidden="true"><use href="#i-check"/></svg>
        </span>
      </label>`).join("");

  methodSelect.innerHTML = Object.entries(DATA.methods)
    .map(([id, item]) => `<option value="${id}">${escapeHtml(item.name)}</option>`)
    .join("");
}

function selectedMaterial() {
  return depositForm.querySelector('input[name="material"]:checked').value;
}

function readWeight() {
  const weight = Number(weightInput.value);
  return Number.isFinite(weight) && weight >= 0.1 && weight <= 100 ? roundKg(weight) : null;
}

function renderDepositPreview(totals) {
  const weight = readWeight();
  const item = material(selectedMaterial());
  const preview = document.getElementById("depositPreview");

  document.getElementById("methodHint").textContent = handover(methodSelect.value);

  if (weight === null) {
    preview.innerHTML = `
      <dt>Perkiraan poin</dt><dd>—</dd>
      <dt>Saldo setelah ditimbang</dt><dd>—</dd>`;
    return;
  }

  const estimate = Math.round(weight * item.rate);
  preview.innerHTML = `
    <dt>${formatKg(weight)} × ${formatPoints(item.rate)} poin/kg</dt>
    <dd class="earned">+${formatPoints(estimate)} poin</dd>
    <dt>Saldo setelah setoran ini ditimbang</dt>
    <dd>${formatPoints(totals.balance + estimate)} poin</dd>`;
}

function renderPending(totals) {
  const list = document.getElementById("pendingRows");

  if (!totals.pending.length) {
    list.innerHTML = `<p class="empty">Tidak ada setoran yang menunggu penimbangan.</p>`;
    return;
  }

  list.innerHTML = totals.pending.slice().reverse().map((item) => `
    <div class="row">
      <span class="row-main">
        <strong class="title-line">${escapeHtml(material(item.material).name)}
          <span class="pill warn">Menunggu penimbangan</span></strong>
        <span>Diajukan ${formatDate(item.date)}. ${escapeHtml(handover(item.method))}</span>
      </span>
      <span class="row-value num">
        <strong>${formatKg(item.kg)}</strong>
        <span>perkiraan +${formatPoints(depositPoints(item))} poin</span>
      </span>
    </div>`).join("");
}

// =====================================
// RENDER: TUKAR POIN
// =====================================

function renderTukar(totals) {
  const basic = DATA.rewards.filter((item) => item.plan === "basic");
  const ready = basic.filter((item) => item.cost <= totals.balance);
  const next = rewardSteps(totals.balance).find((step) => !step.ready);

  screenSubs.tukar =
    `${ready.length} dari ${basic.length} reward Basic bisa ditukar dengan saldo ${formatPoints(totals.balance)} poin.`;

  document.getElementById("tukarWell").innerHTML = `
    <dt>Bisa ditukar sekarang</dt><dd>${ready.length} reward</dd>
    <dt>Perkiraan dari ${totals.pending.length} setoran menunggu</dt>
    <dd>${totals.pending.length ? `+${formatPoints(totals.pendingPoints)} poin` : "—"}</dd>
    <dt>Saldo setelah ditimbang</dt><dd>${formatPoints(totals.balance + totals.pendingPoints)} poin</dd>`;
  document.getElementById("rewardMeta").textContent = `${DATA.rewards.length} reward`;
  document.getElementById("tukarBalance").textContent = formatPoints(totals.balance);
  document.getElementById("tukarNext").textContent = next
    ? `Kurang ${formatPoints(next.short)} poin untuk ${next.phrase}.`
    : "Cukup untuk semua reward Basic.";

  document.getElementById("rewardRows").innerHTML = DATA.rewards
    .slice()
    .sort((a, b) => a.cost - b.cost)
    .map((item) => {
      let action;
      if (item.plan !== DATA.member.plan && item.plan !== "basic") {
        action = `<a class="btn" href="#paket" data-view="paket">Lihat paket</a>`;
      } else if (item.cost <= totals.balance) {
        action = `<button type="button" class="btn" data-redeem="${item.id}">Tukar</button>`;
      } else {
        action = `<span class="short num">Kurang ${formatPoints(item.cost - totals.balance)} poin</span>`;
      }

      const sub = item.plan === "basic" ? item.category : `${item.category}, khusus Premium dan Super`;

      return `
        <div class="row reward-row">
          <span class="row-main">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(sub)}</span>
          </span>
          <span class="cost num">${formatPoints(item.cost)} poin</span>
          <span class="action">${action}</span>
        </div>`;
    }).join("");
}

// =====================================
// RENDER: RIWAYAT
// =====================================

function renderRiwayat(totals) {
  const rows = ledger();
  const counts = {
    all: rows.length,
    deposit: rows.filter((row) => row.kind === "deposit").length,
    redeem: rows.filter((row) => row.kind === "redeem").length
  };

  const oldest = rows[rows.length - 1];
  screenSubs.riwayat = `${counts.all} transaksi sejak ${formatDate(oldest.date, true)}.`;

  // Per bulan, terbaru di atas: poin bersih dari baris yang sudah selesai
  const months = [...new Set(rows.map((row) => row.date.slice(0, 7)))];
  document.getElementById("monthRows").innerHTML = months.map((month) => {
    const inMonth = rows.filter((row) => row.date.startsWith(month));
    const net = sum(inMonth.map((row) => row.points || 0));
    const deposits = inMonth.filter((row) => row.kind === "deposit" && !row.pending);
    const redeems = inMonth.filter((row) => row.kind === "redeem").length;
    const date = parseDate(`${month}-01`);
    const parts = [`${deposits.length} setoran ditimbang, ${formatKg(roundKg(sum(deposits.map((row) => row.kg))))}`];
    if (redeems) parts.push(`${redeems} penukaran`);

    return `
      <div class="row">
        <span class="row-main">
          <strong>${MONTHS[date.getMonth()]} ${date.getFullYear()}</strong>
          <span>${parts.join(", ")}</span>
        </span>
        <span class="row-value num"><strong class="${net > 0 ? "earned" : ""}">${formatSigned(net)}</strong><span>poin</span></span>
      </div>`;
  }).join("");

  document.querySelectorAll("#ledgerTabs button").forEach((tab) => {
    const filter = tab.dataset.filter;
    tab.setAttribute("aria-selected", String(filter === state.ledgerFilter));
    tab.querySelector("span").textContent = counts[filter];
  });

  const visible = rows.filter((row) => state.ledgerFilter === "all" || row.kind === state.ledgerFilter);
  const body = document.getElementById("ledgerRows");

  if (!visible.length) {
    const message = state.ledgerFilter === "redeem"
      ? "Belum ada penukaran. Poin bisa ditukar di halaman Tukar poin."
      : "Belum ada setoran.";
    body.innerHTML = `<tr class="empty-row"><td colspan="4" class="empty-cell">${message}</td></tr>`;
  } else {
    body.innerHTML = visible.map((row) => {
      let points;
      if (row.pending) {
        points = `<span class="none">—</span><span class="sub">perkiraan +${formatPoints(row.estimate)}</span>`;
      } else {
        points = `<span class="${row.points > 0 ? "earned" : "spent"}">${formatSigned(row.points)}</span>`;
      }

      const pill = row.pending ? ` <span class="pill warn">Menunggu penimbangan</span>` : "";

      return `
        <tr>
          <td class="date">${formatDate(row.date, true)}</td>
          <td class="desc">
            <span class="title-line">${escapeHtml(row.title)}${pill}</span>
            <span class="sub"><span class="phone-date">${formatDate(row.date)}, </span>${escapeHtml(row.detail)}</span>
          </td>
          <td class="n kg">${row.kg === null ? `<span class="none">—</span>` : formatKg(row.kg)}</td>
          <td class="n pts">${points}</td>
        </tr>`;
    }).join("");
  }

  document.getElementById("ledgerSummary").innerHTML = `
    <dt>Poin dari ${totals.done.length} setoran</dt><dd class="earned">+${formatPoints(totals.earned)}</dd>
    <dt>Ditukar (${state.redemptions.length} kali)</dt><dd>${totals.spent ? MINUS : ""}${formatPoints(totals.spent)}</dd>
    <dt class="total">Saldo</dt><dd class="total">${formatPoints(totals.balance)} poin</dd>
    <dt>Sampah ditimbang</dt><dd>${formatKg(totals.weighedKg)}</dd>
    <dt>Menunggu penimbangan</dt><dd>${totals.pending.length ? formatKg(totals.pendingKg) : "—"}</dd>`;
}

// =====================================
// RENDER: PAKET MEMBERSHIP
// =====================================

function renderPaket() {
  const current = DATA.plans.find((plan) => plan.id === DATA.member.plan);
  document.getElementById("memberName").textContent = DATA.member.name;
  document.getElementById("memberInitials").textContent = DATA.member.initials;
  document.getElementById("memberPlan").textContent = `Paket ${current.name}`;

  document.getElementById("plans").innerHTML = DATA.plans.map((plan) => {
    const isCurrent = plan.id === DATA.member.plan;
    const price = plan.monthly === 0
      ? "Gratis"
      : `${formatRupiah(plan.monthly)} <small>/bulan</small>`;
    const saving = plan.monthly * 12 - plan.yearly;
    const yearly = plan.monthly === 0
      ? "Tanpa biaya langganan"
      : `atau ${formatRupiah(plan.yearly)} per tahun, hemat ${formatRupiah(saving)}`;
    const button = isCurrent
      ? `<button type="button" class="btn" disabled>Paket saat ini</button>`
      : `<button type="button" class="btn" data-plan="${plan.id}">Pilih ${escapeHtml(plan.name)}</button>`;

    return `
      <article class="card plan">
        <div class="plan-head">
          <h2>${escapeHtml(plan.name)}</h2>
          ${isCurrent ? `<span class="pill pos">Paket kamu</span>` : ""}
        </div>
        <p class="plan-price num">${price}</p>
        <p class="plan-yearly num">${yearly}</p>
        <ul>
          ${plan.features.map((feature) => `
            <li><svg class="check" aria-hidden="true"><use href="#i-check"/></svg>${escapeHtml(feature)}</li>`).join("")}
        </ul>
        ${button}
      </article>`;
  }).join("");

  document.getElementById("billingWell").innerHTML = `
    <dt>Paket sekarang</dt><dd>${escapeHtml(current.name)}</dd>
    <dt>Tagihan berikutnya</dt><dd>${current.monthly ? formatRupiah(current.monthly) : "—"}</dd>
    <dt>Metode pembayaran</dt><dd>Belum ada</dd>`;
}

function updateTitle() {
  document.getElementById("screenTitle").textContent = VIEWS[currentView];
  document.getElementById("screenSub").textContent = screenSubs[currentView] || "";
}

function renderAll() {
  const totals = summarize();
  renderBeranda(totals);
  renderDepositPreview(totals);
  renderPending(totals);
  renderTukar(totals);
  renderRiwayat(totals);
  renderPaket();
  updateTitle();
}

// =====================================
// NOTIFIKASI DAN DIALOG KONFIRMASI
// =====================================

const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// confirm() bawaan browser tidak selalu muncul (misalnya saat website
// ditampilkan di dalam frame), jadi konfirmasi dibuat langsung di halaman.
const confirmDialog = document.getElementById("confirmDialog");
const confirmTitle = document.getElementById("confirmTitle");
const confirmRows = document.getElementById("confirmRows");
const confirmNote = document.getElementById("confirmNote");
const confirmOk = document.getElementById("confirmOk");
const confirmCancel = document.getElementById("confirmCancel");

let resolveConfirm = null;

function askConfirm({ title, rows = [], note = "", okLabel = "Ya, lanjutkan", cancelLabel = "Batal" }) {
  confirmTitle.textContent = title;
  confirmNote.textContent = note;
  confirmOk.textContent = okLabel;
  confirmCancel.hidden = cancelLabel === null;
  confirmCancel.textContent = cancelLabel || "";

  confirmRows.innerHTML = "";
  confirmRows.hidden = rows.length === 0;

  rows.forEach(function([label, value]) {
    const term = document.createElement("dt");
    term.textContent = label;

    const detail = document.createElement("dd");
    detail.textContent = value;

    confirmRows.append(term, detail);
  });

  confirmDialog.showModal();

  return new Promise(function(resolve) {
    resolveConfirm = resolve;
  });
}

// Jawaban langsung dikirim saat tombol diklik, tidak menunggu event "close"
function finishConfirm(answer) {
  if (resolveConfirm) {
    resolveConfirm(answer);
    resolveConfirm = null;
  }

  if (confirmDialog.open) {
    confirmDialog.close();
  }
}

confirmDialog.addEventListener("click", function(event) {
  const button = event.target.closest("[data-answer]");

  if (button) {
    finishConfirm(button.dataset.answer === "ok");
  } else if (event.target === confirmDialog) {
    finishConfirm(false);
  }
});

// Tombol Esc (atau tombol kembali di HP) berarti batal
confirmDialog.addEventListener("cancel", function() {
  finishConfirm(false);
});

// =====================================
// FITUR 1: SETOR SAMPAH
// =====================================

depositForm.addEventListener("input", () => renderDepositPreview(summarize()));
depositForm.addEventListener("change", () => renderDepositPreview(summarize()));

depositForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const weight = readWeight();
  if (weight === null) {
    showToast("Isi perkiraan berat antara 0,1 dan 100 kg.");
    weightInput.focus();
    return;
  }

  const materialId = selectedMaterial();
  const methodId = methodSelect.value;
  const estimate = Math.round(weight * material(materialId).rate);

  const confirmed = await askConfirm({
    title: "Ajukan setoran",
    rows: [
      ["Jenis sampah", material(materialId).name],
      ["Perkiraan berat", formatKg(weight)],
      ["Cara menyetor", DATA.methods[methodId].name],
      ["Perkiraan poin", `+${formatPoints(estimate)} poin`]
    ],
    note: `${handover(methodId)} Poin final masuk setelah mitra menimbang.`,
    okLabel: "Ajukan setoran"
  });

  if (!confirmed) return;

  state.deposits.push({
    date: DATA.asOf,
    material: materialId,
    kg: weight,
    method: methodId,
    status: "pending",
    seq: ++sequence
  });

  renderAll();
  showToast(`Setoran diajukan. Perkiraan +${formatPoints(estimate)} poin setelah ditimbang.`);

  depositForm.reset();
  renderDepositPreview(summarize());
});

// =====================================
// FITUR 2: TUKAR POIN
// =====================================

document.addEventListener("click", async function(event) {
  const button = event.target.closest("[data-redeem]");
  if (!button) return;

  const item = reward(button.dataset.redeem);
  const balance = summarize().balance;

  if (balance < item.cost) {
    showToast(`Poin belum cukup. Saldo kamu ${formatPoints(balance)} poin.`);
    return;
  }

  const confirmed = await askConfirm({
    title: "Tukar poin",
    rows: [
      ["Reward", item.name],
      ["Biaya", `${formatPoints(item.cost)} poin`],
      ["Saldo setelah ditukar", `${formatPoints(balance - item.cost)} poin`]
    ],
    note: "Ini simulasi. Tidak ada pulsa, voucher, atau token yang benar-benar dikirim.",
    okLabel: "Tukar poin"
  });

  if (!confirmed) return;

  state.redemptions.push({ date: DATA.asOf, reward: item.id, seq: ++sequence });
  renderAll();

  showToast(`Poin ditukar: ${item.name}. Sisa saldo ${formatPoints(summarize().balance)} poin.`);
});

// =====================================
// FITUR 3: RIWAYAT
// =====================================

document.getElementById("ledgerTabs").addEventListener("click", function(event) {
  const tab = event.target.closest("[data-filter]");
  if (!tab) return;

  state.ledgerFilter = tab.dataset.filter;
  renderRiwayat(summarize());
  updateTitle();
});

// =====================================
// FITUR 4: PAKET MEMBERSHIP
// =====================================

document.addEventListener("click", async function(event) {
  const button = event.target.closest("[data-plan]");
  if (!button) return;

  const plan = DATA.plans.find((item) => item.id === button.dataset.plan);

  await askConfirm({
    title: `Paket ${plan.name}`,
    rows: [
      ["Per bulan", formatRupiah(plan.monthly)],
      ["Per tahun", formatRupiah(plan.yearly)]
    ],
    note: "Pembayaran belum aktif di prototype ini, jadi paket kamu tetap Basic.",
    okLabel: "Mengerti",
    cancelLabel: null
  });
});

// =====================================
// FITUR 5: NAVIGASI
// =====================================

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const topbarTitle = document.getElementById("topbarTitle");

function openSidebar() {
  sidebar.classList.add("open");
  menuToggle.setAttribute("aria-expanded", "true");
  sidebar.querySelector(".nav-item").focus();
}

function closeSidebar() {
  if (!sidebar.classList.contains("open")) return;
  sidebar.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", openSidebar);
document.getElementById("menuClose").addEventListener("click", function() {
  closeSidebar();
  menuToggle.focus();
});

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape" && sidebar.classList.contains("open")) {
    closeSidebar();
    menuToggle.focus();
  }
});

function showView(name, moveFocus) {
  if (!(name in VIEWS)) name = "beranda";
  currentView = name;
  updateTitle();

  document.querySelectorAll(".view").forEach(function(view) {
    view.hidden = view.dataset.viewName !== name;
  });

  document.querySelectorAll(".nav-item").forEach(function(link) {
    if (link.dataset.view === name) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  topbarTitle.textContent = VIEWS[name];
  closeSidebar();
  window.scrollTo(0, 0);

  if (moveFocus) {
    document.getElementById("screenTitle").focus({ preventScroll: true });
  }
}

// Setiap menu membuka layarnya sendiri. Nama layar disimpan di #hash
// agar tombol kembali dan link langsung tetap berfungsi.
document.addEventListener("click", function(event) {
  const link = event.target.closest("[data-view]");
  if (!link) return;

  event.preventDefault();
  const name = link.dataset.view;

  if (location.hash.slice(1) === name) {
    showView(name, true);
  } else {
    location.hash = name;
  }
});

window.addEventListener("hashchange", function() {
  showView(location.hash.slice(1), true);
});

// =====================================
// INISIALISASI
// =====================================

buildDepositForm();
renderAll();
showView(location.hash.slice(1), false);
