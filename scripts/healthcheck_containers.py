import argparse
import json
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.error import URLError
from urllib.request import urlopen


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def check_http(url: str, timeout: float) -> tuple[bool, str]:
    try:
        with urlopen(url, timeout=timeout) as response:  # nosec B310 - local health checks only
            status = response.status
            if 200 <= status < 400:
                return True, f"HTTP {status}"
            return False, f"HTTP {status}"
    except URLError as exc:
        return False, f"connection error: {exc}"
    except Exception as exc:  # pragma: no cover
        return False, f"unexpected error: {exc}"


def check_tcp(host: str, port: int, timeout: float) -> tuple[bool, str]:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True, "TCP reachable"
    except OSError as exc:
        return False, f"connection error: {exc}"


def check_compose_services(compose_file: Path, expected: set[str]) -> tuple[bool, str]:
    cmd = [
        "docker",
        "compose",
        "-f",
        str(compose_file),
        "ps",
        "--services",
        "--filter",
        "status=running",
    ]
    try:
        completed = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return False, "docker command not found"

    if completed.returncode != 0:
        stderr = completed.stderr.strip() or "docker compose ps failed"
        return False, stderr

    running = {line.strip() for line in completed.stdout.splitlines() if line.strip()}
    missing = sorted(expected - running)
    if missing:
        return False, f"missing running services: {', '.join(missing)}"
    return True, "all expected services are running"


def run_check(
    name: str,
    fn: Callable[[], tuple[bool, str]],
    retries: int,
    delay_seconds: float,
) -> CheckResult:
    last_detail = "not executed"
    for attempt in range(1, retries + 1):
        ok, detail = fn()
        if ok:
            if attempt == 1:
                return CheckResult(name=name, ok=True, detail=detail)
            return CheckResult(name=name, ok=True, detail=f"{detail} (recovered on attempt {attempt})")
        last_detail = detail
        if attempt < retries:
            time.sleep(delay_seconds)
    return CheckResult(name=name, ok=False, detail=last_detail)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify dockerized stack health from host endpoints.")
    parser.add_argument("--host", default="127.0.0.1", help="Host used for endpoint and TCP checks")
    parser.add_argument("--timeout", type=float, default=3.0, help="Timeout per check in seconds")
    parser.add_argument("--retries", type=int, default=3, help="Retries per check")
    parser.add_argument("--retry-delay", type=float, default=2.0, help="Delay between retries in seconds")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.retries < 1:
        print("retries must be >= 1")
        return 2

    repo_root = Path(__file__).resolve().parents[1]
    compose_file = repo_root / "docker-compose.yml"

    checks: list[tuple[str, Callable[[], tuple[bool, str]]]] = [
        (
            "compose services",
            lambda: check_compose_services(
                compose_file,
                {
                    "postgres",
                    "redis",
                    "api",
                    "frontend",
                    "n8n",
                    "ai_worker",
                    "blender_worker",
                },
            ),
        ),
        (
            "frontend",
            lambda: check_http(f"http://{args.host}:3005/", timeout=args.timeout),
        ),
        (
            "api health",
            lambda: check_http(f"http://{args.host}:8010/health", timeout=args.timeout),
        ),
        (
            "api docs",
            lambda: check_http(f"http://{args.host}:8010/docs", timeout=args.timeout),
        ),
        (
            "api llmstudio health",
            lambda: check_http(f"http://{args.host}:8010/api/llmstudio/health", timeout=args.timeout),
        ),
        (
            "n8n",
            lambda: check_http(f"http://{args.host}:5678/", timeout=args.timeout),
        ),
        (
            "postgres tcp",
            lambda: check_tcp(args.host, 5433, timeout=args.timeout),
        ),
        (
            "redis tcp",
            lambda: check_tcp(args.host, 6379, timeout=args.timeout),
        ),
    ]

    print("Container Healthcheck")
    print("-" * 60)

    results: list[CheckResult] = []
    for name, fn in checks:
        result = run_check(name, fn, retries=args.retries, delay_seconds=args.retry_delay)
        results.append(result)
        status = "PASS" if result.ok else "FAIL"
        print(f"[{status}] {name:<22} {result.detail}")

    print("-" * 60)

    failed = [r for r in results if not r.ok]
    summary = {
        "checks_total": len(results),
        "checks_failed": len(failed),
        "failed_checks": [r.name for r in failed],
    }
    print(json.dumps(summary, indent=2))

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
