const form = document.querySelector(".sorter-form");
const formPanel = document.querySelector(".sorter-panel--form");
const resultPanel = document.querySelector(".sorter-panel--result");
const resultValues = document.querySelector(".result-values");
const resultAttempt = document.querySelector(".result-attempt");
const feedback = document.querySelector(".form-feedback");
const rerollButton = document.querySelector(".sorter-button--reroll");
const backButton = document.querySelector(".result-back");
const submitButton = form.querySelector(".sorter-button");

const quantityInput = document.querySelector("#quantity");
const fromInput = document.querySelector("#from");
const toInput = document.querySelector("#to");
const uniqueInput = form.querySelector('input[name="unique"]');

const MAX_QUANTITY = 4;
const RESULT_REVEAL_DELAY = 80;
const RESULT_STAGE_DURATION = 1080;
const RESULT_SEQUENCE_GAP = 140;
const RESULT_HISTORY_LEAD = 140;
const RESULT_HISTORY_SETTLE = 80;

let drawCount = 0;
let lastSettings = null;
let revealTimers = [];

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const settings = getValidatedSettings();

  if (!settings) {
    return;
  }

  lastSettings = settings;
  drawCount += 1;
  runDraw(settings);
});

rerollButton.addEventListener("click", () => {
  if (!lastSettings) {
    return;
  }

  drawCount += 1;
  runDraw(lastSettings);
});

backButton.addEventListener("click", () => {
  showFormState();
});

[quantityInput, fromInput, toInput, uniqueInput].forEach((field) => {
  field.addEventListener("input", clearFeedback);
  field.addEventListener("change", clearFeedback);
});

quantityInput.addEventListener("input", () => {
  const quantity = Number(quantityInput.value);

  if (Number.isInteger(quantity) && quantity > MAX_QUANTITY) {
    quantityInput.value = String(MAX_QUANTITY);
  }
});

function getValidatedSettings() {
  const quantity = Number(quantityInput.value);
  const min = Number(fromInput.value);
  const max = Number(toInput.value);
  const unique = uniqueInput.checked;

  if (!Number.isInteger(quantity) || quantity < 1) {
    showFeedback("Informe uma quantidade valida de numeros.", quantityInput);
    return null;
  }

  if (quantity > MAX_QUANTITY) {
    showFeedback(
      `Voce pode sortear no maximo ${MAX_QUANTITY} numeros por vez.`,
      quantityInput,
    );
    return null;
  }

  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    showFeedback("Preencha um intervalo valido para o sorteio.", fromInput);
    return null;
  }

  if (min > max) {
    showFeedback(
      'O valor inicial nao pode ser maior que o valor "ate".',
      fromInput,
    );
    return null;
  }

  const rangeSize = max - min + 1;

  if (unique && quantity > rangeSize) {
    showFeedback(
      "Nao e possivel sortear essa quantidade sem repetir numeros nesse intervalo.",
      quantityInput,
    );
    return null;
  }

  clearFeedback();

  return {
    quantity,
    min,
    max,
    unique,
  };
}

function runDraw(settings) {
  submitButton.disabled = true;
  rerollButton.disabled = true;

  const numbers = generateNumbers(settings);

  showResultState();
  renderResults(numbers, drawCount);
}

function generateNumbers({ quantity, min, max, unique }) {
  if (!unique) {
    return Array.from({ length: quantity }, () => randomInteger(min, max));
  }

  const selected = new Set();

  while (selected.size < quantity) {
    selected.add(randomInteger(min, max));
  }

  return Array.from(selected);
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showResultState() {
  formPanel.hidden = true;
  resultPanel.hidden = false;
}

function showFormState() {
  clearRevealTimers();
  formPanel.hidden = false;
  resultPanel.hidden = true;
  resultValues.classList.remove("is-staging");
  submitButton.disabled = false;
  rerollButton.disabled = false;
  clearFeedback();
  quantityInput.focus();
}

function renderResults(numbers, attempt) {
  clearRevealTimers();
  resultValues.innerHTML = "";
  resultValues.classList.remove("is-staging");
  resultAttempt.textContent = `${attempt}º RESULTADO`;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const track = document.createElement("div");
  const history = document.createElement("div");
  const stage = document.createElement("div");
  const scene = document.createElement("div");
  const chip = document.createElement("span");
  const stageNumber = document.createElement("span");

  track.className = "result-track";
  history.className = "result-history";
  stage.className = "result-stage";
  scene.className = "result-stage__scene";
  chip.className = "result-stage__chip";
  stageNumber.className = "result-stage__number";

  scene.append(chip, stageNumber);
  stage.append(scene);
  track.append(history, stage);
  resultValues.append(track);

  if (prefersReducedMotion) {
    numbers.forEach((number) => {
      history.appendChild(createHistoryValue(number));
    });

    submitButton.disabled = false;
    rerollButton.disabled = false;
    return;
  }

  numbers.forEach((number, index) => {
    const isLastNumber = index === numbers.length - 1;
    const startAt =
      RESULT_REVEAL_DELAY +
      index * (RESULT_STAGE_DURATION + RESULT_SEQUENCE_GAP);

    revealTimers.push(
      window.setTimeout(() => {
        resultValues.classList.add("is-staging");
        playStageNumber(
          stage,
          stageNumber,
          number,
          history.childElementCount === 0,
        );
      }, startAt),
    );

    revealTimers.push(
      window.setTimeout(
        () => {
          history.appendChild(createHistoryValue(number, true));
        },
        startAt + RESULT_STAGE_DURATION - RESULT_HISTORY_LEAD,
      ),
    );

    if (isLastNumber) {
      revealTimers.push(
        window.setTimeout(
          () => {
            stage.classList.remove("is-active");
            resultValues.classList.remove("is-staging");
          },
          startAt + RESULT_STAGE_DURATION + RESULT_HISTORY_SETTLE,
        ),
      );
    }
  });

  const unlockTimer = window.setTimeout(
    () => {
      submitButton.disabled = false;
      rerollButton.disabled = false;
    },
    RESULT_REVEAL_DELAY +
      numbers.length * RESULT_STAGE_DURATION +
      Math.max(numbers.length - 1, 0) * RESULT_SEQUENCE_GAP +
      RESULT_HISTORY_SETTLE,
  );

  revealTimers.push(unlockTimer);
}

function playStageNumber(stage, stageNumber, number, isSolo) {
  stage.classList.remove("is-active");
  stage.classList.toggle("is-solo", isSolo);
  void stage.offsetWidth;
  stageNumber.textContent = String(number);
  stage.classList.add("is-active");
}

function createHistoryValue(number, animate = false) {
  const value = document.createElement("span");

  value.className = "result-history__value";
  value.textContent = String(number);

  if (animate) {
    window.requestAnimationFrame(() => {
      value.classList.add("is-visible");
    });
  } else {
    value.classList.add("is-visible");
  }

  return value;
}

function clearRevealTimers() {
  revealTimers.forEach((timer) => window.clearTimeout(timer));
  revealTimers = [];
}

function showFeedback(message, fieldToFocus) {
  feedback.textContent = message;

  if (fieldToFocus) {
    fieldToFocus.focus();
    fieldToFocus.select?.();
  }
}

function clearFeedback() {
  feedback.textContent = "";
}
