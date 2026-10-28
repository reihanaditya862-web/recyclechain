// =====================================
// RECYCLECHAIN - KESERUAN
// Level, lencana, confetti, suara dan getar, grafik mingguan,
// simulasi penimbangan, dan satu easter egg.
//
// Dimuat sebelum script.js. Kode di sini hanya mendefinisikan fungsi dan
// memasang event; fungsinya baru dipanggil setelah script.js siap.
// =====================================

// Level dari total kg yang sudah ditimbang
const LEVELS = [
  { min: 0, name: "Pemilah Pemula" },
  { min: 5, name: "Sahabat Daur Ulang" },
  { min: 10, name: "Eco Warrior" },
  { min: 25, name: "Pahlawan Bumi" },
  { min: 50, name: "Legenda Hijau" }
];

// Lencana: syarat dihitung dari data akun saat ini
const BADGES = [
  { id: "first", name: "Setoran pertama", desc: "Setoran pertamamu sudah ditimbang.", icon: "i-bin",
    earned: (t) => t.done.length >= 1 },
  { id: "kg10", name: "10 kg", desc: "Total 10 kg sampah sudah ditimbang.", icon: "i-scale",
    earned: (t) => t.weighedKg >= 10 },
  { id: "allkinds", name: "Pemilah lengkap", desc: "Menyetor keempat jenis sampah.", icon: "i-layers",
    earned: (t) => t.byMaterial.every((row) => row.count > 0) },
  { id: "ewaste", name: "Pemburu e-waste", desc: "Menyetor elektronik bekas.", icon: "i-chip",
    earned: (t) => t.byMaterial.some((row) => row.id === "elektronik" && row.count > 0) },
  { id: "streak", name: "Rajin 4 minggu", desc: "Menyetor 4 minggu berturut-turut.", icon: "i-flame",
    earned: (t) => longestWeekStreak(t.done) >= 4 },
  { id: "redeem", name: "Penukar pertama", desc: "Menukar poin untuk pertama kali.", icon: "i-gift",
    earned: () => state.redemptions.length >= 1 },
  { id: "donor", name: "Dermawan", desc: "Menukar poin untuk donasi lingkungan.", icon: "i-heart",
    earned: () => state.redemptions.some((item) => item.reward === "donasi") },
  { id: "kg25", name: "25 kg", desc: "Total 25 kg sampah sudah ditimbang.", icon: "i-trophy",
    earned: (t) => t.weighedKg >= 25 }
];

function levelInfo(kg) {
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (kg >= level.min) index = i;
  });
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  const progress = next ? (kg - current.min) / (next.min - current.min) : 1;
  return { index, current, next, progress: Math.min(1, Math.max(0, progress)) };
}

// Minggu ke-n sebelum "hari ini" data contoh: 0 = 7 hari terakhir
function weekIndex(iso) {
  const days = Math.round((parseDate(DATA.asOf) - parseDate(iso)) / 86400000);
  return Math.floor(days / 7);
}

function longestWeekStreak(deposits) {
  const weeks = [...new Set(deposits.map((item) => weekIndex(item.date)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  weeks.forEach((week, i) => {
    run = i > 0 && week === weeks[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

function currentMilestones() {
  const totals = summarize();
  return {
    badges: BADGES.filter((badge) => badge.earned(totals)).map((badge) => badge.id),
    level: levelInfo(totals.weighedKg).index
  };
}

// =====================================
// RENDER: LEVEL, LENCANA, ANGKA DI MENU
// =====================================

let lastRedeemCount = null;

function renderFun(totals) {
  const level = levelInfo(totals.weighedKg);
  const earned = BADGES.filter((badge) => badge.earned(totals));

  document.getElementById("levelNumber").textContent = level.index + 1;
  document.getElementById("levelName").textContent = level.current.name;
  document.getElementById("levelKg").textContent = level.next
    ? `${kgFormat.format(totals.weighedKg)} / ${level.next.min} kg`
    : formatKg(totals.weighedKg);
  document.getElementById("levelHint").textContent = level.next
    ? `Setor ${formatKg(roundKg(level.next.min - totals.weighedKg))} lagi untuk jadi ${level.next.name}.`
    : "Kamu sudah di level tertinggi. Terima kasih sudah menjaga bumi!";
  document.getElementById("levelFill").style.transform = `scaleX(${level.progress})`;
  document.getElementById("badgeMeta").textContent = `${earned.length} dari ${BADGES.length} lencana`;

  document.getElementById("badgeList").innerHTML = BADGES.map((badge) => {
    const has = earned.includes(badge);
    return `
      <li>
        <button type="button" class="badge${has ? " is-earned" : ""}" data-badge="${badge.id}"
          title="${escapeHtml(badge.desc)}">
          <span class="badge-medal"><svg aria-hidden="true"><use href="#${badge.icon}"/></svg></span>
          <span class="badge-name">${escapeHtml(badge.name)}</span>
          <span class="visually-hidden">${has ? "didapat" : "belum didapat"}</span>
        </button>
      </li>`;
  }).join("");

  // Angka di menu "Tukar poin": reward yang bisa ditukar sekarang
  const count = DATA.rewards.filter((item) => canRedeem(item) && rewardCost(item) <= totals.balance).length;
  const badge = document.getElementById("navRedeemCount");
  badge.hidden = count === 0;
  badge.querySelector(".num").textContent = count;
  if (lastRedeemCount !== null && count > lastRedeemCount) replayClass(badge, "is-bumped", 500);
  lastRedeemCount = count;

  renderWeeklyChart(false);  // hanya tergambar kalau layar Riwayat sedang terlihat
}

function replayClass(el, className, duration) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), duration);
}

document.getElementById("badgeList").addEventListener("click", function(event) {
  const button = event.target.closest("[data-badge]");
  if (!button) return;
  const badge = BADGES.find((item) => item.id === button.dataset.badge);
  const has = button.classList.contains("is-earned");
  showToast(`${badge.name}: ${badge.desc}${has ? "" : " Belum didapat."}`);
  replayClass(button, "is-poked", 450);
});

// =====================================
// PENCAPAIAN BARU: naik level atau lencana baru dirayakan
// =====================================

function checkMilestones() {
  const now = currentMilestones();
  if (!state.seen) {
    state.seen = now;
    return;
  }

  const newBadges = now.badges.filter((id) => !state.seen.badges.includes(id));
  const levelUp = now.level > state.seen.level;
  state.seen = now;
  saveData();
  if (!newBadges.length && !levelUp) return;

  // Ditunda sebentar agar pesan aksi (misalnya "Poin ditukar") sempat terbaca dulu
  setTimeout(() => {
    const parts = [];
    if (levelUp) parts.push(`Naik ke Level ${now.level + 1}: ${LEVELS[now.level].name}!`);
    newBadges.forEach((id) => parts.push(`Lencana baru: ${BADGES.find((badge) => badge.id === id).name}!`));
    showToast(parts.join(" "));
    confetti({ count: levelUp ? 180 : 130 });

    newBadges.forEach((id) => {
      const button = document.querySelector(`[data-badge="${id}"]`);
      if (button) replayClass(button, "is-new", 1200);
    });
    if (levelUp) replayClass(document.getElementById("levelNumber"), "is-new", 1200);
  }, 1600);
}

// =====================================
// CONFETTI
// Satu kanvas di atas layar, partikel berwarna tempat sampah terpilah.
// Dihapus sendiri setelah semua partikel jatuh.
// =====================================

const CONFETTI_COLORS = ["#2fa866", "#4cc38a", "#f3c623", "#3d8bfd", "#e5484d", "#9aa4ad"];
const confettiState = { canvas: null, particles: [], frame: 0, last: 0, cleanup: 0 };

function confetti({ x = innerWidth / 2, y = innerHeight * 0.32, count = 130, spread = 1, sound = true } = {}) {
  if (sound) feedback("success");
  if (reducedMotion.matches) return;

  if (!confettiState.canvas) {
    const canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    confettiState.canvas = canvas;
    sizeConfetti();
  }

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1 * spread;
    const speed = 7 + Math.random() * 9 * spread;
    confettiState.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      round: Math.random() < 0.3,
      spin: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
      life: 0,
      ttl: 1.6 + Math.random() * 0.8
    });
  }

  if (!confettiState.frame) {
    confettiState.last = performance.now();
    confettiState.frame = requestAnimationFrame(stepConfetti);
  }

  // Pengaman: kalau frame ditahan browser, kanvas tetap dibersihkan
  clearTimeout(confettiState.cleanup);
  confettiState.cleanup = setTimeout(stopConfetti, 3500);
}

// Semburan kecil dari tengah sebuah tombol
function confettiFrom(el, count = 50) {
  const rect = el.getBoundingClientRect();
  confetti({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count, spread: 0.6 });
}

function sizeConfetti() {
  const canvas = confettiState.canvas;
  if (!canvas) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
}

function stepConfetti(now) {
  const canvas = confettiState.canvas;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const dt = Math.min(0.05, Math.max(0, (now - confettiState.last) / 1000));
  confettiState.last = now;

  context.clearRect(0, 0, innerWidth, innerHeight);
  confettiState.particles = confettiState.particles.filter((p) => p.life < p.ttl && p.y < innerHeight + 40);

  confettiState.particles.forEach((p) => {
    p.life += dt;
    p.vy += 22 * dt;              // gravitasi
    p.vx *= 0.985;                // hambatan udara
    p.vy *= 0.985;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.angle += p.spin;

    context.save();
    context.globalAlpha = Math.min(1, (p.ttl - p.life) / 0.4);
    context.translate(p.x, p.y);
    context.rotate(p.angle);
    context.fillStyle = p.color;
    if (p.round) {
      context.beginPath();
      context.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    context.restore();
  });

  if (confettiState.particles.length) {
    confettiState.frame = requestAnimationFrame(stepConfetti);
  } else {
    stopConfetti();
  }
}

function stopConfetti() {
  cancelAnimationFrame(confettiState.frame);
  confettiState.frame = 0;
  confettiState.particles = [];
  clearTimeout(confettiState.cleanup);
  if (confettiState.canvas) {
    confettiState.canvas.remove();
    confettiState.canvas = null;
  }
}

window.addEventListener("resize", sizeConfetti);

// =====================================
// SUARA DAN GETAR (mati secara default)
// =====================================

const SOUND_KEY = "recyclechain-sound";
let audioContext = null;

function soundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

// "tap": ketukan pendek; "success": dua nada naik
function feedback(kind) {
  if (!soundOn()) return;

  if (navigator.vibrate) {
    navigator.vibrate(kind === "success" ? [18, 40, 28] : 10);
  }

  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === "success" ? [[660, 0], [990, 0.11]] : [[1200, 0]];
    notes.forEach(([frequency, delay]) => {
      const start = audioContext.currentTime + delay;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === "success" ? 0.12 : 0.05, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "success" ? 0.22 : 0.05));
      osc.connect(gain).connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {
    // Browser tanpa Web Audio: cukup getar saja
  }
}

const soundToggle = document.getElementById("soundToggle");
soundToggle.checked = soundOn();
soundToggle.addEventListener("change", function() {
  try {
    localStorage.setItem(SOUND_KEY, soundToggle.checked ? "on" : "off");
  } catch {
    // Pilihan tidak tersimpan, tapi tetap berlaku sampai halaman ditutup
  }
  if (soundToggle.checked) feedback("success");
});

// =====================================
// GRAFIK SAMPAH PER MINGGU (layar Riwayat)
// Digambar sesuai lebar kartu, jadi tulisannya tetap terbaca di HP.
// =====================================

const CHART_WEEKS = 8;

function niceStep(rough) {
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
  return steps.find((step) => step >= rough) || 100;
}

function renderWeeklyChart(animate) {
  const box = document.getElementById("weeklyChart");
  const width = box.clientWidth;
  if (!width) return;

  const weeks = Array.from({ length: CHART_WEEKS }, (_, i) => {
    const back = CHART_WEEKS - 1 - i;
    return { start: addDays(DATA.asOf, -(7 * back + 6)), end: addDays(DATA.asOf, -7 * back), done: 0, pending: 0 };
  });

  state.deposits.forEach((item) => {
    const week = weekIndex(item.date);
    if (week < 0 || week >= CHART_WEEKS) return;
    const slot = weeks[CHART_WEEKS - 1 - week];
    if (item.status === "done") slot.done += item.kg;
    else slot.pending += item.kg;
  });

  const max = Math.max(1, ...weeks.map((w) => w.done + w.pending));
  const step = niceStep(max / 4);
  let top = Math.ceil(max / step) * step;
  if (top === max) top += step;  // garis teratas di atas nilai tertinggi

  const height = 200;
  const pad = { left: 34, right: 4, top: 10, bottom: 26 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const col = plotW / CHART_WEEKS;
  const barW = Math.min(36, col * 0.56);
  const y = (kg) => pad.top + plotH - (kg / top) * plotH;
  const labelEvery = col >= 46 ? 1 : 2;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"
    aria-label="Sampah per minggu selama ${CHART_WEEKS} minggu terakhir">`;

  for (let tick = 0; tick <= top + 0.001; tick += step) {
    const ty = y(tick);
    svg += `<line class="chart-grid${tick === 0 ? " base" : ""}" x1="${pad.left}" x2="${width - pad.right}" y1="${ty}" y2="${ty}"/>`;
    svg += `<text class="chart-tick" x="${pad.left - 8}" y="${ty + 4}" text-anchor="end">${kgFormat.format(tick).replace(",0", "")}</text>`;
  }

  weeks.forEach((w, i) => {
    const x = pad.left + col * i + (col - barW) / 2;
    const doneTop = y(w.done);
    const pendingTop = y(w.done + w.pending);
    const label = `${formatDate(w.start)} sampai ${formatDate(w.end)}: ${formatKg(roundKg(w.done))} ditimbang` +
      (w.pending ? `, ${formatKg(roundKg(w.pending))} menunggu` : "");
    const delay = animate ? `style="animation-delay:${i * 45}ms"` : "";

    svg += `<g class="chart-bar${animate ? " grow" : ""}" ${delay}><title>${escapeHtml(label)}</title>`;
    if (w.done) svg += `<rect class="bar-done" x="${x}" y="${doneTop}" width="${barW}" height="${y(0) - doneTop}" rx="3"/>`;
    if (w.pending) svg += `<rect class="bar-pending" x="${x}" y="${pendingTop}" width="${barW}" height="${doneTop - pendingTop}" rx="3"/>`;
    svg += `</g>`;

    if (i % labelEvery === (CHART_WEEKS - 1) % labelEvery) {
      svg += `<text class="chart-tick" x="${x + barW / 2}" y="${height - 8}" text-anchor="middle">${formatDate(w.start)}</text>`;
    }
  });

  box.innerHTML = svg + "</svg>";
}

let chartResizeTimer;
window.addEventListener("resize", function() {
  clearTimeout(chartResizeTimer);
  chartResizeTimer = setTimeout(() => renderWeeklyChart(false), 150);
});

// =====================================
// SIMULASI PENIMBANGAN
// Di aplikasi sungguhan mitra yang menimbang; tombol ini untuk mencoba alurnya.
// =====================================

document.addEventListener("click", async function(event) {
  if (!event.target.closest("[data-simulate-weigh]")) return;

  const pending = state.deposits.filter((item) => item.status === "pending");
  if (!pending.length) {
    showToast("Tidak ada setoran yang menunggu penimbangan.");
    return;
  }

  const kg = roundKg(sum(pending.map((item) => item.kg)));
  const points = sum(pending.map(depositPoints));
  const confirmed = await askConfirm({
    title: "Simulasi penimbangan",
    rows: [
      ["Setoran", `${pending.length} setoran`],
      ["Berat", formatKg(kg)],
      ["Poin masuk", `+${formatPoints(points)} poin`]
    ],
    note: "Di aplikasi sungguhan, mitra yang menimbang. Tombol ini hanya untuk mencoba alurnya.",
    okLabel: "Timbang sekarang"
  });
  if (!confirmed) return;

  pending.forEach((item) => { item.status = "done"; });
  saveAndRender();
  showToast(`Penimbangan selesai: ${formatKg(kg)}, +${formatPoints(points)} poin masuk ke saldo.`);
  confetti({ count: 70, spread: 0.8 });
});

// =====================================
// EASTER EGG: klik logo RecycleChain 5 kali dengan cepat
// =====================================

let logoClicks = [];

document.addEventListener("click", function(event) {
  if (!event.target.closest(".brand")) return;
  const now = Date.now();
  logoClicks = logoClicks.filter((time) => now - time < 2500).concat(now);
  if (logoClicks.length < 5) return;

  logoClicks = [];
  showToast("Kamu menemukan rahasia RecycleChain. Terima kasih sudah ikut menjaga bumi!");
  confetti({ y: innerHeight * 0.2, count: 220, spread: 1.2 });
  const mark = event.target.closest(".brand").querySelector(".brand-mark");
  if (mark) replayClass(mark, "is-spinning", 900);
});
