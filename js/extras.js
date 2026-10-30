// =====================================
// RECYCLECHAIN - EKSTRA
// Kartu "Dampakmu", bagikan pencapaian sebagai gambar, panduan selamat datang,
// unduh riwayat (CSV), tautan "Lewati ke konten", dan tab Riwayat dengan keyboard.
//
// Dimuat sebelum script.js. Kode di sini hanya mendefinisikan fungsi dan
// memasang event; fungsinya baru dipanggil setelah script.js siap.
// =====================================

// =====================================
// DAMPAKMU: berat sampah dibandingkan dengan benda sehari-hari
// =====================================

function impactRows(totals) {
  return totals.byMaterial
    .filter((row) => row.kg > 0)
    .map((row) => ({
      id: row.id,
      kg: row.kg,
      item: DATA.impact[row.id].item,
      count: Math.round((row.kg * 1000) / DATA.impact[row.id].gramsEach)
    }));
}

function renderImpact(totals) {
  const rows = impactRows(totals);
  document.getElementById("impactMeta").textContent = `dari ${formatKg(totals.weighedKg)} ditimbang`;

  document.getElementById("impactRows").innerHTML = rows.length
    ? rows.map((row) => `
      <li class="impact-row">
        <span class="impact-figure num">&asymp; ${formatPoints(row.count)}</span>
        <span class="impact-item">${escapeHtml(row.item)}</span>
        <span class="tag t-${row.id}">${escapeHtml(material(row.id).name)} ${formatKg(row.kg)}</span>
      </li>`).join("")
    : `<li class="impact-empty">Belum ada sampah yang ditimbang. Setelah setoran pertamamu ditimbang,
        dampaknya muncul di sini.</li>`;
}

// =====================================
// BAGIKAN PENCAPAIAN: gambar 1080 x 1350 (pas untuk Instagram) dari data akun
// =====================================

const shareDialog = document.getElementById("shareDialog");
const shareCanvas = document.getElementById("shareCanvas");

function loadImageFrom(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Pola ikon daur ulang (dari --doodle-tile di CSS), diwarnai putih
async function doodlePattern(context) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--doodle-tile").trim();
  const match = raw.match(/^url\("?(.*?)"?\)$/);
  if (!match) return null;
  try {
    const image = await loadImageFrom(match[1]);
    const tile = document.createElement("canvas");
    tile.width = 520;
    tile.height = 520;
    const tileContext = tile.getContext("2d");
    tileContext.drawImage(image, 0, 0, 520, 520);
    tileContext.globalCompositeOperation = "source-in";
    tileContext.fillStyle = "#ffffff";
    tileContext.fillRect(0, 0, 520, 520);
    return context.createPattern(tile, "repeat");
  } catch {
    return null;
  }
}

// Tulis teks dan pecah ke beberapa baris kalau terlalu panjang
function fillWrapped(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  });
  context.fillText(line, x, y);
  return y + lineHeight;
}

async function drawShareCard() {
  const totals = summarize();
  const level = levelInfo(totals.weighedKg);
  const earned = currentMilestones().badges.length;
  const account = state.account || DATA.member;
  const context = shareCanvas.getContext("2d");
  const W = 1080;
  const H = 1350;
  const pad = 88;
  const display = '"Bricolage Grotesque", "Manrope", sans-serif';
  const body = '"Manrope", sans-serif';

  // Pastikan font sudah dimuat sebelum menggambar teks di kanvas
  try {
    await Promise.all([
      document.fonts.load(`800 64px "Bricolage Grotesque"`),
      document.fonts.load(`600 40px "Manrope"`)
    ]);
  } catch {
    // Font cadangan tetap terbaca
  }

  // Latar hijau RecycleChain dengan pola ikon daur ulang yang samar
  const background = context.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, "#0f4d2e");
  background.addColorStop(1, "#1f7a4a");
  context.fillStyle = background;
  context.fillRect(0, 0, W, H);

  const pattern = await doodlePattern(context);
  if (pattern) {
    context.save();
    context.globalAlpha = 0.09;
    context.fillStyle = pattern;
    context.fillRect(0, 0, W, H);
    context.restore();
  }

  // Wordmark
  context.textBaseline = "alphabetic";
  context.font = `800 60px ${display}`;
  context.fillStyle = "#ffffff";
  context.fillText("Recycle", pad, 150);
  context.fillStyle = "#a6e8c5";
  context.fillText("Chain", pad + context.measureText("Recycle").width, 150);

  // Foto atau inisial
  const avatarY = 230;
  const avatarSize = 132;
  context.save();
  context.beginPath();
  context.arc(pad + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = "#dcf3e4";
  context.fill();
  context.clip();
  if (account.photo) {
    try {
      const photo = await loadImageFrom(account.photo);
      context.drawImage(photo, pad, avatarY, avatarSize, avatarSize);
    } catch {
      // Tanpa foto: lingkaran polos
    }
  } else {
    context.fillStyle = "#0d4026";
    context.font = `700 52px ${body}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(account.initials || initialsOf(account.name), pad + avatarSize / 2, avatarY + avatarSize / 2 + 2);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }
  context.restore();

  context.fillStyle = "#ffffff";
  context.font = `700 50px ${display}`;
  context.fillText(account.name, pad + avatarSize + 36, avatarY + 62);
  context.fillStyle = "#a6e8c5";
  context.font = `600 36px ${body}`;
  context.fillText(`Level ${level.index + 1}, ${level.current.name}`, pad + avatarSize + 36, avatarY + 112);

  // Angka utama: total kg
  context.fillStyle = "#ffffff";
  context.font = `800 210px ${display}`;
  context.fillText(kgFormat.format(totals.weighedKg), pad - 6, 640);
  const figureWidth = context.measureText(kgFormat.format(totals.weighedKg)).width;
  context.font = `700 72px ${display}`;
  context.fillText("kg", pad + figureWidth + 18, 640);

  context.fillStyle = "rgba(255, 255, 255, 0.86)";
  context.font = `500 40px ${body}`;
  let y = fillWrapped(context, "sampah terpilah sudah aku setor lewat RecycleChain.", pad, 712, W - pad * 2, 54);

  // Dampak: dua perbandingan teratas
  y += 40;
  impactRows(totals).sort((a, b) => b.count - a.count).slice(0, 2).forEach((row) => {
    context.fillStyle = "#ffffff";
    context.font = `800 64px ${display}`;
    const figure = `≈ ${formatPoints(row.count)}`;
    context.fillText(figure, pad, y + 40);
    const figureEnd = pad + context.measureText(figure).width + 22;
    context.fillStyle = "rgba(255, 255, 255, 0.86)";
    context.font = `500 36px ${body}`;
    context.fillText(row.item, figureEnd, y + 38);
    y += 92;
  });

  // Lencana: 8 lingkaran, yang didapat terisi
  y += 30;
  context.fillStyle = "rgba(255, 255, 255, 0.86)";
  context.font = `600 34px ${body}`;
  context.fillText(`${earned} dari ${BADGES.length} lencana`, pad, y);
  for (let i = 0; i < BADGES.length; i++) {
    const cx = pad + 26 + i * 70;
    context.beginPath();
    context.arc(cx, y + 58, 24, 0, Math.PI * 2);
    if (i < earned) {
      context.fillStyle = "#a6e8c5";
      context.fill();
    } else {
      context.strokeStyle = "rgba(255, 255, 255, 0.5)";
      context.lineWidth = 3;
      context.setLineDash([6, 6]);
      context.stroke();
      context.setLineDash([]);
    }
  }

  // Penutup
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.font = `600 34px ${body}`;
  context.fillText("Sampahmu jadi saldo, bukan cuma jadi bau.", pad, H - 128);
  context.fillStyle = "#a6e8c5";
  context.font = `700 34px ${body}`;
  context.fillText(location.host && location.protocol.startsWith("http") ? location.host : "recyclechain.vercel.app", pad, H - 80);
}

function shareBlob() {
  return new Promise((resolve) => shareCanvas.toBlob(resolve, "image/png"));
}

async function openShare() {
  shareDialog.showModal();
  await drawShareCard();

  // Tombol "Bagikan" hanya muncul kalau perangkat bisa membagikan gambar (biasanya HP)
  const blob = await shareBlob();
  const file = blob && new File([blob], "recyclechain-pencapaian.png", { type: "image/png" });
  document.getElementById("shareNative").hidden = !(file && navigator.canShare && navigator.canShare({ files: [file] }));
}

document.getElementById("shareOpen").addEventListener("click", openShare);
document.getElementById("shareClose").addEventListener("click", () => shareDialog.close());

document.getElementById("shareDownload").addEventListener("click", async function() {
  const blob = await shareBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recyclechain-pencapaian.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Gambar pencapaian diunduh.");
});

document.getElementById("shareNative").addEventListener("click", async function() {
  const blob = await shareBlob();
  const file = new File([blob], "recyclechain-pencapaian.png", { type: "image/png" });
  try {
    await navigator.share({
      files: [file],
      title: "Pencapaian RecycleChain",
      text: "Sampahmu jadi saldo, bukan cuma jadi bau. Yuk ikut memilah sampah!"
    });
  } catch {
    // Dibatalkan pengguna: tidak perlu pesan
  }
});

// =====================================
// PANDUAN SELAMAT DATANG: empat langkah, muncul setelah daftar
// =====================================

const WELCOME_STEPS = [
  { icon: "i-layers", title: "Pilah di rumah",
    text: "Pisahkan plastik, kertas, logam, dan elektronik bekas. Bingung sebuah barang masuk mana? Pakai Cek jenis sampah." },
  { icon: "i-bin", title: "Ajukan setoran",
    text: "Pilih dijemput, antar ke drop-box, atau titik kumpul RT/RW. Tempat terdekat bisa dicari di peta Lokasi drop-off." },
  { icon: "i-scale", title: "Mitra menimbang",
    text: "Setoranmu ditimbang, lalu poin masuk ke saldo sesuai berat dan jenis sampahnya." },
  { icon: "i-gift", title: "Tukar dan naik level",
    text: "Tukar poin dengan pulsa, voucher, token listrik, atau donasi. Kumpulkan lencana dan naik level." }
];

const welcomeDialog = document.getElementById("welcomeDialog");
let welcomeIndex = 0;

function renderWelcome() {
  document.getElementById("welcomeSlides").innerHTML = WELCOME_STEPS.map((step, i) => `
    <div class="welcome-slide" data-slide="${i}" aria-hidden="${i !== welcomeIndex}">
      <span class="welcome-icon"><svg aria-hidden="true"><use href="#${step.icon}"/></svg></span>
      <h3>${escapeHtml(step.title)}</h3>
      <p>${escapeHtml(step.text)}</p>
    </div>`).join("");
  document.getElementById("welcomeDots").innerHTML = WELCOME_STEPS.map(() => "<span></span>").join("");
  showWelcomeStep(0);
}

function showWelcomeStep(index) {
  welcomeIndex = index;
  document.querySelectorAll("#welcomeSlides .welcome-slide").forEach((slide, i) => {
    slide.classList.toggle("is-active", i === index);
    slide.classList.toggle("is-before", i < index);
    slide.setAttribute("aria-hidden", String(i !== index));
  });
  document.querySelectorAll("#welcomeDots span").forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  document.getElementById("welcomeProgress").textContent = `Langkah ${index + 1} dari ${WELCOME_STEPS.length}`;
  document.getElementById("welcomeBack").hidden = index === 0;
  document.getElementById("welcomeNext").textContent = index === WELCOME_STEPS.length - 1 ? "Mulai sekarang" : "Lanjut";
}

function openWelcome(name) {
  const first = (name || (state.account && state.account.name) || "").split(" ")[0];
  document.getElementById("welcomeTitle").textContent = first ? `Selamat datang, ${first}!` : "Cara kerja RecycleChain";
  renderWelcome();
  welcomeDialog.showModal();
  document.getElementById("welcomeNext").focus();
}

document.getElementById("welcomeNext").addEventListener("click", function() {
  if (welcomeIndex < WELCOME_STEPS.length - 1) {
    showWelcomeStep(welcomeIndex + 1);
  } else {
    welcomeDialog.close();
    showToast("Selamat memilah! Mulai dari Setor sampah atau Cek jenis sampah.");
  }
});

document.getElementById("welcomeBack").addEventListener("click", () => showWelcomeStep(Math.max(0, welcomeIndex - 1)));
document.getElementById("welcomeSkip").addEventListener("click", () => welcomeDialog.close());
document.getElementById("welcomeAgain").addEventListener("click", () => openWelcome());

// Panah kiri dan kanan berpindah langkah
welcomeDialog.addEventListener("keydown", function(event) {
  if (event.key === "ArrowRight" && welcomeIndex < WELCOME_STEPS.length - 1) showWelcomeStep(welcomeIndex + 1);
  if (event.key === "ArrowLeft" && welcomeIndex > 0) showWelcomeStep(welcomeIndex - 1);
});

// =====================================
// UNDUH RIWAYAT (CSV) untuk Excel atau Google Sheets
// Pemisah titik koma dan koma desimal, sesuai pengaturan Excel berbahasa Indonesia.
// =====================================

function csvCell(value) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

document.getElementById("csvDownload").addEventListener("click", function() {
  const header = ["Tanggal", "Jenis", "Keterangan", "Cara atau detail", "Berat (kg)", "Poin", "Status"];
  const rows = ledger().map((row) => [
    row.date,
    row.kind === "deposit" ? "Setoran" : "Penukaran",
    row.title,
    row.detail,
    row.kg === null ? "" : kgFormat.format(row.kg),
    row.points === null ? "" : row.points,
    row.pending ? "Menunggu penimbangan" : "Selesai"
  ]);

  // BOM agar Excel membaca huruf dengan benar
  const csv = "﻿" + [header, ...rows].map((line) => line.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `recyclechain-riwayat-${DATA.asOf}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Riwayat diunduh: ${rows.length} transaksi.`);
});

// =====================================
// AKSESIBILITAS
// =====================================

// "Lewati ke konten": langsung ke judul layar, tanpa mengubah #hash layar
document.getElementById("skipLink").addEventListener("click", function(event) {
  event.preventDefault();
  const title = document.getElementById("screenTitle");
  title.scrollIntoView({ block: "start" });
  title.focus({ preventScroll: true });
});

// Tab Riwayat: panah kiri/kanan, Home, dan End berpindah tab
document.getElementById("ledgerTabs").addEventListener("keydown", function(event) {
  const tabs = [...this.querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(document.activeElement);
  if (current === -1) return;

  const targets = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
  if (!(event.key in targets)) return;
  event.preventDefault();

  const next = tabs[(targets[event.key] + tabs.length) % tabs.length];
  next.click();
  next.focus();
});
