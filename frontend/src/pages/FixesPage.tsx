import Footer from "../components/Footer";

const STFIXER_DOWNLOAD_URL =
  "https://github.com/OpenSteam001/OpenSteamTool/releases/latest/download/OpenSteamTool-1.4.8-Debug.zip";

export default function FixesPage() {
  return (
    <div
      style={{
        paddingTop: 64,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "30px 24px 40px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            marginBottom: 10,
          }}
        >
          Game Fixes & Support
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#9CA3AF",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          Patches and compatibility fixes for DiTXTools.
        </p>
      </div>

      {/* Fixes list */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "16px 24px 80px",
        }}
      >
        <div
          style={{
            background: "rgba(17,24,39,0.7)",
            border: "1.5px solid rgba(42,45,62,0.8)",
            borderRadius: 16,
            padding: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(168,85,247,0.12)",
                border: "1px solid rgba(168,85,247,0.25)",
                color: "#A855F7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>

            <div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  marginBottom: 8,
                }}
              >
                DiTXFixer (Required)
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#9CA3AF",
                  lineHeight: 1.7,
                  maxWidth: 520,
                }}
              >
                Fix that will solve the problem of games disappearing, changing to purchase, no internet connection. Extract and copy dwmapi.dll, xinput1_4.dll and OpenSteamTool.dll to your Steam root directory. Create a Lua config directory (for example C:\Program Files (x86)\Steam\config\lua) and place your Lua scripts there. NOT C:\Program Files (x86)\Steam\config\stplug-in.
              </p>

              <a
                href={STFIXER_DOWNLOAD_URL}
                download="OpenSteamTool-1.4.8-Debug.zip"
                style={{
                  background: "#A855F7",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "13px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(168,85,247,0.3)",
                  transition: "all 0.15s",
                  minWidth: 150,
                  marginTop: 18,
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
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
