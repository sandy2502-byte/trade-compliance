#!/usr/bin/env python3
"""
Creates the sample compliance_rules.xlsx file used by compliance_batch_runner.py.
Run once: python scripts/create_sample_rules.py
"""

import os
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "compliance_rules.xlsx")

rules = [
    {
        "rule_id": "R001",
        "rule_text": "max 60% of portfolio in Equity",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Asset Class",
        "notes": "Equity concentration limit per IPS",
    },
    {
        "rule_id": "R002",
        "rule_text": "no positions with Restricted compliance status",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Regulatory",
        "notes": "Sanctions / restricted list requirement",
    },
    {
        "rule_id": "R003",
        "rule_text": "max 30% of portfolio in any single country",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Concentration",
        "notes": "",
    },
    {
        "rule_id": "R004",
        "rule_text": "max 30% of portfolio in any single sector",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Concentration",
        "notes": "",
    },
    {
        "rule_id": "R005",
        "rule_text": "max 40% of portfolio in Bonds",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Asset Class",
        "notes": "Fixed income limit per mandate",
    },
    {
        "rule_id": "R006",
        "rule_text": "min 2% of portfolio in Cash",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Liquidity",
        "notes": "Minimum liquidity buffer",
    },
    {
        "rule_id": "R007",
        "rule_text": "no single position to exceed 15% of NAV",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Concentration",
        "notes": "Single-name concentration limit",
    },
    {
        "rule_id": "R008",
        "rule_text": "max 20% of portfolio in Review status positions",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Regulatory",
        "notes": "Positions under compliance review",
    },
    {
        "rule_id": "R009",
        "rule_text": "max 15% of portfolio in Commodity",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Asset Class",
        "notes": "Commodity exposure limit",
    },
    {
        "rule_id": "R010",
        "rule_text": "max 50% of portfolio in Equity plus ETF combined",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Asset Class",
        "notes": "Equity-like instruments combined cap",
    },
    {
        "rule_id": "R011",
        "rule_text": "minimum 10 positions in portfolio",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Diversification",
        "notes": "Minimum diversification requirement",
    },
    {
        "rule_id": "R012",
        "rule_text": "top 5 holdings max 80% of portfolio",
        "threshold_override": "",
        "enabled": "TRUE",
        "category": "Concentration",
        "notes": "Under review — threshold may be tightened",
    },
]

df = pd.DataFrame(rules)
df.to_excel(OUTPUT_PATH, sheet_name="Rules", index=False)
print(f"Created: {OUTPUT_PATH}  ({len(rules)} rules)")
