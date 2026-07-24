import { useState, useRef, useCallback } from 'react';
import { API_URL } from "../config";
import Footer from '../components/Footer';

export function formatUtcTimestamp(timestamp: string): string {
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)
      ? timestamp
      : `${timestamp}Z`
  );

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} ${timePart}`;
}

type ManifestSource = 'hubcap' | 'manifesthub1' | 'sushi' | 'ryuu' | 'yaszz';
type SearchMode = 'title' | 'appid';

const HIDDEN_SOURCE_OPTIONS = new Set<ManifestSource>(['sushi', 'yaszz', 'manifesthub1']);

interface Game {
  game_name?: string;
  name?: string;
  game_id?: string;
  app_id?: string;
  appid?: string | number;
}

interface StatusResult {
  exists?: boolean;
  available?: boolean;
  update_in_progress?: boolean;
  updating?: boolean;
  update_needed?: boolean;
  file_size?: number;
  size?: number;
  file_modified?: string;
  modified_time?: string;
  last_modified?: string;
  updated_at?: string;
}

interface SteamResult {
  headerImage?: string;
  header_image?: string;
  name?: string;
  releaseDate?: string;
  genres?: string[];
}

interface DetailState {
  name: string;
  appId: string;
  bannerUrl: string | null;
  status: 'loading' | 'ok' | 'missing' | 'updating';
  statusText: string;
  size: string;
  modified: string;
  release: string;
  genres: string[];
  canDownload: boolean;
}

function formatBytes(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 ** 2) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 ** 3) return (b / 1024 ** 2).toFixed(2) + ' MB';
  return (b / 1024 ** 3).toFixed(2) + ' GB';
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeFilenamePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ');
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = header.match(/filename="([^"]+)"/i) ?? header.match(/filename=([^;]+)/i);
  return simpleMatch?.[1]?.trim() ?? null;
}

function unavailableManifestMessage(currentSource: ManifestSource): string {
  switch (currentSource) {
    case 'sushi':
      return 'Manifest not available from EkOp. Try another source; Ex: Hubcap.';
    case 'ryuu':
      return 'Manifest not available from TanJungHoo. Try another source; Ex: Hubcap.';
    case 'yaszz':
      return 'Manifest not available from Yaszz. Try another source; Ex: Hubcap.';
    case 'manifesthub1':
      return 'Invalid API key or manifest not available from DaRwiN. Try another source; Ex: Hubcap.';
    case 'hubcap':
    default:
      return 'Manifest not available.';
  }
}

async function extractErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.detail === 'string') return parsed.detail;
    if (typeof parsed?.message === 'string') return parsed.message;
  } catch {
    // fall through to raw text
  }
  return text || `HTTP ${res.status}`;
}

export default function ManifestPage() {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  const [source, setSource] = useState<ManifestSource>('ryuu');
  const [licenseToken, setLicenseToken] = useState('');
  const [manifestHubApiKey, setManifestHubApiKey] = useState('');
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenDraft, setTokenDraft] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [tokenChecking, setTokenChecking] = useState(false);
  const [manifestHubModalOpen, setManifestHubModalOpen] = useState(false);
  const [manifestHubDraft, setManifestHubDraft] = useState('');
  const [manifestHubError, setManifestHubError] = useState('');
  const [manifestHubChecking, setManifestHubChecking] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownItems, setDropdownItems] = useState<{ name: string; id: string }[]>([]);
  const [dropdownMsg, setDropdownMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [dlStatus, setDlStatus] = useState('');
  const [dlLoading, setDlLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openHubcapTokenModal = () => {
    setTokenDraft(licenseToken);
    setTokenError('');
    setTokenModalOpen(true);
  };

  const openManifestHubModal = () => {
    setManifestHubDraft(manifestHubApiKey);
    setManifestHubError('');
    setManifestHubModalOpen(true);
  };

  const closeTokenModal = () => {
    setTokenModalOpen(false);
    setTokenError('');
  };

  const closeManifestHubModal = () => {
    setManifestHubModalOpen(false);
    setManifestHubError('');
  };

  const confirmHubcapToken = async () => {
    const nextToken = tokenDraft.trim();
    if (!nextToken) {
      setTokenError('Token cannot be empty.');
      return;
    }

    setTokenChecking(true);
    setTokenError('');
    try {
      // Cek validitas token (ada, belum dipakai, belum kedaluwarsa) tanpa
      // mengonsumsinya. Token baru benar-benar "terpakai" saat dipakai untuk
      // download manifest di POST /api/manifest.
      // Token dikirim lewat JSON body (bukan query string) supaya tidak
      // ikut tercatat di access log server/proxy.
      const res = await fetch(`${API_URL}/token/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: nextToken }),
      });

      if (!res.ok) {
        throw new Error(await extractErrorMessage(res));
      }

      setLicenseToken(nextToken);
      setSource('hubcap');
      setTokenModalOpen(false);
      setTokenError('');
      setDlStatus('Token is valid. Hubcap has been selected as the download source.');
    } catch (err: any) {
      setTokenError(String(err?.message ?? 'Token validation failed.'));
    } finally {
      setTokenChecking(false);
    }
  };

  const confirmManifestHubApiKey = async () => {
    const nextKey = manifestHubDraft.trim();
    if (!nextKey) {
      setManifestHubError('API key cannot be empty.');
      return;
    }

    setManifestHubChecking(true);
    setManifestHubError('');
    try {
      setManifestHubApiKey(nextKey);
      setSource('manifesthub1');
      setManifestHubModalOpen(false);
      setManifestHubError('');
      setDlStatus('API key saved. ManifestHub1 has been selected as the download source.');
    } catch (err: any) {
      setManifestHubError(String(err?.message ?? 'API key validation failed.'));
    } finally {
      setManifestHubChecking(false);
    }
  };

  const doSearch = useCallback(async (q: string, mode: SearchMode) => {
    setLoading(true);
    setDropdownOpen(true);
    setDropdownMsg('Searching…');
    setDropdownItems([]);
    try {
      const params = new URLSearchParams({
        q,
        limit: '8',
        appid: String(mode === 'appid'),
      });
      const res = await fetch(`${API_URL}/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const games: Game[] = Array.isArray(data) ? data : data.results ?? data.games ?? data.data ?? [];
      if (!games.length) {
        setDropdownMsg(mode === 'appid' ? 'No games found for this App ID.' : 'No games found.');
      } else {
        setDropdownItems(games.map(g => ({
          name: g.game_name ?? g.name ?? 'Unknown',
          id: String(g.game_id ?? g.app_id ?? g.appid ?? ''),
        })));
        setDropdownMsg('');
      }
    } catch (err: any) {
      setDropdownMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const val = searchMode === 'appid' ? raw.replace(/[^0-9]/g, '') : raw;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Title mode only accepts game titles; App ID-only input is rejected.
    if (searchMode === 'title' && val.trim().length > 0 && /^\d+$/.test(val.trim())) {
      setDropdownOpen(true);
      setDropdownItems([]);
      setDropdownMsg('Title search only accepts game titles. Switch to "App ID" to search by ID.');
      return;
    }

    if (val.length < 3) { setDropdownOpen(false); return; }
    debounceRef.current = setTimeout(() => doSearch(val, searchMode), 350);
  };

  const switchSearchMode = (mode: SearchMode) => {
    if (mode === searchMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchMode(mode);
    setQuery('');
    setDropdownOpen(false);
    setDropdownItems([]);
    setDropdownMsg('');
  };

  const selectGame = async (appId: string, name: string) => {
    setQuery(name);
    setDropdownOpen(false);
    setDlStatus('');
    setDlLoading(false);
    setDetail({
      name, appId,
      bannerUrl: null,
      status: 'loading', statusText: 'Loading…',
      size: '…', modified: '…', release: '…', genres: [],
      canDownload: false,
    });
    setLoading(true);

    const [statusRes, steamRes] = await Promise.allSettled([
      fetch(`${API_URL}/status/${appId}`).then(r => r.ok ? r.json() as Promise<StatusResult> : Promise.reject(`HTTP ${r.status}`)),
      fetch(`${API_URL}/steam/${appId}`).then(r => r.ok ? r.json() as Promise<SteamResult> : Promise.reject(`HTTP ${r.status}`)),
    ]);

    let bannerUrl: string | null = null;
    let canonicalName = name;
    let release = 'N/A';
    let genres: string[] = [];

    if (steamRes.status === 'fulfilled') {
      const s = steamRes.value;
      bannerUrl = s.headerImage ?? s.header_image ?? null;
      if (s.name) canonicalName = s.name;
      if (s.releaseDate) release = s.releaseDate;
      genres = s.genres ?? [];
    }

    let status: DetailState['status'] = 'ok';
    let statusText = 'Available';
    let size = 'N/A';
    let modified = 'N/A';
    let canDownload = false;

    if (statusRes.status === 'fulfilled') {
      const s = statusRes.value;
      const exists = s.exists ?? s.available ?? true;
      const updating = s.update_in_progress ?? s.updating ?? false;
      const needsUpd = s.update_needed ?? false;
      if (!exists) { status = 'missing'; statusText = 'Not found'; }
      else if (updating) { status = 'updating'; statusText = 'Updating…'; }
      else if (needsUpd) { status = 'updating'; statusText = 'Update needed'; }
      const bytes = s.file_size ?? s.size ?? null;
      size = bytes != null ? formatBytes(bytes) : 'N/A';
      const mod = s.file_modified ?? s.modified_time ?? s.last_modified ?? s.updated_at ?? null;
      modified = mod ? formatUtcTimestamp(mod) : "N/A";
      if (exists) canDownload = true;
    } else {
      status = 'missing';
      statusText = 'Error fetching status';
      canDownload = true;
    }

    setDetail({ name: canonicalName, appId, bannerUrl, status, statusText, size, modified, release, genres, canDownload });
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!detail) return;

    if (source === 'hubcap' && !licenseToken) {
      openHubcapTokenModal();
      return;
    }

    if (source === 'manifesthub1' && !manifestHubApiKey.trim()) {
      openManifestHubModal();
      return;
    }

    setDlLoading(true);
    setDlStatus(SOURCE_INFO[source].requestText);

    try {
      const payload: Record<string, unknown> = {
        app_id: Number(detail.appId),
        source,
      };
      if (source === 'hubcap') {
        payload.token = licenseToken;
      }
      if (source === 'manifesthub1') {
        payload.api_key = manifestHubApiKey.trim();
      }

      const res = await fetch(`${API_URL}/manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await extractErrorMessage(res);
        const lower = text.toLowerCase();

        // One-time token: not found, already used, expired, or required.
        const isTokenIssue =
          source === 'hubcap' &&
          (lower.includes('token not found') ||
            lower.includes('token has been used') ||
            lower.includes('token has expired') ||
            lower.includes('token is required'));

        if (isTokenIssue) {
          setLicenseToken('');
          setTokenDraft('');
          setTokenError(text);
          setTokenModalOpen(true);
          throw new Error(text);
        }

        if (lower.includes('manifest is not available') || lower.includes('failed to fetch manifest')) {
          setDlStatus(`✗ ${unavailableManifestMessage(source)}`);
          return;
        }

        throw new Error(`HTTP ${res.status} — ${text.slice(0, 120)}`);
      }

      const blob = await res.blob();
      const headerFilename = filenameFromContentDisposition(res.headers.get('content-disposition'));
      const fallbackGameName = safeFilenamePart(detail.name || '');
      const fallbackFilename = fallbackGameName ? `${detail.appId}_${fallbackGameName}.zip` : `${detail.appId}.zip`;
      const downloadFilename = headerFilename || fallbackFilename;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setDlStatus(`✓ ${downloadFilename} downloaded.`);

      // One-time token: once used for a download, the backend has already
      // marked it as used. Clear the frontend state too so the next download
      // must provide a fresh token.
      if (source === 'hubcap') {
        setLicenseToken('');
      }
    } catch (err: any) {
      const message = String(err?.message ?? 'Unknown error');
      setDlStatus(`✗ ${message}`);
    } finally {
      setDlLoading(false);
    }
  };

  const SOURCE_INFO = {
  sushi: {
    name: 'EkOp',
    description:
      'EkOp is a free manifest source, but DLC availability is limited.',
    requestText: 'Requesting manifest from EkOp…',
  },
  hubcap: {
    name: 'Melvinz',
    description:
      'Melvinz is a source manifest with 99.9% Game & DLC availability, but it requires an access token.',
    requestText: 'Requesting manifest from Melvinz…',
  },
  manifesthub1: {
    name: 'DaRwiN',
    description:
      'DaRwiN is a free source manifest that provides only the manifest file, without Lua scripts; it is suitable for updating your game. DaRwiN requires your own API key.',
    requestText: 'Requesting manifest from DaRwiN…',
  },
  ryuu: {
    name: 'TanJungHoo',
    description:
      'TanJungHoo is a free manifest source that provides the latest game updates and DLC, but not as complete as Melvinz.',
    requestText: 'Requesting manifest from TanJungHoo…',
  },
  yaszz: {
    name: 'Yaszz',
    description:
      'Yaszz is a free manifest source, just like TanJungHoo',
    requestText: 'Requesting manifest from Yaszz…',
  },
} as const;

  const statusColors: Record<string, string> = { ok: '#22C55E', missing: '#EF4444', updating: '#eab308', loading: '#9CA3AF' };
  const statusBg: Record<string, string> = { ok: 'rgba(34,197,94,0.1)', missing: 'rgba(239,68,68,0.1)', updating: 'rgba(234,179,8,0.1)', loading: 'rgba(156,163,175,0.1)' };

  return (
    <div style={{
      paddingTop: 64,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        padding: '30px 24px 0px',
        textAlign: 'center',
      }}>
        
        <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: 10 }}>
          Find & download Steam manifests
        </h1>
        <p style={{ fontSize: 15, color: '#9CA3AF', maxWidth: 480, margin: '0 auto' }}>
          Search by game title or App ID to download manifest files.
        </p>
      </div>

      {/* Main content */}
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Source selector */}
        <div style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 14,
          background: 'rgba(17,24,39,0.55)',
          border: '1px solid rgba(42,45,62,0.8)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10 }}>
            Download Source
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {([
              {
                value: 'ryuu' as const,
                title: 'TanJungHoo',
                subtitle: 'Free', //(Recommended)
              },
              {
                value: 'sushi' as const,
                title: 'EkOp',
                subtitle: 'Free',
              },
              {
                value: 'yaszz' as const,
                title: 'Yaszz',
                subtitle: 'Alternative source',
              },
              {
                value: 'manifesthub1' as const,
                title: 'DaRwiN',
                subtitle: 'API key required (Manifest Only)',
              },
              {
                value: 'hubcap' as const,
                title: 'Melvinz',
                subtitle: 'Need token (Best)',
              },
      
            ].filter(option => !HIDDEN_SOURCE_OPTIONS.has(option.value))).map(option => {
              const active = source === option.value;
              const baseCardStyle = {
                textAlign: 'left' as const,
                padding: '14px 14px 13px',
                borderRadius: 12,
                border: active ? '1.5px solid rgba(168,85,247,0.55)' : '1px solid rgba(42,45,62,0.85)',
                background: active ? 'rgba(168,85,247,0.12)' : 'rgba(15,15,19,0.55)',
                color: '#FAFAFA',
                transition: 'all 0.15s ease',
              };

              const sourceBody = (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{option.title}</span>
                    {option.value === 'manifesthub1' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Edit Api Key"
                          onClick={e => {
                            e.stopPropagation();
                            openManifestHubModal();
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              openManifestHubModal();
                            }
                          }}
                          style={{
                            border: '1px solid rgba(168,85,247,0.35)',
                            background: 'rgba(168,85,247,0.12)',
                            color: '#E9D5FF',
                            borderRadius: 999,
                            padding: '4px 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            lineHeight: 1,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            userSelect: 'none',
                          }}
                        >
                          Edit API Key
                        </span>
                        <span style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          border: active ? '4px solid #A855F7' : '1.5px solid rgba(156,163,175,0.6)',
                          background: active ? '#fff' : 'transparent',
                          flexShrink: 0,
                        }} />
                      </span>
                    ) : (
                      <span style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        border: active ? '4px solid #A855F7' : '1.5px solid rgba(156,163,175,0.6)',
                        background: active ? '#fff' : 'transparent',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6, lineHeight: 1.4 }}>
                    {option.subtitle}
                  </div>
                </>
              );

              if (option.value === 'manifesthub1') {
                return (
                  <div
                    key={option.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (manifestHubApiKey.trim()) {
                        setSource('manifesthub1');
                      } else {
                        openManifestHubModal();
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (manifestHubApiKey.trim()) {
                          setSource('manifesthub1');
                        } else {
                          openManifestHubModal();
                        }
                      }
                    }}
                    style={{
                      ...baseCardStyle,
                      cursor: 'pointer',
                    }}
                  >
                    {sourceBody}
                  </div>
                );
              }

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (option.value === 'hubcap') {
                      if (licenseToken) {
                        setSource('hubcap');
                      } else {
                        openHubcapTokenModal();
                      }
                      return;
                    }

                    setSource(option.value);
                  }}
                  style={baseCardStyle}
                >
                  {sourceBody}
                </button>
              );
            })}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
            {SOURCE_INFO[source].description}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}
                width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                inputMode={searchMode === 'appid' ? 'numeric' : 'text'}
                value={query}
                onChange={handleInput}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                onFocus={() => query.length >= 3 && dropdownItems.length > 0 && setDropdownOpen(true)}
                placeholder={searchMode === 'appid' ? 'Search by App ID (e.g. 730)…' : 'Search by game title…'}
                autoComplete="off"
                style={{
                  width: '100%',
                  background: 'rgba(26,29,39,0.8)',
                  border: '1.5px solid rgba(42,45,62,0.8)',
                  borderRadius: 12,
                  padding: '15px 16px 15px 46px',
                  fontSize: 15, color: '#FAFAFA',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = '#A855F7')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(42,45,62,0.8)')}
              />
            </div>

            {/* Search mode toggle */}
            <div
              role="group"
              aria-label="Search by"
              style={{
                display: 'flex',
                flexShrink: 0,
                background: 'rgba(26,29,39,0.8)',
                border: '1.5px solid rgba(42,45,62,0.8)',
                borderRadius: 12,
                padding: 4,
                gap: 2,
              }}
            >
              {([
                { value: 'title' as const, label: 'Title' },
                { value: 'appid' as const, label: 'App ID' },
              ]).map(opt => {
                const active = searchMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => switchSearchMode(opt.value)}
                    aria-pressed={active}
                    style={{
                      border: 'none',
                      borderRadius: 9,
                      padding: '0 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      color: active ? '#fff' : '#9CA3AF',
                      background: active ? '#A855F7' : 'transparent',
                      boxShadow: active ? '0 2px 12px rgba(168,85,247,0.35)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading bar */}
          {loading && (
            <div style={{
              height: 2, background: 'rgba(42,45,62,0.6)',
              borderRadius: 2, overflow: 'hidden', marginTop: 6,
            }}>
              <div style={{
                height: '100%', width: '40%',
                background: 'linear-gradient(90deg, transparent, #A855F7, transparent)',
                animation: 'shimmer 1s ease-in-out infinite',
              }} />
              <style>{`@keyframes shimmer { 0% { transform: translateX(-250%); } 100% { transform: translateX(400%); } }`}</style>
            </div>
          )}

          {/* Dropdown */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              background: '#1a1d27',
              border: '1.5px solid rgba(42,45,62,0.9)',
              borderRadius: 12,
              overflow: 'hidden',
              zIndex: 100,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              maxHeight: 320, overflowY: 'auto',
            }}>
              {dropdownMsg ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>{dropdownMsg}</div>
              ) : (
                dropdownItems.map(item => (
                  <button
                    key={item.id}
                    onMouseDown={() => selectGame(item.id, item.name)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '12px 16px',
                      background: 'none', border: 'none',
                      borderBottom: '1px solid rgba(42,45,62,0.4)',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', flexShrink: 0 }}>{item.id}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Detail card */}
        {detail && (
          <div style={{
            background: 'rgba(17,24,39,0.7)',
            border: '1.5px solid rgba(42,45,62,0.8)',
            borderRadius: 16,
            overflow: 'hidden',
            animation: 'fadeUp 0.2s ease',
          }}>
            <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            {/* Banner */}
            {detail.bannerUrl ? (
              <img
                src={detail.bannerUrl}
                alt={escHtml(detail.name)}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '460/215', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', aspectRatio: '460/215',
                background: 'linear-gradient(135deg, #1e2130, #2a2d3e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#9CA3AF', fontSize: 13,
              }}>
                {loading ? 'Loading image…' : 'No image available'}
              </div>
            )}

            {/* Header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(42,45,62,0.5)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>{detail.name}</h2>
              <span style={{
                fontFamily: 'monospace', fontSize: 11, fontWeight: 500,
                background: 'rgba(168,85,247,0.12)',
                color: '#C084FC',
                border: '1px solid rgba(168,85,247,0.25)',
                padding: '3px 8px', borderRadius: 5,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                App ID: {detail.appId}
              </span>
            </div>

            {/* Stats grid */}
            <div style={{
              padding: '20px 24px',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
            }}>
              {[
                {
                  label: 'Status',
                  val: (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 500,
                      background: statusBg[detail.status],
                      color: statusColors[detail.status],
                      padding: '3px 10px', borderRadius: 999,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[detail.status], display: 'inline-block' }} />
                      {detail.statusText}
                    </span>
                  ),
                },
                { label: 'Release Date', val: <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#FAFAFA' }}>{detail.release}</span> },
                { label: 'File Size', val: <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#FAFAFA' }}>{detail.size}</span> },
                { label: 'Last Updated', val: <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#FAFAFA' }}>{detail.modified}</span> },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>{label}</div>
                  {val}
                </div>
              ))}

              {detail.genres.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>Genres</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detail.genres.map(g => (
                      <span key={g} style={{
                        fontSize: 11, fontWeight: 500,
                        background: 'rgba(168,85,247,0.1)',
                        color: '#C084FC',
                        border: '1px solid rgba(168,85,247,0.2)',
                        padding: '3px 10px', borderRadius: 999,
                      }}>{g}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Download footer */}
            <div style={{ padding: '16px 24px 24px', borderTop: '1px solid rgba(42,45,62,0.5)' }}>
              <button
                disabled={!detail.canDownload || dlLoading}
                onClick={handleDownload}
                style={{
                  width: '100%',
                  background: detail.canDownload && !dlLoading ? '#A855F7' : 'rgba(168,85,247,0.3)',
                  color: '#fff',
                  border: 'none', borderRadius: 10,
                  padding: '14px',
                  fontSize: 14, fontWeight: 600,
                  cursor: detail.canDownload && !dlLoading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                  boxShadow: detail.canDownload ? '0 4px 20px rgba(168,85,247,0.3)' : 'none',
                }}
                onMouseEnter={e => { if (detail.canDownload && !dlLoading) e.currentTarget.style.background = '#9333EA'; }}
                onMouseLeave={e => { if (detail.canDownload && !dlLoading) e.currentTarget.style.background = '#A855F7'; }}
              >
                {dlLoading ? (
                  <>
                    <span style={{
                      width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite', display: 'inline-block',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    Downloading…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download manifest via {SOURCE_INFO[source].name}
                  </>
                )}
              </button>

              {dlStatus && (
                <p style={{
                  marginTop: 10, fontSize: 12, textAlign: 'center',
                  color: dlStatus.startsWith('✓') ? '#22C55E' : dlStatus.startsWith('✗') ? '#EF4444' : '#9CA3AF',
                }}>
                  {dlStatus}
                </p>
              )}
            </div>
          </div>
        )}

        {!detail && !loading && (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            color: '#9CA3AF',
          }}>
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 16px', opacity: 0.4 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p style={{ fontSize: 14 }}>Search for a Steam game to get started</p>
          </div>
        )}
      </div>

      {tokenModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hubcap-token-title"
          onMouseDown={closeTokenModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 2000,
          }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(17,24,39,0.98))',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 18,
              boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
              padding: 24,
              color: '#FAFAFA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: 'rgba(168,85,247,0.12)',
                  border: '1px solid rgba(168,85,247,0.25)',
                  color: '#C084FC',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                  Melvinz Access
                </div>
                <h3 id="hubcap-token-title" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                  Insert Token
                </h3>
                <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: '#9CA3AF' }}>
                  Melvinz is a source manifest with 99.9% Game & DLC availability, but it requires an access token. Insert a token to use Melvinz. Tokens can be obtained by making a request on Discord.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTokenModal}
                disabled={tokenChecking}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: 4,
                }}
                aria-label="Close token dialog"
              >
                ×
              </button>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
              License Token
            </label>
            <input
              autoFocus
              value={tokenDraft}
              onChange={e => {
                setTokenDraft(e.target.value.toUpperCase());
                setTokenError('');
              }}
              placeholder="DX-XXXXX"
              spellCheck={false}
              autoComplete="off"
              style={{
                width: '100%',
                borderRadius: 12,
                border: `1px solid ${tokenError ? 'rgba(239,68,68,0.6)' : 'rgba(42,45,62,0.9)'}`,
                background: 'rgba(15,15,19,0.7)',
                color: '#FAFAFA',
                padding: '14px 16px',
                fontSize: 15,
                outline: 'none',
                letterSpacing: '0.04em',
                fontFamily: 'monospace',
              }}
            />
            

            {tokenError && (
              <div style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#FCA5A5',
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                {tokenError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={closeTokenModal}
                disabled={tokenChecking}
                style={{
                  flex: '0 0 auto',
                  border: '1px solid rgba(42,45,62,0.9)',
                  background: 'rgba(15,15,19,0.7)',
                  color: '#E5E7EB',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmHubcapToken}
                disabled={tokenChecking}
                style={{
                  flex: 1,
                  border: 'none',
                  background: tokenChecking ? 'rgba(168,85,247,0.6)' : '#A855F7',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: tokenChecking ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(168,85,247,0.28)',
                }}
              >
                {tokenChecking ? 'Checking...' : 'Enter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {manifestHubModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manifesthub-token-title"
          onMouseDown={closeManifestHubModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 2000,
          }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(17,24,39,0.98))',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 18,
              boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
              padding: 24,
              color: '#FAFAFA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: 'rgba(168,85,247,0.12)',
                  border: '1px solid rgba(168,85,247,0.25)',
                  color: '#C084FC',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                  DaRwiN Access
                </div>
                <h3 id="manifesthub-token-title" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                  Insert API Key
                </h3>
                <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: '#9CA3AF' }}>
                  DaRwiN is a free source manifest that provides only the manifest file, without Lua scripts; it is suitable for updating your game. DaRwiN requires your own API key. API Key can be obtained{" "} <a href="https://manifesthub1.filegear-sg.me" target="_blank" rel="noopener noreferrer" style={{color: "#A855F7",fontWeight: 600,textDecoration: "none",}}>here</a>.
                </p>
              </div>
              <button
                type="button"
                onClick={closeManifestHubModal}
                disabled={manifestHubChecking}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: 4,
                }}
                aria-label="Close ManifestHub dialog"
              >
                ×
              </button>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
              API Key
            </label>
            <input
              autoFocus
              type="password"
              value={manifestHubDraft}
              onChange={e => {
                setManifestHubDraft(e.target.value);
                setManifestHubError('');
              }}
              placeholder="Paste your DaRwiN API key"
              spellCheck={false}
              autoComplete="off"
              style={{
                width: '100%',
                borderRadius: 12,
                border: `1px solid ${manifestHubError ? 'rgba(239,68,68,0.6)' : 'rgba(42,45,62,0.9)'}`,
                background: 'rgba(15,15,19,0.7)',
                color: '#FAFAFA',
                padding: '14px 16px',
                fontSize: 15,
                outline: 'none',
                letterSpacing: '0.04em',
                fontFamily: 'monospace',
              }}
            />

            {manifestHubError && (
              <div style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#FCA5A5',
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                {manifestHubError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={closeManifestHubModal}
                disabled={manifestHubChecking}
                style={{
                  flex: '0 0 auto',
                  border: '1px solid rgba(42,45,62,0.9)',
                  background: 'rgba(15,15,19,0.7)',
                  color: '#E5E7EB',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmManifestHubApiKey}
                disabled={manifestHubChecking}
                style={{
                  flex: 1,
                  border: 'none',
                  background: manifestHubChecking ? 'rgba(168,85,247,0.6)' : '#A855F7',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: manifestHubChecking ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(168,85,247,0.28)',
                }}
              >
                {manifestHubChecking ? 'Checking...' : 'Enter'}
              </button>
            </div>
          </div>
        </div>
      )}
       <Footer />
    </div>
  );
}
