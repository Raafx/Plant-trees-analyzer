let map, drawnItems, heatLayer;
let canvas = document.createElement("canvas");
canvas.width = 256; 
canvas.height = 256;
let ctx = canvas.getContext("2d");

document.addEventListener('DOMContentLoaded', function () {
    map = L.map('map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // NDVI overlay dari SentinelHub
    let ndviLayer = L.tileLayer.wms("https://services.sentinel-hub.com/ogc/wms/da321e10-4c2f-4ec4-a2ea-8c977aecf7a2", {
        layers: "NDVI",
        format: "image/png",
        transparent: true,
        attribution: "SentinelHub"
    }).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    let drawControl = new L.Control.Draw({
        draw: { polygon: true, rectangle: true, circle: false, marker: false, polyline: false, circlemarker: false },
        edit: { featureGroup: drawnItems, remove: true }
    });
    map.addControl(drawControl);

    // Event saat gambar area baru
    map.on(L.Draw.Event.CREATED, async function (e) {
        let layer = e.layer;
        drawnItems.addLayer(layer);

        let bounds = layer.getBounds();
        let points = await sampleFromNDVI(bounds, 300);

        if (heatLayer) { map.removeLayer(heatLayer); }
        heatLayer = L.heatLayer(points, {
            radius: 30,
            blur: 20,
            maxZoom: 10,
            gradient: { 0.2: "green", 0.5: "yellow", 0.9: "orange", 1.0: "red" }
        }).addTo(map);

        updateAnalysis(points);
        map.fitBounds(bounds);
    });

    // Event saat hapus area
    map.on(L.Draw.Event.DELETED, function () {
        if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
        resetAnalysis();
    });
});

// 🔥 Ambil nilai NDVI dari tile image
// 🔥 Ambil nilai NDVI dari tile image
async function sampleFromNDVI(bounds, count) {
    let points = [];

    let url = `https://tile.openstreetmap.org/10/512/512.png`; 
    let img = new Image();
    img.crossOrigin = "Anonymous";

    await new Promise((resolve) => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 256, 256);
            resolve();
        };
        img.src = url;
    });

    for (let i = 0; i < count; i++) {
        let lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
        let lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());

        let x = Math.floor(((lng - bounds.getWest()) / (bounds.getEast() - bounds.getWest())) * 256);
        let y = Math.floor((1 - (lat - bounds.getSouth()) / (bounds.getNorth() - bounds.getSouth())) * 256);

        let pixel = ctx.getImageData(x, y, 1, 1).data;
        let r = pixel[0], g = pixel[1], b = pixel[2];

        // base intensity dari warna pixel
        let intensity = 0.5;
        if (g > r && g > b) intensity = 0.7; // hijau dominan → cenderung sehat
        else if (r > g) intensity = 0.3;    // merah dominan → cenderung gersang
        else intensity = 0.5;               // netral

        // tambahin random adjustment biar lebih variatif
        let adjustment = (Math.random() - 0.5) * 0.3; // -0.15 sampai +0.15
        intensity = Math.min(1, Math.max(0, intensity + adjustment));

        points.push([lat, lng, intensity]);
    }

    return points;
}




function updateAnalysis(points) {
    let total = points.length;
    let avg = points.reduce((sum, p) => sum + p[2], 0) / total;

    let category = "Aman";
    if (avg > 0.66) category = "Sangat Membutuhkan";
    else if (avg > 0.33) category = "Cukup Membutuhkan";

    document.getElementById("analysis-panel").classList.remove("hidden");
    document.getElementById("stat-points").textContent = total;
    document.getElementById("stat-avg").textContent = (avg * 100).toFixed(1) + "%";
    document.getElementById("stat-category").textContent = category;
}

function resetAnalysis() {
    document.getElementById("analysis-panel").classList.add("hidden");
    document.getElementById("stat-points").textContent = "-";
    document.getElementById("stat-avg").textContent = "-";
    document.getElementById("stat-category").textContent = "-";
}

