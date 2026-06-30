"""
Local helper for running Blender generator from VS Code.
Set BLENDER_PATH in .env or environment.

Usage:
  python scripts/run_blender_local.py              # background, starter script
  python scripts/run_blender_local.py --ui         # open Blender UI
  python scripts/run_blender_local.py --universal  # universal JSON-driven generator
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path


def detect_project_root() -> Path:
	"""Find repo root in a way that is resilient to unusual launch paths."""
	script_path = Path(__file__).resolve()
	cwd = Path.cwd().resolve()

	# Prefer directories that look like this repo.
	candidates = [script_path.parent, *script_path.parents, cwd, *cwd.parents]
	seen = set()
	for candidate in candidates:
		key = str(candidate)
		if key in seen:
			continue
		seen.add(key)
		if (candidate / "blender").exists() and (candidate / "scripts").exists():
			return candidate

	# Safe fallback: parent if available, otherwise current script directory.
	if len(script_path.parents) > 1:
		return script_path.parents[1]
	return script_path.parent


ROOT = detect_project_root()


def resolve_blender_path() -> str:
	env_path = os.getenv("BLENDER_PATH")
	if env_path and Path(env_path).exists():
		return env_path

	install_root = Path(r"C:\Program Files\Blender Foundation")
	candidates = sorted(install_root.glob("Blender */blender.exe"), reverse=True)
	if candidates:
		return str(candidates[0])

	return r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"


def sync_frontend_assets() -> None:
	"""Copy GLB + walkthrough manifest into the Next.js public folder."""
	public_models = ROOT / "frontend" / "public" / "models"
	public_data = ROOT / "frontend" / "public" / "data"
	public_models.mkdir(parents=True, exist_ok=True)
	public_data.mkdir(parents=True, exist_ok=True)

	glb_src = ROOT / "blender" / "exports" / "USDA_1BEDROOM_001.glb"
	walk_src = ROOT / "blender" / "exports" / "walkthrough.json"
	if glb_src.exists():
		dest = public_models / glb_src.name
		dest.write_bytes(glb_src.read_bytes())
		print(f"Synced GLB -> {dest}")
	if walk_src.exists():
		dest = public_data / "walkthrough.json"
		dest.write_bytes(walk_src.read_bytes())
		print(f"Synced walkthrough manifest -> {dest}")


def main() -> None:
	parser = argparse.ArgumentParser(description="Run Dynasty PropertyOS Blender generator")
	parser.add_argument("--ui", action="store_true", help="Open Blender UI instead of background mode")
	parser.add_argument("--universal", action="store_true", help="Use universal JSON-driven generator")
	args = parser.parse_args()

	blender = resolve_blender_path()
	if not Path(blender).exists():
		print(f"Blender not found at: {blender}", file=sys.stderr)
		sys.exit(1)

	if args.universal:
		script = ROOT / "blender" / "scripts" / "dynasty_propertyos_universal_blender.py"
		sample_json = ROOT / "blender" / "sample_data" / "universal_property_sample.json"
	else:
		script = ROOT / "blender" / "scripts" / "propertyos_blender_starter.py"
		sample_json = None

	cmd = [blender]
	if not args.ui:
		cmd.append("--background")
	cmd.extend(["--python", str(script)])
	if sample_json:
		cmd.extend(["--", str(sample_json)])

	print("Running:", " ".join(cmd))
	subprocess.run(cmd, check=True)
	if args.universal:
		sync_frontend_assets()


if __name__ == "__main__":
	main()
