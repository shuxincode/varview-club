# Harness — CI/CD Control Dashboard

A portable, single-file CI/CD control dashboard that works across any project.
Drop `harness/index.html` into any repo for an instant visual pipeline monitor.

## Quick Start

Open `harness/index.html` in any browser. No server required.

```
open harness/index.html        # macOS
start harness/index.html       # Windows
xdg-open harness/index.html    # Linux
```

## Features

- **Pipeline runner** — visual build/test/deploy stages with pass/fail feedback
- **Live telemetry** — real-time metric bars (latency, throughput, errors)
- **Interactive terminal** — run commands, switch projects, inspect config
- **Project config** — define your own stages and modules in `HARNESS_CONFIG`

## Commands

| Command | Description |
|---------|-------------|
| `run pipeline` | Execute the full CI pipeline |
| `status` | Show current stage statuses |
| `project <name>` | Switch to a different project config |
| `telemetry on/off` | Toggle the live metric stream |
| `config` | Show current project configuration |
| `clear` | Clear terminal output |

## Adding Your Project

1. Open `harness/index.html`
2. Find the `HARNESS_CONFIG` block at the top of the `<script>`
3. Add a new entry under `projects`:

```js
'my-project': {
  name: 'my-project',
  tagline: 'Description',
  version: 'v1.0.0',
  terminalTitle: 'my-project@harness',
  nodeVersion: '>=18',
  pipelineStages: [
    { id: 'lint',  label: 'Lint',  icon: '△',  run: 'npm run lint' },
    { id: 'build', label: 'Build',  icon: '◇',  run: 'npm run build' },
    { id: 'test',  label: 'Test',   icon: '○',  run: 'npm test' },
  ],
  modules: [
    { id: 'core', label: 'Core', badge: 'MAIN', metrics: [
      { key: 'v', label: 'VERSION', default: '1.0' },
    ]},
  ],
  telemetrySource: 'LOCAL',
}
```
