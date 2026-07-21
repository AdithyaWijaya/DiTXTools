import { useState } from "react";

export default function Footer() {
  const [hovered, setHovered] = useState<string | null>(null);

  const links = [
    {
      name: "SteamDB",
      href: "https://steamdb.info",
      icon: "/img/SteamDB.png",
      hoverColor: "#8A8F98",
    },
    {
      name: "Steamtools",
      href: "https://steamtools.net",
      icon: "/img/Steamtools.png",
      hoverColor: "#F97316",
    },
    {
      name: "Discord",
      href: "https://discord.gg/uewY5Jph2b",
      icon: "svg",
      hoverColor: "#5865F2",
    },
  ];

  return (
    <footer
      style={{
        borderTop: "2px solid rgba(42,45,62,0.5)",
        padding: "32px 24px",
        textAlign: "center",
        marginTop: "auto",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {links.map((link) => {
          const isHovered = hovered === link.name;
          return (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered(link.name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: isHovered
                  ? link.hoverColor
                  : "rgba(255,255,255,0.05)",
                border: isHovered
                  ? `1px solid ${link.hoverColor}`
                  : "1px solid rgba(255,255,255,0.1)",
                boxShadow: isHovered
                  ? `0 0 14px ${link.hoverColor}80`
                  : "none",
                transform: isHovered ? "scale(1.1)" : "scale(1)",
                transition: "all 0.2s ease",
                textDecoration: "none",
              }}
            >
              {/* Tooltip nama */}
              <span
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: isHovered
                    ? "translateX(-50%) translateY(0)"
                    : "translateX(-50%) translateY(4px)",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  color: "#FFFFFF",
                  backgroundColor: isHovered
                    ? link.hoverColor
                    : "rgba(20,20,30,0.95)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  opacity: isHovered ? 1 : 0,
                  pointerEvents: "none",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                }}
              >
                {link.name}
              </span>

              {/* Icon */}
              {link.icon === "svg" ? (
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
              ) : (
                <img
                  src={link.icon}
                  alt={link.name}
                  width={20}
                  height={20}
                  style={{ objectFit: "contain" }}
                />
              )}
            </a>
          );
        })}
      </div>

      <p
        style={{
          fontSize: 13,
          color: "#9CA3AF",
          margin: 0,
        }}
      >
        © 2026 DiTXTools. All rights reserved.
      </p>
    </footer>
  );
}
