import marinaData from "./marina.json";
import { along, bearing, distance, footprint, hullFootprint, offset, type LngLat } from "./geo";

export type Side = 1 | -1;

export type Dock = {
  id: string;
  name: string;
  line: [LngLat, LngLat];
  /** Which way the dock name sits. +1 is dock bearing + 90°. */
  labelSide: Side;
};

export type Berth = {
  id: string;
  dockId: string;
  name: string;
  /** Meters from the dock line's start. */
  alongM: number;
  /** +1 → heading = dock bearing + 90°. -1 → minus 90°. */
  side: Side;
};

export type Yacht = {
  id: string;
  name: string;
  berthId: string;
  loa: number;
  beam: number;
  color: string;
};

export type MarinaData = {
  docks: Dock[];
  berths: Berth[];
  yachts: Yacht[];
};

export const marina = marinaData as MarinaData;

export type YachtPlacement = {
  yacht: Yacht;
  dock: Dock;
  berth: Berth;
  stern: LngLat;
  center: LngLat;
  heading: number;
};

export function placeMarina(data: MarinaData = marina): YachtPlacement[] {
  const docksById = new Map(data.docks.map((dock) => [dock.id, dock]));
  const berthsById = new Map(data.berths.map((berth) => [berth.id, berth]));
  const placed: YachtPlacement[] = [];

  for (const yacht of data.yachts) {
    const berth = berthsById.get(yacht.berthId);
    const dock = berth ? docksById.get(berth.dockId) : undefined;
    if (!berth || !dock) continue;
    const [start, end] = dock.line;
    const length = distance(start, end);
    if (berth.alongM <= 0 || berth.alongM >= length) continue;
    const dockBearing = bearing(start, end);
    const heading = (dockBearing + 90 * berth.side + 360) % 360;
    const stern = along(start, end, berth.alongM);
    placed.push({
      yacht,
      dock,
      berth,
      stern,
      center: offset(stern, heading, yacht.loa / 2),
      heading,
    });
  }
  return placed;
}

type PolyProps = {
  id: string;
  part: "hull" | "cabin";
  name: string;
  berth: string;
  loa: number;
  beam: number;
  heading: number;
  color: string;
  height: number;
  base: number;
};

function polygon(id: string, ring: LngLat[], props: PolyProps) {
  return {
    type: "Feature" as const,
    id,
    geometry: { type: "Polygon" as const, coordinates: [ring] },
    properties: props,
  };
}

export function yachtCollection(rows: YachtPlacement[]) {
  const features = rows.flatMap((row) => {
    const { yacht, stern, heading, berth } = row;
    const hullH = Math.min(4.2, 1.6 + yacht.loa * 0.035);
    const hull = polygon(`${yacht.id}-hull`, hullFootprint(stern, heading, yacht.loa, yacht.beam), {
      id: yacht.id,
      part: "hull",
      name: yacht.name,
      berth: berth.name,
      loa: yacht.loa,
      beam: yacht.beam,
      heading,
      color: yacht.color,
      height: hullH,
      base: 0,
    });
    const cabinStern = offset(stern, heading, yacht.loa * 0.22);
    const cabin = polygon(
      `${yacht.id}-cabin`,
      footprint(cabinStern, heading, yacht.loa * 0.34, yacht.beam * 0.52),
      {
        id: yacht.id,
        part: "cabin",
        name: yacht.name,
        berth: berth.name,
        loa: yacht.loa,
        beam: yacht.beam,
        heading,
        color: "#efe6d6",
        height: hullH + 1.7 + yacht.loa * 0.02,
        base: hullH,
      },
    );
    return [hull, cabin];
  });
  return { type: "FeatureCollection" as const, features };
}

export function dockCollection(dockList: Dock[]) {
  return {
    type: "FeatureCollection" as const,
    features: dockList.map((dock) => ({
      type: "Feature" as const,
      id: dock.id,
      properties: { name: dock.name },
      geometry: { type: "LineString" as const, coordinates: dock.line },
    })),
  };
}

export function dockLabelCollection(dockList: Dock[]) {
  return {
    type: "FeatureCollection" as const,
    features: dockList.map((dock) => {
      const [start, end] = dock.line;
      const dockBearing = bearing(start, end);
      const away = (dockBearing + 90 * dock.labelSide + 360) % 360;
      const mid = along(start, end, distance(start, end) / 2);
      return {
        type: "Feature" as const,
        properties: { name: dock.name },
        geometry: { type: "Point" as const, coordinates: offset(mid, away, 55) },
      };
    }),
  };
}

export function labelCollection(rows: YachtPlacement[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.flatMap((row) => [
      {
        type: "Feature" as const,
        id: `${row.yacht.id}-name`,
        properties: {
          id: row.yacht.id,
          kind: "name",
          name: row.yacht.name,
          berth: row.berth.name,
          loa: row.yacht.loa,
        },
        geometry: {
          type: "Point" as const,
          coordinates: offset(row.stern, row.heading, row.yacht.loa * 0.4),
        },
      },
      {
        type: "Feature" as const,
        id: `${row.yacht.id}-berth`,
        properties: {
          id: row.yacht.id,
          kind: "berth",
          name: row.berth.name,
          berth: row.berth.name,
          loa: row.yacht.loa,
        },
        geometry: { type: "Point" as const, coordinates: row.stern },
      },
    ]),
  };
}

export function buildScene(data: MarinaData = marina) {
  const rows = placeMarina(data);
  return {
    rows,
    docks: dockCollection(data.docks),
    dockLabels: dockLabelCollection(data.docks),
    yachts: yachtCollection(rows),
    labels: labelCollection(rows),
  };
}
