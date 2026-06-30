"""ATLAS — Operations Commander. Routes operational tasks to the correct engine."""
from __future__ import annotations
from datetime import datetime
from typing import Any

from dynasty_os.engines.operations_engine import OperationsEngine, Project


class ATLASTrooper:
    name = "ATLAS"
    role = "Operations Commander"
    domain = "Operations Engine"
    capabilities = [
        "project oversight",
        "resource management",
        "execution monitoring",
        "risk alerts",
    ]

    def __init__(self) -> None:
        self._engine = OperationsEngine()
        self._active_projects: dict[str, Project] = {}

    def route(self, task: dict[str, Any]) -> dict[str, Any]:
        action = task.get("action", "")
        project_data = task.get("project", {})

        if action == "intake":
            return self._engine.intake.process(project_data)

        if action == "plan":
            project = self._resolve_project(project_data)
            return self._engine.planning.process(project, task.get("scope_items", []))

        if action == "update_task":
            project = self._resolve_project(project_data)
            return self._engine.execution.process(
                project,
                task.get("task_id", ""),
                task.get("new_status", "In Progress"),
                task.get("notes", ""),
            )

        if action == "inspect":
            project = self._resolve_project(project_data)
            return self._engine.quality.process(
                project.project_id,
                task.get("category", "General"),
                task.get("inspector", ""),
                task.get("result", "Pass"),
                task.get("notes", ""),
            )

        if action == "report":
            project = self._resolve_project(project_data)
            return self._engine.reporting.process(project)

        if action == "closeout":
            project = self._resolve_project(project_data)
            return self._engine.closeout.process(
                project,
                task.get("final_cost", project.actual_cost),
                task.get("punch_list_complete", False),
                task.get("coc_obtained", False),
            )

        return {"error": f"Unknown action: {action}", "available": ["intake", "plan", "update_task", "inspect", "report", "closeout"]}

    def _resolve_project(self, project_data: dict[str, Any]) -> Project:
        pid = project_data.get("project_id", "")
        if pid in self._active_projects:
            return self._active_projects[pid]
        project = Project(
            project_id=pid,
            property_id=project_data.get("property_id", ""),
            budget=project_data.get("budget", 0),
            status=project_data.get("status", "Planning"),
        )
        self._active_projects[pid] = project
        return project

    def get_status(self) -> dict[str, Any]:
        total = len(self._active_projects)
        by_status: dict[str, int] = {}
        for p in self._active_projects.values():
            by_status[p.status] = by_status.get(p.status, 0) + 1

        return {
            "trooper": self.name,
            "role": self.role,
            "active_projects": total,
            "status_breakdown": by_status,
            "engine_metrics": self._engine.get_metrics(),
            "checked_at": datetime.utcnow().isoformat(),
        }
