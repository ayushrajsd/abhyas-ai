"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getActiveProjects } from "@/actions/agents";
import type { ActiveProject } from "@/actions/agents";
import { ActiveProjectsSection } from "@/components/abhyas/ActiveProjectsSection";

const ACTIVE_PROJECTS_SESSION_KEY = "abhyas_active_projects";

export function ContinueClient() {
  const router = useRouter();
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [resumingProjectId, setResumingProjectId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // get active project on re-visit
  useEffect(() => {
    try {
      const storedActiveProjects = sessionStorage.getItem(
        ACTIVE_PROJECTS_SESSION_KEY,
      );
      if (storedActiveProjects) {
        const projects = JSON.parse(storedActiveProjects) as ActiveProject[];
        if (projects.length > 0) {
          setActiveProjects(projects);
        }
      }
    } catch {
      // sessionStorage unavailable or corrupted — start fresh
    }

    getActiveProjects()
      .then((projects) => {
        // console.log(projects);

        setActiveProjects(projects);
        setLoading(false);
        try {
          sessionStorage.setItem(
            ACTIVE_PROJECTS_SESSION_KEY,
            JSON.stringify(projects),
          );
        } catch {}
      })
      .catch(() => {
        setLoading(false);
        setError("Could not load active projects. Please try again.");
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="max-w-4xl mx-auto px-8  space-y-10">
        <header className="space-y-2">
          <h1
            className="font-serif text-3xl font-semibold leading-snug"
            style={{ color: "#1c1c1c" }}
          >
            Pick up where you left off.
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: "#6b6b6b" }}>
            Resume an active project and keep moving one milestone at a time.
          </p>
        </header>
        {error && (
          <div
            role="alert"
            className="rounded-xl px-5 py-4 text-sm border bg-red-50 border-red-200 text-red-800"
          >
            {error}
          </div>
        )}
        <section>
          {loading && (
            <div
              className="rounded-xl px-5 py-4 text-sm"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e8e3da",
                color: "#6b6b6b",
              }}
            >
              Loading active projects...
            </div>
          )}
        </section>
        {!loading && activeProjects.length > 0 && (
          <ActiveProjectsSection
            projects={activeProjects}
            onResume={(project) => {
              setResumingProjectId(project.id);
              router.push(`/projects/${project.id}`);
            }}
            resumingProjectId={resumingProjectId}
          />
        )}{" "}
        {!loading && activeProjects.length === 0 && !error && (
          <div
            className="rounded-xl border px-6 py-8 text-center space-y-4"
            style={{ backgroundColor: "#ffffff", borderColor: "#e8e3da" }}
          >
            <div className="space-y-1">
              <h2
                className="font-serif text-xl font-semibold"
                style={{ color: "#1c1c1c" }}
              >
                No active projects yet.
              </h2>

              <p
                className="text-sm leading-relaxed"
                style={{ color: "#6b6b6b" }}
              >
                Start a project from the dashboard and it will appear here.
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#3d6b4f", color: "#ffffff" }}
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
