(() => {
  "use strict";

  const MP = {
    clamp(value, min, max) {
      return Math.min(Math.max(Number(value), min), max);
    },

    format(value, digits = 2) {
      return new Intl.NumberFormat("en", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(Number(value));
    },

    flowRegime(reynoldsNumber) {
      const re = Number(reynoldsNumber);
      if (re < 2300) return "Laminar";
      if (re <= 4000) return "Transitional";
      return "Turbulent";
    },

    residual(leftSide, rightSide) {
      const reference = Math.max(Math.abs(Number(leftSide)), Math.abs(Number(rightSide)), 1e-12);
      return Math.abs(Number(leftSide) - Number(rightSide)) / reference * 100;
    }
  };

  window.MPLabs = Object.freeze(MP);

  const tabs = [...document.querySelectorAll("[data-discipline]")];
  const panels = [...document.querySelectorAll("[data-panel]")];

  function activateDiscipline(name, focusTab = false) {
    tabs.forEach((tab) => {
      const active = tab.dataset.discipline === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    });

    panels.forEach((panel) => {
      const active = panel.dataset.panel === name;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateDiscipline(tab.dataset.discipline));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      activateDiscipline(tabs[nextIndex].dataset.discipline, true);
    });
  });
})();
