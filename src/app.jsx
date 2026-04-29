// app.jsx — shell, routing, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "teal",
  "density": "comfy",
  "restSec": 90,
  "showRestTimer": true,
  "weekStart": "mon",
  "weightUnit": "kg"
}/*EDITMODE-END*/;

const ACCENTS = {
  teal: { name: 'Teal', h: '#1EA2B8', d: '#2FB4C8' },
  amber: { name: 'Ámbar', h: '#F59E0B', d: '#FBBF24' },
  violet: { name: 'Violeta', h: '#8B5CF6', d: '#A78BFA' },
  rose: { name: 'Rosa', h: '#EF4444', d: '#F87171' },
  green: { name: 'Verde', h: '#10B981', d: '#34D399' },
};

function applyTweaks(tw) {
  const a = ACCENTS[tw.accent] || ACCENTS.teal;
  const root = document.documentElement;
  root.style.setProperty('--accent', a.h);
  root.style.setProperty('--accent-hover', a.d);
  root.style.setProperty('--teal-500', a.h);
  root.style.setProperty('--teal-400', a.d);
  root.style.setProperty('--teal-300', a.d);
  if (tw.density === 'compact') {
    root.style.setProperty('--pa-space-4', '12px');
  }
}

function App() {
  const [loading, setLoading] = React.useState(true);
  const [state, setState] = React.useState(defaultState);
  const [tab, setTab] = React.useState('home');
  const [params, setParams] = React.useState({});
  const [tweaks, setTweaks] = React.useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...(JSON.parse(localStorage.getItem('bitacora-tweaks') || '{}')) }; }
    catch { return TWEAK_DEFAULTS; }
  });
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem('bitacora-sidebar-collapsed') === '1'; } catch { return false; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('bitacora-sidebar-collapsed', sidebarCollapsed ? '1' : '0'); } catch { }
  }, [sidebarCollapsed]);

  // Load state from server on mount
  React.useEffect(() => {
    fetchState().then(s => {
      setState(s);
      if (s.activeSession) setTab('session');
      setLoading(false);
    });
  }, []);

  // Persist to server on every state change (debounced inside persistState)
  React.useEffect(() => {
    if (loading) return;
    persistState(state);
  }, [state, loading]);

  React.useEffect(() => {
    applyTweaks(tweaks);
    localStorage.setItem('bitacora-tweaks', JSON.stringify(tweaks));
  }, [tweaks]);

  // Toast when new PR detected via sessions change
  const prevSessCount = React.useRef(state.sessions.length);
  React.useEffect(() => {
    if (loading) return;
    if (state.sessions.length > prevSessCount.current) {
      const latest = state.sessions[state.sessions.length - 1];
      const prior = state.sessions.slice(0, -1);
      let prCount = 0;
      for (const b of latest.blocks) {
        if (bestPRSetId(b, prior) !== null) prCount++;
      }
      if (prCount > 0) {
        setToast({ kind: 'success', text: `¡${prCount} nuevo${prCount === 1 ? '' : 's'} PR! 🏆` });
      } else {
        setToast({ kind: 'success', text: 'Sesión guardada' });
      }
    }
    prevSessCount.current = state.sessions.length;
  }, [state.sessions.length, loading]);

  React.useEffect(() => {
    if (!toast) return;
    const i = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(i);
  }, [toast]);

  // Tweaks messaging
  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--fg-3)', fontSize: 14 }}>
      Cargando…
    </div>
  );

  const updateTweak = (patch) => {
    setTweaks(t => {
      const next = { ...t, ...patch };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
      return next;
    });
  };

  const goTo = (next, p = {}) => { setTab(next); setParams(p); };

  const stateWithTweaks = { ...state, restSec: tweaks.restSec, weightUnit: tweaks.weightUnit || 'kg', accentColor: (ACCENTS[tweaks.accent] || ACCENTS.teal).h, accentKey: tweaks.accent || 'teal' };

  const navItems = [
    { id: 'home', label: 'Inicio', icon: 'Home' },
    { id: 'session', label: state.activeSession ? 'Sesión activa' : 'Entrenar', icon: 'Dumbbell', dot: !!state.activeSession },
    { id: 'history', label: 'Historial', icon: 'Calendar' },
    { id: 'stats', label: 'Estadísticas', icon: 'Chart' },
    { id: 'library', label: 'Biblioteca', icon: 'Library' },
  ];

  const NavIcon = ({ name, size = 18, color }) => {
    const C = I[name] || I.Home;
    return <C size={size} color={color} />;
  };

  const handleNavClick = (id) => {
    if (id === 'session' && !state.activeSession) {
      const sess = { id: uid(), name: '', date: todayISO(), startedAt: Date.now(), endedAt: null, blocks: [] };
      setState(s => ({ ...s, activeSession: sess }));
      setTab('session');
    } else {
      goTo(id);
    }
  };

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">GT</div>
          <div className="brand-text">
            <div className="brand-name">GymTracker</div>
            <div className="brand-sub">Registro personal</div>
          </div>
          <button className="btn ghost sm sidebar-toggle" title={sidebarCollapsed ? 'Expandir' : 'Colapsar'} onClick={() => setSidebarCollapsed(v => !v)}>
            {sidebarCollapsed ? <I.Chevron size={14} /> : <I.ChevronL size={14} />}
          </button>
        </div>

        <div className="nav-section-label">Menú</div>
        {navItems.map(it => (
          <button key={it.id} title={sidebarCollapsed ? it.label : ''} className={`nav-item ${tab === it.id ? 'active' : ''}`} onClick={() => handleNavClick(it.id)}>
            <NavIcon name={it.icon} size={17} />
            <span>{it.label}</span>
            {it.dot && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />}
          </button>
        ))}

        <div className="sidebar-footer">
          <div className="avatar">YO</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--fg-1)', fontWeight: 600 }}>Atleta</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Bitácora local</div>
          </div>
          <button className="btn ghost sm" title="Ajustes" onClick={() => setTweaksOpen(v => !v)}><I.Settings size={14} /></button>
        </div>
      </aside>

      <main className="main">
        {tab === 'home' && <HomeView state={stateWithTweaks} setState={setState} goTo={goTo} />}
        {tab === 'session' && state.activeSession && <SessionView state={stateWithTweaks} setState={setState} goTo={goTo} />}
        {tab === 'session' && !state.activeSession && (
          <div className="card empty">
            <div className="empty-icon"><I.Dumbbell size={24} /></div>
            <div className="empty-title">No hay sesión activa</div>
            <div className="empty-sub">Inicia una sesión para registrar series en vivo.</div>
            <button className="btn primary" onClick={() => handleNavClick('session')}><I.Plus size={16} /> Iniciar ahora</button>
          </div>
        )}
        {tab === 'history' && <HistoryView state={stateWithTweaks} setState={setState} goTo={goTo} params={params} />}
        {tab === 'stats' && <StatsView state={stateWithTweaks} goTo={goTo} />}
        {tab === 'library' && <LibraryView state={stateWithTweaks} setState={setState} goTo={goTo} />}
        {tab === 'exercise' && <ExerciseDetailView state={stateWithTweaks} setState={setState} goTo={goTo} params={params} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {navItems.slice(0, 5).map(it => (
          <button key={it.id} className={tab === it.id ? 'active' : ''} onClick={() => handleNavClick(it.id)}>
            <NavIcon name={it.icon} size={18} />
            <span>{it.label.length > 9 ? it.label.slice(0, 9) : it.label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div className={`toast ${toast.kind}`}>{toast.text}</div>
      )}

      {tweaksOpen && (
        <div className="tweaks">
          <div className="tweaks-head">
            <span>Tweaks</span>
            <button className="btn ghost sm" onClick={() => setTweaksOpen(false)}><I.X size={14} /></button>
          </div>
          <div className="tweaks-body">
            <div className="tweak-row">
              <label>Color de acento</label>
              <div className="tweak-swatches">
                {Object.entries(ACCENTS).map(([k, a]) => (
                  <button key={k}
                    className={`tweak-sw ${tweaks.accent === k ? 'active' : ''}`}
                    style={{ background: a.h }}
                    onClick={() => updateTweak({ accent: k })}
                    title={a.name}
                  />
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <label>Descanso entre series (seg)</label>
              <input className="input" type="number" value={tweaks.restSec} onChange={e => updateTweak({ restSec: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
            <div className="tweak-row">
              <label>Unidad de peso</label>
              <div className="seg" style={{ width: '100%' }}>
                <button className={(tweaks.weightUnit || 'kg') === 'kg' ? 'active' : ''} onClick={() => updateTweak({ weightUnit: 'kg' })} style={{ flex: 1 }}>Kilogramos (kg)</button>
                <button className={tweaks.weightUnit === 'lb' ? 'active' : ''} onClick={() => updateTweak({ weightUnit: 'lb' })} style={{ flex: 1 }}>Libras (lb)</button>
              </div>
            </div>
            <div className="tweak-row">
              <label>Datos</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn secondary sm" onClick={() => {
                  const data = JSON.stringify(state, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `bitacora-gym-${todayISO()}.json`; a.click();
                  URL.revokeObjectURL(url);
                  setToast({ kind: 'success', text: 'Datos exportados' });
                }}>Exportar</button>
                <button className="btn secondary sm" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'application/json,.json';
                  input.onchange = async (ev) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const parsed = JSON.parse(text);
                      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.exercises) || !Array.isArray(parsed.sessions)) {
                        throw new Error('Formato no válido (se esperaba { exercises: [], sessions: [] })');
                      }
                      const mode = confirm(
                        `Se encontraron ${parsed.exercises.length} ejercicios y ${parsed.sessions.length} sesiones.\n\n` +
                        'Aceptar = FUSIONAR con lo que ya tienes (sin duplicados por id).\n' +
                        'Cancelar = REEMPLAZAR toda la bitácora actual.'
                      );
                      setState(cur => {
                        if (mode) {
                          const exIds = new Set(cur.exercises.map(e => e.id));
                          const sIds = new Set(cur.sessions.map(s => s.id));
                          return {
                            ...cur,
                            exercises: [...cur.exercises, ...parsed.exercises.filter(e => !exIds.has(e.id))],
                            sessions: [...cur.sessions, ...parsed.sessions.filter(s => !sIds.has(s.id))],
                          };
                        }
                        return {
                          ...defaultState(),
                          ...parsed,
                          exercises: parsed.exercises,
                          sessions: parsed.sessions,
                          activeSession: parsed.activeSession || null,
                        };
                      });
                      setToast({ kind: 'success', text: mode ? 'Datos fusionados' : 'Datos importados' });
                    } catch (err) {
                      alert('No se pudo importar:\n' + err.message);
                    }
                  };
                  input.click();
                }}>Importar</button>
                <button className="btn danger sm" onClick={() => {
                  if (!confirm('¿Borrar toda la bitácora? Esta acción no se puede deshacer.')) return;
                  const fresh = defaultState();
                  setState(fresh);
                  setToast({ kind: 'warn', text: 'Bitácora reiniciada' });
                }}>Reiniciar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
