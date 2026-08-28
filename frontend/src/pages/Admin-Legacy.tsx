import { useEffect, useState, type FormEvent } from "react";
import { API_URL } from "../config";
import "./css/Admin-Legacy.css";

const AUTH_KEY = "dit_admin_key";
const AUTH_USER = "dit_admin_username";
const API_BASE = API_URL ?? "";

type AdminPage = "dashboard" | "tokens" | "bot" | "settings";
type ToastType = "success" | "error";
type TokenStatus = "active" | "used" | "expired";

interface TokenItem {
  token: string;
  created_at: string;
  used_at: string | null;
  used_app_id: string | null;
  used_by_ip: string | null;
  status: TokenStatus;
}

interface TokenListResponse {
  total: number;
  items: TokenItem[];
}

interface BotRole {
  id: number;
  role_id: string;
  name: string;
  limit: number | null;
}

interface BotSettings {
  guild_id: string | null;
  guild_configured: boolean;
  bot_token_configured: boolean;
  bot_token_masked: string | null;
  allowed_channels: string[];
  updated_at: string | null;
  roles: BotRole[];
}

interface HubcapSetting {
  configured: boolean;
  masked_value: string | null;
  updated_at: string | null;
}

interface HealthComponent {
  status?: string;
  exists?: boolean;
}

interface HealthResponse {
  status?: string;
  components?: Record<string, HealthComponent>;
}

interface UserStats {
  username?: string;
  can_make_requests?: boolean;
  using_custom_api_limit?: boolean;
  custom_api_limit?: number | null;
  daily_limit?: number;
  daily_usage?: number;
  api_key_usage_count?: number;
  api_key_expires_at?: string | null;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getStoredAuth() {
  return {
    key: sessionStorage.getItem(AUTH_KEY),
    username: sessionStorage.getItem(AUTH_USER) || "admin",
  };
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso?: string | null) {
  if (!iso) return "-";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "Now";
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} hours ago`;
  return `${Math.round(diffH / 24)} days ago`;
}

function prettyName(key: string) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusLabel(status: TokenStatus) {
  return { active: "Active", used: "Used", expired: "Expired" }[status];
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <div className="admin-skeleton" key={index} />
      ))}
    </>
  );
}

export default function Admin() {
  const [auth, setAuth] = useState(getStoredAuth);
  const [page, setPage] = useState<AdminPage>("dashboard");
  const [expired, setExpired] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = (message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const logout = (isExpired = false) => {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_USER);
    setAuth({ key: null, username: "admin" });
    setExpired(isExpired);
  };

  const apiFetch = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (auth.key) {
      headers.set("x-api-key", auth.key);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      throw new ApiError("Unable to contact the server. Check your connection.", 0);
    }

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (response.status === 401 && auth.key) {
      const detail =
        typeof data === "object" && data !== null && "detail" in data
          ? String((data as { detail: unknown }).detail)
          : "";
      if (detail === "Invalid API Key") {
        logout(true);
      }
    }

    if (!response.ok) {
      const detail =
        typeof data === "object" && data !== null
          ? ((data as { detail?: unknown; message?: unknown }).detail ??
              (data as { message?: unknown }).message)
          : data;
      throw new ApiError(
        typeof detail === "string" ? detail : JSON.stringify(detail ?? `Request failed (${response.status}).`),
        response.status,
      );
    }

    return data as T;
  };

  const onLogin = (apiKey: string, username: string) => {
    sessionStorage.setItem(AUTH_KEY, apiKey);
    sessionStorage.setItem(AUTH_USER, username);
    setAuth({ key: apiKey, username });
    setExpired(false);
    setPage("dashboard");
  };

  if (!auth.key) {
    return (
      <div className="admin-page">
        <LoginPage apiFetch={apiFetch} expired={expired} onLogin={onLogin} />
        <ToastStack toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <AdminSidebar activePage={page} username={auth.username} onLogout={() => logout()} onNavigate={setPage} />
        <main className="admin-main">
          <AdminTopbar page={page}>
            {page === "dashboard" && <RefreshButton onClick={() => window.dispatchEvent(new Event("admin-refresh-dashboard"))} />}
            {page === "tokens" && <TokenActions apiFetch={apiFetch} notify={notify} />}
            {page === "bot" && <RefreshButton onClick={() => window.dispatchEvent(new Event("admin-refresh-bot"))} />}
            {page === "settings" && <RefreshButton onClick={() => window.dispatchEvent(new Event("admin-refresh-settings"))} />}
          </AdminTopbar>
          {page === "dashboard" && <DashboardPage apiFetch={apiFetch} notify={notify} />}
          {page === "tokens" && <TokensPage apiFetch={apiFetch} notify={notify} />}
          {page === "bot" && <BotPage apiFetch={apiFetch} notify={notify} />}
          {page === "settings" && <SettingsPage apiFetch={apiFetch} notify={notify} />}
        </main>
      </div>
      <ToastStack toasts={toasts} />
    </div>
  );
}

function LoginPage({
  apiFetch,
  expired,
  onLogin,
}: {
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  expired: boolean;
  onLogin: (apiKey: string, username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(expired ? "Admin session expired. Please log in again." : "");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ api_key: string; username: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      onLogin(data.api_key, data.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-dit">DiTX</span>
          <span>Tools Admin</span>
        </div>
        <p className="admin-login-sub">Login to continue.</p>
        {error && <div className="admin-login-error">{error}</div>}
        <form onSubmit={submit}>
          <label className="admin-field">
            <span>Username</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="admin-btn admin-btn-primary admin-btn-full" disabled={loading} type="submit">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminSidebar({
  activePage,
  username,
  onLogout,
  onNavigate,
}: {
  activePage: AdminPage;
  username: string;
  onLogout: () => void;
  onNavigate: (page: AdminPage) => void;
}) {
  const [open, setOpen] = useState(false);
  const links: { page: AdminPage; label: string; icon: string }[] = [
    { page: "dashboard", label: "Dashboard", icon: "[]" },
    { page: "tokens", label: "Token", icon: "+" },
    { page: "bot", label: "Bot", icon: "o" },
    { page: "settings", label: "Settings", icon: "*" },
  ];

  return (
    <>
      <button className="admin-menu-toggle" onClick={() => setOpen(true)} type="button">
        Menu
      </button>
      <aside className={`admin-sidebar ${open ? "open" : ""}`}>
        <div className="admin-brand">
          <span className="admin-dit">DiTX</span>
          <span>Tools Admin</span>
        </div>
        <nav className="admin-nav">
          {links.map((link) => (
            <button
              className={`admin-nav-link ${activePage === link.page ? "active" : ""}`}
              key={link.page}
              onClick={() => {
                onNavigate(link.page);
                setOpen(false);
              }}
              type="button"
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-id">
            <span className="admin-avatar">{username.slice(0, 2).toUpperCase()}</span>
            <span>{username}</span>
          </div>
          <button className="admin-logout" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </aside>
      {open && <button className="admin-scrim" aria-label="Close menu" onClick={() => setOpen(false)} type="button" />}
    </>
  );
}

function AdminTopbar({ page, children }: { page: AdminPage; children: React.ReactNode }) {
  const copy: Record<AdminPage, { title: string; subtitle: string }> = {
    dashboard: { title: "Dashboard", subtitle: "Recent API status, key usage, and token activity." },
    tokens: { title: "Token Management", subtitle: "View, search, and generate Hubcap access tokens." },
    bot: { title: "Bot", subtitle: "Manage Discord connection and token access roles." },
    settings: { title: "Settings", subtitle: "Manage upstream provider credentials." },
  };

  return (
    <div className="admin-topbar">
      <div>
        <h1>{copy[page].title}</h1>
        <p>{copy[page].subtitle}</p>
      </div>
      <div className="admin-actions">{children}</div>
    </div>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onClick} type="button">
      Refresh
    </button>
  );
}

function DashboardPage({
  apiFetch,
  notify,
}: {
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  notify: (message: string, type?: ToastType) => void;
}) {
  const [tokenStats, setTokenStats] = useState<Record<string, number | null>>({
    active: null,
    used: null,
    expired: null,
    total: null,
  });
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState("");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsError, setUserStatsError] = useState("");
  const [activity, setActivity] = useState<TokenItem[] | null>(null);

  const load = async () => {
    try {
      const [active, used, expired, all] = await Promise.all([
        apiFetch<TokenListResponse>("/admin/tokens?status=active&limit=1"),
        apiFetch<TokenListResponse>("/admin/tokens?status=used&limit=1"),
        apiFetch<TokenListResponse>("/admin/tokens?status=expired&limit=1"),
        apiFetch<TokenListResponse>("/admin/tokens?limit=1"),
      ]);
      setTokenStats({ active: active.total, used: used.total, expired: expired.total, total: all.total });
    } catch (err) {
      setTokenStats({ active: null, used: null, expired: null, total: null });
      notify(err instanceof Error ? err.message : "Failed to load token stats.", "error");
    }

    try {
      setHealth(await apiFetch<HealthResponse>("/health"));
      setHealthError("");
    } catch (err) {
      setHealth(null);
      setHealthError(err instanceof Error ? err.message : "Failed to load health.");
    }

    try {
      setUserStats(await apiFetch<UserStats>("/admin/userstats"));
      setUserStatsError("");
    } catch (err) {
      setUserStats(null);
      setUserStatsError(err instanceof Error ? err.message : "Failed to load user stats.");
    }

    try {
      const data = await apiFetch<TokenListResponse>("/admin/tokens?status=used&limit=5");
      setActivity(data.items);
    } catch {
      setActivity([]);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    window.addEventListener("admin-refresh-dashboard", load);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("admin-refresh-dashboard", load);
    };
  }, []);

  const components = health?.components ?? {};
  const allHealthy =
    health?.status === "healthy" && Object.values(components).every((component) => component.status === "healthy");
  const usageLimit =
    userStats?.using_custom_api_limit && userStats.custom_api_limit != null
      ? userStats.custom_api_limit
      : (userStats?.daily_limit ?? 0);
  const used = userStats?.daily_usage ?? 0;
  const remaining = Math.max(usageLimit - used, 0);
  const pct = usageLimit > 0 ? Math.min((used / usageLimit) * 100, 100) : 0;

  return (
    <>
      <div className="admin-grid admin-grid-stats">
        <Stat label="Active token" value={tokenStats.active} tone="green" />
        <Stat label="Tokens used" value={tokenStats.used} tone="blue" />
        <Stat label="Token expired" value={tokenStats.expired} tone="muted" />
        <Stat label="Total tokens created" value={tokenStats.total} tone="amber" />
      </div>
      <div className="admin-grid admin-grid-2">
        <section className="admin-card">
          <div className="admin-card-title">
            <h2>Latest token activity</h2>
            <span>Last 5 used tokens</span>
          </div>
          {activity === null ? (
            <Skeleton rows={4} />
          ) : activity.length ? (
            <div className="admin-activity-list">
              {activity.map((item) => (
                <div className="admin-activity-item" key={item.token}>
                  <div className="admin-activity-icon">OK</div>
                  <div>
                    <div>
                      App ID <span className="admin-mono">{item.used_app_id || "-"}</span> downloaded with token{" "}
                      <span className="admin-mono">{item.token}</span>
                    </div>
                    <p>
                      IP {item.used_by_ip || "-"} - {relativeTime(item.used_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="There is no activity yet" text="Successfully used tokens will appear here." />
          )}
        </section>
        <div className="admin-stack">
          <section className="admin-card">
            <div className="admin-card-title">
              <h2>API Status</h2>
              <span className={`admin-status-dot ${allHealthy ? "ok" : healthError ? "bad" : "unknown"}`} />
            </div>
            {healthError ? (
              <p className="admin-muted">{healthError}</p>
            ) : Object.keys(components).length ? (
              <div className="admin-component-list">
                {Object.entries(components).map(([name, component]) => (
                  <div className="admin-component-row" key={name}>
                    <span>{prettyName(name)}</span>
                    <strong>{component.status === "healthy" ? "Healthy" : "Down"}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton rows={3} />
            )}
          </section>
          <section className="admin-card">
            <div className="admin-card-title">
              <h2>Usage Hubcap API Key</h2>
            </div>
            {userStatsError ? (
              <p className="admin-muted">{userStatsError}</p>
            ) : userStats ? (
              <>
                <div className="admin-usage-meta">
                  <span>{userStats.username || "-"}</span>
                  <Badge tone={userStats.can_make_requests ? "active" : "expired"}>
                    {userStats.can_make_requests ? "Active" : "Restricted"}
                  </Badge>
                </div>
                <div className="admin-usage-track">
                  <div style={{ width: `${pct}%` }} />
                </div>
                <div className="admin-usage-numbers">
                  <div>
                    <strong>{used}</strong>
                    <span>Used</span>
                  </div>
                  <div>
                    <strong>{usageLimit}</strong>
                    <span>Daily limit</span>
                  </div>
                  <div>
                    <strong>{remaining}</strong>
                    <span>Remaining</span>
                  </div>
                </div>
                <p className="admin-muted">
                  Key used {userStats.api_key_usage_count ?? 0}x - Expire {formatDate(userStats.api_key_expires_at)}
                </p>
              </>
            ) : (
              <Skeleton rows={3} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  return (
    <section className={`admin-stat admin-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
    </section>
  );
}

function TokenActions({
  apiFetch,
  notify,
}: {
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  notify: (message: string, type?: ToastType) => void;
}) {
  const generate = async () => {
    try {
      const token = await apiFetch<TokenItem>("/admin/token", { method: "POST" });
      await navigator.clipboard?.writeText(token.token).catch(() => undefined);
      notify(`New token created: ${token.token}`);
      window.dispatchEvent(new Event("admin-refresh-tokens"));
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to create token.", "error");
    }
  };

  return (
    <>
      <button className="admin-btn admin-btn-primary" onClick={generate} type="button">
        Generate token
      </button>
      <RefreshButton onClick={() => window.dispatchEvent(new Event("admin-refresh-tokens"))} />
    </>
  );
}

function TokensPage({
  apiFetch,
  notify,
}: {
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  notify: (message: string, type?: ToastType) => void;
}) {
  const pageSize = 10;
  const [items, setItems] = useState<TokenItem[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ skip: String(skip), limit: String(pageSize) });
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    try {
      const data = await apiFetch<TokenListResponse>(`/admin/tokens?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to load tokens.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [skip, status, search]);

  useEffect(() => {
    window.addEventListener("admin-refresh-tokens", load);
    return () => window.removeEventListener("admin-refresh-tokens", load);
  }, [skip, status, search]);

  const copyToken = async (token: string) => {
    await navigator.clipboard?.writeText(token).catch(() => undefined);
    notify("Copied to clipboard.");
  };

  const deleteToken = async (token: string) => {
    if (!window.confirm(`Delete token ${token}?`)) return;
    try {
      await apiFetch(`/admin/token/${encodeURIComponent(token)}`, { method: "DELETE" });
      notify("Token successfully deleted.");
      setSkip((current) => (current >= total - 1 ? Math.max(current - pageSize, 0) : current));
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete token.", "error");
    }
  };

  const clearTokens = async () => {
    if (!window.confirm("Clear all used and expired tokens?")) return;
    try {
      const data = await apiFetch<{ deleted: number }>("/admin/tokens/clear", { method: "DELETE" });
      notify(`${data.deleted} token${data.deleted === 1 ? "" : "s"} cleared.`);
      setSkip(0);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to clear tokens.", "error");
    }
  };

  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + pageSize, total);

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <input placeholder="Search for token, app ID, or IP..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="admin-segments">
          {["", "active", "used", "expired"].map((item) => (
            <button
              className={status === item ? "active" : ""}
              key={item || "all"}
              onClick={() => {
                setStatus(item);
                setSkip(0);
              }}
              type="button"
            >
              {item ? statusLabel(item as TokenStatus) : "All"}
            </button>
          ))}
        </div>
        <button className="admin-btn admin-btn-danger admin-btn-sm admin-clear-btn" onClick={clearTokens} type="button">
          Clear Token
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Status</th>
              <th>Create at</th>
              <th>Used at</th>
              <th>App ID</th>
              <th>IP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <Skeleton rows={5} />
                </td>
              </tr>
            ) : items.length ? (
              items.map((token) => (
                <tr key={token.token}>
                  <td className="admin-mono">{token.token}</td>
                  <td>
                    <Badge tone={token.status}>{statusLabel(token.status)}</Badge>
                  </td>
                  <td className="admin-muted admin-mono">{formatDate(token.created_at)}</td>
                  <td className="admin-muted admin-mono">{formatDate(token.used_at)}</td>
                  <td className="admin-muted admin-mono">{token.used_app_id || "-"}</td>
                  <td className="admin-muted admin-mono">{token.used_by_ip || "-"}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button onClick={() => copyToken(token.token)} type="button">Copy</button>
                      <button onClick={() => deleteToken(token.token)} type="button">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <Empty title="No token" text="Try changing the filter, or generating a new token." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination">
        <span>
          {from}-{to} from {total} token
        </span>
        <div>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" disabled={skip === 0} onClick={() => setSkip(Math.max(skip - pageSize, 0))} type="button">
            Previous
          </button>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" disabled={skip + pageSize >= total} onClick={() => setSkip(skip + pageSize)} type="button">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function BotPage({
  apiFetch,
  notify,
}: {
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  notify: (message: string, type?: ToastType) => void;
}) {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [guildId, setGuildId] = useState("");
  const [botToken, setBotToken] = useState("");
  const [allowedChannels, setAllowedChannels] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleLimit, setRoleLimit] = useState("");
  const [editing, setEditing] = useState<BotRole | null>(null);

  const load = async () => {
    try {
      const data = await apiFetch<BotSettings>("/admin/bot/settings");
      setSettings(data);
      setGuildId(data.guild_id || "");
      setAllowedChannels((data.allowed_channels || []).join("\n"));
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to load bot settings.", "error");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    window.addEventListener("admin-refresh-bot", load);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("admin-refresh-bot", load);
    };
  }, []);

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!guildId.trim()) {
      notify("Guild ID is required.", "error");
      return;
    }
    const payload: { guild_id: string; allowed_channels: string; bot_token?: string } = {
      guild_id: guildId.trim(),
      allowed_channels: allowedChannels.trim(),
    };
    if (botToken.trim()) payload.bot_token = botToken.trim();
    try {
      await apiFetch("/admin/bot/settings", { method: "PUT", body: JSON.stringify(payload) });
      setBotToken("");
      notify("Discord settings saved successfully.");
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save settings.", "error");
    }
  };

  const testConnection = async () => {
    if (!guildId.trim()) {
      notify("Guild ID is required.", "error");
      return;
    }
    const payload: { guild_id: string; bot_token?: string } = { guild_id: guildId.trim() };
    if (botToken.trim()) payload.bot_token = botToken.trim();
    try {
      const data = await apiFetch<{ ok: boolean; detail: string }>("/admin/bot/test", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      notify(data.detail, data.ok ? "success" : "error");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to test connection.", "error");
    }
  };

  const addRole = async (event: FormEvent) => {
    event.preventDefault();
    if (!roleName.trim() || !roleId.trim()) {
      notify("Role name and role ID are required.", "error");
      return;
    }
    try {
      await apiFetch("/admin/bot/roles", {
        method: "POST",
        body: JSON.stringify({
          name: roleName.trim(),
          role_id: roleId.trim(),
          limit: roleLimit.trim() ? Number(roleLimit) : null,
        }),
      });
      setRoleName("");
      setRoleId("");
      setRoleLimit("");
      notify("Role added successfully.");
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to add role.", "error");
    }
  };

  const deleteRole = async (id: number) => {
    if (!window.confirm("Delete this role?")) return;
    try {
      await apiFetch(`/admin/bot/roles/${id}`, { method: "DELETE" });
      notify("Role deleted successfully.");
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete role.", "error");
    }
  };

  const configured = settings?.guild_configured && settings?.bot_token_configured;

  return (
    <>
      <section className="admin-card admin-settings-card">
        <div className="admin-card-title">
          <h2>Discord Connection</h2>
          <Badge tone={configured ? "active" : "degraded"}>{configured ? "Configured" : "Incomplete"}</Badge>
        </div>
        <div className="admin-component-row">
          <span>Guild ID</span>
          <strong>{settings?.guild_configured ? settings.guild_id : "Not set"}</strong>
        </div>
        <div className="admin-component-row">
          <span>Bot token</span>
          <strong>{settings?.bot_token_configured ? settings.bot_token_masked : "Not set"}</strong>
        </div>
        <form className="admin-form" onSubmit={saveSettings}>
          <label className="admin-field">
            <span>Guild ID</span>
            <input value={guildId} onChange={(event) => setGuildId(event.target.value)} placeholder="Discord server (guild) ID" />
          </label>
          <label className="admin-field">
            <span>Bot token</span>
            <input
              type="password"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder="Leave empty to keep the current token"
            />
          </label>
          <label className="admin-field">
            <span>Allowed channels</span>
            <textarea
              value={allowedChannels}
              onChange={(event) => setAllowedChannels(event.target.value)}
              placeholder="One channel ID per line, or comma-separated. Empty = all guild channels."
            />
          </label>
          <div className="admin-inline-actions">
            <button className="admin-btn admin-btn-secondary" onClick={testConnection} type="button">
              Test connection
            </button>
            <button className="admin-btn admin-btn-primary" type="submit">
              Save
            </button>
          </div>
        </form>
      </section>
      <section className="admin-card">
        <div className="admin-card-title">
          <h2>Token Access Roles</h2>
          <span>Roles allowed to generate tokens and their daily limit</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role ID</th>
                <th>Daily limit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {settings?.roles?.length ? (
                settings.roles.map((role) => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td className="admin-mono admin-muted">{role.role_id}</td>
                    <td>
                      <Badge tone={role.limit ? "active" : "used"}>{role.limit ? `${role.limit}/day` : "Unlimited"}</Badge>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button onClick={() => setEditing(role)} type="button">Edit</button>
                        <button onClick={() => deleteRole(role.id)} type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <Empty title="No roles configured" text="Add a role below to allow Discord users to generate tokens." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form className="admin-form" onSubmit={addRole}>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Role name</span>
              <input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. OG" />
            </label>
            <label className="admin-field">
              <span>Role ID</span>
              <input value={roleId} onChange={(event) => setRoleId(event.target.value)} placeholder="Discord role ID" />
            </label>
            <label className="admin-field">
              <span>Daily limit</span>
              <input min="1" type="number" value={roleLimit} onChange={(event) => setRoleLimit(event.target.value)} placeholder="Empty = unlimited" />
            </label>
          </div>
          <button className="admin-btn admin-btn-primary" type="submit">
            Add role
          </button>
        </form>
      </section>
      {editing && (
        <RoleModal
          apiFetch={apiFetch}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          role={editing}
        />
      )}
    </>
  );
}

function RoleModal({
  role,
  apiFetch,
  notify,
  onClose,
  onSaved,
}: {
  role: BotRole;
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  notify: (message: string, type?: ToastType) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(role.name);
  const [limit, setLimit] = useState(role.limit?.toString() ?? "");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiFetch(`/admin/bot/roles/${role.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), limit: limit.trim() ? Number(limit) : null }),
      });
      notify("Role updated successfully.");
      onSaved();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update role.", "error");
    }
  };

  return (
    <div className="admin-modal-overlay">
      <form className="admin-modal" onSubmit={save}>
        <h3>Edit role</h3>
        <label className="admin-field">
          <span>Role name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>Daily limit</span>
          <input min="1" type="number" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="Empty = unlimited" />
        </label>
        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="admin-btn admin-btn-primary admin-btn-sm" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsPage({
  apiFetch,
  notify,
}: {
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  notify: (message: string, type?: ToastType) => void;
}) {
  const [setting, setSetting] = useState<HubcapSetting | null>(null);
  const [apiKey, setApiKey] = useState("");

  const load = async () => {
    try {
      setSetting(await apiFetch<HubcapSetting>("/admin/settings/hubcap-api-key"));
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to load API key setting.", "error");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    window.addEventListener("admin-refresh-settings", load);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("admin-refresh-settings", load);
    };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      notify("Hubcap API key is required.", "error");
      return;
    }
    try {
      await apiFetch("/admin/settings/hubcap-api-key", {
        method: "PUT",
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });
      setApiKey("");
      notify("Hubcap API key saved successfully.");
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save API key.", "error");
    }
  };

  return (
    <section className="admin-card admin-settings-card">
      <div className="admin-card-title">
        <h2>Hubcap API Key</h2>
        <Badge tone={setting?.configured ? "active" : "degraded"}>{setting?.configured ? "Configured" : "Missing"}</Badge>
      </div>
      <div className="admin-component-row">
        <span>Current key</span>
        <strong>{setting?.masked_value || "Not set"}</strong>
      </div>
      <div className="admin-component-row">
        <span>Last updated</span>
        <strong>{setting?.updated_at ? formatDate(setting.updated_at) : "From environment / never changed"}</strong>
      </div>
      <form className="admin-form" onSubmit={save}>
        <label className="admin-field">
          <span>New API key</span>
          <input
            autoComplete="off"
            placeholder="Paste the new Hubcap API key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <button className="admin-btn admin-btn-primary" type="submit">
          Save
        </button>
      </form>
    </section>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`admin-badge ${tone}`}>{children}</span>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="admin-empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="admin-toast-stack">
      {toasts.map((toast) => (
        <div className={`admin-toast ${toast.type}`} key={toast.id}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
