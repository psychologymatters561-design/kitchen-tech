// Aanch cost engine. One file, used by the browser AND the server (isomorphic ES module).
// Every number here is either physics or an input the visitor can change.
// Nothing claims Aanch is cheaper than gas when it is not: the maths decides.

export const PHYSICS = Object.freeze({
  // LPG net calorific value is about 46 MJ/kg = 12.8 kWh of heat per kg.
  lpgKWhPerKg: 12.8,
  // Share of the energy that actually reaches the pot.
  // LPG: BIS IS 4246 asks for 68% in the lab; flames lick past real Indian vessels, so we use 60%.
  // Infrared (radiant glass): 70 to 80% in published comparisons, we use 72%.
  // Induction: 85 to 90%, we use 85%.
  eff: Object.freeze({ lpg: 0.6, infrared: 0.72, induction: 0.85 }),
  vlgcTonnes: 44000, // one very large gas carrier holds about 44,000 tonnes of LPG
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(+v) && v !== '' && v !== null ? +v : d);

/**
 * Monthly running cost of cooking the SAME amount of food on gas, Aanch and induction.
 * @param {object} i
 * @param {number} i.cylinderPrice   rupees per cylinder (domestic 14.2 kg default)
 * @param {number} i.cylinderKg      kg of LPG in that cylinder
 * @param {number} i.daysPerCylinder how many days one cylinder lasts this home today
 * @param {number} i.tariff          rupees per electricity unit (kWh)
 * @param {number} i.shareOnAanch    0..1, how much of the cooking moves to Aanch
 */
export function monthlyCost(i = {}) {
  const eff = { ...PHYSICS.eff, ...(i.eff || {}) };
  const cylinderPrice = clamp(num(i.cylinderPrice, 942), 100, 10000);
  const cylinderKg = clamp(num(i.cylinderKg, 14.2), 1, 50);
  const daysPerCylinder = clamp(num(i.daysPerCylinder, 40), 5, 365);
  const tariff = clamp(num(i.tariff, 7), 0, 30);
  const share = clamp(num(i.shareOnAanch, 1), 0, 1);

  const monthFactor = 30 / daysPerCylinder;
  const usefulHeatKWh = cylinderKg * PHYSICS.lpgKWhPerKg * eff.lpg * monthFactor; // heat in the pot per month

  const gasOnly = cylinderPrice * monthFactor;
  const aanchUnits = usefulHeatKWh / eff.infrared;
  const inductionUnits = usefulHeatKWh / eff.induction;
  const aanchOnly = aanchUnits * tariff;
  const inductionOnly = inductionUnits * tariff;

  const mixGas = gasOnly * (1 - share);
  const mixElectric = aanchOnly * share;
  const mixed = mixGas + mixElectric;
  const cylinderLastsDays = share >= 1 ? Infinity : daysPerCylinder / (1 - share);

  // Tariff at which Aanch and gas cost exactly the same for this home.
  const breakEvenTariff = gasOnly / aanchUnits;

  return {
    inputs: { cylinderPrice, cylinderKg, daysPerCylinder, tariff, shareOnAanch: share },
    usefulHeatKWh,
    gasOnly,
    aanchOnly,
    aanchUnits,
    inductionOnly,
    inductionUnits,
    mixed: { total: mixed, gas: mixGas, electric: mixElectric, units: aanchUnits * share },
    cylinderLastsDays,
    cylindersPerYearNow: 365 / daysPerCylinder,
    cylindersPerYearMixed: share >= 1 ? 0 : 365 / cylinderLastsDays,
    breakEvenTariff,
    aanchVsGas: aanchOnly - gasOnly, // positive = Aanch costs more per month
    aanchVsInduction: aanchOnly - inductionOnly, // always positive: induction is more efficient
  };
}

/**
 * Induction's hidden cost: cookware that is not magnetic must be replaced.
 * Aanch heats any flat-bottom vessel.
 */
export const UTENSILS = Object.freeze([
  { id: 'steel-kadai', label: 'Steel kadai', material: 'Stainless steel', induction: 'maybe', note: 'Only if the base is magnetic (try a fridge magnet).', replace: 900 },
  { id: 'alu-cooker', label: 'Aluminium pressure cooker', material: 'Aluminium', induction: false, replace: 1800 },
  { id: 'alu-patila', label: 'Aluminium patila', material: 'Aluminium', induction: false, replace: 700 },
  { id: 'iron-tawa', label: 'Iron tawa', material: 'Cast iron', induction: 'maybe', note: 'Works on induction only if the base is flat.', replace: 600 },
  { id: 'copper-pot', label: 'Copper / brass pot', material: 'Copper', induction: false, replace: 1500 },
  { id: 'glass-kettle', label: 'Glass kettle', material: 'Borosilicate glass', induction: false, replace: 900 },
  { id: 'clay-handi', label: 'Clay handi', material: 'Clay', induction: false, replace: 500 },
  { id: 'nonstick-pan', label: 'Non-stick fry pan', material: 'Aluminium with coating', induction: 'maybe', note: 'Only induction-base models work.', replace: 1100 },
]);

export function utensilCheck(ids = []) {
  const picked = UTENSILS.filter((u) => ids.includes(u.id));
  const inductionNo = picked.filter((u) => u.induction === false);
  const inductionMaybe = picked.filter((u) => u.induction === 'maybe');
  return {
    picked: picked.length,
    aanchWorks: picked.length, // flat-bottom vessels of any material
    inductionWorks: picked.length - inductionNo.length - inductionMaybe.length,
    inductionNo: inductionNo.length,
    inductionMaybe: inductionMaybe.length,
    replaceCost: inductionNo.reduce((s, u) => s + u.replace, 0),
    replaceCostWorst: [...inductionNo, ...inductionMaybe].reduce((s, u) => s + u.replace, 0),
  };
}

/**
 * National picture: what happens to imported LPG when homes move part of their cooking to electricity.
 * Assumptions are explicit inputs and are printed next to the result on the page.
 */
export function nationalImpact(i = {}) {
  const homes = clamp(num(i.homes, 100000), 0, 3e8);
  const share = clamp(num(i.shareOnElectric, 0.5), 0, 1);
  const kgPerHomeYear = clamp(num(i.kgPerHomeYear, 100), 0, 1000); // about 7 cylinders a year
  const importShare = clamp(num(i.importShare, 0.6), 0, 1);
  const lpgTonnes = (homes * kgPerHomeYear * share) / 1000;
  const importedTonnes = lpgTonnes * importShare;
  return {
    homes,
    lpgTonnes,
    importedTonnes,
    ships: importedTonnes / PHYSICS.vlgcTonnes,
    cylinders: (homes * kgPerHomeYear * share) / 14.2,
  };
}

/** Rough electricity use for a given wattage and minutes. Glass cycles on and off, so 'full' is the worst case. */
export function unitsFor(watts = 2000, minutes = 60, duty = 1) {
  return (num(watts, 2000) / 1000) * (num(minutes, 60) / 60) * clamp(num(duty, 1), 0, 1);
}

const inr = typeof Intl !== 'undefined' ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }) : null;
export const fmtINR = (v) => '₹' + (inr ? inr.format(Math.round(v)) : Math.round(v));
export const fmtNum = (v, d = 0) =>
  typeof Intl !== 'undefined' ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: d }).format(v) : v.toFixed(d);
