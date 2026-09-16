# ELAVAGNON 360 Dashboard

Interactive customer analytics dashboard for the ELAVAGNON dataset.

## Run the dashboard

```bash
.venv/bin/python -m http.server 8000
```

Open http://localhost:8000 in a browser.

## Rebuild the data

The project uses Python 3 with `pandas` and `numpy`:

```bash
.venv/bin/python analysis.py
.venv/bin/python build_dashboard_data.py
```

The dashboard includes overview, marketing, commercial, customer-relations, client explorer, and Agents IA views. The Agents IA view has a local data-grounded fallback so it works without an external API.
