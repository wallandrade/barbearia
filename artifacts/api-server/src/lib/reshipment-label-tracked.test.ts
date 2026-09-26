import assert from "node:assert/strict";
import test from "node:test";

import { orderHasLabelAndRealTracking } from "./reshipment-label-tracked";

test("EC sozinho não fecha; barcode real ou tracking key com etiqueta fecha", () => {
  assert.equal(orderHasLabelAndRealTracking({
    envioecomLabelUrl: "https://x/a.pdf",
    envioecomBarcode: "EC123",
  }), false);
  assert.equal(orderHasLabelAndRealTracking({
    envioecomLabelUrl: "https://x/a.pdf",
    envioecomBarcode: "888030902787510",
  }), true);
  assert.equal(orderHasLabelAndRealTracking({
    envioecomLabelUrl: "https://x/a.pdf",
    envioecomBarcode: "EC123",
    envioecomTrackingKey: "trk-1",
  }), true);
  assert.equal(orderHasLabelAndRealTracking({
    envioecomBarcode: "888030902787510",
    envioecomTrackingKey: "trk-1",
  }), false);
  assert.equal(orderHasLabelAndRealTracking({
    envioecomLabelUrl: "https://x/a.pdf",
    envioecomBarcode: "888030902787510",
    envioecomStatus: "Cancelado",
  }), false);
});

test("dividido só fecha quando todos têm etiqueta e rastreio real", () => {
  assert.equal(orderHasLabelAndRealTracking({
    envioecomLabelUrl: "https://x/order.pdf",
    envioecomBarcode: "888030902787510",
    packages: [
      { envioecomLabelUrl: "https://x/a.pdf", envioecomBarcode: "888030902787510" },
      { envioecomLabelUrl: "https://x/b.pdf", envioecomBarcode: "EC999" },
    ],
  }), false);
  assert.equal(orderHasLabelAndRealTracking({
    packages: [
      { envioecomLabelUrl: "https://x/a.pdf", envioecomTrackingKey: "a" },
      { envioecomLabelUrl: "https://x/b.pdf", envioecomBarcode: "AA123456789BR" },
    ],
  }), true);
});
