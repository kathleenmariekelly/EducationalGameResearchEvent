const METHODS = {
  'Logistic Regression': {
    use: 'Classifies labeled examples with a mostly linear decision boundary.',
    tags: ['supervised', 'classification', 'linear baseline']
  },
  'Linear Regression': {
    use: 'Predicts continuous numeric values with a mostly linear relationship.',
    tags: ['supervised', 'regression', 'linear baseline']
  },
  'Decision Tree': {
    use: 'Splits features into readable rules for classification or regression.',
    tags: ['supervised', 'classification/regression', 'interpretable rules']
  },
  'Random Forest': {
    use: 'Combines many trees for classification or regression.',
    tags: ['supervised', 'classification/regression', 'nonlinear tabular']
  },
  'k-NN': {
    use: 'Predicts from nearby/similar examples.',
    tags: ['supervised', 'classification/regression', 'similarity-based']
  },
  'k-Means': {
    use: 'Finds clusters in unlabeled data by grouping similar examples.',
    tags: ['unsupervised', 'clustering', 'similarity-based']
  },
  'PCA': {
    use: 'Compresses correlated high-dimensional features into fewer components.',
    tags: ['unsupervised', 'dimensionality reduction', 'compression']
  }
};

const SELECT_OPTIONS = {
  data: ['labeled examples', 'no labels', 'no target label'],
  target: ['known category output', 'numeric output', 'discover unknown groups', 'compress many features'],
  pattern: ['nonlinear tabular signals', 'similarity between examples', 'correlated high-dimensional features', 'linear numeric trend']
};

let roundIndex = 0;
let score = 0;
let integrity = 100;
let selectedModule = null;
let committed = false;
let probedModules = new Set();
let probeLog = [];
let dialIndexes = { data: -1, target: -1, pattern: -1 };

const els = {
  roundLabel: document.querySelector('#roundLabel'),
  scoreLabel: document.querySelector('#scoreLabel'),
  integrityLabel: document.querySelector('#integrityLabel'),
  integrityFill: document.querySelector('#integrityFill'),
  machineName: document.querySelector('#machineName'),
  machineSymptom: document.querySelector('#machineSymptom'),
  robotCore: document.querySelector('#robotCore'),
  dataDial: document.querySelector('#dataDial'),
  targetDial: document.querySelector('#targetDial'),
  patternDial: document.querySelector('#patternDial'),
  diagnosticReadout: document.querySelector('#diagnosticReadout'),
  moduleGrid: document.querySelector('#moduleGrid'),
  analysisText: document.querySelector('#analysisText'),
  probeButton: document.querySelector('#probeButton'),
  testButton: document.querySelector('#testButton'),
  nextButton: document.querySelector('#nextButton')
};

function scenario() {
  return window.SCENARIOS[roundIndex];
}

function currentDiagnosis() {
  return {
    data: dialIndexes.data >= 0 ? SELECT_OPTIONS.data[dialIndexes.data] : '',
    target: dialIndexes.target >= 0 ? SELECT_OPTIONS.target[dialIndexes.target] : '',
    pattern: dialIndexes.pattern >= 0 ? SELECT_OPTIONS.pattern[dialIndexes.pattern] : ''
  };
}

function loadRound() {
  selectedModule = null;
  committed = false;
  integrity = 100;
  probedModules = new Set();
  probeLog = [];
  dialIndexes = { data: -1, target: -1, pattern: -1 };

  const s = scenario();
  els.roundLabel.textContent = `Machine ${roundIndex + 1}/${window.SCENARIOS.length}`;
  els.scoreLabel.textContent = `Score: ${score}`;
  updateIntegrityLabel();
  els.machineName.textContent = s.name;
  els.machineSymptom.textContent = s.symptom;
  els.analysisText.textContent = 'Build a diagnosis, select a module, then decide: probe for more evidence and damage the machine, or commit if you are confident.';
  els.probeButton.classList.remove('hidden');
  els.testButton.classList.remove('hidden');
  els.nextButton.classList.add('hidden');

  renderDials();
  updateReadoutAndModules();
}

function labelEvidence(option) {
  const icons = {
    'labeled examples': '📚 labeled examples',
    'no labels': '🧭 no labels',
    'no target label': '🧭 no target label',
    'known category output': '🎯 category output',
    'numeric output': '🎯 numeric output',
    'discover unknown groups': '🎯 discover groups',
    'compress many features': '🎯 compress features',
    'nonlinear tabular signals': '〰️ nonlinear tabular',
    'similarity between examples': '〰️ similarity-based',
    'correlated high-dimensional features': '〰️ high-dimensional/correlated',
    'linear numeric trend': '〰️ linear trend'
  };
  return icons[option] || option;
}

document.querySelectorAll('.dial-row').forEach(row => {
  row.addEventListener('click', event => {
    if (committed) return;
    const slot = row.dataset.slot;
    const options = SELECT_OPTIONS[slot];

    if (event.target.classList.contains('dial-value')) {
      dialIndexes[slot] = dialIndexes[slot] < 0 ? 0 : -1;
    }

    if (event.target.classList.contains('dial-btn')) {
      const dir = Number(event.target.dataset.dir);
      if (dialIndexes[slot] < 0) dialIndexes[slot] = dir > 0 ? 0 : options.length - 1;
      else dialIndexes[slot] = (dialIndexes[slot] + dir + options.length) % options.length;
    }

    playTone('tick');
    renderDials();
    updateReadoutAndModules();
  });
});

function renderDials() {
  ['data', 'target', 'pattern'].forEach(slot => {
    const dial = els[`${slot}Dial`];
    const value = dialIndexes[slot] >= 0 ? SELECT_OPTIONS[slot][dialIndexes[slot]] : '';
    dial.textContent = value ? labelEvidence(value) : 'unset';
    dial.classList.toggle('unset', !value);
    dial.classList.toggle('tag-supervised', value === 'labeled examples');
    dial.classList.toggle('tag-unsupervised', value === 'no labels' || value === 'no target label');
    dial.classList.toggle('tag-output', slot === 'target' && Boolean(value));
    dial.classList.toggle('tag-pattern', slot === 'pattern' && Boolean(value));
    if (!committed) dial.classList.remove('dial-correct', 'dial-wrong');
  });
}

function inferTask(diagnosis) {
  if (diagnosis.target === 'known category output') return 'Classification';
  if (diagnosis.target === 'numeric output') return 'Regression';
  if (diagnosis.target === 'discover unknown groups') return 'Clustering';
  if (diagnosis.target === 'compress many features') return 'Dimensionality Reduction';
  return 'unclear';
}

function updateReadoutAndModules() {
  const diagnosis = currentDiagnosis();
  const inferredTask = inferTask(diagnosis);

  els.diagnosticReadout.innerHTML = `
    <p><strong>Task implied by your diagnosis:</strong> ${inferredTask}</p>
    <p>${explainDiagnosis(diagnosis, inferredTask)}</p>
    ${dataHintBlock(diagnosis.data)}
    ${targetHintBlock(diagnosis.target)}
    ${patternHintBlock(diagnosis.pattern)}
  `;
  renderModules();
}

function explainDiagnosis(diagnosis, inferredTask) {
  if (!diagnosis.data || !diagnosis.target || !diagnosis.pattern) {
    return 'Tune all three dials. Data + goal identify the task; pattern helps choose the model.';
  }

  let text = '';
  if (inferredTask === 'Classification') text = 'Category target → classification.';
  else if (inferredTask === 'Regression') text = 'Numeric target → regression.';
  else if (inferredTask === 'Clustering') text = 'Unknown groups → clustering.';
  else if (inferredTask === 'Dimensionality Reduction') text = 'Compress features → dimensionality reduction.';
  else text = 'Goal is unclear.';

  if (diagnosis.data === 'labeled examples') text += ' Labeled data supports supervised models.';
  if (diagnosis.data === 'no labels') text += ' No labels supports unsupervised discovery.';
  if (diagnosis.data === 'no target label') text += ' No target supports representation/compression.';
  return text;
}

function dataHintBlock(data) {
  if (!data) return '';
  const hint = dataHint(data);
  return makeHintBox('Why does this data signal matter?', hint);
}

function targetHintBlock(target) {
  if (!target) return '';
  const hint = targetHint(target);
  return makeHintBox('Why does this target/goal matter?', hint);
}

function patternHintBlock(pattern) {
  if (!pattern) return '';
  const hint = patternHint(pattern);
  return makeHintBox('Why does this pattern clue matter?', hint);
}

function makeHintBox(summary, hint) {
  return `
    <details class="hint-box">
      <summary>${summary}</summary>
      <div class="hint-short">${hint.short}</div>
      <details class="deeper-hint">
        <summary>Explain further</summary>
        <div>${hint.deep}</div>
      </details>
    </details>
  `;
}

function dataHint(data) {
  const hints = {
    'labeled examples': {
      short: 'Labels mean the machine has examples with known answers, so supervised models become possible.',
      deep: 'A label is the answer attached to each training example: failed/not failed, digit 0-9, price, category, etc. If labels exist, the repair can learn a mapping from inputs to known outputs.'
    },
    'no labels': {
      short: 'No labels means there are no known answers to predict, so grouping/discovery methods become more likely.',
      deep: 'Without labels, supervised models do not know what answer they are supposed to imitate. The repair usually shifts toward finding structure, such as clusters of similar examples.'
    },
    'no target label': {
      short: 'No target label means the goal is probably representation or preprocessing, not direct prediction.',
      deep: 'Sometimes the data has features but no answer column at all. Then the useful move may be compressing, cleaning, or transforming the data before another model uses it.'
    }
  };
  return hints[data] || { short: 'The data signal tells you whether the problem has known answers.', deep: 'Known answers point toward supervised learning; absent answers point toward unsupervised or representation methods.' };
}

function targetHint(target) {
  const hints = {
    'known category output': {
      short: 'A category output means classification: choose one class from a set of labels.',
      deep: 'Examples include spam/not spam, fragile/refrigerated/hazardous, or digit 0-9. The model output is a class name, not a measured number.'
    },
    'numeric output': {
      short: 'A numeric output means regression: predict a continuous value.',
      deep: 'Examples include price, temperature, demand, energy output, or time to failure. The model is judged by how close its number is to the true number.'
    },
    'discover unknown groups': {
      short: 'Unknown groups mean clustering: find structure without pre-existing labels.',
      deep: 'The machine is not asking “which known label is this?” It is asking “what natural groups seem to exist?” That changes the method family.'
    },
    'compress many features': {
      short: 'Compression means dimensionality reduction: make many features into fewer useful signals.',
      deep: 'The output is not a prediction about the world. It is a transformed representation of the input data, often used before visualization or another model.'
    }
  };
  return hints[target] || { short: 'The target/goal usually determines the task type.', deep: 'First identify what the machine is trying to produce: a class, a number, groups, or compressed features.' };
}

function patternHint(pattern) {
  const hints = {
    'linear numeric trend': {
      short: 'Linear trend favors simpler linear models when the target matches: Linear Regression for numbers, Logistic Regression for categories.',
      deep: '“Linear” means changes in features push the output in a mostly steady direction. Linear models are fast and useful baselines, but they miss curved boundaries or complex feature interactions.'
    },
    'nonlinear tabular signals': {
      short: 'Nonlinear tabular signals favor tree-based models, especially Random Forest, because feature interactions may matter.',
      deep: 'Tabular data means rows/columns like sensor readings or item attributes. Nonlinear means no single straight-line rule explains the output. Random Forest tests many feature splits and combines trees, so it often handles interactions better than one linear model.'
    },
    'similarity between examples': {
      short: 'Similarity clues favor k-NN for labeled prediction or k-Means for unlabeled grouping.',
      deep: 'If the important idea is “things like this behave like other nearby things,” distance matters. k-NN uses nearby labeled examples to predict. k-Means uses similarity to form groups when there are no labels.'
    },
    'correlated high-dimensional features': {
      short: 'Many correlated features point toward PCA because the repair needs compression, not prediction.',
      deep: 'High-dimensional means many input features. Correlated means several features carry overlapping information. PCA rotates/compresses those features into fewer components that preserve much of the variation.'
    }
  };
  return hints[pattern] || { short: 'Pattern clues help choose between methods after the task type is known.', deep: 'First identify the task from the target/goal. Then use pattern clues to choose which method behavior best fits the data.' };
}

function tagClass(tag) {
  if (tag === 'supervised') return 'tag-supervised';
  if (tag === 'unsupervised') return 'tag-unsupervised';
  if (tag.includes('classification') || tag.includes('regression') || tag === 'clustering' || tag === 'dimensionality reduction') return 'tag-output';
  if (tag.includes('nonlinear') || tag.includes('similarity') || tag.includes('linear')) return 'tag-pattern';
  return 'tag-shape';
}

function tagIcon(tag) {
  if (tag === 'supervised') return '📚';
  if (tag === 'unsupervised') return '🧭';
  if (tag.includes('classification') || tag.includes('regression') || tag === 'clustering' || tag === 'dimensionality reduction') return '🎯';
  if (tag.includes('nonlinear') || tag.includes('similarity') || tag.includes('linear')) return '〰️';
  return '🧩';
}

function tagHint(tag) {
  const hints = {
    supervised: 'Uses examples with known answers/labels.',
    unsupervised: 'Looks for structure when answers/labels are not provided.',
    classification: 'Predicts a category or class.',
    regression: 'Predicts a continuous number.',
    'classification/regression': 'Can predict categories or numbers depending on setup.',
    clustering: 'Discovers groups without known labels.',
    'dimensionality reduction': 'Compresses features into a smaller representation.',
    'linear baseline': 'Assumes a simpler straight-line style relationship.',
    'nonlinear tabular': 'Handles interactions in table-like feature data.',
    'similarity-based': 'Uses nearby/similar examples.',
    'interpretable rules': 'Creates human-readable feature splits.',
    compression: 'Reduces many features into fewer signals.'
  };
  return hints[tag] || tag;
}

function renderModules() {
  els.moduleGrid.innerHTML = '';
  Object.entries(METHODS).forEach(([name, info]) => {
    const card = document.createElement('div');
    card.className = 'module';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', selectedModule === name ? 'true' : 'false');
    if (selectedModule === name) card.classList.add('selected');
    if (probedModules.has(name)) card.classList.add('probed');
    card.innerHTML = `
      <span class="module-name">${name}${probedModules.has(name) ? ' · probed' : ''}</span>
      <span class="module-use">${info.use}</span>
      <span class="tag-row">${info.tags.map(tag => `<span class="module-tag ${tagClass(tag)}" title="${tagHint(tag)}">${tagIcon(tag)} ${tag}</span>`).join('')}</span>
      <details class="hint-box compact module-help">
        <summary>How does this module behave?</summary>
        <div class="hint-short">${moduleShortTip(name)}</div>
        <details class="deeper-hint">
          <summary>Explain further</summary>
          <div>${moduleDeepTip(name)}</div>
        </details>
      </details>
    `;

    const selectCard = () => {
      if (committed) return;
      selectedModule = selectedModule === name ? null : name;
      playTone(selectedModule ? 'select' : 'tick');
      renderModules();
    };

    card.addEventListener('click', event => {
      if (event.target.closest('details')) return;
      selectCard();
    });
    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.closest('details')) return;
      event.preventDefault();
      selectCard();
    });
    els.moduleGrid.appendChild(card);
  });
}

els.probeButton.addEventListener('click', () => {
  if (committed) return;
  const diagnosis = currentDiagnosis();
  if (!diagnosis.data || !diagnosis.target || !diagnosis.pattern || !selectedModule) {
    els.analysisText.textContent = 'To probe safely, first complete the diagnosis and select a module.';
    return;
  }
  probeSelectedModule();
});

els.testButton.addEventListener('click', () => {
  const diagnosis = currentDiagnosis();
  if (!diagnosis.data || !diagnosis.target || !diagnosis.pattern || !selectedModule) {
    els.analysisText.textContent = 'The repair circuit is incomplete. Tune all three diagnostic dials and select one final model module.';
    return;
  }
  commitRepair();
});

els.nextButton.addEventListener('click', () => {
  roundIndex += 1;
  if (roundIndex >= window.SCENARIOS.length) showEnd();
  else loadRound();
});

function probeSelectedModule() {
  if (probedModules.has(selectedModule)) {
    els.analysisText.innerHTML = `<div class="result-title">${selectedModule} already probed</div><div class="mini-note">Repeating a probe gives no new signal.</div>${probeLog.join('')}`;
    return;
  }

  const errors = diagnosisErrorCount();
  const damage = 12 + errors * 6;
  integrity = Math.max(0, integrity - damage);
  updateIntegrityLabel();
  pulseRobot('damage');
  playTone('damage');
  probedModules.add(selectedModule);

  const result = makeProbeResult(selectedModule, damage, errors);
  probeLog.push(result);
  els.analysisText.innerHTML = probeLog.join('');
  renderModules();
}

function makeProbeResult(moduleName, damage, errors) {
  const s = scenario();
  const best = moduleName === s.bestMethod;
  const acceptable = s.acceptableMethods.includes(moduleName);
  const wrongFamily = isWrongTaskFamily(moduleName, s.task);
  const signalClass = best ? 'signal-good' : acceptable ? 'signal-warn' : 'signal-bad';
  const signalText = best ? 'strong signal' : acceptable ? 'runs with warnings' : 'bad fit';
  const noise = errors ? `<span class="signal-chip signal-bad">+${errors} noisy dial${errors > 1 ? 's' : ''}</span>` : '<span class="signal-chip signal-good">clean dials</span>';
  const reason = probeReason(moduleName, best, acceptable, wrongFamily);

  return `
    <div class="probe-card">
      <div class="result-title">Probe: ${moduleName}</div>
      <div class="signal-row">
        <span class="signal-chip ${signalClass}">${signalText}</span>
        <span class="signal-chip signal-bad">-${damage} integrity</span>
        ${noise}
      </div>
      <div class="mini-note">${reason}</div>
    </div>
  `;
}

function probeReason(moduleName, best, acceptable, wrongFamily) {
  const s = scenario();
  const quick = best
    ? `Output matches <strong>${s.task}</strong>; pattern matches <strong>${s.slots.pattern}</strong>.`
    : acceptable
      ? `Right problem family, weaker pattern fit. The machine needs behavior like: <strong>${patternBehaviorClue(s.slots.pattern)}</strong>.`
      : wrongFamily
        ? `Wrong subsystem: <strong>${methodFamily(moduleName)}</strong> vs <strong>${s.task}</strong>.`
        : `Assumption mismatch: this machine wants <strong>${s.slots.pattern}</strong>.`;

  return `${quick}
    <details class="hint-box compact">
      <summary>Why?</summary>
      <div class="hint-short">${targetedModuleTip(moduleName, s)}</div>
      <details class="deeper-hint">
        <summary>Explain further</summary>
        <div>${deeperModuleTip(moduleName, s)}</div>
      </details>
    </details>`;
}

function targetedModuleTip(moduleName, s) {
  if (moduleName === s.bestMethod) return `${moduleName} matches both the task type and the pattern clue.`;
  if (s.acceptableMethods.includes(moduleName)) return `${moduleName} can solve the task, but the pattern clue asks for behavior like: <strong>${patternBehaviorClue(s.slots.pattern)}</strong>.`;
  if (isWrongTaskFamily(moduleName, s.task)) return `${moduleName} is aimed at ${methodFamily(moduleName)}, but this repair needs ${s.task}.`;
  return `${moduleName} does not match the key pattern clue: “${s.slots.pattern}.”`;
}

function patternBehaviorClue(pattern) {
  const clues = {
    'linear numeric trend': 'change the output steadily as inputs increase or decrease',
    'nonlinear tabular signals': 'combine many feature splits so interactions between columns can matter',
    'similarity between examples': 'compare this case to nearby examples instead of learning one global rule',
    'correlated high-dimensional features': 'compress overlapping signals into fewer stronger components'
  };
  return clues[pattern] || 'match the model behavior to the pattern clue';
}

function deeperModuleTip(moduleName, s) {
  const methodTips = {
    'Logistic Regression': 'Best when predicting categories with a mostly linear boundary. It is not for numeric regression despite the name “regression.”',
    'Linear Regression': 'Best when predicting a number and the relationship is roughly linear. It is not a classifier.',
    'Decision Tree': 'Can solve classification or regression, but one tree can overfit. Random Forest is often stronger when performance matters.',
    'Random Forest': 'Combines many trees. Strong for tabular data with nonlinear interactions, but less simple to explain than one tree.',
    'k-NN': 'Uses similarity to nearby labeled examples. It needs labels for prediction and works best when distance is meaningful.',
    'k-Means': 'Uses similarity to form groups without labels. It does not predict known labels or numeric values.',
    'PCA': 'Compresses many correlated features. It helps representation, but it does not directly classify, regress, or cluster into named groups.'
  };
  return `${methodTips[moduleName]} This machine’s ideal clue is: ${s.slots.pattern}.`;
}

function isWrongTaskFamily(moduleName, task) {
  if ((task === 'Classification' || task === 'Regression') && ['k-Means', 'PCA'].includes(moduleName)) return true;
  if (task === 'Clustering' && moduleName !== 'k-Means') return true;
  if (task === 'Dimensionality Reduction' && moduleName !== 'PCA') return true;
  if (task === 'Classification' && moduleName === 'Linear Regression') return true;
  if (task === 'Regression' && moduleName === 'Logistic Regression') return true;
  return false;
}

function methodFamily(moduleName) {
  if (moduleName === 'k-Means') return 'unsupervised clustering';
  if (moduleName === 'PCA') return 'feature compression / dimensionality reduction';
  if (moduleName === 'Linear Regression') return 'numeric regression';
  if (moduleName === 'Logistic Regression') return 'classification';
  return 'supervised prediction';
}

function diagnosisErrorCount() {
  const s = scenario();
  const diagnosis = currentDiagnosis();
  return ['data', 'target', 'pattern'].filter(slot => diagnosis[slot] !== s.slots[slot]).length;
}

function markDialOutcomes() {
  const s = scenario();
  const diagnosis = currentDiagnosis();
  ['data', 'target', 'pattern'].forEach(slot => {
    const dial = els[`${slot}Dial`];
    const correct = diagnosis[slot] === s.slots[slot];
    dial.classList.toggle('dial-correct', correct);
    dial.classList.toggle('dial-wrong', !correct);
  });
}

function commitRepair() {
  committed = true;
  const s = scenario();
  const diagnosis = currentDiagnosis();
  const slotNames = { data: 'Data', target: 'Goal', pattern: 'Pattern' };
  let repairPoints = 0;

  const dialCards = ['data', 'target', 'pattern'].map(slot => {
    const correct = diagnosis[slot] === s.slots[slot];
    if (correct) repairPoints += 1;
    return `
      <div class="outcome-card ${correct ? 'outcome-good' : 'outcome-bad'}">
        <div class="outcome-label">${correct ? '✓' : '✗'} ${slotNames[slot]}</div>
        <div>${labelEvidence(diagnosis[slot])}</div>
        ${correct ? '' : `<div class="mini-note">target: ${labelEvidence(s.slots[slot])}</div>`}
      </div>
    `;
  }).join('');

  const inferredTask = inferTask(diagnosis);
  const correctTask = inferredTask === s.task;
  const best = selectedModule === s.bestMethod;
  const acceptable = s.acceptableMethods.includes(selectedModule);
  if (best) repairPoints += 3;
  else if (acceptable) repairPoints += 1;
  if (best) {
    pulseRobot('success');
    playTone('success');
  } else {
    pulseRobot('damage');
    playTone('fail');
  }

  const moduleClass = best ? 'signal-good' : acceptable ? 'signal-warn' : 'signal-bad';
  const moduleSignal = best ? 'optimal module' : acceptable ? 'works, weaker' : 'wrong fit';
  const moduleReason = best
    ? s.bestReason
    : acceptable
      ? `Can run, but the pattern clue asks for behavior like: ${patternBehaviorClue(s.slots.pattern)}.`
      : `Needs ${s.bestMethod}; ${methodFamily(selectedModule)} misses this repair.`;

  const integrityBonus = Math.floor(integrity / 25);
  const roundPoints = repairPoints + integrityBonus;
  score += roundPoints;
  els.scoreLabel.textContent = `Score: ${score}`;
  const rank = repairRank(best, repairPoints, integrity);
  markDialOutcomes();

  els.analysisText.innerHTML = `
    <div class="result-title">${rank.icon} ${rank.name} repair · +${roundPoints}/10</div>
    <div class="signal-row">
      <span class="signal-chip ${correctTask ? 'signal-good' : 'signal-bad'}">${correctTask ? 'task locked' : `task drift: ${inferredTask}`}</span>
      <span class="signal-chip ${moduleClass}">${moduleSignal}</span>
      <span class="signal-chip signal-good">+${integrityBonus} integrity bonus</span>
    </div>
    <div class="outcome-grid">${dialCards}</div>
    <div class="probe-card">
      <div class="result-title">Final module: ${selectedModule}</div>
      <div class="mini-note">${moduleReason}</div>
      <details class="hint-box compact">
        <summary>Why was this module ${best ? 'good' : 'not ideal'}?</summary>
        <div class="hint-short">${targetedModuleTip(selectedModule, s)}</div>
        <details class="deeper-hint">
          <summary>Explain further</summary>
          <div>${deeperModuleTip(selectedModule, s)}</div>
        </details>
      </details>
    </div>
    <div class="mini-note"><strong>Takeaway:</strong> ${makeTakeaway(s)}</div>
  `;
  els.probeButton.classList.add('hidden');
  els.testButton.classList.add('hidden');
  els.nextButton.classList.remove('hidden');
  renderModules();
}

function repairRank(best, repairPoints, integrityLeft) {
  if (best && integrityLeft >= 76) return { icon: '🥇', name: 'Gold' };
  if (best || (repairPoints >= 5 && integrityLeft >= 52)) return { icon: '🥈', name: 'Silver' };
  if (repairPoints >= 2) return { icon: '🥉', name: 'Bronze' };
  return { icon: '🛠️', name: 'Emergency' };
}

function moduleShortTip(moduleName) {
  const tips = {
    'Logistic Regression': 'Use for labeled category prediction when a simple linear boundary may work.',
    'Linear Regression': 'Use for labeled numeric prediction when a straight-line trend may work.',
    'Decision Tree': 'Use for readable rule-based prediction; flexible but can overfit alone.',
    'Random Forest': 'Use for strong tabular prediction when nonlinear interactions may matter.',
    'k-NN': 'Use when similar labeled examples should have similar outputs.',
    'k-Means': 'Use when there are no labels and the goal is to discover groups.',
    'PCA': 'Use when many correlated features need to be compressed.'
  };
  return tips[moduleName];
}

function moduleDeepTip(moduleName) {
  const tips = {
    'Logistic Regression': 'Despite the name, logistic regression is mainly a classifier. It estimates class probability using a linear combination of features.',
    'Linear Regression': 'Linear regression predicts a continuous number. It is a strong first baseline when the relationship between features and target is roughly linear.',
    'Decision Tree': 'A decision tree asks a sequence of feature questions. It is easy to inspect, but a single tree may memorize quirks in the training data.',
    'Random Forest': 'A random forest averages many decision trees. That usually improves predictive strength on tabular data and reduces overfitting compared with one tree.',
    'k-NN': 'k-NN stores examples and predicts from nearby ones. It depends heavily on whether the distance between examples is meaningful.',
    'k-Means': 'k-Means repeatedly assigns points to nearby cluster centers. It is for discovering groups, not predicting known labels.',
    'PCA': 'PCA finds directions of high variation and projects data onto fewer components. It is useful when features overlap or are too numerous.'
  };
  return tips[moduleName];
}

function playTone(kind) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = playTone.ctx || (playTone.ctx = new AudioContext());
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const settings = {
      tick: [420, 0.025, 'square', 0.018],
      select: [620, 0.055, 'sine', 0.025],
      damage: [120, 0.12, 'sawtooth', 0.045],
      fail: [180, 0.16, 'sawtooth', 0.04],
      success: [740, 0.18, 'sine', 0.035]
    }[kind] || [440, 0.05, 'sine', 0.02];
    osc.frequency.setValueAtTime(settings[0], now);
    if (kind === 'success') osc.frequency.exponentialRampToValueAtTime(1040, now + settings[1]);
    if (kind === 'fail') osc.frequency.exponentialRampToValueAtTime(95, now + settings[1]);
    osc.type = settings[2];
    gain.gain.setValueAtTime(settings[3], now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[1]);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + settings[1]);
  } catch (error) {
    // Audio is optional; ignore browser/autoplay restrictions.
  }
}

function updateIntegrityLabel() {
  els.integrityLabel.textContent = `Integrity: ${integrity}%`;
  els.integrityLabel.classList.toggle('danger', integrity <= 40);
  els.integrityFill.style.width = `${integrity}%`;
  els.integrityFill.classList.toggle('danger-fill', integrity <= 40);
  els.integrityFill.classList.toggle('warn-fill', integrity > 40 && integrity <= 64);
  els.robotCore.classList.toggle('robot-warn', integrity <= 64);
  els.robotCore.classList.toggle('robot-danger', integrity <= 40);
}

function pulseRobot(kind) {
  els.robotCore.classList.remove('robot-damage', 'robot-success');
  void els.robotCore.offsetWidth;
  els.robotCore.classList.add(kind === 'success' ? 'robot-success' : 'robot-damage');
}

function makeTakeaway(s) {
  if (s.task === 'Classification') return 'Category target means classification. Then choose the classifier whose assumptions match the pattern: linear, similarity-based, tree-based, or ensemble.';
  if (s.task === 'Regression') return 'Numeric target means regression. Then decide whether the pattern is simple enough for linear regression or better served by nonlinear tabular methods.';
  if (s.task === 'Clustering') return 'No labels plus unknown groups means clustering. Supervised predictors may look familiar, but they are solving a different problem.';
  return 'Compression of many features is dimensionality reduction. PCA changes the representation; it is not trying to predict a class or number.';
}

function containWheelScroll(element) {
  if (!element) return;
  element.addEventListener('wheel', event => {
    const canScroll = element.scrollHeight > element.clientHeight;
    if (!canScroll) return;

    const atTop = element.scrollTop <= 0;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
    const scrollingUp = event.deltaY < 0;
    const scrollingDown = event.deltaY > 0;

    if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
      event.preventDefault();
      element.scrollTop += event.deltaY;
    }
  }, { passive: false });
}

containWheelScroll(document.querySelector('.module-panel'));
containWheelScroll(els.analysisText);

function showEnd() {
  const maxScore = window.SCENARIOS.length * 10;
  document.querySelector('.layout').innerHTML = `
    <article class="panel analysis-panel" style="grid-column: 1 / -1;">
      <h2>Workshop stabilized</h2>
      <div class="analysis-text">
Final score: ${score}/${maxScore}

What this version practiced:
• diagnosing labels/no labels before picking a method
• distinguishing target type from pattern clues
• probing models to observe why they do or do not fit
• trading off information gain against machine damage
      </div>
      <div class="actions"><button class="secondary" onclick="location.reload()">Replay workshop</button></div>
    </article>`;
}

loadRound();
