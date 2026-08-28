import { useState } from "react";
import { type Page, getPathFromPage } from "../router";

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Manifest Downloader", page: "manifest" },
    { label: "Fixes / Support", page: "fixes" },
  ];

  const handleNav = (page: Page) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(page);
    setMenuOpen(false);
  };

  const [discordHover, setDiscordHover] = useState(false);
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "rgba(15, 15, 19, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "2px solid rgba(42, 45, 62, 0.6)",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "0 clamp(24px, 5vw, 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          boxSizing: "border-box",
        }}
      >
        <a
          href="/"
          onClick={handleNav("home")}
          style={{
            background: "none",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <img
            src="/img/icoditx.png"
            alt="DiTXTools logo"
            width={32}
            height={32}
            style={{
              borderRadius: 8,
              objectFit: "contain",
              display: "block",
            }}
          />

          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#FAFAFA",
              letterSpacing: "-0.01em",
            }}
          >
            DiTXTools
          </span>
        </a>

        <div
          style={{ display: "flex", gap: 28, alignItems: "center" }}
          className="desktop-nav"
        >
          {navLinks.map(({ label, page }) => (
            <a
              key={page}
              href={getPathFromPage(page)}
              onClick={handleNav(page)}
              style={{
                background: "none",
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                color: currentPage === page ? "#A855F7" : "#9CA3AF",
                cursor: "pointer",
                padding: "8px 0",
                borderBottom:
                  currentPage === page
                    ? "2px solid #A855F7"
                    : "2px solid transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          ))}
          <a
            href="https://discord.gg/uewY5Jph2b"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setDiscordHover(true)}
            onMouseLeave={() => setDiscordHover(false)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: discordHover ? "#5865F2" : "rgba(255,255,255,0.05)",
              border: discordHover
                ? "1px solid #5865F2"
                : "1px solid rgba(255,255,255,0.1)",
              boxShadow: discordHover
                ? "0 0 14px rgba(88,101,242,.45)"
                : "none",
              transform: discordHover ? "scale(1.08)" : "scale(1)",
              transition: "all .2s ease",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: "50%",
                transform: discordHover
                  ? "translateX(-50%) translateY(0)"
                  : "translateX(-50%) translateY(-4px)",
                opacity: discordHover ? 1 : 0,
                pointerEvents: "none",
                transition: "opacity .2s ease, transform .2s ease",
                whiteSpace: "nowrap",
                padding: "4px 10px",
                borderRadius: 6,
                background: "#5865F2",
                color: "#fff",
                fontSize: 12,
              }}
            >
              Discord
            </span>

            <svg
              width="20"
              height="20"
              viewBox="0 0 127.14 96.36"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#ffffff"
                d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
              />
            </svg>
          </a>
        </div>

        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: "none",
            background: "none",
            border: "none",
            color: "#FAFAFA",
            padding: 8,
            cursor: "pointer",
          }}
        >
          <svg
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            background: "rgba(15, 15, 19, 0.98)",
            borderTop: "1px solid rgba(42,45,62,0.6)",
            padding: "16px 32px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {navLinks.map(({ label, page }) => (
            <a
              key={page}
              href={getPathFromPage(page)}
              onClick={handleNav(page)}
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                fontSize: 15,
                fontWeight: 600,
                color: currentPage === page ? "#A855F7" : "#9CA3AF",
                padding: "12px 0",
                cursor: "pointer",
                borderBottom: "1px solid rgba(42,45,62,0.4)",
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          ))}
          <a
            href="https://discord.gg/uewY5Jph2b"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            style={{
              textDecoration: "none",
              color: "#9CA3AF",
              fontSize: 15,
              fontWeight: 600,
              padding: "12px 0",
              borderBottom: "1px solid rgba(42,45,62,0.4)",
            }}
          >
            Discord
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
