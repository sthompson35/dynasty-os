import os
import subprocess
import time
from datetime import datetime, timezone


INTERVAL = int(os.getenv("AI_WORKER_INTERVAL_SECONDS", "60"))


def log(message: str) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"[{timestamp}] [ai_worker] {message}", flush=True)


def run_validation_cycle() -> None:
    cmd = ["python", "scripts/validate_llmstudio_setup.py"]
    log(f"Running: {' '.join(cmd)}")
    completed = subprocess.run(cmd, capture_output=True, text=True)

    if completed.stdout:
        print(completed.stdout, flush=True)
    if completed.stderr:
        print(completed.stderr, flush=True)

    if completed.returncode == 0:
        log("Validation cycle PASS")
    else:
        log(f"Validation cycle FAIL (exit={completed.returncode})")


def main() -> None:
    log(f"Starting AI worker loop (interval={INTERVAL}s)")
    while True:
        try:
            run_validation_cycle()
        except Exception as exc:  # pragma: no cover
            log(f"Unexpected worker error: {exc}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
