"use client";

import type { ActiveProject } from "@/actions/agents";

interface ActiveProjectsSectionProps {
  projects: ActiveProject[];
  onResume: (project: ActiveProject) => void;
  resumingProjectId: string | null;
}

const COMPLEXITY_DOT: Record<string, string> = {
  beginner: "#3d6b4f",
  intermediate: "#854d0e",
  challenging: "#991b1b",
};

export function ActiveProjectsSection({
  projects,
  onResume,
  resumingProjectId,
}: ActiveProjectsSectionProps) {
  if (projects.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "#9b9b9b" }}
      >
        Continue learning{" "}
      </h2>
      <ul className="space-y-2">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
            style={{ backgroundColor: "#ffffff", borderColor: "#ddd8cf" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    COMPLEXITY_DOT[project.complexity] ?? "#9b9b9b",
                }}
              />
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "#1c1c1c" }}
                >
                  {project.title}
                </p>
                <p className="text-xs truncate" style={{ color: "#9b9b9b" }}>
                  {project.topic}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onResume(project)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity"
                style={{ backgroundColor: "#3d6b4f", color: "#ffffff" }}
              >
                {project.id === resumingProjectId ? "Opening" : "Resume"}
              </button>
              {/** TODO: Future improvement: Limit active projects to 3 and introduce pause/archive flow. */}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
