import json
import os
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CFG_DIR = ROOT / "ai_agents" / "llmstudio"


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _print_status(ok: bool, message: str) -> None:
    prefix = "[OK]" if ok else "[FAIL]"
    print(f"{prefix} {message}")


def check_files() -> bool:
    expected = [
        CFG_DIR / "agents.json",
        CFG_DIR / "assistants.json",
        CFG_DIR / "codeploit.json",
    ]
    ok = True
    for path in expected:
        exists = path.exists()
        _print_status(exists, f"Config file present: {path.relative_to(ROOT)}")
        ok = ok and exists

    if not ok:
        return False

    agents = _load_json(CFG_DIR / "agents.json")
    assistants = _load_json(CFG_DIR / "assistants.json")
    codeploit = _load_json(CFG_DIR / "codeploit.json")

    agent_count = len(agents.get("agents", []))
    assistant_count = len(assistants.get("assistants", []))
    codeploit_id = codeploit.get("profile", {}).get("id")

    prompt_paths = [
        agent.get("system_prompt_file")
        for agent in agents.get("agents", [])
        if agent.get("system_prompt_file")
    ]
    missing_prompt_paths = [
        rel_path for rel_path in prompt_paths if not (ROOT / rel_path).exists()
    ]

    _print_status(agent_count >= 8, f"Agents configured: {agent_count} (expected >= 8)")
    _print_status(assistant_count >= 1, f"Assistants configured: {assistant_count} (expected >= 1)")
    _print_status(codeploit_id == "codeploit", f"CodePloit profile id: {codeploit_id}")
    _print_status(not missing_prompt_paths, f"Agent prompt files present: {len(prompt_paths) - len(missing_prompt_paths)}/{len(prompt_paths)}")

    return (
        agent_count >= 8
        and assistant_count >= 1
        and codeploit_id == "codeploit"
        and not missing_prompt_paths
    )


def check_llmstudio() -> bool:
    base_url = os.getenv("LLMSTUDIO_BASE_URL", "http://127.0.0.1:1234").rstrip("/")
    timeout = float(os.getenv("LLMSTUDIO_TIMEOUT_SECONDS", "5"))
    url = f"{base_url}/v1/models"
    req = Request(url=url, method="GET")

    try:
        with urlopen(req, timeout=timeout) as resp:  # nosec B310
            status_ok = 200 <= resp.status < 300
            _print_status(status_ok, f"LLMStudio reachable at {url} (status {resp.status})")
            return status_ok
    except (URLError, HTTPError, TimeoutError) as exc:
        _print_status(False, f"LLMStudio not reachable at {url}: {exc}")
        return False


def main() -> int:
    files_ok = check_files()
    service_ok = check_llmstudio()
    passed = files_ok and service_ok
    print("\nValidation result:", "PASS" if passed else "FAIL")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
