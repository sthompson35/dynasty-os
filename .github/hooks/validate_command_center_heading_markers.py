import json
import re
import sys
from typing import Any, List


REQUIRED_NUMBERED_HEADINGS = [
    r"1\.\s+Executive\s+Command\s+Snapshot",
    r"2\.\s+Lead\s+Engine\s+Dashboard",
    r"3\.\s+Deal\s+Engine\s+Decision\s+And\s+Threshold\s+Check",
    r"4\.\s+Capital\s+Engine\s+Position",
    r"5\.\s+Operations\s+Status(?:\s*\([^\)]*\))?",
    r"6\.\s+Disposition\s+Pathway\s+Recommendation",
    r"7\.\s+InvestorOS\s+Lifecycle\s+Status",
    r"8\.\s+PropertyOS\s+Digital\s+Twin\s+Completeness",
    r"9\.\s+Smart\s+Town\s+Intelligence\s+Highlights",
    r"10\.\s+AI\s+Trooper\s+Routing\s+Plan",
    r"11\.\s+KPIs",
    r"12\.\s+Decision\s*:",
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

    # Run only when this looks like command-center output.
    trigger_tokens = [
        "executive command snapshot",
        "lead engine dashboard",
        "deal engine decision and threshold check",
        "decision",
    ]
    token_hits = sum(1 for token in trigger_tokens if token in lower)
    if token_hits < 2:
        ok()

    last_pos = -1
    for idx, pattern in enumerate(REQUIRED_NUMBERED_HEADINGS, start=1):
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            fail(
                f"Dynasty heading marker check failed: missing exact numbered heading marker for section {idx}."
            )
        if match.start() <= last_pos:
            fail(
                "Dynasty heading marker check failed: numbered headings are out of order. Expected 1. through 12. in sequence."
            )
        last_pos = match.start()

    ok()


if __name__ == "__main__":
    main()
