"""Operations Engine — 10 sub-systems for project management and construction oversight."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


TASK_STATUSES = ["Not Started", "In Progress", "Blocked", "Inspection", "Complete"]
INSPECTION_RESULTS = ["Pass", "Conditional Pass", "Fail"]
PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Complete", "Cancelled"]
RISK_LEVELS = ["Low", "Moderate", "High", "Critical"]


@dataclass
class Project:
    project_id: str
    property_id: str
    status: str = "Planning"
    start_date: str = ""
    target_completion: str = ""
    budget: float = 0.0
    actual_cost: float = 0.0
    completion_percent: float = 0.0
    risk_score: str = "Low"
    tasks: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class ProjectIntakeEngine:
    """Validates and onboards new renovation/construction projects."""

    REQUIRED = ["project_id", "property_id", "budget"]

    def __init__(self) -> None:
        self._intakes: list[dict[str, Any]] = []

    def process(self, project_data: dict[str, Any]) -> dict[str, Any]:
        missing = [f for f in self.REQUIRED if not project_data.get(f)]
        result = {
            "project_id": project_data.get("project_id", ""),
            "valid": len(missing) == 0,
            "missing_fields": missing,
            "intake_at": datetime.utcnow().isoformat(),
        }
        self._intakes.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        valid = sum(1 for i in self._intakes if i["valid"])
        return {"total_intakes": len(self._intakes), "valid": valid}


class PlanningEngine:
    """Builds project scopes, schedules, and task breakdowns."""

    def __init__(self) -> None:
        self._plans: list[dict[str, Any]] = []

    def process(self, project: Project, scope_items: list[dict[str, Any]], target_days: int = 90) -> dict[str, Any]:
        tasks = [
            {
                "task_id": f"{project.project_id}_T{i+1}",
                "category": item.get("category", "General"),
                "description": item.get("description", ""),
                "budget": item.get("budget", 0),
                "assigned_to": item.get("assigned_to", "TBD"),
                "status": "Not Started",
                "due_date": item.get("due_date", ""),
            }
            for i, item in enumerate(scope_items)
        ]
        project.tasks = tasks
        plan = {
            "project_id": project.project_id,
            "task_count": len(tasks),
            "total_budget": sum(t["budget"] for t in tasks),
            "target_days": target_days,
            "planned_at": datetime.utcnow().isoformat(),
        }
        self._plans.append(plan)
        return plan

    def get_metrics(self) -> dict[str, Any]:
        return {"total_plans_created": len(self._plans)}


class ResourceEngine:
    """Allocates labor, equipment, and materials to projects."""

    def __init__(self) -> None:
        self._assignments: list[dict[str, Any]] = []

    def process(self, project_id: str, resource_type: str, resource_id: str, role: str) -> dict[str, Any]:
        assignment = {
            "project_id": project_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "role": role,
            "assigned_at": datetime.utcnow().isoformat(),
        }
        self._assignments.append(assignment)
        return assignment

    def get_metrics(self) -> dict[str, Any]:
        by_type: dict[str, int] = {}
        for a in self._assignments:
            t = a["resource_type"]
            by_type[t] = by_type.get(t, 0) + 1
        return {"total_assignments": len(self._assignments), "by_type": by_type}


class ProcurementEngine:
    """Manages vendor selection, purchase orders, and material delivery."""

    def __init__(self) -> None:
        self._purchase_orders: list[dict[str, Any]] = []

    def process(self, project_id: str, vendor_id: str, items: list[dict[str, Any]]) -> dict[str, Any]:
        total = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in items)
        po = {
            "po_id": f"PO-{project_id}-{len(self._purchase_orders)+1:04d}",
            "project_id": project_id,
            "vendor_id": vendor_id,
            "items": items,
            "total": round(total, 2),
            "status": "Pending",
            "ordered_at": datetime.utcnow().isoformat(),
        }
        self._purchase_orders.append(po)
        return po

    def get_metrics(self) -> dict[str, Any]:
        total_spend = sum(po["total"] for po in self._purchase_orders)
        by_status: dict[str, int] = {}
        for po in self._purchase_orders:
            s = po["status"]
            by_status[s] = by_status.get(s, 0) + 1
        return {"total_pos": len(self._purchase_orders), "total_spend": total_spend, "by_status": by_status}


class ExecutionEngine:
    """Tracks live project execution, task progress, and blocker resolution."""

    def __init__(self) -> None:
        self._updates: list[dict[str, Any]] = []

    def process(self, project: Project, task_id: str, new_status: str, notes: str = "") -> dict[str, Any]:
        for task in project.tasks:
            if task["task_id"] == task_id:
                task["status"] = new_status
                task["last_updated"] = datetime.utcnow().isoformat()
                break

        completed = sum(1 for t in project.tasks if t["status"] == "Complete")
        total = len(project.tasks)
        project.completion_percent = round((completed / total) * 100, 1) if total else 0.0

        update = {
            "project_id": project.project_id,
            "task_id": task_id,
            "new_status": new_status,
            "completion_percent": project.completion_percent,
            "notes": notes,
            "updated_at": datetime.utcnow().isoformat(),
        }
        self._updates.append(update)
        return update

    def get_metrics(self) -> dict[str, Any]:
        by_status: dict[str, int] = {}
        for u in self._updates:
            s = u["new_status"]
            by_status[s] = by_status.get(s, 0) + 1
        return {"total_updates": len(self._updates), "by_status": by_status}


class QualityEngine:
    """Manages inspections, punch lists, and quality sign-offs."""

    CATEGORIES = [
        "Structural", "Electrical", "Mechanical", "Plumbing",
        "Finish Work", "Safety", "Code Compliance",
    ]

    def __init__(self) -> None:
        self._inspections: list[dict[str, Any]] = []

    def process(self, project_id: str, category: str, inspector: str, result: str, notes: str = "") -> dict[str, Any]:
        inspection = {
            "inspection_id": f"INS-{project_id}-{len(self._inspections)+1:04d}",
            "project_id": project_id,
            "category": category,
            "inspector": inspector,
            "result": result,
            "notes": notes,
            "inspected_at": datetime.utcnow().isoformat(),
        }
        self._inspections.append(inspection)
        return inspection

    def get_metrics(self) -> dict[str, Any]:
        by_result: dict[str, int] = {}
        for i in self._inspections:
            r = i["result"]
            by_result[r] = by_result.get(r, 0) + 1
        return {"total_inspections": len(self._inspections), "by_result": by_result}


class FinancialControlEngine:
    """Tracks project spend, budget variance, and change orders."""

    def __init__(self) -> None:
        self._transactions: list[dict[str, Any]] = []

    def process(self, project: Project, amount: float, category: str, description: str = "") -> dict[str, Any]:
        project.actual_cost += amount
        variance = project.budget - project.actual_cost
        tx = {
            "project_id": project.project_id,
            "amount": amount,
            "category": category,
            "description": description,
            "running_total": round(project.actual_cost, 2),
            "budget_remaining": round(variance, 2),
            "over_budget": variance < 0,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        self._transactions.append(tx)
        return tx

    def get_metrics(self) -> dict[str, Any]:
        total_spent = sum(t["amount"] for t in self._transactions)
        over_budget = sum(1 for t in self._transactions if t["over_budget"])
        return {
            "total_transactions": len(self._transactions),
            "total_spent": round(total_spent, 2),
            "over_budget_events": over_budget,
        }


class RiskManagementEngine:
    """Identifies and tracks project risks: contractor, weather, supply, budget."""

    def __init__(self) -> None:
        self._risks: list[dict[str, Any]] = []

    def process(self, project: Project, risk_type: str, description: str, severity: str = "Moderate") -> dict[str, Any]:
        risk = {
            "project_id": project.project_id,
            "risk_type": risk_type,
            "description": description,
            "severity": severity,
            "status": "Open",
            "identified_at": datetime.utcnow().isoformat(),
        }
        self._risks.append(risk)

        open_high = sum(1 for r in self._risks if r["severity"] in ("High", "Critical") and r["status"] == "Open")
        if open_high >= 2:
            project.risk_score = "High"
        elif open_high == 1:
            project.risk_score = "Moderate"

        return risk

    def get_metrics(self) -> dict[str, Any]:
        by_severity: dict[str, int] = {}
        for r in self._risks:
            s = r["severity"]
            by_severity[s] = by_severity.get(s, 0) + 1
        return {"total_risks": len(self._risks), "by_severity": by_severity}


class ReportingEngine:
    """Generates project status reports, owner updates, and investor summaries."""

    def __init__(self) -> None:
        self._reports: list[dict[str, Any]] = []

    def process(self, project: Project) -> dict[str, Any]:
        report = {
            "project_id": project.project_id,
            "status": project.status,
            "completion_percent": project.completion_percent,
            "budget": project.budget,
            "actual_cost": project.actual_cost,
            "budget_variance": round(project.budget - project.actual_cost, 2),
            "risk_score": project.risk_score,
            "task_summary": {
                status: sum(1 for t in project.tasks if t.get("status") == status)
                for status in TASK_STATUSES
            },
            "generated_at": datetime.utcnow().isoformat(),
        }
        self._reports.append(report)
        return report

    def get_metrics(self) -> dict[str, Any]:
        return {"total_reports_generated": len(self._reports)}


class CloseoutEngine:
    """Manages project closeout: final inspection, warranty, document handoff."""

    def __init__(self) -> None:
        self._closeouts: list[dict[str, Any]] = []

    def process(self, project: Project, final_cost: float, punch_list_complete: bool, coc_obtained: bool) -> dict[str, Any]:
        project.status = "Complete" if punch_list_complete and coc_obtained else "On Hold"
        project.actual_cost = final_cost
        closeout = {
            "project_id": project.project_id,
            "final_cost": final_cost,
            "budget": project.budget,
            "cost_variance": round(project.budget - final_cost, 2),
            "punch_list_complete": punch_list_complete,
            "certificate_of_occupancy": coc_obtained,
            "project_status": project.status,
            "closed_at": datetime.utcnow().isoformat(),
        }
        self._closeouts.append(closeout)
        return closeout

    def get_metrics(self) -> dict[str, Any]:
        completed = sum(1 for c in self._closeouts if c["project_status"] == "Complete")
        return {"total_closeouts": len(self._closeouts), "completed": completed}


class OperationsEngine:
    """Master orchestrator for all 10 Operations Engine sub-systems."""

    def __init__(self) -> None:
        self.intake = ProjectIntakeEngine()
        self.planning = PlanningEngine()
        self.resources = ResourceEngine()
        self.procurement = ProcurementEngine()
        self.execution = ExecutionEngine()
        self.quality = QualityEngine()
        self.financial_control = FinancialControlEngine()
        self.risk_management = RiskManagementEngine()
        self.reporting = ReportingEngine()
        self.closeout = CloseoutEngine()

    def get_metrics(self) -> dict[str, Any]:
        return {
            "intake": self.intake.get_metrics(),
            "planning": self.planning.get_metrics(),
            "resources": self.resources.get_metrics(),
            "procurement": self.procurement.get_metrics(),
            "execution": self.execution.get_metrics(),
            "quality": self.quality.get_metrics(),
            "financial_control": self.financial_control.get_metrics(),
            "risk_management": self.risk_management.get_metrics(),
            "reporting": self.reporting.get_metrics(),
            "closeout": self.closeout.get_metrics(),
        }


__all__ = [
    "Project",
    "TASK_STATUSES",
    "INSPECTION_RESULTS",
    "PROJECT_STATUSES",
    "ProjectIntakeEngine",
    "PlanningEngine",
    "ResourceEngine",
    "ProcurementEngine",
    "ExecutionEngine",
    "QualityEngine",
    "FinancialControlEngine",
    "RiskManagementEngine",
    "ReportingEngine",
    "CloseoutEngine",
    "OperationsEngine",
]
