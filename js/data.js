// =====================================
// RECYCLECHAIN - DATA CONTOH
// Semua angka di layar dihitung dari baris di file ini.
// Tarif, jadwal, dan transaksi adalah contoh untuk prototype.
// =====================================

const DATA = {
  // "Hari ini" untuk data contoh
  asOf: "2026-10-26",

  member: {
    name: "Eco Hero",
    initials: "EH",
    plan: "basic"
  },

  // Jadwal penimbangan berikutnya, dipakai semua cara menyetor
  weighing: {
    date: "2026-10-31",
    pickupWindow: "08.00–10.00"
  },

  // Tarif contoh dalam poin per kg
  materials: {
    plastik: { name: "Plastik", rate: 160 },
    kertas: { name: "Kertas dan kardus", rate: 100 },
    logam: { name: "Logam dan kaleng", rate: 240 },
    elektronik: { name: "Elektronik bekas", rate: 800 }
  },

  methods: {
    jemput: { name: "Jemput terjadwal" },
    dropbox: { name: "Drop-box terdekat" },
    titik: { name: "Titik kumpul RT/RW" }
  },

  // Urut dari yang paling lama
  deposits: [
    { date: "2026-09-14", material: "plastik", kg: 1.5, method: "titik", status: "done" },
    { date: "2026-09-21", material: "kertas", kg: 1.5, method: "titik", status: "done" },
    { date: "2026-09-28", material: "plastik", kg: 2.5, method: "jemput", status: "done" },
    { date: "2026-10-05", material: "logam", kg: 1.5, method: "titik", status: "done" },
    { date: "2026-10-12", material: "elektronik", kg: 1.0, method: "dropbox", status: "done" },
    { date: "2026-10-18", material: "kertas", kg: 2.5, method: "dropbox", status: "done" },
    { date: "2026-10-23", material: "plastik", kg: 2.0, method: "jemput", status: "done" },
    { date: "2026-10-25", material: "kertas", kg: 3.0, method: "jemput", status: "pending" }
  ],

  redemptions: [
    { date: "2026-10-15", reward: "data-5gb" }
  ],

  rewards: [
    // "short" dipakai di tengah kalimat ("Kurang 180 poin untuk voucher belanja")
    { id: "donasi", name: "Donasi lingkungan", short: "donasi lingkungan", category: "Donasi untuk program kebersihan", cost: 800, plan: "basic" },
    { id: "data-5gb", name: "Paket data 5 GB", short: "paket data 5 GB", category: "Pulsa dan data", cost: 1200, plan: "basic" },
    { id: "voucher-10k", name: "Voucher belanja Rp10.000", short: "voucher belanja", category: "Voucher belanja", cost: 1500, plan: "basic" },
    { id: "token-10k", name: "Token listrik Rp10.000", short: "token listrik", category: "Token listrik", cost: 1500, plan: "basic" },
    { id: "refurbish", name: "Perangkat elektronik refurbish", short: "perangkat refurbish", category: "Elektronik, mulai dari", cost: 8000, plan: "premium" }
  ],

  plans: [
    {
      id: "basic",
      name: "Basic",
      monthly: 0,
      yearly: 0,
      features: [
        "Setor sampah dan e-waste",
        "Tukar pulsa, voucher, token, dan donasi",
        "Pantau saldo dan riwayat"
      ]
    },
    {
      id: "premium",
      name: "Premium",
      monthly: 50000,
      yearly: 500000,
      features: [
        "Semua fitur Basic",
        "Reward barang refurbish",
        "Jemput gratis untuk setoran di atas 5 kg",
        "Diskon 10% barang refurbish"
      ]
    },
    {
      id: "super",
      name: "Super",
      monthly: 100000,
      yearly: 1000000,
      features: [
        "Semua fitur Premium",
        "Diskon 25% dan akses flash sale",
        "Garansi barang refurbish 1 tahun"
      ]
    }
  ]
};

// Pemeriksaan data mentah: tanggal urut dan semua kunci dikenal
DATA.deposits.forEach(function(item, index, list) {
  console.assert(index === 0 || list[index - 1].date <= item.date, "Setoran harus urut tanggal", item);
  console.assert(item.material in DATA.materials, "Jenis sampah tidak dikenal", item);
  console.assert(item.method in DATA.methods, "Cara menyetor tidak dikenal", item);
});

DATA.redemptions.forEach(function(item) {
  console.assert(DATA.rewards.some((reward) => reward.id === item.reward), "Reward tidak dikenal", item);
});
