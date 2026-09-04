import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOsrmRouteUrl,
  metersToRouteKm,
  parseGoogleDistanceMatrixKm,
  parseOsrmRouteKm,
  resetMotoboyRouteCacheForTests,
  resolveMotoboyDistanceKm,
  resolveMotoboyRouteProvider,
} from "./motoboy-route";

test("metersToRouteKm converte e rejeita inválido", () => {
  assert.equal(metersToRouteKm(65200), 65.2);
  assert.equal(metersToRouteKm(0), null);
  assert.equal(metersToRouteKm(-1), null);
});

test("parseOsrmRouteKm lê distance em metros (Sé → Atibaia)", () => {
  const km = parseOsrmRouteKm({
    code: "Ok",
    routes: [{ distance: 67742.1 }],
  });
  assert.ok(km);
  assert.ok(Math.abs(km! - 67.7421) < 1e-6);
});

test("parseOsrmRouteKm ignora code diferente de Ok", () => {
  assert.equal(parseOsrmRouteKm({ code: "NoRoute", routes: [{ distance: 1000 }] }), null);
  assert.equal(parseOsrmRouteKm({}), null);
});

test("parseGoogleDistanceMatrixKm lê element.distance.value", () => {
  const km = parseGoogleDistanceMatrixKm({
    rows: [{ elements: [{ status: "OK", distance: { value: 65200, text: "65,2 km" } }] }],
  });
  assert.equal(km, 65.2);
});

test("parseGoogleDistanceMatrixKm ignora ZERO_RESULTS", () => {
  assert.equal(parseGoogleDistanceMatrixKm({
    rows: [{ elements: [{ status: "ZERO_RESULTS" }] }],
  }), null);
});

test("buildOsrmRouteUrl usa lng,lat", () => {
  const url = buildOsrmRouteUrl(
    { lat: -23.5503898, lng: -46.633081 },
    { lat: -23.11694, lng: -46.55028 },
  );
  assert.ok(url.includes("-46.633081,-23.5503898;-46.55028,-23.11694"));
  assert.ok(url.includes("/route/v1/driving/"));
});

test("resolveMotoboyRouteProvider default é osrm sem chave Google", () => {
  const prev = process.env.MOTOBOY_ROUTE_PROVIDER;
  const prevKey = process.env.MOTOBOY_GOOGLE_MAPS_API_KEY;
  const prevGmaps = process.env.GOOGLE_MAPS_API_KEY;
  const prevDir = process.env.GOOGLE_DIRECTIONS_API_KEY;
  delete process.env.MOTOBOY_ROUTE_PROVIDER;
  delete process.env.MOTOBOY_GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_DIRECTIONS_API_KEY;
  assert.equal(resolveMotoboyRouteProvider(), "osrm");
  if (prev != null) process.env.MOTOBOY_ROUTE_PROVIDER = prev;
  if (prevKey != null) process.env.MOTOBOY_GOOGLE_MAPS_API_KEY = prevKey;
  if (prevGmaps != null) process.env.GOOGLE_MAPS_API_KEY = prevGmaps;
  if (prevDir != null) process.env.GOOGLE_DIRECTIONS_API_KEY = prevDir;
});

test("resolveMotoboyDistanceKm usa rota e não Haversine quando OSRM responde", async () => {
  resetMotoboyRouteCacheForTests();
  const prev = process.env.MOTOBOY_ROUTE_PROVIDER;
  process.env.MOTOBOY_ROUTE_PROVIDER = "osrm";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ code: "Ok", routes: [{ distance: 65200 }] }),
  })) as typeof fetch;
  try {
    const km = await resolveMotoboyDistanceKm(
      { lat: -23.5503898, lng: -46.633081 },
      { lat: -23.11694, lng: -46.55028 },
    );
    assert.equal(km, 65.2);
  } finally {
    globalThis.fetch = originalFetch;
    if (prev != null) process.env.MOTOBOY_ROUTE_PROVIDER = prev;
    else delete process.env.MOTOBOY_ROUTE_PROVIDER;
    resetMotoboyRouteCacheForTests();
  }
});

test("resolveMotoboyDistanceKm cai no Haversine se a rota falhar", async () => {
  resetMotoboyRouteCacheForTests();
  const prev = process.env.MOTOBOY_ROUTE_PROVIDER;
  process.env.MOTOBOY_ROUTE_PROVIDER = "osrm";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    json: async () => ({}),
  })) as typeof fetch;
  try {
    const km = await resolveMotoboyDistanceKm(
      { lat: -23.5503898, lng: -46.633081 },
      { lat: -23.11694, lng: -46.55028 },
    );
    assert.ok(km > 45 && km < 55, `esperava ~49 km em linha reta, veio ${km}`);
  } finally {
    globalThis.fetch = originalFetch;
    if (prev != null) process.env.MOTOBOY_ROUTE_PROVIDER = prev;
    else delete process.env.MOTOBOY_ROUTE_PROVIDER;
    resetMotoboyRouteCacheForTests();
  }
});
