(() => {
  "use strict";

  const G = 9.80665;
  const ATMOSPHERIC_PRESSURE_KPA = 101.325;

  const fluids = Object.freeze({
    water: Object.freeze({ name: "Water", temperature: "20°C", rho: 998.2, mu: 0.001002, vapourPressure: 2.34, gas: false }),
    seawater: Object.freeze({ name: "Seawater", temperature: "20°C", rho: 1025, mu: 0.00108, vapourPressure: 2.3, gas: false }),
    glycerin: Object.freeze({ name: "Glycerin", temperature: "20°C", rho: 1260, mu: 1.49, vapourPressure: 0.01, gas: false }),
    oil: Object.freeze({ name: "Hydraulic oil ISO VG 46", temperature: "40°C reference", rho: 860, mu: 0.0396, vapourPressure: 0.01, gas: false }),
    air: Object.freeze({ name: "Air", temperature: "20°C", rho: 1.204, mu: 0.0000181, vapourPressure: null, gas: true })
  });

  const defaults = Object.freeze({
    solveFor: "p2",
    fluid: "water",
    flow: 18,
    flowUnit: "m3h",
    d1: 100,
    d2: 70,
    z1: 0,
    z2: 6,
    p1: 150,
    p2: 120,
    pumpHead: 8,
    length: 35,
    roughness: 0.045,
    minorK: 2.2,
    autoAlpha: true,
    model: "real"
  });

  const state = {
    model: defaults.model,
    prediction: null,
    lastResult: null,
    hasRun: false
  };

  const $ = (id) => document.getElementById(id);
  const number = (id) => Number($(id).value);
  const setText = (id, value) => { const node = $(id); if (node) node.textContent = value; };

  function clamp(value, min, max) {
    return window.MPLabs?.clamp ? window.MPLabs.clamp(value, min, max) : Math.min(Math.max(value, min), max);
  }

  function format(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function formatRe(value) {
    if (!Number.isFinite(value)) return "—";
    if (value >= 1e7) return value.toExponential(2);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  }

  function toCubicMetresPerSecond(value, unit) {
    return unit === "ls" ? value / 1000 : value / 3600;
  }

  function flowRegime(reynolds) {
    if (reynolds < 2300) return "Laminar";
    if (reynolds <= 4000) return "Transitional";
    return "Turbulent";
  }

  function kineticCoefficient(reynolds, automatic) {
    if (!automatic) return 1;
    if (reynolds <= 2300) return 2;
    if (reynolds >= 4000) return 1;
    return 2 - (reynolds - 2300) / 1700;
  }

  function turbulentFrictionFactor(reynolds, relativeRoughness) {
    const argument = relativeRoughness / 3.7 + 5.74 / Math.pow(Math.max(reynolds, 1), 0.9);
    return 0.25 / Math.pow(Math.log10(argument), 2);
  }

  function frictionFactor(reynolds, roughnessMetres, diameterMetres) {
    if (!Number.isFinite(reynolds) || reynolds <= 0 || diameterMetres <= 0) return 0;
    if (reynolds <= 2300) return 64 / reynolds;
    const relativeRoughness = Math.max(roughnessMetres, 0) / diameterMetres;
    const turbulent = turbulentFrictionFactor(Math.max(reynolds, 4000), relativeRoughness);
    if (reynolds >= 4000) return turbulentFrictionFactor(reynolds, relativeRoughness);
    const laminarAt2300 = 64 / 2300;
    const fraction = (reynolds - 2300) / 1700;
    return laminarAt2300 + fraction * (turbulent - laminarAt2300);
  }

  function validateInputs(input) {
    const errors = [];
    if (!fluids[input.fluid]) errors.push("Select a valid fluid.");
    if (!Number.isFinite(input.flow) || input.flow < 0) errors.push("The flow rate must be zero or positive.");
    if (!Number.isFinite(input.d1) || input.d1 <= 0 || !Number.isFinite(input.d2) || input.d2 <= 0) errors.push("Both diameters must be greater than zero.");
    ["z1", "z2", "p1", "p2", "pumpHead", "length", "roughness", "minorK"].forEach((key) => {
      if (!Number.isFinite(input[key])) errors.push(`A valid value is required for ${key}.`);
    });
    if (input.length < 0 || input.roughness < 0 || input.minorK < 0) errors.push("Length, roughness and ΣK cannot be negative.");
    return errors;
  }

  function computeScenario(input) {
    const fluid = fluids[input.fluid];
    const q = toCubicMetresPerSecond(input.flow, input.flowUnit);
    const d1 = input.d1 / 1000;
    const d2 = input.d2 / 1000;
    const area1 = Math.PI * d1 * d1 / 4;
    const area2 = Math.PI * d2 * d2 / 4;
    const v1 = area1 > 0 ? q / area1 : NaN;
    const v2 = area2 > 0 ? q / area2 : NaN;
    const re1 = fluid.rho * v1 * d1 / fluid.mu;
    const re2 = fluid.rho * v2 * d2 / fluid.mu;
    const alpha1 = kineticCoefficient(re1, input.autoAlpha);
    const alpha2 = kineticCoefficient(re2, input.autoAlpha);
    const velocityHead1 = alpha1 * v1 * v1 / (2 * G);
    const velocityHead2 = alpha2 * v2 * v2 / (2 * G);
    const roughness = input.roughness / 1000;
    const f = frictionFactor(re2, roughness, d2);
    const hf = input.model === "real" && d2 > 0 ? f * (input.length / d2) * v2 * v2 / (2 * G) : 0;
    const hs = input.model === "real" ? input.minorK * v2 * v2 / (2 * G) : 0;
    const loss = hf + hs;
    const p1Head = input.p1 * 1000 / (fluid.rho * G);
    const suppliedWithoutPump = p1Head + velocityHead1 + input.z1;
    let p2 = input.p2;
    let pumpHead = input.pumpHead;

    if (input.solveFor === "p2") {
      const p2HeadSolved = suppliedWithoutPump + pumpHead - velocityHead2 - input.z2 - loss;
      p2 = p2HeadSolved * fluid.rho * G / 1000;
    } else {
      const targetP2Head = p2 * 1000 / (fluid.rho * G);
      pumpHead = targetP2Head + velocityHead2 + input.z2 + loss - suppliedWithoutPump;
    }

    const p2Head = p2 * 1000 / (fluid.rho * G);
    const lhs = p1Head + velocityHead1 + input.z1 + pumpHead;
    const rhs = p2Head + velocityHead2 + input.z2 + loss;
    const difference = lhs - rhs;
    const residual = Math.abs(difference) / Math.max(Math.abs(lhs), Math.abs(rhs), 1e-12) * 100;
    const massFlow = fluid.rho * q;
    const regime1 = flowRegime(re1);
    const regime2 = flowRegime(re2);
    const warnings = [];

    if (fluid.gas) warnings.push("Air is treated as incompressible. Keep velocities and pressure changes low for this model.");
    if (!fluid.gas && Math.max(v1, v2) > 3) warnings.push("Velocity exceeds 3 m/s, which is high for many liquid pipe systems.");
    if (regime2 === "Transitional") warnings.push("Section 2 is in the transitional Reynolds range; the friction factor is uncertain.");
    if (input.solveFor === "pump" && pumpHead < 0) warnings.push("The calculated pump head is negative: the upstream system already supplies excess energy.");
    const p2Absolute = p2 + ATMOSPHERIC_PRESSURE_KPA;
    if (!fluid.gas && fluid.vapourPressure !== null && p2Absolute <= fluid.vapourPressure) warnings.push("The calculated absolute outlet pressure is at or below the fluid vapour pressure; cavitation or phase change invalidates this simple model.");
    if (p2Absolute <= 0) warnings.push("The calculated absolute pressure is non-physical for this incompressible model.");

    return {
      ...input,
      fluidData: fluid,
      q, d1, d2, area1, area2, v1, v2, re1, re2, alpha1, alpha2,
      velocityHead1, velocityHead2, f, hf, hs, loss, p1Head, p2Head,
      p2, pumpHead, lhs, rhs, difference, residual, massFlow,
      regime1, regime2, p2Absolute, warnings
    };
  }

  function readInputs() {
    return {
      solveFor: $("solve-for").value,
      fluid: $("fluid-select").value,
      flow: number("flow-rate"),
      flowUnit: $("flow-unit").value,
      d1: number("diameter-1"),
      d2: number("diameter-2"),
      z1: number("elevation-1"),
      z2: number("elevation-2"),
      p1: number("pressure-1"),
      p2: number("pressure-2"),
      pumpHead: number("pump-head"),
      length: number("pipe-length"),
      roughness: number("roughness"),
      minorK: number("minor-k"),
      autoAlpha: $("auto-alpha").checked,
      model: state.model
    };
  }

  function updateFluidPreview() {
    const fluid = fluids[$("fluid-select").value];
    const viscosity = fluid.mu >= 0.01 ? `${format(fluid.mu, 4)} Pa·s` : `${format(fluid.mu * 1000, 3)} mPa·s`;
    setText("fluid-density", `${format(fluid.rho, fluid.rho < 10 ? 3 : 1)} kg/m³`);
    setText("fluid-viscosity", viscosity);
  }

  function updateConditionalControls() {
    const solvesPump = $("solve-for").value === "pump";
    $("pressure-2-control").hidden = !solvesPump;
    $("pump-head-control").hidden = solvesPump;
    if (!solvesPump) $("pump-head-control").classList.add("span-two");
  }

  function updateModelControls() {
    document.querySelectorAll("[data-model]").forEach((button) => button.classList.toggle("is-active", button.dataset.model === state.model));
    const advanced = document.querySelector(".advanced-controls");
    const ideal = state.model === "ideal";
    advanced.classList.toggle("is-disabled", ideal);
    setText("real-parameters-state", ideal ? "Excluded" : "Included");
  }

  function setSimulationState(type, label) {
    const node = $("simulation-state");
    node.className = `simulation-state ${type ? `is-${type}` : ""}`.trim();
    node.querySelector("span").textContent = label;
  }

  function markDirty() {
    if (!state.hasRun) return;
    setSimulationState("dirty", "Inputs changed — run again");
  }

  function renderPrediction(result, evaluate) {
    const correct = result.d2 < result.d1 ? "increase" : result.d2 > result.d1 ? "decrease" : "same";
    document.querySelectorAll("[data-prediction]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.prediction === state.prediction && !evaluate);
      button.classList.toggle("is-correct", evaluate && button.dataset.prediction === correct);
      button.classList.toggle("is-incorrect", evaluate && button.dataset.prediction === state.prediction && state.prediction !== correct);
    });
    const message = $("prediction-result");
    message.className = "prediction-result";
    if (!evaluate) {
      message.textContent = state.prediction ? "Prediction recorded. Run the simulation to check it." : "Choose before you simulate.";
      return;
    }
    if (!state.prediction) {
      message.textContent = `Result: V₂ ${correct === "increase" ? "increases" : correct === "decrease" ? "decreases" : "stays the same"}. Make a prediction before the next run.`;
      return;
    }
    const matched = state.prediction === correct;
    message.classList.add(matched ? "is-correct" : "is-incorrect");
    message.textContent = matched ? "Correct — continuity confirms your prediction." : "Not this time — use Q = AV to compare both sections.";
  }

  function renderSchematic(result) {
    const deltaZ = clamp(result.z2 - result.z1, -16, 16);
    const y1 = 245;
    const y2 = 245 - deltaZ * 5.2;
    const midY = (y1 + y2) / 2;
    const path = `M 110 ${y1} L 375 ${y1} C 414 ${y1} 424 ${y2} 463 ${y2} L 785 ${y2}`;
    ["pipe-path-metal", "pipe-path-fluid", "flow-dashes"].forEach((id) => $(id).setAttribute("d", path));
    const visualDiameter = clamp((result.d1 + result.d2) / 2, 30, 160);
    const metalWidth = 22 + (visualDiameter - 30) / 130 * 18;
    $("pipe-path-metal").setAttribute("stroke-width", format(metalWidth, 1));
    $("pipe-path-fluid").setAttribute("stroke-width", format(Math.max(metalWidth - 13, 7), 1));
    $("flow-dashes").style.animationDuration = `${clamp(1.7 / Math.max(result.v2, .15), .35, 2.5)}s`;

    const markerHeight1 = clamp(42 + result.d1 * .22, 52, 105);
    const markerHeight2 = clamp(42 + result.d2 * .22, 52, 105);
    $("section-one-line").setAttribute("y1", y1 - markerHeight1 / 2);
    $("section-one-line").setAttribute("y2", y1 + markerHeight1 / 2);
    $("section-one").querySelector("circle").setAttribute("cy", y1);
    $("section-one").querySelector("circle").setAttribute("r", clamp(14 + result.d1 * .04, 16, 24));
    $("section-one").querySelector("text.svg-section").setAttribute("y", y1 + 5);
    $("section-one").querySelector("text.svg-label").setAttribute("y", y1 - markerHeight1 / 2 - 26);
    $("svg-d1").setAttribute("y", y1 - markerHeight1 / 2 - 12);

    $("section-two-line").setAttribute("y1", y2 - markerHeight2 / 2);
    $("section-two-line").setAttribute("y2", y2 + markerHeight2 / 2);
    $("section-two-circle").setAttribute("cy", y2);
    $("section-two-circle").setAttribute("r", clamp(14 + result.d2 * .04, 16, 24));
    $("section-two-number").setAttribute("y", y2 + 5);
    $("section-two-label").setAttribute("y", y2 - markerHeight2 / 2 - 26);
    $("svg-d2").setAttribute("y", y2 - markerHeight2 / 2 - 12);

    $("gauge-two").setAttribute("transform", `translate(655 ${y2 - 83})`);
    $("pump-graphic").setAttribute("transform", `translate(420 ${midY})`);
    $("z2-guide").setAttribute("y1", y2);
    $("z2-arrow").setAttribute("d", `M 834 ${y2 + 6} L 840 ${y2 - 2} L 846 ${y2 + 6} M 834 320 L 840 328 L 846 320`);
    $("svg-z2").setAttribute("y", (y2 + 326) / 2 + 4);
    $("v2-arrow-line").setAttribute("d", `M 678 ${y2 + 57} L 743 ${y2 + 57}`);
    $("v2-arrow-head").setAttribute("d", `M 736 ${y2 + 51} L 746 ${y2 + 57} L 736 ${y2 + 63}`);
    $("svg-v2").setAttribute("y", y2 + 76);

    setText("svg-d1", `D₁ = ${format(result.d1, 0)} mm`);
    setText("svg-d2", `D₂ = ${format(result.d2, 0)} mm`);
    setText("svg-p1", `p₁ = ${format(result.p1, 1)} kPa(g)`);
    setText("svg-p2", `p₂ = ${format(result.p2, 1)} kPa(g)`);
    setText("svg-hp", `Hₚ = ${format(result.pumpHead, 2)} m`);
    setText("svg-z1", `z₁ = ${format(result.z1, 1)} m`);
    setText("svg-z2", `z₂ = ${format(result.z2, 1)} m`);
    setText("svg-v1", `V₁ = ${format(result.v1, 2)} m/s`);
    setText("svg-v2", `V₂ = ${format(result.v2, 2)} m/s`);

    const needleAngle = clamp((result.p2 + 100) / 400 * 100 - 50, -50, 50);
    $("gauge-two-needle").setAttribute("transform", `rotate(${needleAngle} 0 22)`);
  }

  function renderResults(result) {
    const solvesP2 = result.solveFor === "p2";
    setText("primary-result-label", solvesP2 ? "Calculated outlet pressure" : "Required pump head");
    $("primary-result").innerHTML = solvesP2
      ? `${format(result.p2, 1)} <b>kPa(g)</b>`
      : `${format(result.pumpHead, 2)} <b>m</b>`;
    setText("primary-result-note", solvesP2 ? "From the extended energy balance" : result.pumpHead >= 0 ? "Energy the pump must supply" : "Negative: excess upstream energy");
    setText("result-v1", format(result.v1, 2));
    setText("result-v2", format(result.v2, 2));
    setText("result-re2", formatRe(result.re2));
    setText("result-regime", `${result.regime2} flow · α₂ = ${format(result.alpha2, 2)}`);
    setText("result-loss", format(result.loss, 2));
    setText("result-hf", format(result.hf, 2));
    setText("result-hs", format(result.hs, 2));
    setText("result-mass", format(result.massFlow, result.massFlow < 1 ? 3 : 2));
    setText("result-friction", result.model === "ideal" ? "—" : format(result.f, 4));
    setText("result-friction-note", result.model === "ideal" ? "Excluded by ideal model" : result.regime2 === "Laminar" ? "f = 64/Re" : result.regime2 === "Turbulent" ? "Swamee–Jain correlation" : "Transition interpolation");
    const muDisplay = result.fluidData.mu >= .01 ? `${format(result.fluidData.mu, 4)} Pa·s` : `${format(result.fluidData.mu * 1000, 3)} mPa·s`;
    setText("fluid-properties-inline", `${result.fluidData.name} · ρ = ${format(result.fluidData.rho, result.fluidData.rho < 10 ? 3 : 1)} kg/m³ · μ = ${muDisplay}`);
  }

  function renderBalance(result) {
    const termValues = {
      "term-p1": result.p1Head,
      "term-v1": result.velocityHead1,
      "term-z1": result.z1,
      "term-hp": result.pumpHead,
      "term-p2": result.p2Head,
      "term-v2": result.velocityHead2,
      "term-z2": result.z2,
      "term-loss": result.loss
    };
    Object.entries(termValues).forEach(([id, value]) => setText(id, `${format(value, 3)} m`));
    ["lhs-total-top", "lhs-total", "lhs-energy-label"].forEach((id) => setText(id, `${format(result.lhs, 3)} m`));
    ["rhs-total-top", "rhs-total", "rhs-energy-label"].forEach((id) => setText(id, `${format(result.rhs, 3)} m`));
    setText("balance-difference", `Δ = ${format(result.difference, 8)} m`);
    setText("residual-value", `${format(result.residual, 6)}%`);
    const valid = result.residual < 0.001;
    $("residual-badge").classList.toggle("is-valid", valid);
    $("residual-badge").classList.toggle("is-warning", !valid);
    setText("residual-status", valid ? "BALANCED" : "CHECK INPUTS");
    const scale = Math.max(Math.abs(result.lhs), Math.abs(result.rhs), 1);
    $("lhs-energy-bar").style.width = `${clamp(Math.abs(result.lhs) / scale * 100, 0, 100)}%`;
    $("rhs-energy-bar").style.width = `${clamp(Math.abs(result.rhs) / scale * 100, 0, 100)}%`;
  }

  function renderValidity(result) {
    const gasWarning = result.fluidData.gas;
    const incompressible = $("incompressible-assumption");
    incompressible.classList.toggle("is-warning", gasWarning);
    incompressible.querySelector("span").textContent = gasWarning ? "!" : "✓";
    setText("incompressible-note", gasWarning ? "Air is approximated as incompressible; avoid large pressure changes." : "Suitable for the selected liquid at the stated temperature.");

    const validity = $("validity-assumption");
    validity.classList.toggle("is-warning", result.warnings.length > 0);
    validity.querySelector("span").textContent = result.warnings.length ? "!" : "✓";
    setText("validity-title", result.warnings.length ? "Review model validity" : "Inputs within model range");
    setText("validity-note", result.warnings.length ? result.warnings.join(" ") : "No immediate validity warning detected.");

    const warning = $("input-warning");
    if (result.warnings.length) {
      warning.hidden = false;
      warning.textContent = result.warnings.join(" ");
    } else {
      warning.hidden = true;
      warning.textContent = "";
    }
  }

  function render(result, evaluatePrediction = false) {
    state.lastResult = result;
    renderSchematic(result);
    renderResults(result);
    renderBalance(result);
    renderValidity(result);
    renderPrediction(result, evaluatePrediction);
  }

  function runSimulation({ animate = true, evaluatePrediction = true } = {}) {
    const input = readInputs();
    const errors = validateInputs(input);
    if (errors.length) {
      const warning = $("input-warning");
      warning.hidden = false;
      warning.textContent = errors.join(" ");
      setSimulationState("dirty", "Correct invalid inputs");
      return null;
    }

    const finish = () => {
      const result = computeScenario(input);
      render(result, evaluatePrediction);
      state.hasRun = true;
      setSimulationState("complete", "Simulation complete · equation balanced");
      $("run-simulation").classList.remove("is-running");
      $("run-simulation").disabled = false;
      return result;
    };

    if (!animate) return finish();
    setSimulationState("running", "Solving the energy equation…");
    $("run-simulation").classList.add("is-running");
    $("run-simulation").disabled = true;
    window.setTimeout(finish, 320);
    return null;
  }

  function applyDefaults() {
    $("solve-for").value = defaults.solveFor;
    $("fluid-select").value = defaults.fluid;
    $("flow-rate").value = defaults.flow;
    $("flow-unit").value = defaults.flowUnit;
    $("diameter-1").value = defaults.d1;
    $("diameter-2").value = defaults.d2;
    $("elevation-1").value = defaults.z1;
    $("elevation-2").value = defaults.z2;
    $("pressure-1").value = defaults.p1;
    $("pressure-2").value = defaults.p2;
    $("pump-head").value = defaults.pumpHead;
    $("pipe-length").value = defaults.length;
    $("roughness").value = defaults.roughness;
    $("minor-k").value = defaults.minorK;
    $("auto-alpha").checked = defaults.autoAlpha;
    state.model = defaults.model;
    state.prediction = null;
    state.hasRun = false;
    updateConditionalControls();
    updateModelControls();
    updateFluidPreview();
    document.querySelectorAll("[data-prediction]").forEach((button) => button.className = "");
    setSimulationState("", "Ready to simulate");
    runSimulation({ animate: false, evaluatePrediction: false });
    state.hasRun = false;
    setSimulationState("", "Ready to simulate");
  }

  function bindEvents() {
    document.querySelectorAll("[data-model]").forEach((button) => {
      button.addEventListener("click", () => {
        state.model = button.dataset.model;
        updateModelControls();
        markDirty();
      });
    });

    document.querySelectorAll("[data-prediction]").forEach((button) => {
      button.addEventListener("click", () => {
        state.prediction = button.dataset.prediction;
        renderPrediction(state.lastResult || computeScenario(readInputs()), false);
      });
    });

    $("solve-for").addEventListener("change", () => { updateConditionalControls(); markDirty(); });
    $("fluid-select").addEventListener("change", () => { updateFluidPreview(); markDirty(); });
    document.querySelectorAll(".configuration-panel input, .configuration-panel select").forEach((control) => {
      control.addEventListener("input", markDirty);
      control.addEventListener("change", markDirty);
    });
    $("run-simulation").addEventListener("click", () => runSimulation());
    $("reset-lab").addEventListener("click", applyDefaults);
  }

  window.BernoulliLabEngine = Object.freeze({
    fluids,
    defaults,
    computeScenario,
    frictionFactor,
    kineticCoefficient,
    flowRegime
  });

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    applyDefaults();
  });
})();
