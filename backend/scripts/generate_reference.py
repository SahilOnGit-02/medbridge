"""Generate API/ER references from application metadata without connecting to data."""

import argparse
import json
from pathlib import Path

from app.main import app
from app.db.session import Base
from app import models  # noqa: F401
from sqlalchemy import UniqueConstraint

ROOT = Path(__file__).resolve().parents[2]


def references():
    schema = app.openapi()
    api = [
        "# API documentation",
        "",
        "Generated from `app.main:app`. Do not hand-edit the endpoint inventory.",
        "Run `python -m scripts.generate_reference` from backend/ with a configured environment.",
        "",
        "Interactive schema: `/docs`; machine-readable schema: `/openapi.json`.",
        "The committed [OpenAPI snapshot](../openapi-current.json) comes from the same generator.",
        "",
        "## Authorization",
        "",
        "Bearer means an authenticated active account. It does not imply permission for every role or patient.",
        "See [authentication](AUTHENTICATION.md), [consent](CONSENT-AND-ACCESS-CONTROL.md),",
        "[emergency access](EMERGENCY-ACCESS.md) and [reports](MEDICAL-REPORTS.md) for role and resource checks.",
        "",
        "| Method | Path | Authentication | Tags |",
        "|---|---|---|---|",
    ]
    for path, methods in sorted(schema["paths"].items()):
        for method, op in sorted(methods.items()):
            if method not in {"get", "post", "patch", "put", "delete"}:
                continue
            auth = "Bearer" if op.get("security") else "Public"
            api.append(
                f"| {method.upper()} | `{path}` | {auth} | {', '.join(op.get('tags', []))} |"
            )
    db = [
        "# Database design",
        "",
        "Generated from SQLAlchemy metadata. Actual database creation and changes are governed by Alembic migrations.",
        "This inventory describes the schema, not populated data.",
        "",
        "## Entity relationship diagram",
        "",
        "```mermaid",
        "erDiagram",
    ]
    for table in sorted(Base.metadata.tables.values(), key=lambda t: t.name):
        db.append(f"    {table.name} {{")
        for column in table.columns:
            kind = str(column.type).split("(")[0].replace(" ", "_")
            mark = " PK" if column.primary_key else " FK" if column.foreign_keys else ""
            db.append(f"        {kind} {column.name}{mark}")
        db.append("    }")
    for table in sorted(Base.metadata.tables.values(), key=lambda t: t.name):
        for fk in sorted(table.foreign_keys, key=lambda x: x.parent.name):
            parent = "|o" if fk.parent.nullable else "||"
            unique = (
                fk.parent.unique
                or fk.parent.primary_key
                or any(
                    isinstance(c, UniqueConstraint) and list(c.columns) == [fk.parent]
                    for c in table.constraints
                )
            )
            child = "o|" if unique else "o{"
            db.append(
                f'    {fk.column.table.name} {parent}--{child} {table.name} : "{fk.parent.name}"'
            )
    db.extend(
        [
            "```",
            "",
            "Relationship lines show foreign-key connections; nullable foreign keys and application-level constraints are listed below.",
            "",
        ]
    )
    for table in sorted(Base.metadata.tables.values(), key=lambda t: t.name):
        db.extend(
            [
                f"## {table.name}",
                "",
                "| Column | Type | Nullable | References |",
                "|---|---|---|---|",
            ]
        )
        for column in table.columns:
            refs = (
                ", ".join(sorted(fk.target_fullname for fk in column.foreign_keys))
                or "-"
            )
            db.append(
                f"| `{column.name}` | {column.type} | {'Yes' if column.nullable else 'No'} | {refs} |"
            )
        db.append("")
    workflows = [
        "# n8n export inventory",
        "",
        "Generated from the committed JSON exports. This inventories nodes, not execution evidence.",
        "",
    ]
    for name in ("hospital-a.json", "hospital-b.json"):
        data = json.loads((ROOT / name).read_text())
        workflows.extend([f"## {name}", "", "| Node | Type |", "|---|---|"])
        for node in data["nodes"]:
            workflows.append(f"| {node['name']} | `{node['type']}` |")
        workflows.append("")
    return {
        ROOT / "openapi-current.json": json.dumps(schema, indent=2, sort_keys=True)
        + "\n",
        ROOT / "docs/API-DOCUMENTATION.md": "\n".join(api) + "\n",
        ROOT / "docs/DATABASE-DESIGN.md": "\n".join(db).rstrip() + "\n",
        ROOT / "docs/N8N-INVENTORY.md": "\n".join(workflows).rstrip() + "\n",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    mismatches = []
    for path, content in references().items():
        if args.check:
            if not path.exists() or path.read_text() != content:
                mismatches.append(str(path.relative_to(ROOT)))
        else:
            path.write_text(content)
    if mismatches:
        raise SystemExit("Regenerate stale references: " + ", ".join(mismatches))
    print(
        "API and database references are current."
        if args.check
        else "Generated API and database references."
    )


if __name__ == "__main__":
    main()
