/* =========================================================
   DIT Admin — SPA client (single file)

   Hash-based router (#/login, #/dashboard, #/tokens) --
   chosen so this panel can still be served directly as
   static files (StaticFiles(html=True) in main.py) without
   needing server rewrite rules: hash changes never trigger
   a new request to the server, so switching menus never
   reloads the page.

   The auth model has not changed: login exchanges the
   username/password for the ADMIN_API_KEY already used by
   every /admin endpoint, stores it in sessionStorage, and
   sends it as an x-api-key header on every admin request.
   ========================================================= */

const API_BASE = ""; // e.g. "https://api.yourdomain.com" if the backend is on a different origin

const AUTH_KEY = "dit_admin_key";
const AUTH_USER = "dit_admin_username";

const Auth = {
  get key() {
    return sessionStorage.getItem(AUTH_KEY);
  },
  get username() {
    return sessionStorage.getItem(AUTH_USER) || "admin";
  },
  isLoggedIn() {
    return !!this.key;
  },
  set(key, username) {
    sessionStorage.setItem(AUTH_KEY, key);
    sessionStorage.setItem(AUTH_USER, username);
  },
  clear() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_USER);
  },
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * Wrapper around fetch() that attaches x-api-key, parses JSON,
 * and redirects to #/login if the server returns 401 (invalid/expired key).
 */
async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (Auth.isLoggedIn()) {
    headers["x-api-key"] = Auth.key;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    throw new ApiError("Unable to contact the server. Check your connection.", 0);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (response.status === 401) {
    const detail = (data && (data.detail || data.message)) || "";
    const isAdminAuthError =
      Auth.isLoggedIn() && typeof detail === "string" && detail === "Invalid API Key";

    if (isAdminAuthError) {
      Auth.clear();
      navigate("login?expired=1");
      throw new ApiError("Session ended.", 401);
    }
  }

  if (!response.ok) {
    const detail =
      (data && (data.detail || data.message)) || `Request failed (${response.status}).`;
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), response.status);
  }

  return data;
}

function logout() {
  Auth.clear();
  navigate("login");
}

/* ---------- Toast ---------- */

function toast(message, type = "success") {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.25s ease";
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

/* ---------- Copy to clipboard ---------- */

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const tmp = document.createElement("textarea");
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand("copy");
    tmp.remove();
  }

  if (btn) {
    const original = btn.innerHTML;
    btn.classList.add("copied");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = original;
    }, 1300);
  }
  toast("Copied to clipboard.", "success");
}

/* ---------- Formatting helpers ---------- */

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Now";
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} hours ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} days ago`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

/* =========================================================
   Router
   ========================================================= */

function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, ""); // remove "#" or "#/"
  const [pathPart, queryPart] = raw.split("?");
  const page = (pathPart || "dashboard").trim() || "dashboard";
  const params = new URLSearchParams(queryPart || "");
  return { page, params };
}

function navigate(path) {
  const target = `#/${path}`;
  if (window.location.hash === target) {
    router(); // identical hash does not trigger hashchange, render manually
  } else {
    window.location.hash = target;
  }
}

function router() {
  const { page, params } = parseRoute();

  if (page !== "login" && !Auth.isLoggedIn()) {
    navigate("login");
    return;
  }
  if (page === "login" && Auth.isLoggedIn()) {
    navigate("dashboard");
    return;
  }

  switch (page) {
    case "login":
      renderLoginPage(params);
      break;
    case "tokens":
      renderShell("tokens", "Token Management", "View, search, and generate Hubcap access tokens.");
      renderTokensPage();
      break;
    case "settings":
      renderShell("settings", "Settings", "Manage upstream provider credentials.");
      renderSettingsPage();
      break;
    case "dashboard":
    default:
      renderShell("dashboard", "Dashboard", "Recent API status, key usage, and token activity.");
      renderDashboardPage();
      break;
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);

/* =========================================================
   Shared shell (sidebar + topbar) for authenticated pages
   ========================================================= */

function renderShell(activePage, title, subtitle) {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><span class="dit">DiTX</span><span class="api">Tools Admin</span></div>

        <nav class="nav-group">
          <a href="#/dashboard" class="nav-link ${activePage === "dashboard" ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
            Dashboard
          </a>
          <a href="#/tokens" class="nav-link ${activePage === "tokens" ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7l-9 9-4-4M3 17l4 4 9-9"/></svg>
            Token
          </a>
          <a href="#/settings" class="nav-link ${activePage === "settings" ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 .6 1.65 1.65 0 00-.33 1.06V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-.6-1 1.65 1.65 0 00-1.06-.33H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-.6 1.65 1.65 0 00.33-1.06V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 00.6 1 1.65 1.65 0 001.06.33H21a2 2 0 010 4h-.09A1.65 1.65 0 0019.4 15z"/></svg>
            Settings
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="admin-id">
            <div class="avatar-dot" id="admin-avatar">${escapeHtml(Auth.username.slice(0, 2).toUpperCase())}</div>
            <span id="admin-username">${escapeHtml(Auth.username)}</span>
          </div>
          <button class="btn-logout" id="logout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Log out
          </button>
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <div style="display:flex; align-items:center; gap:0.8rem;">
            <button class="menu-toggle" id="menu-toggle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <div>
              <h1>${escapeHtml(title)}</h1>
              <p>${escapeHtml(subtitle)}</p>
            </div>
          </div>
          <div id="topbar-actions"></div>
        </div>

        <div id="page-content"></div>
      </main>
    </div>
  `;

  document.getElementById("logout-btn").addEventListener("click", logout);

  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      e.target !== toggle &&
      !toggle.contains(e.target)
    ) {
      sidebar.classList.remove("open");
    }
  });
}

/* =========================================================
   Login page
   ========================================================= */

function renderLoginPage(params) {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand"><span class="dit">DiTX</span><span class="api">Tools Admin</span></div>
        <p class="login-sub">Login to continue.</p>

        <div id="login-error" class="login-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span></span>
        </div>

        <form id="login-form" novalidate>
          <div class="field">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" autocomplete="username"/>
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" autocomplete="current-password"/>
          </div>

          <button type="submit" id="login-submit" class="btn btn-primary btn-login">
            <span class="spinner"></span>
            <span class="btn-label">Login</span>
          </button>
        </form>
      </div>
    </div>
  `;

  const errorBox = document.getElementById("login-error");
  const form = document.getElementById("login-form");
  const submitBtn = document.getElementById("login-submit");

  if (params.get("expired") === "1") {
    showError("Admin session expired. Please log in again.");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showError("Username and password are required.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      Auth.set(data.api_key, data.username);
      navigate("dashboard");
    } catch (err) {
      showError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("loading", isLoading);
  }

  function showError(msg) {
    errorBox.querySelector("span").textContent = msg;
    errorBox.classList.add("show");
  }

  function hideError() {
    errorBox.classList.remove("show");
  }
}

/* =========================================================
   Dashboard page
   ========================================================= */

function renderDashboardPage() {
  const content = document.getElementById("page-content");
  const actions = document.getElementById("topbar-actions");

  actions.innerHTML = `
    <button class="btn btn-ghost btn-sm" id="refresh-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      Refresh
    </button>
  `;

  content.innerHTML = `
    <div class="grid grid-stats">
      <div class="stat-card" style="--accent: var(--green);">
        <div class="stat-label">Active token</div>
        <div class="stat-value accent" id="stat-active">…</div>
      </div>
      <div class="stat-card" style="--accent: var(--blue);">
        <div class="stat-label">Tokens used</div>
        <div class="stat-value accent" id="stat-used">…</div>
      </div>
      <div class="stat-card" style="--accent: var(--text-secondary);">
        <div class="stat-label">Token expired</div>
        <div class="stat-value accent" id="stat-expired">…</div>
      </div>
      <div class="stat-card" style="--accent: var(--amber);">
        <div class="stat-label">Total tokens created</div>
        <div class="stat-value accent" id="stat-total">…</div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">
          <h2>Latest token activity</h2>
          <span class="hint">Last 5 days</span>
        </div>
        <div class="activity-list" id="activity-list"></div>
      </div>

      <div style="display:flex; flex-direction:column; gap:1.1rem;">
        <div class="card">
          <div class="card-title">
            <h2>API Status</h2>
            <div class="status-row" style="font-size:0.8rem;">
              <span class="status-dot unknown" id="health-dot"></span>
              <span id="health-label">Checking…</span>
            </div>
          </div>
          <div class="component-list" id="component-list"></div>
        </div>

        <div class="card">
          <div class="card-title">
            <h2>Usage Hubcap API Key</h2>
          </div>
          <div id="userstats-box"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("refresh-btn").addEventListener("click", () => {
    loadHealth();
    loadUserStats();
    loadTokenStats();
    loadActivity();
  });

  loadHealth();
  loadUserStats();
  loadTokenStats();
  loadActivity();
}

async function loadHealth() {
  const dotEl = document.getElementById("health-dot");
  const labelEl = document.getElementById("health-label");
  const listEl = document.getElementById("component-list");

  dotEl.className = "status-dot unknown";
  labelEl.textContent = "Checking...";
  listEl.innerHTML = `<div class="component-row"><span class="name">Loading component status…</span></div>`;

  try {
    const data = await apiFetch("/health");
    const components = data.components || {};

    const allHealthy =
      data.status === "healthy" && Object.values(components).every((c) => c.status === "healthy");

    dotEl.className = `status-dot ${allHealthy ? "ok" : "bad"}`;
    labelEl.textContent = allHealthy ? "All systems are healthy" : "Abnormal";

    listEl.innerHTML =
      Object.entries(components)
        .map(([name, c]) => {
          const healthy = c.status === "healthy";
          const extra =
            name === "manifest_storage" ? (c.exists ? "" : " · path not found") : "";
          return `
            <div class="component-row">
              <span class="name">${prettyName(name)}</span>
              <span class="val">
                <span class="status-dot ${healthy ? "ok" : "bad"}" style="width:8px;height:8px;"></span>
                ${healthy ? "Healthy" : "Down"}${extra}
              </span>
            </div>`;
        })
        .join("") || `<div class="component-row"><span class="name muted">No component data.</span></div>`;
  } catch (err) {
    dotEl.className = "status-dot bad";
    labelEl.textContent = "Unreachable";
    listEl.innerHTML = `<div class="component-row"><span class="name muted">${escapeHtml(err.message)}</span></div>`;
  }
}

function prettyName(key) {
  return key
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

async function loadUserStats() {
  const box = document.getElementById("userstats-box");
  box.innerHTML = skeletonRows(3);

  try {
    const s = await apiFetch("/admin/userstats");
    const limit = s.using_custom_api_limit && s.custom_api_limit != null ? s.custom_api_limit : s.daily_limit;
    const used = s.daily_usage ?? 0;
    const remaining = Math.max(limit - used, 0);
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

    box.innerHTML = `
      <div class="usage-meta">
        <span>${escapeHtml(s.username || "—")}</span>
        <span class="badge ${s.can_make_requests ? "active" : "expired"}">${s.can_make_requests ? "Active" : "Restricted"}</span>
      </div>
      <div class="usage-bar-track">
        <div class="usage-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="usage-numbers">
        <div><span class="num">${used}</span><label>Used</label></div>
        <div><span class="num">${limit}</span><label>Daily limit</label></div>
        <div><span class="num accent">${remaining}</span><label>Remaining usage</label></div>
      </div>
      <div class="usage-foot">
        <span>Key used ${s.api_key_usage_count ?? 0}x</span>
        <span>Expire ${s.api_key_expires_at ? formatDate(s.api_key_expires_at) : "—"}</span>
      </div>
    `;
  } catch (err) {
    box.innerHTML = `<p class="muted" style="font-size:0.85rem;">${escapeHtml(err.message)}</p>`;
  }
}

async function loadTokenStats() {
  const ids = { active: "stat-active", used: "stat-used", expired: "stat-expired", total: "stat-total" };
  Object.values(ids).forEach((id) => {
    document.getElementById(id).textContent = "…";
  });

  try {
    const [active, used, expired, all] = await Promise.all([
      apiFetch("/admin/tokens?status=active&limit=1"),
      apiFetch("/admin/tokens?status=used&limit=1"),
      apiFetch("/admin/tokens?status=expired&limit=1"),
      apiFetch("/admin/tokens?limit=1"),
    ]);

    document.getElementById(ids.active).textContent = active.total;
    document.getElementById(ids.used).textContent = used.total;
    document.getElementById(ids.expired).textContent = expired.total;
    document.getElementById(ids.total).textContent = all.total;
  } catch (err) {
    Object.values(ids).forEach((id) => {
      document.getElementById(id).textContent = "—";
    });
    toast(err.message, "error");
  }
}

async function loadActivity() {
  const listEl = document.getElementById("activity-list");
  listEl.innerHTML = skeletonRows(4);

  try {
    const data = await apiFetch("/admin/tokens?status=used&limit=5");

    if (!data.items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:1.5rem;">
          <h3>There is no activity yet</h3>
          <p>Successfully used tokens will appear here.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = data.items
      .map(
        (t) => `
        <div class="activity-item">
          <div class="activity-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div class="activity-body">
            <div class="activity-title">App ID <span class="mono">${escapeHtml(t.used_app_id || "—")}</span> downloaded with token <span class="mono">${escapeHtml(t.token)}</span></div>
            <div class="activity-meta">IP ${escapeHtml(t.used_by_ip || "—")} · ${relativeTime(t.used_at)}</div>
          </div>
        </div>`
      )
      .join("");
  } catch (err) {
    listEl.innerHTML = `<p class="muted" style="font-size:0.85rem;">${escapeHtml(err.message)}</p>`;
  }
}

function skeletonRows(n) {
  return Array.from({ length: n })
    .map(() => `<div class="skeleton" style="height:18px;margin-bottom:10px;border-radius:6px;"></div>`)
    .join("");
}

/* =========================================================
   Settings page
   ========================================================= */

function renderSettingsPage() {
  const content = document.getElementById("page-content");
  const actions = document.getElementById("topbar-actions");

  actions.innerHTML = `
    <button class="btn btn-ghost btn-sm" id="settings-refresh-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      Refresh
    </button>
  `;

  content.innerHTML = `
    <div class="card settings-card">
      <div class="card-title">
        <h2>Hubcap API Key</h2>
        <span class="badge expired" id="hubcap-key-status">Loading</span>
      </div>

      <div class="component-row settings-current">
        <span class="name">Current key</span>
        <span class="val mono" id="hubcap-key-current">Loading...</span>
      </div>
      <div class="component-row settings-current">
        <span class="name">Last updated</span>
        <span class="val mono" id="hubcap-key-updated">—</span>
      </div>

      <form id="hubcap-key-form" class="settings-form" novalidate>
        <div class="field">
          <label for="hubcap-api-key">New API key</label>
          <input type="password" id="hubcap-api-key" autocomplete="off" placeholder="Paste the new Hubcap API key" />
        </div>

        <button type="submit" class="btn btn-primary" id="hubcap-key-submit">
          <span class="spinner"></span>
          <span class="btn-label">Save</span>
        </button>
      </form>
    </div>
  `;

  document.getElementById("settings-refresh-btn").addEventListener("click", loadHubcapApiKeySetting);
  document.getElementById("hubcap-key-form").addEventListener("submit", updateHubcapApiKeySetting);

  loadHubcapApiKeySetting();
}

async function loadHubcapApiKeySetting() {
  const statusEl = document.getElementById("hubcap-key-status");
  const currentEl = document.getElementById("hubcap-key-current");
  const updatedEl = document.getElementById("hubcap-key-updated");

  statusEl.className = "badge expired";
  statusEl.textContent = "Loading";
  currentEl.textContent = "Loading...";
  updatedEl.textContent = "—";

  try {
    const data = await apiFetch("/admin/settings/hubcap-api-key");
    statusEl.className = `badge ${data.configured ? "active" : "degraded"}`;
    statusEl.textContent = data.configured ? "Configured" : "Missing";
    currentEl.textContent = data.masked_value || "Not set";
    updatedEl.textContent = data.updated_at ? formatDate(data.updated_at) : "From environment / never changed";
  } catch (err) {
    statusEl.className = "badge degraded";
    statusEl.textContent = "Error";
    currentEl.textContent = err.message;
  }
}

async function updateHubcapApiKeySetting(e) {
  e.preventDefault();

  const input = document.getElementById("hubcap-api-key");
  const submitBtn = document.getElementById("hubcap-key-submit");
  const apiKey = input.value.trim();

  if (!apiKey) {
    toast("Hubcap API key is required.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add("loading");

  try {
    await apiFetch("/admin/settings/hubcap-api-key", {
      method: "PUT",
      body: JSON.stringify({ api_key: apiKey }),
    });

    input.value = "";
    toast("Hubcap API key saved successfully.", "success");
    loadHubcapApiKeySetting();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
}

/* =========================================================
   Tokens page
   ========================================================= */

const tokensState = {
  pageSize: 10,
  skip: 0,
  total: 0,
  searchDebounce: null,
};

function renderTokensPage() {
  const content = document.getElementById("page-content");
  const actions = document.getElementById("topbar-actions");

  tokensState.skip = 0;
  tokensState.total = 0;

  actions.innerHTML = `
    <button class="btn btn-primary" id="generate-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      Generate token
    </button>
  `;

  content.innerHTML = `
    <div class="card">
      <div class="toolbar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" id="search-input" placeholder="Search for token, app ID, or IP…" />
        </div>
        <div class="status-filter-group" id="status-filter" aria-label="Filter token status">
          <button type="button" class="status-filter active" data-status="">All</button>
          <button type="button" class="status-filter" data-status="active">Active</button>
          <button type="button" class="status-filter" data-status="used">Used</button>
          <button type="button" class="status-filter" data-status="expired">Expired</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Status</th>
              <th>Create at</th>
              <th>Used at</th>
              <th>App ID</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody id="tokens-tbody"></tbody>
        </table>
      </div>

      <div class="pagination">
        <span id="pagination-info">—</span>
        <div class="controls">
          <button class="btn btn-ghost btn-sm" id="prev-page">Previous</button>
          <button class="btn btn-ghost btn-sm" id="next-page">Next</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <h3>Token created successfully</h3>
        <p class="desc">This token can only be used once.</p>
        <div class="new-token-box">
          <span id="modal-token-value" class="mono"></span>
          <button class="copy-btn" id="modal-copy" title="Copy token">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" id="modal-close">Close</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("generate-btn").addEventListener("click", generateToken);

  document.getElementById("search-input").addEventListener("input", () => {
    clearTimeout(tokensState.searchDebounce);
    tokensState.searchDebounce = setTimeout(() => {
      tokensState.skip = 0;
      loadTokens();
    }, 350);
  });

  document.querySelectorAll(".status-filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".status-filter").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      tokensState.skip = 0;
      loadTokens();
    });
  });

  document.getElementById("prev-page").addEventListener("click", () => {
    tokensState.skip = Math.max(tokensState.skip - tokensState.pageSize, 0);
    loadTokens();
  });

  document.getElementById("next-page").addEventListener("click", () => {
    if (tokensState.skip + tokensState.pageSize < tokensState.total) {
      tokensState.skip += tokensState.pageSize;
      loadTokens();
    }
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });
  document.getElementById("modal-copy").addEventListener("click", (e) => {
    copyText(document.getElementById("modal-token-value").textContent, e.currentTarget);
  });

  loadTokens();
}

async function loadTokens() {
  const tbody = document.getElementById("tokens-tbody");
  tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height:16px;"></div></td></tr>`.repeat(5);

  const search = document.getElementById("search-input").value.trim();
  const status = document.querySelector(".status-filter.active")?.dataset.status || "";

  const params = new URLSearchParams({
    skip: tokensState.skip,
    limit: tokensState.pageSize,
  });
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  try {
    const data = await apiFetch(`/admin/tokens?${params.toString()}`);
    tokensState.total = data.total;
    renderTokens(data.items);
    renderPagination();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>Failed to load token</h3><p>${escapeHtml(err.message)}</p></div></td></tr>`;
  }
}

function renderTokens(items) {
  const tbody = document.getElementById("tokens-tbody");

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <h3>No token</h3>
        <p>Try changing the filter, or generating a new token.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map(
      (t) => `
      <tr>
        <td>
          <div class="token-cell">
            <span class="mono">${escapeHtml(t.token)}</span>
            <button class="copy-btn" title="Copy token" data-copy="${escapeHtml(t.token)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
            <button class="delete-token-btn" title="Delete token" data-token="${escapeHtml(t.token)}" aria-label="Delete token ${escapeHtml(t.token)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </td>
        <td><span class="badge ${t.status}">${statusLabel(t.status)}</span></td>
        <td class="mono muted">${formatDate(t.created_at)}</td>
        <td class="mono muted">${t.used_at ? formatDate(t.used_at) : "—"}</td>
        <td class="mono muted">${escapeHtml(t.used_app_id || "—")}</td>
        <td class="mono muted">${escapeHtml(t.used_by_ip || "—")}</td>
      </tr>`
    )
    .join("");

  tbody.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.dataset.copy, btn));
  });

  tbody.querySelectorAll(".delete-token-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteToken(btn.dataset.token, btn));
  });
}

function statusLabel(status) {
  return { active: "Active", used: "Used", expired: "Expired" }[status] || status;
}

function renderPagination() {
  const from = tokensState.total === 0 ? 0 : tokensState.skip + 1;
  const to = Math.min(tokensState.skip + tokensState.pageSize, tokensState.total);
  document.getElementById("pagination-info").textContent = `${from}–${to} from ${tokensState.total} token`;
  document.getElementById("prev-page").disabled = tokensState.skip === 0;
  document.getElementById("next-page").disabled = tokensState.skip + tokensState.pageSize >= tokensState.total;
}

async function generateToken() {
  const btn = document.getElementById("generate-btn");
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="spinner-inline"></span> Creating...`;

  try {
    const token = await apiFetch("/admin/token", { method: "POST" });
    openModal(token.token);
    tokensState.skip = 0;
    document.querySelectorAll(".status-filter").forEach((button) => {
      button.classList.toggle("active", button.dataset.status === "");
    });
    document.getElementById("search-input").value = "";
    loadTokens();
    toast("New token successfully created.", "success");
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

async function deleteToken(tokenValue, btn) {
  if (!confirm(`Delete token ${tokenValue}?`)) return;

  btn.disabled = true;

  try {
    await apiFetch(`/admin/token/${encodeURIComponent(tokenValue)}`, { method: "DELETE" });
    if (tokensState.skip >= tokensState.total - 1) {
      tokensState.skip = Math.max(tokensState.skip - tokensState.pageSize, 0);
    }
    await loadTokens();
    toast("Token successfully deleted.", "success");
  } catch (err) {
    btn.disabled = false;
    toast(err.message, "error");
  }
}

function openModal(tokenValue) {
  document.getElementById("modal-token-value").textContent = tokenValue;
  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}
