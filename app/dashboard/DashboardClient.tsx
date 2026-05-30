"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopicEntry } from "@/components/abhyas/TopicEntry";
import { ProjectIdeaCard } from "@/components/abhyas/ProjectIdeaCard";
import { SavedIdeasSection } from "@/components/abhyas/SavedIdeasSection";
import { ActiveProjectsSection } from "@/components/abhyas/ActiveProjectsSection";
import {
  selectProject,
  getSavedProjects,
  bookmarkProject,
  removeBookmark,
  startSavedProject,
  getActiveProjects,
} from "@/actions/agents";
import type { SavedIdea, ActiveProject } from "@/actions/agents";
import type { ProjectIdea } from "@/schemas/agents";

const SESSION_KEY = "abhyas_search_results";
const ACTIVE_PROJECTS_SESSION_KEY = "abhyas_active_projects";

export function DashboardClient({ username }: { username: string }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [projects, setProjects] = useState<ProjectIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [resumingProjectId, setResumingProjectId] = useState<string | null>(
    null,
  );

  const hasResults = projects.length > 0 || isLoading;

  function getActiveProjectsFromSessionStorage(): ActiveProject[] {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = sessionStorage.getItem(ACTIVE_PROJECTS_SESSION_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed as ActiveProject[];
    } catch {
      return [];
    }
  }

  // Persist results to sessionStorage on every update so navigating back restores them
  // even if the user clicks a card before streaming finishes
  useEffect(() => {
    if (projects.length > 0 && topic) {
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ topic, projects }),
        );
      } catch {
        /* sessionStorage unavailable */
      }
    }
  }, [projects, topic]);

  useEffect(() => {
    getSavedProjects()
      .then(setSavedIdeas)
      .catch(() => {});

    // Restore previous search results when navigating back
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const { topic: t, projects: p } = JSON.parse(stored) as {
          topic: string;
          skillLevel: string;
          projects: ProjectIdea[];
        };
        if (p.length > 0) {
          setTopic(t);
          setProjects(p);
        }
      }
    } catch {
      // sessionStorage unavailable or corrupted — start fresh
    }
  }, []);

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
        try {
          sessionStorage.setItem(
            ACTIVE_PROJECTS_SESSION_KEY,
            JSON.stringify(projects),
          );
        } catch {}
      })
      .catch(() => {});
  }, []);

  const savedTitles = new Set(savedIdeas.map((s) => s.title));

  const handleSubmit = useCallback(
    async (submittedTopic: string, submittedSkillLevel: string) => {
      setIsLoading(true);
      setProjects([]);
      setError(null);
      setTopic(submittedTopic);
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch("/api/projects/ideate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: submittedTopic,
            skillLevel: submittedSkillLevel,
          }),
        });

        if (!res.ok) {
          const { error } = (await res.json()) as { error: string };
          if (error?.includes("onboarding")) {
            router.push("/onboarding");
            return;
          }
          throw new Error(error ?? "Something went wrong");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const project = JSON.parse(line) as ProjectIdea;
              setProjects((prev) => [...prev, project]);
            } catch {
              // malformed line: skip
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleSelect = useCallback(
    async (project: ProjectIdea) => {
      setSelectingId(project.id);
      try {
        const projectId = await selectProject(project, topic);
        router.push(`/projects/${projectId}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start project",
        );
        setSelectingId(null);
      }
    },
    [router, topic],
  );

  const handleBookmark = useCallback(
    async (project: ProjectIdea) => {
      const alreadySaved = savedTitles.has(project.title);

      if (alreadySaved) {
        const existing = savedIdeas.find((s) => s.title === project.title);
        if (!existing) return;
        setSavedIdeas((prev) => prev.filter((s) => s.id !== existing.id));
        try {
          await removeBookmark(existing.id);
        } catch {
          setSavedIdeas((prev) => [...prev, existing]);
        }
      } else {
        const tempId = `temp-${Date.now()}`;
        const optimistic: SavedIdea = {
          id: tempId,
          title: project.title,
          description: project.description,
          complexity: project.complexity,
          topic,
        };
        setSavedIdeas((prev) => [optimistic, ...prev]);
        try {
          const realId = await bookmarkProject(project, topic);
          setSavedIdeas((prev) =>
            prev.map((s) => (s.id === tempId ? { ...s, id: realId } : s)),
          );
        } catch {
          setSavedIdeas((prev) => prev.filter((s) => s.id !== tempId));
          setError("Could not save idea. Try again.");
        }
      }
    },
    [savedIdeas, savedTitles, topic],
  );

  const handleRemoveSaved = useCallback(async (idea: SavedIdea) => {
    setSavedIdeas((prev) => prev.filter((s) => s.id !== idea.id));
    try {
      await removeBookmark(idea.id);
    } catch {
      setSavedIdeas((prev) => [idea, ...prev]);
    }
  }, []);

  const handleStartSaved = useCallback(
    async (idea: SavedIdea) => {
      setStartingId(idea.id);
      try {
        await startSavedProject(idea.id);
        router.push(`/projects/${idea.id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start project",
        );
        setStartingId(null);
      }
    },
    [router],
  );

  return (
    <div className="space-y-10">
      {activeProjects.length > 0 && (
        <ActiveProjectsSection
          projects={activeProjects}
          onResume={(project) => {
            setResumingProjectId(project.id);
            router.push(`/projects/${project.id}`);
          }}
          resumingProjectId={resumingProjectId}
        />
      )}
      <SavedIdeasSection
        ideas={savedIdeas}
        startingId={startingId}
        onStart={handleStartSaved}
        onRemove={handleRemoveSaved}
      />

      {/* Topic entry: collapses to a compact strip once results arrive */}
      {!hasResults ? (
        <div className="space-y-5">
          {username && (
            <p className="text-sm" style={{ color: "#6b6b6b" }}>
              Good to have you back,{" "}
              <span className="font-medium" style={{ color: "#3d6b4f" }}>
                @{username}
              </span>
            </p>
          )}
          <TopicEntry onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      ) : (
        <div
          className="flex items-center justify-between py-3 px-4 rounded-xl"
          style={{ backgroundColor: "#f0f7f3", border: "1px solid #b8d9c5" }}
        >
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "#3d6b4f" }}
          >
            <span className="font-semibold">{topic}</span>
            {isLoading && (
              <span style={{ color: "#6b6b6b" }}>· finding projects…</span>
            )}
          </div>
          {!isLoading && (
            <button
              onClick={() => {
                setProjects([]);
                setError(null);
                try {
                  sessionStorage.removeItem(SESSION_KEY);
                } catch {
                  /* ignore */
                }
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-xs underline underline-offset-2"
              style={{ color: "#3d6b4f" }}
            >
              Search again
            </button>
          )}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg text-sm border"
          style={{
            backgroundColor: "#fef2f2",
            borderColor: "#fecaca",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}
      {isLoading && projects.length === 0 && (
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "#6b6b6b" }}
        >
          <span
            className="inline-block w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: "#3d6b4f" }}
          />
          Finding projects worth building…
        </div>
      )}
      {projects.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-baseline gap-3">
            <h2
              className="font-serif text-xl font-semibold"
              style={{ color: "#1c1c1c" }}
            >
              {isLoading
                ? `${projects.length} so far…`
                : `${projects.length} project${projects.length === 1 ? "" : "s"} for you`}
            </h2>
            {!isLoading && (
              <span className="text-sm" style={{ color: "#9b9b9b" }}>
                One will fit where you are right now.
              </span>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {projects.map((project, i) => (
              <ProjectIdeaCard
                key={project.id}
                project={project}
                index={i}
                isBookmarked={savedTitles.has(project.title)}
                onBookmark={handleBookmark}
                onSelect={handleSelect}
                isSelecting={selectingId === project.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
