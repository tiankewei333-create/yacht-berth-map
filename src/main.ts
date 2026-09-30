import maplibregl, { type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { buildScene, marina, type YachtPlacement } from "./marina";

const scene = buildScene(marina);
const rows = scene.rows;
const byId = new Map(rows.map((row) => [row.yacht.id, row]));

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [7.4239, 43.73445],
  zoom: 16.35,
  pitch: 62,
  bearing: -18,
  attributionControl: { compact: true },
  canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

const list = document.querySelector<HTMLUListElement>("#list");
const card = document.querySelector<HTMLElement>("#card");
const cardBerth = document.querySelector<HTMLElement>("#card-berth");
const cardName = document.querySelector<HTMLElement>("#card-name");
const cardSize = document.querySelector<HTMLElement>("#card-size");
let selected: string | null = null;

function paintSelection(id: string | null) {
  for (const row of rows) {
    map.setFeatureState({ source: "yachts", id: `${row.yacht.id}-hull` }, { selected: row.yacht.id === id });
    map.setFeatureState({ source: "yachts", id: `${row.yacht.id}-cabin` }, { selected: row.yacht.id === id });
  }
  list?.querySelectorAll("button").forEach((btn) => {
    if (btn.dataset.id === id) btn.setAttribute("aria-current", "true");
    else btn.removeAttribute("aria-current");
  });
}

function show(row: YachtPlacement) {
  selected = row.yacht.id;
  paintSelection(selected);
  if (card && cardBerth && cardName && cardSize) {
    card.hidden = false;
    cardBerth.textContent = `${row.dock.name} · ${row.berth.name}`;
    cardName.textContent = row.yacht.name;
    cardSize.textContent = `${row.berth.name} · 距起点 ${row.berth.alongM} m · ${row.yacht.loa}×${row.yacht.beam} m · 船头 ${Math.round(row.heading)}°`;
  }
}

function focus(row: YachtPlacement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  map.easeTo({
    center: row.center,
    zoom: Math.max(map.getZoom(), 17.1),
    pitch: 64,
    bearing: row.heading - 24,
    duration: reduce ? 0 : 900,
  });
  show(row);
}

if (list) {
  for (const row of rows) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = row.yacht.id;
    btn.innerHTML = `<strong>${row.yacht.name}</strong><span>${row.berth.name} · ${row.yacht.loa}×${row.yacht.beam}</span>`;
    btn.addEventListener("click", () => focus(row));
    li.append(btn);
    list.append(li);
  }
}

document.querySelector("#card-close")?.addEventListener("click", () => {
  selected = null;
  paintSelection(null);
  if (card) card.hidden = true;
});

map.on("load", () => {
  map.addSource("docks", { type: "geojson", data: scene.docks });
  map.addSource("dock-labels", { type: "geojson", data: scene.dockLabels });
  map.addSource("yachts", { type: "geojson", data: scene.yachts });
  map.addSource("labels", { type: "geojson", data: scene.labels });

  map.addLayer({
    id: "dock-line",
    type: "line",
    source: "docks",
    paint: { "line-color": "#8a6a32", "line-width": 4 },
  });
  map.addLayer({
    id: "dock-label",
    type: "symbol",
    source: "dock-labels",
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 14,
    },
    paint: {
      "text-color": "#3a2e1c",
      "text-halo-color": "#f3efe6",
      "text-halo-width": 1.4,
    },
  });
  map.addLayer({
    id: "yacht-hull",
    type: "fill-extrusion",
    source: "yachts",
    filter: ["==", ["get", "part"], "hull"],
    paint: {
      "fill-extrusion-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#c4a15a",
        ["get", "color"],
      ],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-opacity": 0.94,
    },
  });
  map.addLayer({
    id: "yacht-cabin",
    type: "fill-extrusion",
    source: "yachts",
    filter: ["==", ["get", "part"], "cabin"],
    paint: {
      "fill-extrusion-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#f4e2b0",
        ["get", "color"],
      ],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-opacity": 0.96,
    },
  });
  map.addLayer({
    id: "yacht-name",
    type: "symbol",
    source: "labels",
    filter: ["==", ["get", "kind"], "name"],
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15.4, 10, 17.4, 14],
      "text-anchor": "center",
      "text-optional": true,
      "text-padding": 1,
      "text-allow-overlap": false,
      "symbol-sort-key": ["*", -1, ["get", "loa"]],
    },
    paint: {
      "text-color": "#1a1814",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.3,
    },
  });
  map.addLayer({
    id: "berth-label",
    type: "symbol",
    source: "labels",
    minzoom: 16.5,
    filter: ["==", ["get", "kind"], "berth"],
    layout: {
      "text-field": ["get", "berth"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-anchor": "center",
      "text-offset": [0, 0.9],
      "text-optional": true,
      "text-allow-overlap": false,
      "text-padding": 2,
    },
    paint: {
      "text-color": "#6a4a16",
      "text-halo-color": "#f3efe6",
      "text-halo-width": 1.2,
    },
  });

  const onYachtClick = (event: MapLayerMouseEvent) => {
    const hit = event.features?.[0];
    const id = String(hit?.properties?.id ?? "");
    const row = byId.get(id);
    if (row) show(row);
  };
  map.on("click", "yacht-hull", onYachtClick);
  map.on("click", "yacht-cabin", onYachtClick);
  map.on("mouseenter", "yacht-hull", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "yacht-hull", () => {
    map.getCanvas().style.cursor = "";
  });
});
