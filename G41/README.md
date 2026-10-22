# ML Machine Repair

A small educational prototype about recognizing machine learning task types and choosing a strong starting method.

## Learning objective

Given a short real-world ML scenario, the player practices identifying the task type and choosing a likely strong baseline method.

## Core mechanic

Each broken machine has a symptom report with clues about labels, target output, data shape, and goal. The player repairs the machine by installing:

1. a task core: classification, regression, clustering, or dimensionality reduction
2. a method module: logistic regression, linear regression, decision tree, random forest, k-NN, k-means, or PCA

The game gives partial credit for the correct task type and for choosing either the strongest starting method or a reasonable alternative.

## Run locally

From this folder:

```bash
npx serve .
```

Then open the local URL shown in the terminal.
