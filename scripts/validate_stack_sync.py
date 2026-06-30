import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple


def read_env_file(path: Path) -> Dict[str, str]:
    data: Dict[str, str] = {}
    if not path.exists():
        return data

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip()
    return data


def check_required_env(values: Dict[str, str], required: List[str]) -> List[str]:
    missing = []
    for key in required:
        if not values.get(key):
            missing.append(key)
    return missing


def normalize(url: str) -> str:
    return url.strip().rstrip("/")


def check_url_sync(env_values: Dict[str, str]) -> List[str]:
    errors: List[str] = []

    frontend_url = normalize(env_values.get("NEXT_PUBLIC_API_BASE_URL", ""))
    n8n_url = normalize(env_values.get("N8N_DYNASTY_API_URL", ""))
    railway_url = normalize(env_values.get("RAILWAY_BACKEND_PUBLIC_URL", ""))

    if frontend_url and n8n_url and ("localhost" in n8n_url or "127.0.0.1" in n8n_url):
        if ("localhost" not in frontend_url) and ("127.0.0.1" not in frontend_url):
            errors.append(
                "NEXT_PUBLIC_API_BASE_URL points to non-local host while N8N_DYNASTY_API_URL points to localhost."
            )

    if railway_url:
        if frontend_url and normalize(frontend_url) != normalize(railway_url):
            errors.append(
                "When RAILWAY_BACKEND_PUBLIC_URL is set, NEXT_PUBLIC_API_BASE_URL must match it."
            )
        if n8n_url and normalize(n8n_url) != normalize(railway_url):
            errors.append(
                "When RAILWAY_BACKEND_PUBLIC_URL is set, N8N_DYNASTY_API_URL must match it."
            )

    return errors


def check_workflow_file(path: Path) -> Tuple[bool, List[str]]:
    warnings: List[str] = []
    if not path.exists():
        return False, ["workflow file not found"]

    content = path.read_text(encoding="utf-8")

    hardcoded_url_fields = re.findall(r'"url"\s*:\s*"http://localhost:8010', content)
    if hardcoded_url_fields:
        warnings.append(
            "Found hardcoded http://localhost:8010 in operational url fields. Use Dynasty Config variable instead."
        )

    required_patterns = [
        r"\$env\.N8N_DYNASTY_API_URL",
        r"\$\('Dynasty Config'\)\.first\(\)\.json\.dynastyApiUrl",
    ]
    for pattern in required_patterns:
        if not re.search(pattern, content):
            warnings.append(f"Missing required workflow pattern: {pattern}")

    return len(warnings) == 0, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate frontend/backend/n8n/Railway configuration sync.")
    parser.add_argument("--env-file", default=".env", help="Path to env file to validate")
    parser.add_argument(
        "--workflow-file",
        default="ultimate-dynasty-os-v2.json",
        help="Path to n8n workflow JSON",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    env_path = (repo_root / args.env_file).resolve()
    workflow_path = (repo_root / args.workflow_file).resolve()

    env_values = read_env_file(env_path)

    required = [
        "NEXT_PUBLIC_API_BASE_URL",
        "CORS_ALLOW_ORIGINS",
        "N8N_DYNASTY_API_URL",
    ]

    missing = check_required_env(env_values, required)
    sync_errors = check_url_sync(env_values)
    workflow_ok, workflow_warnings = check_workflow_file(workflow_path)

    result = {
        "env_file": str(env_path),
        "workflow_file": str(workflow_path),
        "missing_required_env": missing,
        "sync_errors": sync_errors,
        "workflow_checks_ok": workflow_ok,
        "workflow_warnings": workflow_warnings,
    }

    print(json.dumps(result, indent=2))

    if missing or sync_errors or workflow_warnings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
