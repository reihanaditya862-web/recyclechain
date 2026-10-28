// =====================================
// RECYCLECHAIN - LOKASI (PETA)
// Peta Leaflet dengan data nyata dari OpenStreetMap: bank sampah, pusat
// daur ulang, drop-box, dan TPS di sekitar lokasi pengguna. Tanpa API key.
//
// Leaflet baru dimuat saat layar Lokasi dibuka, agar layar lain tetap ringan.
// Dimuat sebelum script.js; openMap() dipanggil dari showView().
// =====================================

const LEAFLET = {
  css: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  cssSri: "sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb",
  js: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  jsSri: "sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO"
};

// Beberapa server Overpass publik: kalau satu penuh, coba yang berikutnya
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

// Radius pencarian diperbesar bertahap kalau tempat di sekitar masih sedikit
const SEARCH_RADII = [5000, 15000, 30000];
const MIN_PLACES = 3;

// Tampilan awal sebelum lokasi diketahui (bukan data, hanya posisi kamera peta)
const START_VIEW = { lat: -2.5, lon: 118, zoom: 4 };

const PLACE_KINDS = {
  bank: "Bank sampah",
  centre: "Pusat daur ulang",
  container: "Drop-box daur ulang",
  transfer: "TPS / TPST",
  point: "Titik daur ulang"
};

// Tag OpenStreetMap "recycling:*" ke empat kategori RecycleChain
const ACCEPT_TAGS = {
  plastik: ["plastic", "plastic_bottles", "plastic_packaging", "plastic_bags", "pet_drink_bottles"],
  kertas: ["paper", "cardboard", "newspaper", "magazines", "paper_packaging", "beverage_cartons"],
  logam: ["cans", "scrap_metal", "metal", "aluminium", "tins"],
  elektronik: ["electrical_appliances", "small_appliances", "batteries", "mobile_phones", "computers",
    "electrical_items", "low_energy_bulbs", "electronics", "car_batteries"]
};

const mapState = {
  leaflet: null,      // promise saat Leaflet sedang dimuat
  map: null,
  tiles: null,
  markers: null,
  me: null,
  center: null,       // { lat, lon, label }
  places: [],
  selected: null,
  request: 0
};

// ---------- memuat Leaflet sesuai kebutuhan ----------

function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (mapState.leaflet) return mapState.leaflet;

  mapState.leaflet = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET.css;
    link.integrity = LEAFLET.cssSri;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = LEAFLET.js;
    script.integrity = LEAFLET.jsSri;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => {
      mapState.leaflet = null;
      reject(new Error("leaflet"));
    };
    document.head.appendChild(script);
  });
  return mapState.leaflet;
}

// ---------- peta ----------

function isDarkTheme() {
  return currentTheme() === "dark" || currentTheme() === "glass-dark";
}

// Tile resmi OpenStreetMap: gratis tanpa API key, cukup mencantumkan atribusi.
// Untuk tema gelap, tile yang sama dibalik warnanya lewat CSS (lihat .map.is-dark).
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function syncMapTheme() {
  document.getElementById("map").classList.toggle("is-dark", isDarkTheme());
}

async function openMap() {
  const box = document.getElementById("map");
  try {
    await ensureLeaflet();
  } catch {
    setMapStatus("Peta tidak bisa dimuat. Periksa koneksi internet, lalu buka layar ini lagi.", "error");
    return;
  }

  if (!mapState.map) {
    mapState.map = L.map(box, { zoomControl: true, attributionControl: true })
      .setView([START_VIEW.lat, START_VIEW.lon], START_VIEW.zoom);
    mapState.tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">kontributor OpenStreetMap</a>'
    }).addTo(mapState.map);
    syncMapTheme();
    mapState.markers = L.layerGroup().addTo(mapState.map);

    // Peta ikut tema terang atau gelap
    new MutationObserver(syncMapTheme)
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-rc-theme"] });

    if (!mapState.center) {
      setMapStatus("Tekan \"Gunakan lokasiku\" untuk melihat bank sampah dan titik daur ulang di sekitarmu, atau cari kota.");
    }
  }

  // Layar baru terlihat: Leaflet perlu mengukur ulang ukuran kotaknya
  requestAnimationFrame(() => mapState.map.invalidateSize());
  setTimeout(() => mapState.map && mapState.map.invalidateSize(), 400);
}

function setMapStatus(text, tone) {
  const status = document.getElementById("mapStatus");
  status.textContent = text;
  status.dataset.tone = tone || "";
  status.hidden = !text;
}

// ---------- lokasi pengguna ----------

function locateMe() {
  if (!navigator.geolocation) {
    setMapStatus("Browser ini tidak bisa membaca lokasi. Cari kota atau kecamatan di kolom pencarian.", "error");
    return;
  }

  setMapStatus("Mencari lokasimu...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setCenter(position.coords.latitude, position.coords.longitude, "Lokasimu", true);
    },
    (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Izin lokasi ditolak. Kamu tetap bisa mencari kota atau kecamatan di kolom pencarian."
        : "Lokasimu belum terbaca. Coba lagi, atau cari kota atau kecamatan.";
      setMapStatus(message, "error");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

// Cari kota atau kecamatan lewat Nominatim (OpenStreetMap)
async function searchArea(query) {
  setMapStatus(`Mencari "${query}"...`);
  try {
    const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
      q: query, format: "json", limit: "1", countrycodes: "id", "accept-language": "id"
    });
    const res = await fetchWithTimeout(url, {}, 15000);
    const results = res.ok ? await res.json() : [];
    if (!results.length) {
      setMapStatus(`"${query}" tidak ditemukan. Coba nama kota atau kecamatan lain.`, "error");
      return;
    }
    const place = results[0];
    setCenter(Number(place.lat), Number(place.lon), place.display_name.split(",")[0], false);
  } catch {
    setMapStatus("Pencarian gagal. Periksa koneksi internet, lalu coba lagi.", "error");
  }
}

function setCenter(lat, lon, label, isMe) {
  mapState.center = { lat, lon, label };
  mapState.map.setView([lat, lon], 14);

  if (mapState.me) mapState.me.remove();
  mapState.me = L.marker([lat, lon], {
    icon: L.divIcon({ className: isMe ? "map-me" : "map-me is-search", html: "<span></span>", iconSize: [22, 22] }),
    keyboard: false,
    zIndexOffset: 1000
  }).addTo(mapState.map).bindTooltip(label, { direction: "top", offset: [0, -10] });

  loadPlaces();
}

// ---------- data tempat dari OpenStreetMap ----------

function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function overpassQuery({ lat, lon }, radius) {
  const around = `(around:${radius},${lat},${lon})`;
  return `[out:json][timeout:25];(` +
    `nwr["amenity"="recycling"]${around};` +
    `nwr["amenity"="waste_transfer_station"]${around};` +
    `nwr["name"~"bank sampah",i]${around};` +
    `);out center tags 120;`;
}

async function fetchOverpass(center, radius) {
  const body = new URLSearchParams({ data: overpassQuery(center, radius) });
  for (const server of OVERPASS_SERVERS) {
    try {
      const res = await fetchWithTimeout(server, { method: "POST", body }, 25000);
      if (res.ok) return (await res.json()).elements.map(fromOverpass).filter(Boolean);
    } catch {
      // Server ini penuh atau tidak terjangkau: coba server berikutnya
    }
  }
  return null;
}

// Cadangan kalau semua server Overpass gagal: cari "bank sampah" lewat Nominatim
async function fetchNominatimBanks({ lat, lon }) {
  const d = 0.2;
  const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
    q: "bank sampah", format: "json", limit: "40", countrycodes: "id", bounded: "1",
    viewbox: `${lon - d},${lat + d},${lon + d},${lat - d}`, "accept-language": "id"
  });
  const res = await fetchWithTimeout(url, {}, 15000);
  if (!res.ok) throw new Error("nominatim");
  return (await res.json()).map((item) => ({
    id: `nominatim-${item.place_id}`,
    lat: Number(item.lat),
    lon: Number(item.lon),
    name: item.display_name.split(",")[0],
    kind: "bank",
    accepts: [],
    hours: "",
    address: item.display_name.split(",").slice(1, 3).join(",").trim()
  }));
}

function fromOverpass(el) {
  const tags = el.tags || {};
  const lat = el.lat ?? (el.center && el.center.lat);
  const lon = el.lon ?? (el.center && el.center.lon);
  if (lat === undefined || lon === undefined) return null;

  let kind = "point";
  if (/bank\s*sampah/i.test(tags.name || "")) kind = "bank";
  else if (tags.amenity === "waste_transfer_station") kind = "transfer";
  else if (tags.recycling_type === "centre") kind = "centre";
  else if (tags.recycling_type === "container") kind = "container";

  const accepts = Object.entries(ACCEPT_TAGS)
    .filter(([, keys]) => keys.some((key) => tags[`recycling:${key}`] === "yes"))
    .map(([id]) => id);

  const address = [tags["addr:street"] && `${tags["addr:street"]} ${tags["addr:housenumber"] || ""}`.trim(),
    tags["addr:subdistrict"] || tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(", ");

  return {
    id: `${el.type}-${el.id}`,
    lat, lon,
    name: tags.name || tags.operator || PLACE_KINDS[kind],
    kind,
    accepts,
    hours: tags.opening_hours || "",
    address
  };
}

// Jam buka OpenStreetMap ("Mo-Sa 08:00-15:00; Su off") ke bahasa Indonesia ("Sen–Sab 08.00–15.00; Min tutup")
const OSM_DAYS = { Mo: "Sen", Tu: "Sel", We: "Rab", Th: "Kam", Fr: "Jum", Sa: "Sab", Su: "Min", PH: "libur nasional" };

function formatHours(hours) {
  if (hours === "24/7") return "24 jam setiap hari";
  return hours
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (day) => OSM_DAYS[day])
    .replace(/(\d{2}):(\d{2})/g, "$1.$2")
    .replace(/(\d)-(\d)/g, "$1–$2")
    .replace(/([a-z])-([A-Z])/gi, "$1–$2")
    .replace(/\boff\b/gi, "tutup");
}

// Jarak garis lurus (haversine) dalam meter
function distanceMeters(a, b) {
  const rad = (deg) => deg * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${kgFormat.format(meters / 1000)} km`;
}

async function loadPlaces() {
  const request = ++mapState.request;
  const center = mapState.center;
  setMapStatus(`Mencari bank sampah dan titik daur ulang di sekitar ${center.label.toLowerCase() === "lokasimu" ? "lokasimu" : center.label}...`);
  document.getElementById("placesList").innerHTML = "";
  document.getElementById("placesMeta").textContent = "";

  let places = null;
  let radius = SEARCH_RADII[0];
  for (radius of SEARCH_RADII) {
    places = await fetchOverpass(center, radius);
    if (request !== mapState.request) return;   // pengguna sudah mencari tempat lain
    if (!places || places.length >= MIN_PLACES) break;
  }

  if (!places) {
    try {
      places = await fetchNominatimBanks(center);
      radius = 20000;
    } catch {
      places = null;
    }
    if (request !== mapState.request) return;
  }

  if (!places) {
    setMapStatus("Data lokasi sedang tidak bisa dimuat karena server peta penuh. Coba lagi beberapa saat lagi.", "error");
    renderRetry();
    return;
  }

  // Satu tempat bisa tercatat dua kali (titik dan bangunan): buang yang terlalu berdekatan dengan nama sama
  const unique = [];
  places.forEach((place) => {
    place.distance = distanceMeters(center, place);
    if (!unique.some((other) => other.name === place.name && distanceMeters(other, place) < 60)) unique.push(place);
  });
  mapState.places = unique.sort((a, b) => a.distance - b.distance).slice(0, 40);
  renderPlaces(radius);
}

// ---------- tampilan daftar dan pin ----------

function renderRetry() {
  document.getElementById("placesList").innerHTML =
    `<li class="places-empty"><button type="button" class="btn" data-map-retry>Coba lagi</button></li>`;
}

function renderPlaces(radius) {
  const list = document.getElementById("placesList");
  const places = mapState.places;
  mapState.markers.clearLayers();

  if (!places.length) {
    setMapStatus(`Belum ada bank sampah atau titik daur ulang yang tercatat di OpenStreetMap dalam ${radius / 1000} km dari sini.`, "empty");
    list.innerHTML = `<li class="places-empty">Tahu lokasinya? Kamu bisa menambahkannya di
      <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">openstreetmap.org</a>, lalu muncul di sini.</li>`;
    return;
  }

  setMapStatus("");
  document.getElementById("placesMeta").textContent = `${places.length} tempat dalam ${radius / 1000} km`;

  places.forEach((place) => {
    L.marker([place.lat, place.lon], {
      icon: L.divIcon({ className: `map-pin pin-${place.kind}`, html: "<span></span>", iconSize: [26, 26], iconAnchor: [13, 13] }),
      title: place.name,
      alt: place.name
    }).addTo(mapState.markers).on("click", () => selectPlace(place.id, true));
  });

  // Tampilkan pengguna dan lima tempat terdekat dalam satu layar
  const bounds = L.latLngBounds([[mapState.center.lat, mapState.center.lon]]);
  places.slice(0, 5).forEach((place) => bounds.extend([place.lat, place.lon]));
  mapState.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

  list.innerHTML = places.map((place) => {
    const accepts = place.accepts.length
      ? place.accepts.map((id) => `<span class="tag t-${id}">${escapeHtml(material(id).name)}</span>`).join("")
      : `<span class="place-unknown">Jenis sampah belum tercatat</span>`;
    const meta = [place.address, place.hours && `Buka ${formatHours(place.hours)}`].filter(Boolean).join(". ");
    const route = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;

    return `
      <li class="place" data-place="${escapeHtml(place.id)}">
        <button type="button" class="place-main" data-place-select="${escapeHtml(place.id)}">
          <span class="place-head">
            <strong>${escapeHtml(place.name)}</strong>
            <span class="place-distance num">${formatDistance(place.distance)}</span>
          </span>
          <span class="place-kind">${escapeHtml(PLACE_KINDS[place.kind])}</span>
          ${meta ? `<span class="place-meta">${escapeHtml(meta)}</span>` : ""}
          <span class="place-accepts">${accepts}</span>
        </button>
        <span class="place-actions">
          <a class="btn" href="${route}" target="_blank" rel="noopener noreferrer">Rute</a>
          <button type="button" class="btn primary" data-place-drop="${escapeHtml(place.id)}">Setor ke sini</button>
        </span>
      </li>`;
  }).join("");
}

function selectPlace(id, fromMap) {
  const place = mapState.places.find((item) => item.id === id);
  if (!place) return;
  mapState.selected = id;

  document.querySelectorAll("#placesList .place").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.place === id);
  });

  L.popup({ offset: [0, -8], closeButton: false })
    .setLatLng([place.lat, place.lon])
    .setContent(`<strong>${escapeHtml(place.name)}</strong><br>${escapeHtml(PLACE_KINDS[place.kind])}, ${formatDistance(place.distance)}`)
    .openOn(mapState.map);
  mapState.map.panTo([place.lat, place.lon]);

  if (fromMap) {
    const row = document.querySelector(`#placesList .place[data-place="${CSS.escape(id)}"]`);
    if (row) row.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "nearest" });
  }
}

// "Setor ke sini": pilih tempat ini untuk setoran drop-box, lalu ke form setoran
function dropAt(id) {
  const place = mapState.places.find((item) => item.id === id);
  if (!place) return;

  state.dropPlace = { name: place.name, distance: formatDistance(place.distance) };
  location.hash = "setor";
  const select = document.getElementById("depositMethod");
  select.value = "dropbox";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  showToast(`${place.name} dipilih sebagai tempat drop-off.`);
}

// ---------- event ----------

document.getElementById("locateBtn").addEventListener("click", locateMe);

document.getElementById("mapSearch").addEventListener("submit", function(event) {
  event.preventDefault();
  const query = document.getElementById("mapSearchInput").value.trim();
  if (query.length >= 2) searchArea(query);
});

document.getElementById("placesList").addEventListener("click", function(event) {
  const select = event.target.closest("[data-place-select]");
  const drop = event.target.closest("[data-place-drop]");
  if (select) selectPlace(select.dataset.placeSelect, false);
  if (drop) dropAt(drop.dataset.placeDrop);
  if (event.target.closest("[data-map-retry]") && mapState.center) loadPlaces();
});
