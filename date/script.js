const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const error = $("#error");
const selectedDates = new Set();
const current = new Date();
const today = new Date(current.getFullYear(), current.getMonth(), current.getDate());

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric"
});

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full"
});

let monthOffset = 0;

const choice = name => $(`input[name="${name}"]:checked`)?.value || "";
const text = id => $(id).value.trim();

const dateKey = date => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");

function showStep(number) {
  error.textContent = "";

  document.body.dataset.theme = [
    "intro",
    "meal",
    "activity",
    "calendar"
  ][number];

  $("#intro").hidden = number !== 0;
  $("#progress").hidden = number === 0;

  $$(".step").forEach(step => {
    step.hidden = Number(step.dataset.step) !== number;
  });

  if (number) {
    $("#progress-label").textContent = `Étape ${number} sur 3`;
    $("#progress-bar").style.width = `${number / 3 * 100}%`;
  }

  if (number === 3) drawCalendar();
}

function swapButtons() {
  $("#swap-buttons").classList.toggle("swapped");
}

$("#no").addEventListener("pointerenter", event => {
  if (event.pointerType !== "touch") swapButtons();
});

$("#no").addEventListener("pointerdown", event => {
  if (event.pointerType === "touch") swapButtons();
});

$("#no").addEventListener("click", event => {
  if (event.detail === 0) swapButtons();
});

$("#yes").addEventListener("click", () => showStep(1));

const fields = {
  meal: {
    "Self cooking": "#cooking-field",
    Autre: "#meal-other-field"
  },
  activity: {
    Autre: "#activity-other-field"
  }
};

$("#date-form").addEventListener("change", event => {
  const group = event.target.name;
  if (!fields[group]) return;

  Object.entries(fields[group]).forEach(([value, selector]) => {
    $(selector).hidden = event.target.value !== value;
  });

  error.textContent = "";
});

function mealAnswer() {
  const meal = choice("meal");

  if (meal === "Self cooking") {
    const dish = text("#cooking-dish");
    return dish ? `Self cooking — plat : ${dish}` : "";
  }

  return meal === "Autre" ? text("#meal-other-text") : meal;
}

function activityAnswer() {
  const activity = choice("activity");

  return activity === "Autre"
    ? text("#activity-other-text")
    : activity;
}

$("#date-form").addEventListener("click", event => {
  const button = event.target.closest("[data-back], [data-next]");
  if (!button) return;

  if (button.dataset.back !== undefined) {
    showStep(Number(button.dataset.back));
    return;
  }

  const next = Number(button.dataset.next);

  if (next === 2 && !mealAnswer()) {
    error.textContent = choice("meal") === "Self cooking"
      ? "Précise le plat à cuisiner."
      : choice("meal") === "Autre"
        ? "Précise ton autre idée de repas."
        : "Choisis un repas.";
    return;
  }

  if (next === 3 && !activityAnswer()) {
    error.textContent = choice("activity") === "Autre"
      ? "Précise ton autre idée d’activité."
      : "Choisis une activité.";
    return;
  }

  showStep(next);
});

function drawCalendar() {
  const first = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1
  );

  const year = first.getFullYear();
  const month = first.getMonth();
  const grid = $("#calendar-grid");
  const fragment = document.createDocumentFragment();

  $("#month-title").textContent = monthFormatter.format(first);
  $("#previous").disabled = monthOffset === 0;
  $("#following").disabled = monthOffset === 11;

  for (const label of ["L", "M", "M", "J", "V", "S", "D"]) {
    const cell = document.createElement("span");
    cell.className = "weekday";
    cell.textContent = label;
    fragment.append(cell);
  }

  for (let i = 0; i < (first.getDay() + 6) % 7; i++) {
    fragment.append(document.createElement("span"));
  }

  const days = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= days; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const selected = selectedDates.has(key);
    const button = document.createElement("button");

    button.type = "button";
    button.className = selected ? "day selected" : "day";
    button.textContent = day;
    button.disabled = date < today;
    button.dataset.date = key;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", dayFormatter.format(date));

    fragment.append(button);
  }

  grid.replaceChildren(fragment);

  const count = selectedDates.size;

  $("#selected-count").textContent = count
    ? `${count} jour${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}.`
    : "Aucun jour sélectionné.";
}

$("#calendar-grid").addEventListener("click", event => {
  const button = event.target.closest("[data-date]");
  if (!button || button.disabled) return;

  const key = button.dataset.date;

  if (selectedDates.has(key)) {
    selectedDates.delete(key);
  } else if (selectedDates.size < 31) {
    selectedDates.add(key);
  } else {
    error.textContent = "Tu peux sélectionner 31 jours au maximum.";
    return;
  }

  error.textContent = "";
  drawCalendar();
});

$("#previous").addEventListener("click", () => {
  if (monthOffset > 0) {
    monthOffset--;
    drawCalendar();
  }
});

$("#following").addEventListener("click", () => {
  if (monthOffset < 11) {
    monthOffset++;
    drawCalendar();
  }
});

function getPublicIPv4() {
  return new Promise((resolve, reject) => {
    const callback = `ipCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let finished = false;

    function finish(ip) {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      script.remove();
      delete window[callback];

      ip ? resolve(ip) : reject(new Error("IPv4 indisponible"));
    }

    window[callback] = data => {
      const ip = data?.ip;
      const parts = typeof ip === "string" ? ip.split(".") : [];

      finish(
        parts.length === 4 && parts.every(part =>
          /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255
        )
          ? ip
          : null
      );
    };

    script.onerror = () => finish(null);

    const timeout = setTimeout(() => finish(null), 8000);

    script.referrerPolicy = "no-referrer";
    script.src = `https://api.ipify.org?format=jsonp&callback=${callback}`;

    document.head.append(script);
  });
}

function clean(value) {
  return value.trim()
    .replace(/[\r\n`*_~>|\\]/g, " ")
    .replace(/@/g, "＠");
}

$("#date-form").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("#send");
  if (button.disabled) return;

  const meal = mealAnswer();
  const activity = activityAnswer();

  if (!meal) {
    showStep(1);
    error.textContent = "Choisis un repas et précise ton choix si nécessaire.";
    return;
  }

  if (!activity) {
    showStep(2);
    error.textContent = "Choisis une activité et précise ton choix si nécessaire.";
    return;
  }

  if (!selectedDates.size) {
    showStep(3);
    error.textContent = "Sélectionne au moins un jour.";
    return;
  }

  button.disabled = true;
  button.textContent = "Envoi en cours…";
  error.textContent = "";

  try {
    const ipv4 = await getPublicIPv4();

    const content = [
      "💌 Nouvelle réponse pour le date !",
      `🍽️ Repas : ${clean(meal)}`,
      `🎲 Activité : ${clean(activity)}`,
      `📅 Disponibilités : ${[...selectedDates].sort().join(", ")}`,
      `🌐 IPv4 publique : ${ipv4}`
    ].join("\n");

    const body = new FormData();

    body.append("payload_json", JSON.stringify({
      content,
      allowed_mentions: { parse: [] }
    }));

    await fetch("https://discord.com/api/webhooks/1551530799587655761/UTj3OZKiwv6Wv40witcniviRISwvmLS4svaQMyf2au8kke3kTY9uNuOSnwtNYYK2u_Sx", {
      method: "POST",
      mode: "no-cors",
      referrerPolicy: "no-referrer",
      body
    });

    $$(".step").forEach(step => {
      step.hidden = true;
    });

    $("#progress").hidden = true;
    $("#finished").hidden = false;
  } catch {
    error.textContent = "IPv4 indisponible ou impossible de lancer l’envoi.";
  } finally {
    button.disabled = false;
    button.textContent = "Envoyer 💌";
  }
});
