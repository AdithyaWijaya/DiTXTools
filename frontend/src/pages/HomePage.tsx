import { useState } from "react";
import "./css/HomePage.css";
type Page = "home" | "manifest" | "fixes";

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

function CopyCommand() {
  const [copied, setCopied] = useState(false);
  const cmd = "irm steam.run | iex";

  const handleCopy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        background: "rgba(15, 15, 19, 0.8)",
        border: "1px solid rgba(168, 85, 247, 0.35)",
        borderRadius: 10,
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            color: "#A855F7",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "monospace",
          }}
        >
          $
        </span>
        <code
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 14,
            fontWeight: 500,
            color: "#FAFAFA",
            letterSpacing: "0.02em",
          }}
        >
          {cmd}
        </code>
      </div>
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        style={{
          background: copied ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.12)",
          border: "none",
          borderLeft: "1px solid rgba(168,85,247,0.2)",
          color: copied ? "#22C55E" : "#A855F7",
          padding: "12px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          transition: "all 0.15s",
        }}
      >
        {copied ? (
          <svg
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}

const TOOLS = [
  {
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    title: "Manifest Downloader",
    description:
      "Search any Steam game by name or App ID and instantly download the depot manifest ZIP file.",
    badge: "Popular",
    badgeColor: "#A855F7",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: "Fixes / Support",
    description:
      "Community-maintained patches, workarounds and compatibility fixes for common Steam game issues.",
    badge: "Fix available",
    badgeColor: "#9CA3AF",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "DLCs Games",
    description:
      "Get all DLCs through Melvinz to experience the ultimate version of the game.",
    badge: "99.9%",
    badgeColor: "#EC4899",
  },
];

const TEAM = [
  {
    handle: "xDITT4GT++",
    role: "CEO & Project Lead",
    image: "/img/xDITT4GT++.jpg",
    color: "#A855F7",
    bio: "Leads the DiTXTools project, defines product direction, coordinates development, and oversees strategic decisions.",
  },
  {
    handle: "Adithya",
    role: "Frontend & Design",
    image: "/img/Adithya.jpg",
    color: "#EC4899",
    bio: "Designs and develops the user interface, focusing on user experience, visual consistency, and responsive layouts.",
  },
  {
    handle: "Wijaya",
    role: "Backend & Support",
    image: "/img/Wijaya.jpg",
    color: "#3B82F6",
    bio: "Develops backend services, maintains system stability, and provides technical support for users and community members.",
  },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div style={{ paddingTop: 64, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Hero ── */}
      <section
        className="hero-section"
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        {/* Glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 600,
            background:
              "radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "20%",
            width: 300,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(236,72,153,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#FFFFFF",
            maxWidth: 800,
            marginBottom: 24,
          }}
        >
          DiTXTools{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #A855F7, #EC4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MuanifestGen
          </span>
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#9CA3AF",
            maxWidth: 560,
            lineHeight: 1.7,
            marginBottom: 48,
            fontWeight: 400,
          }}
        >
          DiTXTools provides fast, reliable utilities for downloading Steam
          manifests, applying game fixes.
        </p>

        {/* Install command block */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#9CA3AF",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Install SteamTools First
          </p>
          <CopyCommand />
        </div>

        {/* CTA Buttons */}
        <div
          className="cta-buttons"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          <button
            onClick={() => onNavigate("manifest")}
            style={{
              flex: 1,
              whiteSpace: "nowrap",
              justifyContent: "center",
              background: "#A855F7",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 30px rgba(168,85,247,0.4)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#9333EA";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#A855F7";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Manifest
          </button>
          <button
            onClick={() => onNavigate("fixes")}
            style={{
              flex: 1,
              whiteSpace: "nowrap",
              justifyContent: "center",
              background: "transparent",
              color: "#9CA3AF",
              border: "1.5px solid rgba(42,45,62,0.8)",
              borderRadius: 10,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)";
              e.currentTarget.style.color = "#FAFAFA";
              e.currentTarget.style.background = "rgba(168,85,247,0.06)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(168,85,247,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(42,45,62,0.8)";
              e.currentTarget.style.color = "#9CA3AF";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Browse Fixes & Support
          </button>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          {[
            { val: "119k+", label: "Total Games" },
            { val: "11,881", label: "Complete Editions" },
            { val: "28.7 GB", label: "DB Total Size" },
          ].map((s) => (
            <div
              key={s.label}
              className="stats-item"
              style={{
                textAlign: "center",
              }}
            >
              <div
                className="stats-value"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#A855F7",
                  letterSpacing: "-0.02em",
                }}
              >
                {s.val}
              </div>
              <div
                className="stats-label"
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tools ── */}
      <section
        style={{ width: "100%", padding: "0px 24px", maxWidth: 1200, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#A855F7",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Tools & Utilities
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
            }}
          >
            Everything you need
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#9CA3AF",
              marginTop: 14,
              maxWidth: 480,
              margin: "14px auto 0",
            }}
          >
            A growing suite of open-source Steam utilities built for the
            community.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {TOOLS.map((tool) => (
            <div
              key={tool.title}
              style={{
                background: "rgba(17, 24, 39, 0.5)",
                border: "1px solid rgba(42,45,62,0.8)",
                borderRadius: 16,
                padding: 28,
                transition: "all 0.25s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(168,85,247,0.4)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(-3px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 12px 30px rgba(168,85,247,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(42,45,62,0.8)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(168,85,247,0.12)",
                    border: "1px solid rgba(168,85,247,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#A855F7",
                  }}
                >
                  {tool.icon}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: `${tool.badgeColor}20`,
                    color: tool.badgeColor,
                    border: `1px solid ${tool.badgeColor}40`,
                    padding: "3px 10px",
                    borderRadius: 999,
                    letterSpacing: "0.05em",
                  }}
                >
                  {tool.badge}
                </span>
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  marginBottom: 10,
                }}
              >
                {tool.title}
              </h3>
              <p style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.65 }}>
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ── */}
      <section
        style={{
          padding: "100px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#EC4899",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Our Leadership
            </p>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
              }}
            >
              Meet Our Team
            </h2>
            <p style={{ fontSize: 16, color: "#9CA3AF", marginTop: 14 }}>
              A small team of passionate developers building tools they wish
              existed.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 24,
            }}
          >
            {TEAM.map((member) => (
              <div
                key={member.handle}
                style={{
                  background: "rgba(26, 29, 39, 0.6)",
                  border: "1px solid rgba(42,45,62,0.6)",
                  borderRadius: 16,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${member.color}50`;
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 12px 30px ${member.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(42,45,62,0.6)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <img
                    src={member.image}
                    alt={member.handle}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#FFFFFF",
                      }}
                    >
                      {member.handle}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: member.color,
                        fontWeight: 500,
                      }}
                    >
                      {member.role}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.65 }}>
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Discord Community ── */}
      <section
        style={{
          padding: "0px 24px",
          marginBottom: 48,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 50 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#EC4899",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Community
            </p>

            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
              }}
            >
              Need Support?
            </h2>

            <p
              style={{
                fontSize: 16,
                color: "#9CA3AF",
                marginTop: 14,
              }}
            >
              Join our Discord server to get support, report bugs, and connect
              with the community.
            </p>
          </div>

          <a
            href="https://discord.gg/uewY5Jph2b"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: "100%",
              maxWidth: 320,
              height: 70,

              margin: "0 auto",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,


              background: "rgba(88,101,242,.08)",
              border: "2px solid rgba(88,101,242,.35)",
              borderRadius: 28,

              color: "#FFF",
              textDecoration: "none",

              fontSize: 16,
              fontWeight: 700,


              transition: "all .2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(88,101,242,.14)";
              e.currentTarget.style.borderColor = "#5865F2";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(88,101,242,.08)";
              e.currentTarget.style.borderColor = "rgba(88,101,242,.35)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 127.14 96.36"
              width="30"
              height="30"

              fill="#5865F2"
            >
              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0 105.89 105.89 0 0 0 19.39 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2.05a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.67 2.05a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1A105.25 105.25 0 0 0 126.6 80.22c2.64-27.38-4.5-51.12-18.9-72.15ZM42.45 65.69c-6.27 0-11.41-5.73-11.41-12.78S36.06 40.13 42.45 40.13c6.44 0 11.5 5.78 11.41 12.78.01 7.05-5.06 12.78-11.41 12.78Zm42.24 0c-6.27 0-11.41-5.73-11.41-12.78s5.02-12.78 11.41-12.78c6.44 0 11.5 5.78 11.41 12.78 0 7.05-5.02 12.78-11.41 12.78Z" />
            </svg>

            <span>Join Discord Server</span>
          </a>
        </div>
      </section>
    </div>
  );
}
