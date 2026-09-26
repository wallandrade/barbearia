import assert from "node:assert/strict";
import test from "node:test";

import {
  BRASIL_API_SP_STUB,
  chooseMotoboyCepCoordinates,
  geocodeMotoboyCep,
  parseAwesomeApiCoordinates,
  parseBrasilApiCoordinates,
  resetMotoboyGeocodeCacheForTests,
} from "./motoboy-geocode";

test("parseBrasilApiCoordinates lê location.coordinates", () => {
  const coords = parseBrasilApiCoordinates({
    location: { coordinates: { latitude: "-23.550385", longitude: "-46.633956" } },
  });
  assert.ok(coords);
  assert.ok(Math.abs(coords!.lat - (-23.550385)) < 1e-6);
  assert.ok(Math.abs(coords!.lng - (-46.633956)) < 1e-6);
});

test("parseBrasilApiCoordinates ignora 0,0 e vazio", () => {
  assert.equal(parseBrasilApiCoordinates({ location: { coordinates: { latitude: "0", longitude: "0" } } }), null);
  assert.equal(parseBrasilApiCoordinates({ location: { coordinates: {} } }), null);
  assert.equal(parseBrasilApiCoordinates({}), null);
});

test("parseAwesomeApiCoordinates lê lat/lng", () => {
  const coords = parseAwesomeApiCoordinates({ lat: "-23.61001", lng: "-46.42842" });
  assert.ok(coords);
  assert.ok(Math.abs(coords!.lat - (-23.61001)) < 1e-6);
  assert.ok(Math.abs(coords!.lng - (-46.42842)) < 1e-6);
  assert.equal(parseAwesomeApiCoordinates({}), null);
  assert.equal(parseAwesomeApiCoordinates({ lat: "0", lng: "0" }), null);
});

test("fontes que batem usam a BrasilAPI", () => {
  const brasil = { lat: -23.560262, lng: -46.561531 };
  const alternate = { lat: -23.5608, lng: -46.562 };
  const chosen = chooseMotoboyCepCoordinates({ cep: "03338000", brasilApi: brasil, alternate });
  assert.deepEqual(chosen, brasil);
});

test("08381-173 divergente usa a AwesomeAPI, não o pino da Sé", () => {
  const chosen = chooseMotoboyCepCoordinates({
    cep: "08381173",
    brasilApi: BRASIL_API_SP_STUB,
    alternate: { lat: -23.61001, lng: -46.42842 },
  });
  assert.ok(chosen);
  assert.ok(Math.abs(chosen!.lat - (-23.61001)) < 1e-6);
  assert.ok(Math.abs(chosen!.lng - (-46.42842)) < 1e-6);
});

test("só o pino genérico fora do CEP 010 não precifica km", () => {
  assert.equal(chooseMotoboyCepCoordinates({
    cep: "08381173",
    brasilApi: BRASIL_API_SP_STUB,
    alternate: null,
  }), null);
  assert.equal(chooseMotoboyCepCoordinates({
    cep: "03338000",
    brasilApi: BRASIL_API_SP_STUB,
    alternate: BRASIL_API_SP_STUB,
  }), null);
});

test("CEP 010 pode ficar no pino ao lado da Sé", () => {
  const chosen = chooseMotoboyCepCoordinates({
    cep: "01001000",
    brasilApi: BRASIL_API_SP_STUB,
    alternate: null,
  });
  assert.deepEqual(chosen, BRASIL_API_SP_STUB);
});

test("geocodeMotoboyCep troca o pino genérico pela AwesomeAPI", async () => {
  resetMotoboyGeocodeCacheForTests();
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("brasilapi.com.br")) {
      return {
        ok: true,
        json: async () => ({
          location: { coordinates: { latitude: "-23.5475", longitude: "-46.63611" } },
        }),
      };
    }
    if (url.includes("awesomeapi.com.br")) {
      return { ok: true, json: async () => ({ lat: "-23.61001", lng: "-46.42842" }) };
    }
    throw new Error(url);
  }) as typeof fetch;
  try {
    const coords = await geocodeMotoboyCep("08381-173");
    assert.ok(coords);
    assert.ok(Math.abs(coords!.lat - (-23.61001)) < 1e-6);
    assert.ok(Math.abs(coords!.lng - (-46.42842)) < 1e-6);
  } finally {
    globalThis.fetch = original;
    resetMotoboyGeocodeCacheForTests();
  }
});
