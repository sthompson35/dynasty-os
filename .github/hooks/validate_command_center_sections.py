import json
import re
import sys
from typing import Any, List, Tuple


REQUIRED_SECTIONS = [
    "Executive Command Snapshot",
    "Lead Engine Dashboard",
    "Deal Engine Decision And Threshold Check",
    "Capital Engine Position",
    "Operations Status",
    "Disposition Pathway Recommendation",
    "InvestorOS Lifecycle Status",
    "PropertyOS Digital Twin Completeness",
    "Smart Town Intelligence Highlights",
    "AI Trooper Routing Plan",
    "KPIs",
    "Decision",
]


def collect_text(node: Any, out: List[str]) -> None:
    if isinstance(node, str):
        out.append(node)
        return
    if isinstance(node, list):
        for item in node:
            collect_text(item, out)
        return
    if isinstance(node, dict):
        for key in [
            "assistantResponse",
            "response",
            "text",
            "content",
            "messages",
            "transcript",
        ]:
            if key in node:
                collect_text(node[key], out)


def fail(reason: str) -> None:
    payload = {
        "continue": False,
        "stopReason": reason,
        "systemMessage": reason,
    }
    print(json.dumps(payload))
    sys.exit(2)


def ok() -> None:
    print(json.dumps({"continue": True}))
    sys.exit(0)


def find_section_positions(text: str) -> List[Tuple[str, int]]:
    positions: List[Tuple[str, int]] = []
    for section in REQUIRED_SECTIONS:
        if section == "Operations Status":
            pattern = r"operations\s+status(?:\s*\([^\)]*\))?"
        elif section == "Decision":
            pattern = r"decision\s*:"
        else:
            pattern = re.escape(section)
        match = re.search(pattern, text, re.IGNORECASE)
        positions.append((section, match.start() if match else -1))
    return positions


def main() -> None:
    try:
        hook_input = json.load(sys.stdin)
    except Exception:
        ok()

    collected: List[str] = []
    collect_text(hook_input, collected)
    text = "\n".join(collected)
    lower = text.lower()

    if not text.strip():
        ok()

    # Enforce only when this appears to be a command-center style final output.
    trigger_tokens = [
        "executive command snapshot",
        "lead engine dashboard",
        "deal engine decision and threshold check",
        "decision:",
    ]
    token_hits = sum(1 for token in trigger_tokens if token in lower)
    if token_hits < 2:
        ok()

    positions = find_section_positions(text)
    missing = [name for name, pos in positions if pos < 0]
    if missing:
        fail(
            "Dynasty formatting check failed: missing required sections: "
            + ", ".join(missing)
        )

    last = -1
    for name, pos in positions:
        if pos <= last:
            fail(
                "Dynasty formatting check failed: sections are out of order. Expected exact order starts with: "
                + " -> ".join(REQUIRED_SECTIONS)
            )
        last = pos

    ok()


if __name__ == "__main__":
    main()
