"use client";
import Link from "next/link";

interface NavBarProps {
  activePage: "dashboard" | "continue";
  userName: string;
  avatarUrl: string;
}

export function AppNavbar({ activePage, userName, avatarUrl }: NavBarProps) {
  return (
    <nav
      className="flex items-center justify-between px-8 py-5"
      style={{ borderBottom: "1px solid #e8e3da" }}
    >
      <div>
        <span className="font-serif text-lg font-semibold tracking-tight">
          Abhyas<span style={{ color: "#3d6b4f" }}>.ai</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/continue"
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={
            activePage === "continue"
              ? {
                  // backgroundColor: "#eef6f1",
                  color: "#2f5f43",
                  fontWeight: "bold",
                }
              : { color: "#6b6b6b" }
          }
        >
          Continue Learning
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={
            activePage === "dashboard"
              ? {
                  // backgroundColor: "#eef6f1",
                  color: "#2f5f43",
                  fontWeight: "bold",
                }
              : { color: "#6b6b6b" }
          }
        >
          Dashboard
        </Link>
        {avatarUrl && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={userName ?? ""}
              className="w-7 h-7 rounded-full"
              style={{ border: "1.5px solid #ddd8cf" }}
            />
            <span className="text-sm" style={{ color: "#6b6b6b" }}>
              @{userName}
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
