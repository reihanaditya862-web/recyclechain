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
    plastik: { name: "Plastik", rate: 160, examples: "Botol, gelas, dan kemasan sabun. Bilas lalu pipihkan." },
    kertas: { name: "Kertas dan kardus", rate: 100, examples: "Kardus, koran, buku bekas. Harus kering, lipat rata." },
    logam: { name: "Logam dan kaleng", rate: 240, examples: "Kaleng minuman dan makanan, besi bekas. Bilas dulu." },
    elektronik: { name: "Elektronik bekas", rate: 800, examples: "HP rusak, charger, kabel, baterai. Jangan dibongkar." }
  },

  // Panduan "Cek jenis sampah": material null berarti belum diterima RecycleChain
  wasteGuide: [
    { name: "Botol plastik", words: "botol air mineral minuman aqua pet", material: "plastik", tip: "Lepas label kalau bisa, bilas, lalu pipihkan." },
    { name: "Botol kecap atau saus plastik", words: "kecap saus sambal", material: "plastik", tip: "Bilas sampai bersih dari sisa kecap, lalu keringkan." },
    { name: "Gelas plastik", words: "gelas cup air mineral es teh kopi", material: "plastik", tip: "Bilas dan tumpuk, lepas sedotannya." },
    { name: "Kemasan sabun dan sampo", words: "deterjen sampo sabun jerigen pembersih pewangi", material: "plastik", tip: "Bilas sisa sabun, tutupnya ikut disetor." },
    { name: "Kantong plastik", words: "kresek tas belanja plastik", material: "plastik", tip: "Pastikan kering dan bersih, gulung jadi satu." },
    { name: "Wadah makanan plastik", words: "tupperware kotak makan toples mika", material: "plastik", tip: "Cuci dari sisa makanan dan minyak." },
    { name: "Tutup botol plastik", words: "tutup galon", material: "plastik", tip: "Kumpulkan dalam satu kantong." },
    { name: "Mainan plastik rusak", words: "mainan ember gayung", material: "plastik", tip: "Lepas bagian logam dan baterainya." },
    { name: "Kardus", words: "karton dus kotak paket mi instan", material: "kertas", tip: "Lepas lakban, lipat rata, dan simpan di tempat kering." },
    { name: "Koran dan majalah", words: "koran majalah tabloid brosur", material: "kertas", tip: "Ikat dengan tali, jangan sampai basah." },
    { name: "Buku dan kertas bekas", words: "buku tulis hvs fotokopi kertas print", material: "kertas", tip: "Lepas sampul plastik dan jilid spiral." },
    { name: "Kotak susu dan jus", words: "tetra pak karton susu jus", material: "kertas", tip: "Bilas, buka lipatannya, lalu pipihkan." },
    { name: "Kaleng minuman", words: "kaleng soda minuman aluminium", material: "logam", tip: "Bilas dan injak sampai pipih." },
    { name: "Kaleng makanan", words: "kaleng sarden susu kental manis kornet", material: "logam", tip: "Bilas sampai bersih, hati-hati tepi yang tajam." },
    { name: "Panci dan wajan rusak", words: "panci wajan teflon peralatan dapur", material: "logam", tip: "Lepas gagang plastik atau kayunya kalau bisa." },
    { name: "Besi dan paku bekas", words: "besi paku baut seng kawat", material: "logam", tip: "Bungkus bagian yang tajam sebelum disetor." },
    { name: "HP rusak", words: "handphone hp ponsel smartphone tablet", material: "elektronik", tip: "Hapus data dan keluarkan kartu SIM lebih dulu." },
    { name: "Charger dan kabel", words: "charger kabel adaptor usb headset earphone", material: "elektronik", tip: "Gulung kabel dan ikat supaya tidak kusut." },
    { name: "Baterai bekas", words: "baterai batu batre aki", material: "elektronik", tip: "Tutup kutubnya dengan selotip, simpan terpisah." },
    { name: "Lampu bekas", words: "lampu led neon bohlam", material: "elektronik", tip: "Bungkus agar tidak pecah. Lampu neon mengandung merkuri." },
    { name: "Laptop dan perangkat kecil", words: "laptop komputer remote kipas setrika radio", material: "elektronik", tip: "Hapus data pribadi dan jangan dibongkar." },
    { name: "Sisa makanan dan kulit buah", words: "sisa makanan nasi sayur kulit buah organik", material: null, tip: "Belum diterima. Olah jadi kompos atau eco-enzyme di rumah." },
    { name: "Daun dan ranting", words: "daun ranting rumput kebun", material: null, tip: "Belum diterima. Cocok untuk kompos." },
    { name: "Botol dan pecahan kaca", words: "kaca beling botol kaca sirup", material: null, tip: "Belum diterima. Kumpulkan terpisah untuk pengepul kaca." },
    { name: "Styrofoam", words: "styrofoam gabus sterofoam", material: null, tip: "Belum diterima. Kurangi pemakaiannya." },
    { name: "Popok dan pembalut", words: "popok pampers pembalut", material: null, tip: "Belum diterima. Buang ke sampah residu, dibungkus rapat." },
    { name: "Tisu bekas", words: "tisu tissue", material: null, tip: "Belum diterima. Buang ke sampah residu." },
    { name: "Minyak jelantah", words: "minyak goreng jelantah", material: null, tip: "Belum diterima. Simpan di botol, setor ke program jelantah." },
    { name: "Obat kedaluwarsa", words: "obat kadaluarsa kedaluwarsa", material: null, tip: "Belum diterima. Serahkan ke apotek yang menerima obat bekas." }
  ],

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
    { id: "refurbish", name: "Perangkat elektronik refurbish", short: "perangkat refurbish", category: "Elektronik", cost: 8000, plan: "premium" }
  ],

  plans: [
    {
      id: "basic",
      name: "Basic",
      monthly: 0,
      yearly: 0,
      refurbishDiscount: 0,
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
      refurbishDiscount: 10,
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
      refurbishDiscount: 25,
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
