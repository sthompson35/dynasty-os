import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path


INTERVAL = int(os.getenv("BLENDER_WORKER_INTERVAL_SECONDS", "60"))
RUN_ON_START = os.getenv("BLENDER_RUN_ON_START", "false").lower() == "true"
TRIGGER_FILE = Path(os.getenv("BLENDER_TRIGGER_FILE", "storage/blender_jobs/run.flag"))


def log(message: str) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"[{timestamp}] [blender_worker] {message}", flush=True)


def blender_available() -> bool:
    blender_path = os.getenv("BLENDER_PATH", "blender")
    try:
        result = subprocess.run([blender_path, "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            first_line = (result.stdout or "").splitlines()[0] if result.stdout else "detected"
            log(f"Blender available: {first_line}")
            return True
    except FileNotFoundError:
        pass
    except Exception as exc:  # pragma: no cover
        log(f"Blender probe error: {exc}")

    log("Blender is not available in this container. Waiting for proper BLENDER_PATH/image.")
    return False


def run_generator() -> None:
    cmd = ["python", "scripts/run_blender_local.py"]
    log(f"Running generator: {' '.join(cmd)}")
    completed = subprocess.run(cmd, capture_output=True, text=True)

    if completed.stdout:
        print(completed.stdout, flush=True)
    if completed.stderr:
        print(completed.stderr, flush=True)

    if completed.returncode == 0:
        log("Generator run PASS")
    else:
        log(f"Generator run FAIL (exit={completed.returncode})")


def consume_trigger_if_present() -> bool:
    if not TRIGGER_FILE.exists():
        return False
    try:
        TRIGGER_FILE.unlink()
    except Exception:
        pass
    log(f"Trigger detected via {TRIGGER_FILE}")
    return True


def main() -> None:
    log(f"Starting Blender worker loop (interval={INTERVAL}s)")

    has_blender = blender_available()
    if RUN_ON_START and has_blender:
        run_generator()

    while True:
        try:
            if has_blender and consume_trigger_if_present():
                run_generator()
        except Exception as exc:  # pragma: no cover
            log(f"Unexpected worker error: {exc}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
