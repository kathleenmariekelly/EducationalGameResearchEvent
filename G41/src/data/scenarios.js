window.SCENARIOS = [
  {
    name: "Sorting Arm Misroutes Packages",
    symptom: "A factory arm sees package weight, dimensions, color histogram, and barcode metadata. Past packages are already labeled fragile, refrigerated, hazardous, or standard. The arm must assign the next package to one known category.",
    task: "Classification",
    bestMethod: "Random Forest",
    acceptableMethods: ["Decision Tree", "k-NN", "Logistic Regression"],
    slots: {
      data: "labeled examples",
      target: "known category output",
      pattern: "nonlinear tabular signals"
    },
    chips: ["labeled examples", "no labels", "known category output", "numeric output", "nonlinear tabular signals", "compress many features"],
    slotReasons: {
      data: "Past packages already have labels, so this is supervised data.",
      target: "Fragile/refrigerated/hazardous/standard are categories, not numbers.",
      pattern: "Package measurements and metadata may interact in nonlinear ways."
    },
    bestReason: "Random Forest is a strong starting point for nonlinear tabular classification.",
    methodNotes: {
      "Decision Tree": "reasonable and interpretable, but a single tree is less stable than a forest.",
      "k-NN": "reasonable if similar packages share labels, but sensitive to scaling and many features.",
      "Logistic Regression": "a useful simple classifier, but weaker if the class boundary is nonlinear."
    }
  },
  {
    name: "Steam Plant Output Gauge Fails",
    symptom: "Sensors record temperature, pressure, valve position, fuel rate, and turbine vibration. Past records include exact energy output in megawatts. The plant wants to predict tomorrow's output.",
    task: "Regression",
    bestMethod: "Random Forest",
    acceptableMethods: ["Linear Regression", "Decision Tree", "k-NN"],
    slots: {
      data: "labeled examples",
      target: "numeric output",
      pattern: "nonlinear tabular signals"
    },
    chips: ["labeled examples", "no labels", "numeric output", "known category output", "nonlinear tabular signals", "discover unknown groups"],
    slotReasons: {
      data: "Past records pair sensor inputs with known megawatt outputs.",
      target: "Megawatts are a continuous numeric value.",
      pattern: "Physical sensor relationships are often nonlinear."
    },
    bestReason: "Random Forest often handles nonlinear tabular regression better than a linear-only model.",
    methodNotes: {
      "Linear Regression": "reasonable if the relationship is close to linear, but that may underfit machinery behavior.",
      "Decision Tree": "captures nonlinear splits, but a single tree is less stable than a forest.",
      "k-NN": "uses similar past states, but can be weak with noisy or differently scaled sensors."
    }
  },
  {
    name: "Unknown Robot Tribes",
    symptom: "Exploration drones found thousands of robots with gait rhythm, power draw, chassis shape, and radio signature. No one has type labels; engineers want to discover natural groups.",
    task: "Clustering",
    bestMethod: "k-Means",
    acceptableMethods: [],
    slots: {
      data: "no labels",
      target: "discover unknown groups",
      pattern: "similarity between examples"
    },
    chips: ["no labels", "labeled examples", "discover unknown groups", "known category output", "similarity between examples", "linear numeric trend"],
    slotReasons: {
      data: "The robots do not have known type labels.",
      target: "The goal is to discover groups rather than predict a known label.",
      pattern: "Grouping depends on which robots are similar across measurements."
    },
    bestReason: "k-Means directly groups unlabeled numeric examples into clusters.",
    methodNotes: {}
  },
  {
    name: "Overloaded Vision Core",
    symptom: "A security machine receives 500 sensor features per second, many correlated. Engineers want fewer transformed signals that preserve most variation before another model uses the data.",
    task: "Dimensionality Reduction",
    bestMethod: "PCA",
    acceptableMethods: [],
    slots: {
      data: "no target label",
      target: "compress many features",
      pattern: "correlated high-dimensional features"
    },
    chips: ["no target label", "labeled examples", "compress many features", "numeric output", "correlated high-dimensional features", "known category output"],
    slotReasons: {
      data: "No prediction label is given; the issue is representation.",
      target: "The stated goal is fewer transformed signals, not a predicted class or number.",
      pattern: "PCA is especially natural when many numeric features are correlated."
    },
    bestReason: "PCA is the standard starting method for compressing correlated numeric features.",
    methodNotes: {}
  },
  {
    name: "Boiler Failure Warning Bell",
    symptom: "Maintenance logs list boiler sensor readings and whether each boiler failed within 24 hours: yes or no. This repair asks for a strong first predictive model.",
    task: "Classification",
    bestMethod: "Random Forest",
    acceptableMethods: ["Logistic Regression", "Decision Tree", "k-NN"],
    slots: {
      data: "labeled examples",
      target: "known category output",
      pattern: "nonlinear tabular signals"
    },
    chips: ["labeled examples", "no labels", "known category output", "numeric output", "nonlinear tabular signals", "compress many features"],
    slotReasons: {
      data: "Each past boiler has sensor readings plus a known failed/not-failed label.",
      target: "Yes/no failure is a category target.",
      pattern: "Failures may depend on interactions among sensor readings."
    },
    bestReason: "Random Forest is strong for tabular classification with possible sensor interactions.",
    methodNotes: {
      "Logistic Regression": "solid as a simple binary classifier, but weaker if interactions are nonlinear.",
      "Decision Tree": "explainable, but one tree may overfit rare failure patterns.",
      "k-NN": "plausible if similar sensor states share outcomes, but vulnerable to noise and scaling."
    }
  },
  {
    name: "Clockwork Market Price Oracle",
    symptom: "A trading machine has past sales records with item age, rarity score, repair history, region, and final sale price. It must estimate the price of newly listed items.",
    task: "Regression",
    bestMethod: "Random Forest",
    acceptableMethods: ["Linear Regression", "Decision Tree", "k-NN"],
    slots: {
      data: "labeled examples",
      target: "numeric output",
      pattern: "nonlinear tabular signals"
    },
    chips: ["labeled examples", "no labels", "numeric output", "known category output", "nonlinear tabular signals", "discover unknown groups"],
    slotReasons: {
      data: "Past sales include inputs and known final prices.",
      target: "Price is a continuous numeric target.",
      pattern: "Rarity, age, repairs, and region may interact nonlinearly."
    },
    bestReason: "Random Forest is strong for tabular price prediction with nonlinear interactions.",
    methodNotes: {
      "Linear Regression": "a simple numeric baseline, but market prices may not vary linearly.",
      "Decision Tree": "can model nonlinear rules, but one tree can overfit quirks.",
      "k-NN": "works if similar items sell similarly, but relies on good feature scaling."
    }
  },
  {
    name: "Mail Tube Handwriting Reader",
    symptom: "The pneumatic mail system stores images of handwritten digits. Each training image is labeled 0 through 9. The reader must identify the digit on future envelopes.",
    task: "Classification",
    bestMethod: "k-NN",
    acceptableMethods: ["Random Forest", "Logistic Regression", "Decision Tree"],
    slots: {
      data: "labeled examples",
      target: "known category output",
      pattern: "similarity between examples"
    },
    chips: ["labeled examples", "no labels", "known category output", "numeric output", "similarity between examples", "linear numeric trend"],
    slotReasons: {
      data: "Training images already have digit labels.",
      target: "Digits 0 through 9 are class labels.",
      pattern: "As a first baseline, visually similar digit vectors often share labels."
    },
    bestReason: "k-NN is a defensible introductory image baseline because it uses similarity between examples.",
    methodNotes: {
      "Random Forest": "often strong, but raw image pixels may need more feature work.",
      "Logistic Regression": "a common simple multiclass baseline, but less able to capture shape similarity.",
      "Decision Tree": "possible, but a single tree is rarely a strong image baseline."
    }
  },
  {
    name: "Gearbox Noise Families",
    symptom: "Acoustic sensors captured unlabeled sound profiles from gearboxes across the city. Engineers suspect recurring vibration patterns but do not know the failure families ahead of time.",
    task: "Clustering",
    bestMethod: "k-Means",
    acceptableMethods: ["PCA"],
    slots: {
      data: "no labels",
      target: "discover unknown groups",
      pattern: "similarity between examples"
    },
    chips: ["no labels", "labeled examples", "discover unknown groups", "known category output", "similarity between examples", "compress many features"],
    slotReasons: {
      data: "The sound profiles have no known family labels.",
      target: "The goal is to discover families rather than predict known labels.",
      pattern: "Grouping depends on similar acoustic profiles."
    },
    bestReason: "k-Means directly forms groups of similar unlabeled examples.",
    methodNotes: {
      "PCA": "useful before clustering for compression or visualization, but it does not itself create the groups."
    }
  }
];
