import json
import re
import sys
from typing import Any, List


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
        return


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

    decision_tokens = ["go with conditions", "renegotiate", "hold", "kill", "decision:"]
    is_deal_output = any(token in lower for token in decision_tokens)

    if not is_deal_output:
        ok()

    threshold_checks = [
        (r"15\s*,?000|\$\s*15\s*,?000", "minimum wholesale fee $15,000"),
        (r"30\s*%", "minimum flip margin 30%"),
        (r"20\s*%", "worst-case ROI 20%+"),
        (r"25\s*%", "target ROI 25%+"),
        (r"1\.25\s*x|1\.25", "minimum DSCR 1.25x"),
        (r"70\s*%", "maximum LTV 70%"),
    ]

    missing_thresholds = [label for pattern, label in threshold_checks if not re.search(pattern, text, re.IGNORECASE)]
    if missing_thresholds:
        fail(
            "Dynasty compliance check failed: missing mandatory threshold references: "
            + ", ".join(missing_thresholds)
        )

    if "missing" in lower:
        has_owner = "owner" in lower
        has_timeline = "timeline" in lower or "due" in lower or "eta" in lower
        if not (has_owner and has_timeline):
            fail(
                "Dynasty compliance check failed: outputs with MISSING data must include owner and timeline fields."
            )

    ok()


if __name__ == "__main__":
    main()
