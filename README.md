# ELAVAGNON 360 Dashboard

ELAVAGNON 360 is an interactive customer-intelligence dashboard for a small and medium-sized business. It combines customer profiles, purchases, reviews, complaints, segmentation, churn risk, marketing performance, cross-selling opportunities, and customer-service priorities in one browser-based interface.

## Main features

### Dashboard views

- **Vue d'ensemble**: revenue, orders, average order value, active customers, satisfaction, unresolved complaints, monthly revenue, segments, and churn risk.
- **Marketing**: top products by segment, acquisition channels, review sentiment, recurring themes, and editable newsletter drafts.
- **Commercial**: cross-selling opportunities, personalized sales-message drafts, and copy-to-clipboard support.
- **Relation client**: complaint priorities, severity, retention follow-up, and churn-risk action plans.
- **Clients**: searchable and filterable customer profiles with individualized recommendations.
- **Chatbot IA**: conversational analysis, graph explanations, recommendations, and customer-message assistance.
- **Importer des données**: team upload areas for CSV files and the generated dashboard JSON.

Graph explanations can be shown and hidden using the same button. Segment, risk, sentiment, and complaint-severity colors are consistent across charts.

## Project structure

```text
ELAVAGNON_360_Dashboard_source/
├── index.html                 # Complete browser dashboard
├── analysis.py                # Builds the 360-degree customer dataset
├── build_dashboard_data.py    # Builds dashboard_data.json
├── build_report.js            # Generates the project report
├── dashboard_data.json        # Aggregated dashboard data
├── clients_360.csv            # Processed customer profiles
├── achats_clean.csv           # Cleaned purchases
├── avis_clean.csv             # Cleaned reviews
├── reclam_clean.csv           # Cleaned complaints
├── README.md                  # Project documentation
└── .gitignore                 # Local files excluded from Git
```

The `.venv/` directory and Python cache files are excluded from Git.

## Requirements

- Python 3.10 or newer
- `pandas`
- `numpy`
- A modern browser
- Network access to the Chart.js CDN for charts

The dashboard is a static HTML application. It does not require Node.js or a backend server for local use.

## Installation

From the project directory:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install pandas numpy
```

If `.venv` already exists, only the installation command is needed.

## Run the dashboard

Start the local server:

```bash
.venv/bin/python -m http.server 8000
```

Open `http://localhost:8000` in your browser. Keep the terminal running while using the dashboard and stop the server with `Ctrl+C`.

If port 8000 is unavailable:

```bash
.venv/bin/python -m http.server 8001
```

Then open `http://localhost:8001`.

Using the HTTP server is recommended instead of opening `index.html` directly with the `file://` protocol.

## Rebuild the data

Run these commands separately and in this order:

```bash
.venv/bin/python analysis.py
.venv/bin/python build_dashboard_data.py
```

### `analysis.py`

This script reads the four source datasets, joins them with `client_id`, and produces the customer 360-degree dataset. It calculates:

- Order count and total revenue per customer
- First and latest purchase dates
- Purchase recency and customer seniority
- Favorite product
- Review sentiment and themes
- Complaint totals and unresolved complaints
- Behavioral customer segments
- Churn-risk score from 0 to 100

The source files are expected in the sibling `donnees2` directory:

```text
../donnees2/02_Comprehension_Clients_clients.csv
../donnees2/02_Comprehension_Clients_achats.csv
../donnees2/02_Comprehension_Clients_avis_clients.csv
../donnees2/02_Comprehension_Clients_reclamations.csv
```

The script writes `clients_360.csv`, `achats_clean.csv`, `avis_clean.csv`, and `reclam_clean.csv` beside the dashboard.

### `build_dashboard_data.py`

This script reads the processed CSV files and generates `dashboard_data.json`, including KPI values, charts, segments, client tables, complaint priorities, and cross-selling recommendations.

## Team data-import workflow

The browser import page validates and previews files. Raw CSV imports are stored locally in the browser for handoff; they do not independently recalculate the full customer model inside the browser.

Recommended workflow:

1. Open **Importer des données**.
2. Select the CSV provided by the relevant team.
3. Check the row count, columns, and preview.
4. Run `analysis.py` to rebuild the processed files.
5. Run `build_dashboard_data.py` to rebuild the aggregate JSON.
6. Import the new `dashboard_data.json` in the dashboard.
7. Reload the page with `Ctrl+R`.

Available import areas:

| Team | File content |
| --- | --- |
| Customer knowledge | Profiles, cities, segments, satisfaction |
| Sales | Orders, products, amounts, dates |
| Customer experience | Reviews, notes, comments, sentiment |
| Customer service | Complaints, severity, resolution |
| Dashboard aggregate | `dashboard_data.json` |

Imported data is stored in browser `localStorage`. This is local browser storage, not a shared database.

## Expected data fields

All datasets are joined with `client_id`.

Customer file:

- `client_id`
- demographic fields
- city
- acquisition channel
- satisfaction where available

Purchases file:

- `client_id`
- `commande_id`
- `date`
- `produit`
- `montant_fcfa`

Reviews file:

- `client_id`
- `avis_id`
- `note`
- `commentaire`

Complaints file:

- `client_id`
- `reclamation_id`
- `date`
- `motif`
- `gravite`
- `resolution`

Keep column names and date formats consistent with the existing datasets. If a team changes a column name, update `analysis.py` before rebuilding.

## Chatbot IA and local agent behavior

The dashboard attempts to use the hosted `claude.use('sample')` capability when available. In a normal local browser session, that capability may not exist.

The dashboard therefore includes a local, data-grounded fallback that works without an API key. It can:

- Answer questions about revenue, segments, products, channels, satisfaction, complaints, and churn
- Explain individual graphs in simple language
- Adapt recommendations to segment, satisfaction, recency, order count, favorite product, city, acquisition channel, and churn risk
- Generate editable sales, retention, and newsletter drafts
- Provide copy-to-clipboard actions for customer messages

The local fallback is a transparent rule-based assistant, not a general-purpose language model. It uses the currently loaded dashboard data.

## Customer-facing messages

Before sending an AI-generated message:

1. Read the draft.
2. Adapt the greeting and tone to the relationship.
3. Confirm that the product and offer are accurate.
4. Remove or correct anything that is not appropriate.
5. Use **Copier le message** only after review.

Customer-facing drafts do not expose internal IDs, churn scores, or technical information.

## GitHub

Repository:

https://github.com/SimtakoAbelBaboime/elavagnon-360-dashboard

Publish a local change:

```bash
git status
git add .
git commit -m "Describe the change"
git push origin main
```

### GitHub Pages

The dashboard can be hosted as a static site:

1. Open the repository on GitHub.
2. Open **Settings**, then **Pages**.
3. Choose **Deploy from a branch**.
4. Select the `main` branch and `/root`.
5. Save and wait for publication.

The published URL appears in the Pages settings. Chart.js is loaded from jsDelivr, so the hosted page needs network access for charts.

## Troubleshooting

### `ModuleNotFoundError: No module named 'pandas'`

Use the project interpreter:

```bash
.venv/bin/python -m pip install pandas numpy
.venv/bin/python analysis.py
```

### `FileNotFoundError` for a CSV

Confirm that the four source files exist in the expected `donnees2` directory and that their names match the paths documented above.

### The dashboard shows old data

Run both pipeline commands, import the newly generated `dashboard_data.json`, and reload the browser.

### Charts are empty

Confirm that the HTTP server is running and that the browser can reach the Chart.js CDN. Tables, navigation, imports, and local agent responses can still work if the CDN is blocked.

### The agent gives a generic response

Reload the latest `index.html`. The local fallback should provide different responses for questions about revenue, segments, products, channels, satisfaction, complaints, and churn.

## Validation checklist

Before sharing a new version:

- `analysis.py` completes without an exception.
- `build_dashboard_data.py` prints an `OK` message.
- The dashboard opens through the HTTP server.
- Every navigation view displays content.
- The chatbot answers a suggested question.
- Graph explanations can be shown and hidden.
- Segment and risk colors remain consistent.
- CSV imports show columns and preview rows.
- JSON import updates the dashboard after reload.
- Customer messages and newsletters can be edited and copied.
- Changes are committed and pushed to GitHub.

## Privacy

This project is intended for educational and demonstration purposes. Before using real customer data, review access permissions, remove sensitive files from public repositories, and apply the organization's data-protection requirements.
