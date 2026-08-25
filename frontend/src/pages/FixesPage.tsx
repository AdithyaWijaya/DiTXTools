const fixes = [
  {
    icon: "gear",
    title: "SteamTool Setup",
    description:
      "Fast login, batch management, authorized login, game updates. Play genuine games with cloud saves, achievements, remote play, multiplayer, and workshop support. Drag & Manifest files to the steamtools icon. For lua files create lua folder on C:\\Program Files (x86)\\Steam\\config\\lua and place your lua files there if you using DiTXFixer.",
    url: "https://steamtools.net/res/st-setup-1.8.30.exe",
    download: "st-setup-1.8.30.exe",
  },
  {
    icon: "wrench",
    title: "DiTXFixer (Required)",
    description:
      "Fix that will solve the problem of games disappearing, changing to purchase, no internet connection. Extract and copy dwmapi.dll, xinput1_4.dll and OpenSteamTool.dll to your Steam root directory. If there is still no internet connection, try placing the manifest in C:\\Program Files (x86)\\Steam\\depotcache.",
    url: "https://github.com/madoiscool/BetterSteamTools/releases/latest/download/OpenSteamTool-v1.0.0-Release.zip",
    download: "OpenSteamTool-v1.0.0-Release.zip",
  },
  {
    icon: "cloud",
    title: "Cloud Redirect (Clouds Save)",
    description:
      "What this tool does is redirect Steam Cloud requests for games that are injected to Google Drive/OneDrive/a local folder, including AutoCloud games. Everything is native inside the Steam Client, but the actual data is read/written to and from your cloud account. This was much harder to do than just redirecting read/write to an AppID that your account owns, but it was fun to make. It also is less likely to piss off Valve.",
    url: "https://github.com/Selectively11/CloudRedirect/releases/download/v2.6.5/CloudRedirect.exe",
    download: "CloudRedirect.exe",
  }
];

function FixCard({ icon, title, description, url, download }: (typeof fixes)[number]) {
  return (
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
          {icon === "gear" ? (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : icon === "cloud" ? (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          ) : (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          )}
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
            {title}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#9CA3AF",
              lineHeight: 1.7,
              maxWidth: 520,
            }}
          >
            {description}
          </p>

          <a
            href={url}
            download={download}
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
  );
}

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

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "16px 24px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {fixes.map((fix) => (
          <FixCard key={fix.title} {...fix} />
        ))}
      </div>
    </div>
  );
}
