import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import marina from "../src/marina.json";
import { buildScene, type MarinaData, type YachtPlacement } from "../src/marina";

MapLibreGL.setAccessToken(null);

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const scene = buildScene(marina as MarinaData);

export default function App() {
  const rows = useMemo(() => scene.rows, []);
  const camera = useRef<React.ElementRef<typeof MapLibreGL.Camera>>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const active = rows.find((row) => row.yacht.id === selected) ?? null;

  function onYacht(event: { features?: Array<{ properties?: { id?: string } }> }) {
    const id = event.features?.[0]?.properties?.id;
    if (id) setSelected(String(id));
  }

  function focus(row: YachtPlacement) {
    setSelected(row.yacht.id);
    camera.current?.setCamera({
      centerCoordinate: row.center,
      zoomLevel: 17.2,
      pitch: 64,
      heading: row.heading - 24,
      animationDuration: 800,
    });
  }

  return (
    <View style={styles.root}>
      <MapLibreGL.MapView style={styles.map} mapStyle={STYLE} logoEnabled={false} compassEnabled>
        <MapLibreGL.Camera
          ref={camera}
          zoomLevel={16.35}
          pitch={62}
          heading={18}
          centerCoordinate={[7.4239, 43.73445]}
          animationMode="moveTo"
        />
        <MapLibreGL.ShapeSource id="docks" shape={scene.docks}>
          <MapLibreGL.LineLayer id="dock-line" style={{ lineColor: "#8a6a32", lineWidth: 4 }} />
        </MapLibreGL.ShapeSource>
        <MapLibreGL.ShapeSource id="dock-labels" shape={scene.dockLabels}>
          <MapLibreGL.SymbolLayer
            id="dock-label"
            style={{
              textField: ["get", "name"],
              textSize: 14,
              textColor: "#3a2e1c",
              textHaloColor: "#f3efe6",
              textHaloWidth: 1.4,
            }}
          />
        </MapLibreGL.ShapeSource>
        <MapLibreGL.ShapeSource id="yachts" shape={scene.yachts} onPress={onYacht}>
          <MapLibreGL.FillExtrusionLayer
            id="yacht-hull"
            filter={["==", ["get", "part"], "hull"]}
            style={{
              fillExtrusionColor: ["get", "color"],
              fillExtrusionHeight: ["get", "height"],
              fillExtrusionBase: ["get", "base"],
              fillExtrusionOpacity: 0.94,
            }}
          />
          <MapLibreGL.FillExtrusionLayer
            id="yacht-cabin"
            filter={["==", ["get", "part"], "cabin"]}
            style={{
              fillExtrusionColor: "#efe6d6",
              fillExtrusionHeight: ["get", "height"],
              fillExtrusionBase: ["get", "base"],
              fillExtrusionOpacity: 0.96,
            }}
          />
        </MapLibreGL.ShapeSource>
        <MapLibreGL.ShapeSource id="labels" shape={scene.labels}>
          <MapLibreGL.SymbolLayer
            id="yacht-name"
            filter={["==", ["get", "kind"], "name"]}
            style={{
              textField: ["get", "name"],
              textSize: 12,
              textColor: "#1a1814",
              textHaloColor: "#ffffff",
              textHaloWidth: 1.2,
              textAllowOverlap: false,
            }}
          />
          <MapLibreGL.SymbolLayer
            id="berth-label"
            filter={["==", ["get", "kind"], "berth"]}
            minZoomLevel={16.5}
            style={{
              textField: ["get", "berth"],
              textSize: 11,
              textColor: "#6a4a16",
              textHaloColor: "#f3efe6",
              textHaloWidth: 1.1,
              textAllowOverlap: false,
            }}
          />
        </MapLibreGL.ShapeSource>
      </MapLibreGL.MapView>
      <ScrollView horizontal style={styles.list} contentContainerStyle={styles.listInner}>
        {rows.map((row) => (
          <Pressable key={row.yacht.id} style={[styles.chip, selected === row.yacht.id && styles.chipOn]} onPress={() => focus(row)}>
            <Text style={[styles.chipName, selected === row.yacht.id && styles.chipNameOn]}>{row.yacht.name}</Text>
            <Text style={[styles.chipMeta, selected === row.yacht.id && styles.chipNameOn]}>{row.berth.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {active ? (
        <View style={styles.card}>
          <Text style={styles.kicker}>{active.berth.name}</Text>
          <Text style={styles.title}>{active.yacht.name}</Text>
          <Text style={styles.meta}>
            距起点 {active.berth.alongM} m · {active.yacht.loa}×{active.yacht.beam} m · 船头 {Math.round(active.heading)}°
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f3efe6" },
  map: { flex: 1 },
  list: { position: "absolute", top: 52, left: 0, right: 0, maxHeight: 64 },
  listInner: { paddingHorizontal: 12, gap: 8 },
  chip: { backgroundColor: "rgba(243,239,230,0.94)", borderWidth: 1, borderColor: "rgba(26,24,20,0.14)", paddingHorizontal: 10, paddingVertical: 8 },
  chipOn: { backgroundColor: "#16384a", borderColor: "#16384a" },
  chipName: { color: "#1a1814", fontWeight: "600" },
  chipNameOn: { color: "#f3efe6" },
  chipMeta: { color: "#6c655c", fontSize: 12 },
  card: { position: "absolute", left: 12, right: 12, bottom: 28, backgroundColor: "#16384a", padding: 14 },
  kicker: { color: "rgba(243,239,230,0.7)", fontSize: 12, letterSpacing: 1 },
  title: { color: "#f3efe6", fontSize: 22, marginTop: 2 },
  meta: { color: "rgba(243,239,230,0.8)", marginTop: 4 },
});
