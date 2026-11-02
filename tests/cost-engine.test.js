import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyCost, nationalImpact, utensilCheck, UTENSILS, unitsFor, PHYSICS } from '../public/assets/js/lib/cost-engine.js';

test('defaults: same food, three fuels, honest ordering', () => {
  const r = monthlyCost({ cylinderPrice: 942, daysPerCylinder: 40, tariff: 7 });
  // one 14.2 kg cylinder = 181.76 kWh of heat, 60% reaches the pot, 0.75 cylinders a month
  assert.ok(Math.abs(r.usefulHeatKWh - 14.2 * 12.8 * 0.6 * 0.75) < 1e-9);
  assert.ok(Math.abs(r.gasOnly - 706.5) < 0.01);
  assert.ok(r.inductionOnly < r.aanchOnly, 'induction is more efficient than infrared');
  // At Rs 7/unit and Rs 942/cylinder, Aanch costs a bit MORE than gas. The engine must say so.
  assert.ok(r.aanchVsGas > 0);
  assert.ok(r.breakEvenTariff > 5.5 && r.breakEvenTariff < 7);
});

test('commercial cylinder: Aanch is clearly cheaper', () => {
  const r = monthlyCost({ cylinderPrice: 2930, cylinderKg: 19, daysPerCylinder: 30, tariff: 9 });
  assert.ok(r.aanchOnly < r.gasOnly * 0.75);
});

test('half the cooking on Aanch doubles cylinder life', () => {
  const r = monthlyCost({ daysPerCylinder: 40, shareOnAanch: 0.5 });
  assert.equal(r.cylinderLastsDays, 80);
  assert.ok(Math.abs(r.mixed.total - (r.gasOnly / 2 + r.aanchOnly / 2)) < 1e-9);
});

test('all cooking on Aanch: cylinder never runs out', () => {
  assert.equal(monthlyCost({ shareOnAanch: 1 }).cylinderLastsDays, Infinity);
});

test('bad inputs are clamped, never NaN', () => {
  const r = monthlyCost({ cylinderPrice: 'abc', daysPerCylinder: -4, tariff: 999, shareOnAanch: 7 });
  for (const v of [r.gasOnly, r.aanchOnly, r.inductionOnly]) assert.ok(Number.isFinite(v));
  assert.equal(r.inputs.tariff, 30);
  assert.equal(r.inputs.shareOnAanch, 1);
});

test('utensil check: Aanch works with everything picked', () => {
  const all = UTENSILS.map((u) => u.id);
  const r = utensilCheck(all);
  assert.equal(r.aanchWorks, all.length);
  assert.ok(r.inductionNo >= 4);
  assert.ok(r.replaceCost > 0 && r.replaceCostWorst >= r.replaceCost);
  assert.equal(utensilCheck(['nope']).picked, 0);
});

test('national impact maths', () => {
  const r = nationalImpact({ homes: 1e7, shareOnElectric: 0.5, kgPerHomeYear: 100, importShare: 0.6 });
  assert.equal(r.lpgTonnes, 500000);
  assert.equal(r.importedTonnes, 300000);
  assert.ok(Math.abs(r.ships - 300000 / PHYSICS.vlgcTonnes) < 1e-9);
});

test('units for wattage', () => {
  assert.equal(unitsFor(2000, 60), 2);
  assert.equal(unitsFor(2000, 30, 0.5), 0.5);
});
