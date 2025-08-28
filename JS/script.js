let map, drawnItems, heatLayer;

        document.addEventListener('DOMContentLoaded', function() {
            map = L.map('map').setView([-2.5489, 118.0149], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            let drawControl = new L.Control.Draw({
                draw: { polygon: true, rectangle: true, circle: false, marker: false, polyline: false, circlemarker: false },
                edit: { featureGroup: drawnItems, remove: true }
            });
            map.addControl(drawControl);

            // Event saat gambar area baru
            map.on(L.Draw.Event.CREATED, function (e) {
                let layer = e.layer;
                drawnItems.addLayer(layer);

                let bounds = layer.getBounds();
                let points = generateRandomData(bounds, 150);

                if (heatLayer) { map.removeLayer(heatLayer); }
                heatLayer = L.heatLayer(points, {
                    radius: 25,
                    blur: 15,
                    maxZoom: 10,
                    gradient: { 0.2: "green", 0.5: "yellow", 0.8: "orange", 1.0: "red" }
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

        function generateRandomData(bounds, count) {
            let points = [];
            for (let i = 0; i < count; i++) {
                let lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
                let lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
                let intensity = Math.random();
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