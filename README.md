# Evidence Checklist

A free tool that tells you exactly what proof an assessor will ask for, requirement by requirement, and tracks what you have.

**Live tool:** https://nehemiah313.github.io/evidence-checklist/

## What it does

- **337 suggested evidence items** across all 110 NIST SP 800-171 requirements: specific, assessor-grade suggestions for every 5-point and 5/3-point control, family-level guidance for the rest
- Track each item as **Missing, In progress, or Collected**, with a location note (share, ticket number, URL)
- **"Implemented but unproven" flag**: import your statuses from the [SPRS Score Calculator](https://github.com/nehemiah313/sprs-score-calculator) and it calls out every requirement you marked Implemented with zero evidence collected
- Progress dashboard overall and per family, search, and gap-only view
- Exports a **CSV** and a **Markdown checklist** with checkboxes
- Everything stays in your browser (localStorage only, nothing uploaded)

## Honest framing

Evidence suggestions are a starting point. Confirm with your assessor what proof they expect for your environment. Implemented without proof is unproven.

## The data

- [`data/nist-800-171-controls.json`](data/nist-800-171-controls.json) / `.csv` — the 110 requirements
- [`data/evidence.json`](data/evidence.json) — the evidence suggestions (build with `build_evidence.py`)

Requirement text: NIST SP 800-171 Rev. 2 (public domain). Free to reuse under MIT.

## Built by

**Neo Harvard**, CEO of [AI Tech Pros](https://aitechpros.ai) — SPRS and CMMC readiness for defense contractors. Part of the [MAPS framework](https://github.com/nehemiah313/maps-framework) family: Map, Assess, Prioritize, Sustain.
