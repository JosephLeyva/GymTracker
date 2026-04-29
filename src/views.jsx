// views.jsx — Home, History, Library, Stats

function HomeView({ state, setState, goTo }) {
  const [period, setPeriod] = React.useState('all');
  const sessions = state.sessions;
  const today = todayISO();

  const periodSessions = period === 'week'
    ? sessions.filter(s => weekKey(s.date) === weekKey(today))
    : period === 'month'
      ? sessions.filter(s => s.date.slice(0, 7) === today.slice(0, 7))
      : sessions;

  const totalSessions = periodSessions.length;
  const totalVolume = periodSessions.reduce((n, s) => n + sessionVolume(s), 0);
  const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e]));

  let totalPRs = 0;
  if (period === 'all') {
    totalPRs = Object.keys(bestOneRMPerExercise(sessions)).length;
  } else {
    const withPR = new Set();
    for (const sess of periodSessions) {
      const prior = sessions.filter(s => s.date < sess.date || (s.date === sess.date && s.startedAt < sess.startedAt));
      for (const blk of sess.blocks || []) {
        for (const set of blk.sets || []) {
          if (isPRSet(set, blk.exerciseId, prior)) withPR.add(blk.exerciseId);
        }
      }
    }
    totalPRs = withPR.size;
  }

  const periodDates = new Set(periodSessions.map(s => s.date));
  let streak = 0;
  if (periodDates.size > 0) {
    const lastDate = [...periodDates].sort().at(-1);
    const d = new Date(lastDate + 'T00:00:00');
    while (periodDates.has(d.toLocaleDateString('sv-SE', { timeZone: 'America/Phoenix' }))) { streak++; d.setDate(d.getDate() - 1); }
  }

  const periodLabel = period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mes' : 'Histórico';

  const startSession = () => {
    const sess = { id: uid(), name: '', date: todayISO(), startedAt: Date.now(), endedAt: null, blocks: [] };
    setState(s => ({ ...s, activeSession: sess }));
    goTo('session');
  };

  const recent = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tu bitácora</h1>
          <div className="page-sub">{fmtDate(todayISO(), { long: true })}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="seg">
            <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}><I.Week size={13} /> Semana</button>
            <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}><I.Month size={13} /> Mes</button>
            <button className={period === 'all' ? 'active' : ''} onClick={() => setPeriod('all')}><I.History size={13} /> Histórico</button>
          </div>
          {state.activeSession ? (
            <button className="btn primary lg" onClick={() => goTo('session')}>
              <I.Play size={16} /> Continuar sesión
            </button>
          ) : (
            <button className="btn primary lg" onClick={startSession}>
              <I.Plus size={18} /> Nueva sesión
            </button>
          )}
        </div>
      </div>

      <div className="stat-row" style={{ marginBottom: 20 }}>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--cat-strength)' }}><I.Activity size={18} /></div>
          <div className="label">Sesiones</div>
          <div className="value">{totalSessions}</div>
          <div className="delta">{periodLabel}</div>
        </div>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--cat-legs)' }}><I.Weight size={18} /></div>
          <div className="label">Volumen total</div>
          <div className="value">{kgToDisplay(totalVolume, state.weightUnit).toLocaleString('es-MX')}<span style={{ fontSize: 14, color: 'var(--fg-3)', fontWeight: 500, marginLeft: 4 }}>{unitLabel(state.weightUnit)}</span></div>
          <div className="delta">{periodLabel}</div>
        </div>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--warning)' }}><I.Trophy size={18} /></div>
          <div className="label">Records (PRs)</div>
          <div className="value">{totalPRs}</div>
          <div className="delta">{period === 'all' ? 'Ejercicios con PR' : `Nuevos PRs · ${periodLabel.toLowerCase()}`}</div>
        </div>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--cat-pull)' }}><I.Flame size={18} /></div>
          <div className="label">Racha</div>
          <div className="value">{streak}<span style={{ fontSize: 14, color: 'var(--fg-3)', fontWeight: 500, marginLeft: 4 }}>días</span></div>
          <div className="delta">{period === 'all' ? 'Días consecutivos' : `Consecutivos · ${periodLabel.toLowerCase()}`}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }} className="home-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Actividad · últimas 26 semanas</div>
              <div className="card-sub">Intensidad por día de entrenamiento</div>
            </div>
          </div>
          {totalSessions === 0 ? (
            <div className="empty">
              <div className="empty-icon"><I.Calendar size={24} /></div>
              <div className="empty-title">Sin actividad aún</div>
              <div className="empty-sub">Tu primer entrenamiento aparecerá aquí.</div>
            </div>
          ) : <Heatmap sessions={sessions} />}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Sesiones recientes</div>
            <button className="btn ghost sm" onClick={() => goTo('history')}>Ver todas <I.Chevron size={12} /></button>
          </div>
          {recent.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <div className="empty-sub">Aún no registras sesiones.</div>
              <button className="btn primary sm" onClick={startSession} style={{ marginTop: 10 }}>
                <I.Plus size={14} /> Empezar ahora
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(s => {
                const groups = new Set();
                for (const b of s.blocks) { const e = exMap[b.exerciseId]; if (e) groups.add(e.group); }
                return (
                  <div key={s.id} className="exercise-row" onClick={() => goTo('history', { sessionId: s.id })}>
                    <div style={{ width: 44, textAlign: 'center' }}>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{fmtWeekday(s.date)}</div>
                      <div style={{ fontSize: 18, color: 'var(--fg-1)', fontWeight: 700, letterSpacing: '-0.02em' }}>{new Date(s.date + 'T00:00:00').getDate()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="ex-name">{s.name || [...groups].slice(0, 2).join(' + ') || 'Sesión'}</div>
                      <div className="ex-meta">
                        {s.blocks.length} ejercicio{s.blocks.length === 1 ? '' : 's'} · {kgToDisplay(sessionVolume(s), state.weightUnit).toLocaleString('es-MX')} {unitLabel(state.weightUnit)} · {sessionDuration(s)} min
                      </div>
                    </div>
                    <I.Chevron size={14} color="var(--fg-4)" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .home-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function HistoryView({ state, setState, goTo, params }) {
  const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e]));
  const [mode, setMode] = React.useState('calendar');
  const [cursor, setCursor] = React.useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedId, setSelectedId] = React.useState(params?.sessionId || null);
  const [editing, setEditing] = React.useState(null); // session object being edited, or { __new: true, date }

  const addExerciseInline = (ex) => setState(s => ({ ...s, exercises: [...s.exercises, ex] }));
  const stateForEditor = { ...state, __addExercise: addExerciseInline };

  const openEdit = (sess) => setEditing(sess);
  const openNew = (date) => setEditing({ __new: true, date: date || todayISO() });

  const saveEdited = (sess) => {
    setState(s => {
      const exists = s.sessions.some(x => x.id === sess.id);
      return {
        ...s,
        sessions: exists
          ? s.sessions.map(x => x.id === sess.id ? sess : x)
          : [...s.sessions, sess],
      };
    });
    setEditing(null);
    setSelectedId(sess.id);
  };

  const monthSessions = state.sessions.filter(s => {
    const d = new Date(s.date + 'T00:00:00');
    return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
  });
  const byDate = {};
  for (const s of state.sessions) (byDate[s.date] ||= []).push(s);

  // Calendar grid
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(first); d.setDate(d.getDate() - (startOffset - i));
    cells.push({ date: d, out: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), out: false });
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last); d.setDate(d.getDate() + 1);
    cells.push({ date: d, out: true });
  }
  const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][cursor.getMonth()];
  const today = todayISO();

  const selected = selectedId ? state.sessions.find(s => s.id === selectedId) : null;

  const sortedList = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));

  const deleteSession = (id) => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    setState(s => ({ ...s, sessions: s.sessions.filter(x => x.id !== id) }));
    setSelectedId(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial</h1>
          <div className="page-sub">{state.sessions.length} sesiones registradas</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="seg">
            <button className={mode === 'calendar' ? 'active' : ''} onClick={() => setMode('calendar')}>Calendario</button>
            <button className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>Lista</button>
          </div>
          <button className="btn primary" onClick={() => openNew()}>
            <I.Plus size={16} /> Nueva sesión
          </button>
        </div>
      </div>

      {mode === 'calendar' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn ghost sm" onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><I.ChevronL size={14} /></button>
              <div className="card-title">{monthName} {cursor.getFullYear()}</div>
              <button className="btn ghost sm" onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><I.Chevron size={14} /></button>
            </div>
            <button className="btn ghost sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Hoy</button>
          </div>
          <div className="cal-grid">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((c, i) => {
              const iso = c.date.toISOString().slice(0, 10);
              const sess = byDate[iso] || [];
              const hasPR = sess.some(s => {
                for (const b of s.blocks) {
                  const prior = state.sessions.filter(x => x.date < s.date);
                  for (const st of b.sets) if (isPRSet(st, b.exerciseId, prior)) return true;
                }
                return false;
              });
              return (
                <div key={i}
                  className={`cal-day ${c.out ? 'out' : ''} ${iso === today ? 'today' : ''} ${sess.length ? 'has-session' : ''} ${hasPR ? 'pr' : ''}`}
                  onClick={() => sess[0] ? setSelectedId(sess[0].id) : openNew(iso)}
                  title={sess.length ? 'Ver sesión' : 'Crear sesión en esta fecha'}
                >
                  <div style={{ fontWeight: 600 }}>{c.date.getDate()}</div>
                  {sess.length > 0 && (
                    <div className="dots">
                      {sess.slice(0, 3).map((_, j) => <div key={j} className="dot" />)}
                      {hasPR && <div className="dot" style={{ background: 'var(--warning)' }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'list' && (
        <div className="card">
          {sortedList.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><I.Book size={22} /></div>
              <div className="empty-title">Sin historial aún</div>
              <div className="empty-sub">Registra tu primera sesión para empezar.</div>
            </div>
          ) : sortedList.map(s => {
            const groups = new Set();
            for (const b of s.blocks) { const e = exMap[b.exerciseId]; if (e) groups.add(e.group); }
            return (
              <div key={s.id} className="exercise-row" onClick={() => setSelectedId(s.id)}>
                <div style={{ width: 56, textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{fmtWeekday(s.date)}</div>
                  <div style={{ fontSize: 20, color: 'var(--fg-1)', fontWeight: 700, letterSpacing: '-0.02em' }}>{fmtDate(s.date)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ex-name">{s.name || [...groups].slice(0, 3).join(' + ') || 'Sesión'}</div>
                  <div className="ex-meta">
                    {s.blocks.length} ejercicios · {s.blocks.reduce((n, b) => n + b.sets.length, 0)} series · {kgToDisplay(sessionVolume(s), state.weightUnit).toLocaleString('es-MX')} {unitLabel(state.weightUnit)} · {sessionDuration(s)} min
                  </div>
                </div>
                <I.Chevron size={14} color="var(--fg-4)" />
              </div>
            );
          })}
        </div>
      )}

      {selectedId && selected && (
        <div className="modal-backdrop" onClick={() => setSelectedId(null)}>
          <div className="modal lg" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <SessionDetail sess={selected} exMap={exMap} state={state} onClose={() => setSelectedId(null)} onDelete={() => deleteSession(selected.id)} onEdit={() => openEdit(selected)} />
            </div>
          </div>
        </div>
      )}

      {editing && (
        <SessionEditorModal
          initial={editing.__new ? { id: uid(), name: '', date: editing.date, startedAt: new Date(editing.date + 'T12:00:00').getTime(), endedAt: new Date(editing.date + 'T12:00:00').getTime() + 60 * 60 * 1000, blocks: [] } : editing}
          isNew={!!editing.__new}
          state={stateForEditor}
          onClose={() => setEditing(null)}
          onSave={saveEdited}
          onDelete={!editing.__new ? () => { deleteSession(editing.id); setEditing(null); } : null}
        />
      )}

    </div>
  );
}

function SessionDetail({ sess, exMap, state, onClose, onDelete, onEdit }) {
  const prior = state.sessions.filter(x => x.date < sess.date || (x.date === sess.date && x.startedAt < sess.startedAt));
  const [sharing, setSharing] = React.useState(false);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="card-title" style={{ fontSize: 18 }}>{fmtDate(sess.date, { long: true })}</div>
          <div className="card-sub">{kgToDisplay(sessionVolume(sess), state.weightUnit).toLocaleString('es-MX')} {unitLabel(state.weightUnit)} · {sessionDuration(sess)} min · {sess.blocks.reduce((n, b) => n + b.sets.length, 0)} series</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn primary sm" onClick={() => setSharing(true)}><I.Share size={12} /> Compartir</button>
          <button className="btn secondary sm" onClick={() => exportSessionPDF(sess, state)}><I.FilePdf size={14} /> PDF</button>
          {onEdit && <button className="btn secondary sm" onClick={onEdit}><I.Edit size={12} /> Editar</button>}
          <button className="btn danger sm" onClick={onDelete}><I.Trash size={12} /></button>
          <button className="btn ghost sm" onClick={onClose}><I.X size={14} /></button>
        </div>
      </div>
      {sess.blocks.map(b => {
        const ex = exMap[b.exerciseId];
        if (!ex) return null;
        return (
          <div key={b.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className="ex-chip" style={{ width: 28, height: 28, background: groupColor(ex.group), borderRadius: 7 }}>
                <I.Dumbbell size={14} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{ex.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{ex.group}</div>
              {ex.equipment && (() => { const eq = equipmentInfo(ex.equipment); const EqIcon = eq ? I[eq.icon] : null; return eq ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line-1)', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>
                  {EqIcon && <EqIcon size={10} />}{eq.label}
                </span>
              ) : null; })()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>
              {(() => {
                const prSetId = bestPRSetId(b, prior); return b.sets.map((st, i) => {
                  const isPR = prSetId === st.id;
                  return (
                    <div key={st.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ color: 'var(--fg-4)', width: 22 }}>{i + 1}.</span>
                      {b.kind === 'cardio'
                        ? <span>{st.duration || 0} min · {st.distance || 0} km</span>
                        : b.kind === 'time'
                          ? <span>{st.duration || 0} seg</span>
                          : <span>{kgToDisplay(st.weight || 0, state.weightUnit)} {unitLabel(state.weightUnit)} × {st.reps || 0}</span>}
                      {isPR && <span className="pill pr"><I.Trophy size={10} /> PR</span>}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        );
      })}
      {sharing && <ShareCardModal sess={sess} state={state} onClose={() => setSharing(false)} />}
    </div>
  );
}

function LibraryView({ state, setState, goTo }) {
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [eqFilter, setEqFilter] = React.useState('all');
  const [editing, setEditing] = React.useState(null);
  const [creating, setCreating] = React.useState(false);

  const groups = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Cardio'];
  const bestRMs = bestOneRMPerExercise(state.sessions);
  const countByExercise = {};
  for (const s of state.sessions) for (const b of s.blocks) countByExercise[b.exerciseId] = (countByExercise[b.exerciseId] || 0) + 1;

  const filtered = state.exercises
    .filter(e => filter === 'all' || e.group === filter)
    .filter(e => eqFilter === 'all' || e.equipment === eqFilter)
    .filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Biblioteca de ejercicios</h1>
          <div className="page-sub">{state.exercises.length} ejercicios · agrega o edita los tuyos</div>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={16} /> Nuevo ejercicio</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-4)' }}>
            <I.Search size={16} />
          </div>
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="seg">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          {groups.map(g => (
            <button key={g} className={filter === g ? 'active' : ''} onClick={() => setFilter(g)}>{g}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginRight: 4 }}>Equipo</div>
        <div className="seg">
          <button className={eqFilter === 'all' ? 'active' : ''} onClick={() => setEqFilter('all')}>Todos</button>
          {EQUIPMENT_TYPES.map(eq => {
            const EqIcon = I[eq.icon];
            return (
              <button key={eq.id} className={eqFilter === eq.id ? 'active' : ''} onClick={() => setEqFilter(eq.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <EqIcon size={14} /> {eq.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        {filtered.map(e => {
          const best = bestRMs[e.id];
          const count = countByExercise[e.id] || 0;
          const eq = equipmentInfo(e.equipment);
          const EqIcon = eq ? I[eq.icon] : null;
          return (
            <div key={e.id} className="exercise-row" onClick={() => goTo('exercise', { exerciseId: e.id })}>
              <div className="ex-chip" style={{ background: groupColor(e.group) }}>
                {e.kind === 'cardio' ? <I.Run size={18} /> : <I.Dumbbell size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="ex-name">{e.name}</div>
                <div className="ex-meta">
                  {e.group} · {count} sesion{count === 1 ? '' : 'es'}
                  {best && ` · e1RM ${kgToDisplay(best.e1rm, state.weightUnit)} ${unitLabel(state.weightUnit)}`}
                </div>
              </div>
              {eq && (
                <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg-2)', color: 'var(--fg-2)', border: '1px solid var(--line-1)', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                  <EqIcon size={12} /> {eq.label}
                </span>
              )}
              {best && <span className="pill pr"><I.Trophy size={10} /> {best.weight}×{best.reps}</span>}
              <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); setEditing(e); }}><I.Edit size={14} /></button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty"><div className="empty-sub">Sin resultados</div></div>
        )}
      </div>

      {(creating || editing) && (
        <ExerciseEditModal
          exercise={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={(ex) => {
            setState(s => editing
              ? { ...s, exercises: s.exercises.map(x => x.id === ex.id ? ex : x) }
              : { ...s, exercises: [...s.exercises, ex] });
            setCreating(false); setEditing(null);
          }}
          onDelete={editing ? () => {
            if (!confirm('¿Eliminar ejercicio?')) return;
            setState(s => ({ ...s, exercises: s.exercises.filter(x => x.id !== editing.id) }));
            setEditing(null);
          } : null}
        />
      )}
    </div>
  );
}

function ExerciseEditModal({ exercise, onClose, onSave, onDelete }) {
  const [form, setForm] = React.useState(exercise || { name: '', group: 'Pecho', kind: 'strength', equipment: 'mancuernas' });
  const groups = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Cardio', 'Otros'];
  const save = () => {
    if (!form.name.trim()) return;
    const muscleColor = form.muscleColor || (GROUP_COLORS[form.group] || '--cat-other').replace('--cat-', '');
    onSave({ ...form, id: form.id || uid(), name: form.name.trim(), muscleColor });
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}</div>
          <button className="btn ghost sm" onClick={onClose}><I.X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="field-label required">Nombre</label>
            <input className="input" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="field-label required">Grupo muscular</label>
            <select className="input" value={form.group} onChange={e => setForm(v => ({ ...v, group: e.target.value }))}>
              {groups.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label required">Tipo</label>
            <select className="input" value={form.kind} onChange={e => setForm(v => ({ ...v, kind: e.target.value }))}>
              <option value="strength">Fuerza (peso × reps)</option>
              <option value="cardio">Cardio (tiempo/distancia)</option>
              <option value="time">Tiempo (ej. plancha)</option>
            </select>
          </div>
          <div>
            <label className="field-label required">Equipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {EQUIPMENT_TYPES.map(eq => {
                const EqIcon = I[eq.icon];
                const active = form.equipment === eq.id;
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setForm(v => ({ ...v, equipment: eq.id }))}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
                      background: active ? 'var(--accent-weak, var(--bg-2))' : 'var(--bg-1)',
                      border: `1.5px solid ${active ? 'var(--accent, var(--fg-1))' : 'var(--line-1)'}`,
                      color: active ? 'var(--fg-1)' : 'var(--fg-2)',
                      fontWeight: 600, fontSize: 12, transition: 'all 0.12s ease',
                    }}
                  >
                    <EqIcon size={22} />
                    <span>{eq.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          {onDelete && <button className="btn danger" onClick={onDelete}><I.Trash size={14} /> Eliminar</button>}
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={save}><I.Check size={14} /> Guardar</button>
        </div>
      </div>
    </div>
  );
}

function ExerciseDetailView({ state, setState, goTo, params }) {
  const ex = state.exercises.find(e => e.id === params.exerciseId);
  if (!ex) return <div className="card">Ejercicio no encontrado.</div>;

  const [metric, setMetric] = React.useState('topE1rm');
  const [showShare, setShowShare] = React.useState(false);
  const series = exerciseSeries(ex.id, state.sessions);
  const best = bestOneRMPerExercise(state.sessions)[ex.id];

  const prDates = new Set();
  let running = 0;
  for (const p of series) {
    if (p.topE1rm > running) { prDates.add(p.date); running = p.topE1rm; }
  }
  const recentSets = [];
  for (const s of [...state.sessions].reverse()) {
    for (const b of s.blocks) {
      if (b.exerciseId !== ex.id) continue;
      for (const st of b.sets) recentSets.push({ ...st, date: s.date, sessionId: s.id });
      if (recentSets.length >= 30) break;
    }
    if (recentSets.length >= 30) break;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <button className="btn ghost sm" onClick={() => goTo('library')}>
          <I.ChevronL size={14} /> Volver
        </button>
        {series.length > 0 && (
          <button className="btn secondary sm" onClick={() => setShowShare(true)}>
            <I.Share size={14} /> Compartir progreso
          </button>
        )}
      </div>
      {showShare && (
        <ShareExerciseCardModal ex={ex} state={state} onClose={() => setShowShare(false)} />
      )}
      <div className="ex-hero">
        <div className="ex-hero-chip" style={{ background: groupColor(ex.group) }}>
          {ex.kind === 'cardio' ? <I.Run size={24} /> : <I.Dumbbell size={24} />}
        </div>
        <div>
          <div className="ex-hero-name">{ex.name}</div>
          <div className="ex-hero-meta">
            {ex.group} · {ex.kind === 'cardio' ? 'Cardio' : ex.kind === 'time' ? 'Tiempo' : 'Fuerza'}
            {ex.equipment && ` · ${equipmentLabel(ex.equipment)}`}
            {' · '}{series.length} sesiones
          </div>
        </div>
        {best && (
          <div className="pr-card" style={{ minWidth: 0 }}>
            <div className="pr-icon"><I.Trophy size={22} /></div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>PR</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)' }}>{kgToDisplay(best.weight, state.weightUnit)} {unitLabel(state.weightUnit)} × {best.reps}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>e1RM {kgToDisplay(best.e1rm, state.weightUnit)} {unitLabel(state.weightUnit)} · {fmtDate(best.date)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Progresión</div>
            <div className="card-sub">Puntos dorados = nuevo PR</div>
          </div>
          <div className="seg">
            <button className={metric === 'topE1rm' ? 'active' : ''} onClick={() => setMetric('topE1rm')}>e1RM</button>
            <button className={metric === 'topWeight' ? 'active' : ''} onClick={() => setMetric('topWeight')}>Top peso</button>
            <button className={metric === 'volume' ? 'active' : ''} onClick={() => setMetric('volume')}>Volumen</button>
          </div>
        </div>
        <LineChart points={series} yKey={metric} prDates={prDates} unit={state.weightUnit || 'kg'} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Series recientes</div>
          <div className="card-sub">{recentSets.length} entradas</div>
        </div>
        {recentSets.length === 0 ? (
          <div className="empty"><div className="empty-sub">Aún no hay series registradas.</div></div>
        ) : (
          <table className="set-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Fecha</th>
                {ex.kind === 'cardio' ? <><th>Tiempo</th><th>Distancia</th><th>Ritmo</th></>
                  : ex.kind === 'time' ? <><th>Tiempo</th><th colSpan="2">Notas</th></>
                    : <><th>Peso</th><th>Reps</th><th>e1RM</th></>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const prSetIds = new Set();
                if (ex.kind === 'strength') {
                  const bySession = {};
                  for (const st of recentSets) {
                    (bySession[st.sessionId] = bySession[st.sessionId] || []).push(st);
                  }
                  for (const [sessId, sets] of Object.entries(bySession)) {
                    const sess = state.sessions.find(s => s.id === sessId);
                    if (!sess) continue;
                    const prior = state.sessions.filter(s => s.date < sess.date);
                    const id = bestPRSetId({ exerciseId: ex.id, sets }, prior);
                    if (id) prSetIds.add(id);
                  }
                }
                return recentSets.map((st, i) => {
                  const isPR = prSetIds.has(st.id);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line-1)' }}>
                      <td style={{ color: 'var(--fg-3)' }}>{fmtDate(st.date)}</td>
                      {ex.kind === 'cardio' ? (
                        <>
                          <td>{st.duration || 0} min</td>
                          <td>{st.distance || 0} km</td>
                          <td>{st.distance && st.duration ? (st.duration / st.distance).toFixed(2) : '—'}</td>
                        </>
                      ) : ex.kind === 'time' ? (
                        <>
                          <td>{st.duration || 0} seg</td>
                          <td colSpan="2" style={{ color: 'var(--fg-3)' }}>{st.note || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{kgToDisplay(st.weight || 0, state.weightUnit)} {unitLabel(state.weightUnit)}</td>
                          <td>{st.reps || 0}</td>
                          <td style={{ color: 'var(--fg-3)' }}>{(() => { const e = estOneRM(Number(st.weight), Number(st.reps)); return e ? kgToDisplay(e, state.weightUnit) + ' ' + unitLabel(state.weightUnit) : '—'; })()}</td>
                        </>
                      )}
                      <td style={{ textAlign: 'right' }}>{isPR && <span className="pill pr"><I.Trophy size={10} /> PR</span>}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatsView({ state, goTo }) {
  const [range, setRange] = React.useState(7);
  const [radarCompare, setRadarCompare] = React.useState(true);
  const [progMetric, setProgMetric] = React.useState('volume');
  const [progGroup, setProgGroup] = React.useState('all');
  const [shareChart, setShareChart] = React.useState(null);

  const accentColor = state.accentColor || '#1EA2B8';

  const PROG_METRICS = [
    { k: 'volume', label: 'Volumen' }, { k: 'duration', label: 'Duración' }, { k: 'sets', label: 'Series' },
  ];

  const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e]));

  const cutoffISO = range === 'all' ? null : (() => {
    const d = new Date(); d.setDate(d.getDate() - Number(range));
    return d.toISOString().slice(0, 10);
  })();
  const rangedSessions = cutoffISO ? state.sessions.filter(s => s.date >= cutoffISO) : state.sessions;
  const rangeLabel = range === 7 ? 'últimos 7 días' : range === 30 ? 'últimos 30 días' : range === 90 ? 'últimos 90 días' : 'historial completo';

  const prs = bestOneRMPerExercise(rangedSessions);
  const prList = Object.entries(prs)
    .map(([exId, p]) => ({ ex: exMap[exId], ...p }))
    .filter(p => p.ex)
    .sort((a, b) => b.e1rm - a.e1rm);

  const totalVol = rangedSessions.reduce((n, s) => n + sessionVolume(s), 0);
  const totalSets = rangedSessions.reduce((n, s) => n + s.blocks.reduce((m, b) => m + b.sets.length, 0), 0);
  const avgDur = rangedSessions.length
    ? Math.round(rangedSessions.reduce((n, s) => n + sessionDuration(s), 0) / rangedSessions.length)
    : 0;

  const byGroup = {};
  for (const s of rangedSessions) {
    for (const b of s.blocks) {
      const ex = exMap[b.exerciseId]; if (!ex) continue;
      let v = 0;
      for (const st of b.sets) if (st.done) v += (Number(st.weight) || 0) * (Number(st.reps) || 0);
      byGroup[ex.group] = (byGroup[ex.group] || 0) + v;
    }
  }
  const groupList = Object.entries(byGroup).sort((a, b) => b[1] - a[1]);
  const maxG = Math.max(...groupList.map(g => g[1]), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estadísticas</h1>
          <div className="page-sub">{rangeLabel}</div>
        </div>
        <div className="seg">
          <button className={range === 7 ? 'active' : ''} onClick={() => setRange(7)}>7d</button>
          <button className={range === 30 ? 'active' : ''} onClick={() => setRange(30)}>30d</button>
          <button className={range === 90 ? 'active' : ''} onClick={() => setRange(90)}>90d</button>
          <button className={range === 'all' ? 'active' : ''} onClick={() => setRange('all')}>Todo</button>
        </div>
      </div>

      <div className="stat-row" style={{ marginBottom: 20 }}>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--warning)' }}><I.Trophy size={18} /></div>
          <div className="label">Records personales</div>
          <div className="value">{prList.length}</div>
        </div>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--cat-legs)' }}><I.Weight size={18} /></div>
          <div className="label">Volumen acumulado</div>
          <div className="value">{(totalVol / 1000).toFixed(1)}<span style={{ fontSize: 14, color: 'var(--fg-3)', marginLeft: 4 }}>t</span></div>
        </div>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--cat-mobility)' }}><I.Activity size={18} /></div>
          <div className="label">Series totales</div>
          <div className="value">{totalSets}</div>
        </div>
        <div className="stat-tile">
          <div className="chip" style={{ background: 'var(--cat-core)' }}><I.Clock size={18} /></div>
          <div className="label">Duración promedio</div>
          <div className="value">{avgDur}<span style={{ fontSize: 14, color: 'var(--fg-3)', marginLeft: 4 }}>min</span></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Balance muscular · radar</div>
            <div className="card-sub">Volumen por grupo muscular{radarCompare && range !== 'all' ? ' · compara con el período anterior' : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--fg-2)', cursor: range === 'all' ? 'not-allowed' : 'pointer', opacity: range === 'all' ? 0.45 : 1 }}>
              <input type="checkbox" checked={radarCompare && range !== 'all'} disabled={range === 'all'} onChange={e => setRadarCompare(e.target.checked)} />
              Período anterior
            </label>
            <button className="btn ghost sm" title="Compartir" onClick={() => setShareChart('radar')}><I.Share size={15} /></button>
          </div>
        </div>
        <MuscleRadar sessions={state.sessions} exercises={state.exercises} period={range} compare={radarCompare && range !== 'all'} color={accentColor} unit={state.weightUnit || 'kg'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }} className="stats-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Progresión por sesión</div>
              <div className="card-sub">Puntos dorados = sesión con nuevo PR · línea punteada = promedio móvil (7)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="seg">
                {PROG_METRICS.map(m => (
                  <button key={m.k} className={progMetric === m.k ? 'active' : ''} onClick={() => setProgMetric(m.k)}>{m.label}</button>
                ))}
              </div>
              <button className="btn ghost sm" title="Compartir" onClick={() => setShareChart('progress')}><I.Share size={15} /></button>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <select className="input" style={{ maxWidth: 200, fontSize: 12.5 }} value={progGroup} onChange={e => setProgGroup(e.target.value)}>
              <option value="all">Todos los grupos</option>
              {[...new Set(state.exercises.map(e => e.group))].sort().map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          {state.sessions.length === 0 ? (
            <div className="empty"><div className="empty-sub">Sin datos aún.</div></div>
          ) : (() => {
            const progSessions = progGroup === 'all'
              ? state.sessions
              : state.sessions
                  .map(s => ({ ...s, blocks: s.blocks.filter(b => { const ex = exMap[b.exerciseId]; return ex && ex.group === progGroup; }) }))
                  .filter(s => s.blocks.length > 0);
            return <SessionProgressChart sessions={progSessions} exercises={state.exercises} range={range} metric={progMetric} color={accentColor} showMA={true} unit={state.weightUnit || 'kg'} />;
          })()}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Distribución muscular</div>
              <div className="card-sub">{rangeLabel}</div>
            </div>
            <button className="btn ghost sm" title="Compartir" onClick={() => setShareChart('dist')}><I.Share size={15} /></button>
          </div>
          {groupList.length === 0
            ? <div className="empty"><div className="empty-sub">Sin datos en este periodo.</div></div>
            : <MuscleDistributionChart groupList={groupList} unit={state.weightUnit || 'kg'} />
          }
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Records personales (1RM estimado)</div>
          <div className="card-sub">Ordenado por e1RM · {rangeLabel}</div>
        </div>
        {prList.length === 0 ? (
          <div className="empty"><div className="empty-icon"><I.Trophy size={22} /></div>
            <div className="empty-title">Aún no hay PRs</div>
            <div className="empty-sub">Registra sesiones de fuerza y verás aparecer tus records aquí.</div>
          </div>
        ) : (
          <div>
            {prList.map(p => (
              <div key={p.ex.id} className="exercise-row" style={{ cursor: 'pointer' }} onClick={() => goTo('exercise', { exerciseId: p.ex.id })}>
                <div className="ex-chip" style={{ background: groupColor(p.ex.group) }}><I.Trophy size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div className="ex-name">{p.ex.name}</div>
                  <div className="ex-meta">{p.ex.group} · {fmtDate(p.date, { long: true })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{kgToDisplay(p.weight, state.weightUnit)} {unitLabel(state.weightUnit)} × {p.reps}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--warning)', fontWeight: 600 }}>e1RM {kgToDisplay(p.e1rm, state.weightUnit)} {unitLabel(state.weightUnit)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@media (max-width: 900px) { .stats-grid { grid-template-columns: 1fr !important; } }`}</style>

      {shareChart && (
        <ShareStatsCardModal
          chartType={shareChart}
          chartTitle={shareChart === 'radar' ? 'Balance muscular' : shareChart === 'progress' ? 'Progresión por sesión' : 'Distribución muscular'}
          rangeLabel={rangeLabel}
          rangedSessions={rangedSessions}
          groupList={groupList}
          maxG={maxG}
          totalVol={totalVol}
          totalSets={totalSets}
          avgDur={avgDur}
          exMap={exMap}
          progMetric={progMetric}
          progGroup={progGroup}
          state={state}
          onClose={() => setShareChart(null)}
        />
      )}
    </div>
  );
}

Object.assign(window, { HomeView, HistoryView, LibraryView, ExerciseDetailView, StatsView });
