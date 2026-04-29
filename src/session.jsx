// session.jsx — in-progress workout view

function SessionView({ state, setState, goTo }) {
  const sess = state.activeSession;
  if (!sess) return null;

  const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e]));
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [restFor, setRestFor] = React.useState(null);
  const [restLeft, setRestLeft] = React.useState(0);

  React.useEffect(() => {
    if (!restFor) return;
    const i = setInterval(() => {
      setRestLeft(left => {
        if (left <= 1) { clearInterval(i); setRestFor(null); return 0; }
        return left - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [restFor]);

  const updateSet = (blockId, setId, patch) => {
    setState(s => ({
      ...s,
      activeSession: {
        ...s.activeSession,
        blocks: s.activeSession.blocks.map(b =>
          b.id !== blockId ? b : {
            ...b,
            sets: b.sets.map(st => st.id !== setId ? st : { ...st, ...patch })
          }
        )
      }
    }));
  };
  const toggleDone = (blockId, setId) => {
    const blk = sess.blocks.find(b => b.id === blockId);
    const st = blk.sets.find(s => s.id === setId);
    const newDone = !st.done;
    updateSet(blockId, setId, { done: newDone });
    if (newDone) {
      setRestFor(setId);
      setRestLeft(state.restSec || 90);
    }
  };
  const addSet = (blockId) => {
    const blk = sess.blocks.find(b => b.id === blockId);
    const last = blk.sets[blk.sets.length - 1];
    const newSet = last ? { id: uid(), weight: last.weight, reps: last.reps, duration: last.duration, distance: last.distance, done: false }
      : { id: uid(), weight: '', reps: '', done: false };
    setState(s => ({
      ...s,
      activeSession: {
        ...s.activeSession,
        blocks: s.activeSession.blocks.map(b =>
          b.id === blockId ? { ...b, sets: [...b.sets, newSet] } : b
        )
      }
    }));
  };
  const removeSet = (blockId, setId) => {
    setState(s => ({
      ...s,
      activeSession: {
        ...s.activeSession,
        blocks: s.activeSession.blocks.map(b =>
          b.id !== blockId ? b : { ...b, sets: b.sets.filter(st => st.id !== setId) }
        )
      }
    }));
  };
  const removeBlock = (blockId) => {
    setState(s => ({
      ...s,
      activeSession: {
        ...s.activeSession,
        blocks: s.activeSession.blocks.filter(b => b.id !== blockId)
      }
    }));
  };
  const addExercise = (exId) => {
    const ex = exMap[exId];
    const isCardio = ex.kind === 'cardio';
    const blk = {
      id: uid(),
      exerciseId: exId,
      sets: [{ id: uid(), weight: '', reps: '', duration: '', distance: '', done: false }],
      kind: ex.kind,
    };
    setState(s => ({
      ...s,
      activeSession: { ...s.activeSession, blocks: [...s.activeSession.blocks, blk] }
    }));
    setPickerOpen(false);
  };

  const [justFinished, setJustFinished] = React.useState(null);

  const finish = () => {
    const cleaned = {
      ...sess,
      endedAt: Date.now(),
      blocks: sess.blocks
        .map(b => ({ ...b, sets: b.sets.filter(s => s.done) }))
        .filter(b => b.sets.length > 0)
    };
    if (cleaned.blocks.length === 0) {
      if (!confirm('No marcaste ninguna serie como completa. ¿Guardar sesión vacía?')) return;
    }
    setState(s => ({
      ...s,
      activeSession: null,
      sessions: [...s.sessions, cleaned],
    }));
    if (cleaned.blocks.length > 0) {
      setJustFinished(cleaned);
    } else {
      goTo('home');
    }
  };

  const cancel = () => {
    if (!confirm('¿Descartar esta sesión? Se perderán los cambios.')) return;
    setState(s => ({ ...s, activeSession: null }));
    goTo('home');
  };

  const elapsed = Math.max(0, Math.round((Date.now() - sess.startedAt) / 60000));
  const [, tick] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { const i = setInterval(tick, 30000); return () => clearInterval(i); }, []);

  const doneSetsCount = sess.blocks.reduce((n, b) => n + b.sets.filter(s => s.done).length, 0);
  const totalSetsCount = sess.blocks.reduce((n, b) => n + b.sets.length, 0);
  const currentVol = sessionVolume(sess);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="pill teal" style={{ marginBottom: 8 }}>● En progreso</div>
          <h1 className="page-title">{sess.name || 'Sesión de hoy'}</h1>
          <div className="page-sub">Iniciada hace {elapsed} min · {doneSetsCount}/{totalSetsCount} series · {kgToDisplay(currentVol, state.weightUnit).toLocaleString('es-MX')} {unitLabel(state.weightUnit)} de volumen</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost" onClick={cancel}>Cancelar</button>
          <button className="btn primary" onClick={finish}>
            <I.Check size={16} /> Terminar sesión
          </button>
        </div>
      </div>

      {sess.blocks.length === 0 && (
        <div className="card empty">
          <div className="empty-icon"><I.Dumbbell size={24} /></div>
          <div className="empty-title">Agrega tu primer ejercicio</div>
          <div className="empty-sub">Elige de la biblioteca para empezar a registrar series.</div>
          <button className="btn primary" onClick={() => setPickerOpen(true)}>
            <I.Plus size={16} /> Agregar ejercicio
          </button>
        </div>
      )}

      {sess.blocks.map((blk, bi) => {
        const ex = exMap[blk.exerciseId];
        if (!ex) return null;
        const color = groupColor(ex.group);
        const priorSessions = state.sessions;
        const eqInfo = equipmentInfo(ex.equipment);
        const EqIcon = eqInfo ? I[eqInfo.icon] : null;
        return (
          <div key={blk.id} className="exercise-card">
            <div className="exercise-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="ex-chip" style={{ background: color }}>
                  {blk.kind === 'cardio' ? <I.Run size={20} /> : <I.Dumbbell size={20} />}
                </div>
                <div>
                  <div className="exercise-title">{ex.name}</div>
                  <div className="exercise-meta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>{ex.group} · {blk.kind === 'cardio' ? 'Cardio' : blk.kind === 'time' ? 'Tiempo' : 'Fuerza'}</span>
                    {eqInfo && <><span style={{ opacity: 0.4 }}>·</span><EqIcon size={11} /><span>{eqInfo.label}</span></>}
                  </div>
                </div>
              </div>
              <button className="btn ghost sm" onClick={() => removeBlock(blk.id)}><I.Trash size={14} /></button>
            </div>

            <SetTable
              block={blk}
              kind={blk.kind}
              onUpdate={(setId, patch) => updateSet(blk.id, setId, patch)}
              onToggle={(setId) => toggleDone(blk.id, setId)}
              onRemove={(setId) => removeSet(blk.id, setId)}
              priorSessions={priorSessions}
              unit={state.weightUnit || 'kg'}
            />

            <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => addSet(blk.id)}>
              <I.Plus size={14} /> Agregar serie
            </button>
          </div>
        );
      })}

      {sess.blocks.length > 0 && (
        <button className="btn secondary" onClick={() => setPickerOpen(true)} style={{ marginTop: 8 }}>
          <I.Plus size={16} /> Agregar otro ejercicio
        </button>
      )}

      {restFor && (
        <div className="rest-timer">
          <div>
            <div className="lbl">Descanso</div>
            <div className="time">{String(Math.floor(restLeft / 60)).padStart(1, '0')}:{String(restLeft % 60).padStart(2, '0')}</div>
          </div>
          <button className="btn ghost sm" onClick={() => { setRestFor(null); setRestLeft(0); }}>Saltar</button>
        </div>
      )}

      {pickerOpen && (
        <ExercisePickerModal
          exercises={state.exercises}
          onClose={() => setPickerOpen(false)}
          onPick={addExercise}
          onCreate={(ex) => { setState(s => ({ ...s, exercises: [...s.exercises, ex] })); addExercise(ex.id); }}
        />
      )}

      {justFinished && (
        <ShareCardModal
          sess={justFinished}
          state={{ ...state, sessions: [...state.sessions, justFinished] }}
          onClose={() => { setJustFinished(null); goTo('home'); }}
        />
      )}
    </div>
  );
}

function SetTable({ block, kind, onUpdate, onToggle, onRemove, priorSessions, unit = 'kg' }) {
  const isCardio = kind === 'cardio';
  const isTime = kind === 'time';

  return (
    <div>
      <div className={`sets-grid ${isCardio ? 'cardio' : ''} sets-grid-head`}>
        <div>Serie</div>
        {isCardio ? (
          <>
            <div>Tiempo (min)</div>
            <div>Distancia (km)</div>
            <div>Ritmo</div>
            <div></div>
          </>
        ) : isTime ? (
          <>
            <div>Tiempo (seg)</div>
            <div>Notas</div>
            <div></div>
            <div></div>
          </>
        ) : (
          <>
            <div>Peso ({unitLabel(unit)})</div>
            <div>Reps</div>
            <div>e1RM</div>
            <div></div>
          </>
        )}
      </div>
      {(() => {
        const prSetId = !isCardio && !isTime ? bestPRSetId(block, priorSessions) : null;
        return block.sets.map((st, i) => {
          const isPR = prSetId === st.id;
          const e1 = estOneRM(Number(st.weight) || 0, Number(st.reps) || 0);
          const pace = (Number(st.distance) && Number(st.duration)) ? (Number(st.duration) / Number(st.distance)).toFixed(2) : '';
          return (
            <div key={st.id} className={`sets-grid ${isCardio ? 'cardio' : ''} set-row ${st.done ? 'done' : ''}`} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="set-idx">{i + 1}</div>
                {isPR && st.done && <span className="pill pr" title="Nuevo PR"><I.Trophy size={10} /> PR</span>}
              </div>
              {isCardio ? (
                <>
                  <input type="number" inputMode="decimal" placeholder="0" value={st.duration || ''}
                    onChange={e => onUpdate(st.id, { duration: e.target.value })} />
                  <input type="number" inputMode="decimal" placeholder="0" value={st.distance || ''}
                    onChange={e => onUpdate(st.id, { distance: e.target.value })} />
                  <input value={pace ? `${pace} min/km` : ''} readOnly placeholder="—" />
                </>
              ) : isTime ? (
                <>
                  <input type="number" inputMode="numeric" placeholder="0" value={st.duration || ''}
                    onChange={e => onUpdate(st.id, { duration: e.target.value })} />
                  <input placeholder="—" value={st.note || ''} onChange={e => onUpdate(st.id, { note: e.target.value })} />
                  <input value="" readOnly />
                </>
              ) : (
                <>
                  <input type="number" inputMode="decimal" placeholder="0" value={st.weight === '' || st.weight == null ? '' : kgToDisplay(st.weight, unit)}
                    onChange={e => onUpdate(st.id, { weight: e.target.value === '' ? '' : displayToKg(e.target.value, unit) })} />
                  <input type="number" inputMode="numeric" placeholder="0" value={st.reps || ''}
                    onChange={e => onUpdate(st.id, { reps: e.target.value })} />
                  <input value={e1 ? `${kgToDisplay(e1, unit)} ${unitLabel(unit)}` : ''} readOnly placeholder="—" />
                </>
              )}
              <div style={{ display: 'flex', gap: 4 }}>
                <button className={`set-check ${st.done ? 'done' : ''}`} onClick={() => onToggle(st.id)} title="Completar">
                  <I.Check size={16} />
                </button>
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}

function ExercisePickerModal({ exercises, onClose, onPick, onCreate }) {
  const [q, setQ] = React.useState('');
  const [eqFilter, setEqFilter] = React.useState('all');
  const [creating, setCreating] = React.useState(false);
  const [nn, setNN] = React.useState({ name: '', group: 'Pecho', kind: 'strength', equipment: 'mancuernas' });

  const filtered = exercises
    .filter(e => eqFilter === 'all' || e.equipment === eqFilter)
    .filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.group.toLowerCase().includes(q.toLowerCase()));
  const groups = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Cardio', 'Otros'];

  const saveNew = () => {
    if (!nn.name.trim()) return;
    const muscleColor = (GROUP_COLORS[nn.group] || '--cat-other').replace('--cat-', '');
    onCreate({ id: uid(), name: nn.name.trim(), group: nn.group, kind: nn.kind, equipment: nn.equipment, muscleColor });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{creating ? 'Nuevo ejercicio' : 'Elegir ejercicio'}</div>
          <button className="btn ghost sm" onClick={onClose}><I.X size={16} /></button>
        </div>
        <div className="modal-body">
          {!creating && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-4)' }}>
                    <I.Search size={16} />
                  </div>
                  <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar ejercicio…"
                    value={q} onChange={e => setQ(e.target.value)} autoFocus />
                </div>
                <button className="btn secondary" onClick={() => setCreating(true)}><I.Plus size={14} /> Nuevo</button>
              </div>
              <div className="seg" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
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
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {filtered.map(e => {
                  const eq = equipmentInfo(e.equipment);
                  const EqIcon = eq ? I[eq.icon] : null;
                  return (
                    <div key={e.id} className="exercise-row" onClick={() => onPick(e.id)}>
                      <div className="ex-chip" style={{ background: groupColor(e.group) }}>
                        {e.kind === 'cardio' ? <I.Run size={18} /> : <I.Dumbbell size={18} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="ex-name">{e.name}</div>
                        <div className="ex-meta">{e.group} · {e.kind === 'cardio' ? 'Cardio' : e.kind === 'time' ? 'Tiempo' : 'Fuerza'}</div>
                      </div>
                      {eq && (
                        <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg-2)', color: 'var(--fg-2)', border: '1px solid var(--line-1)', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, marginRight: 6 }}>
                          <EqIcon size={12} /> {eq.label}
                        </span>
                      )}
                      <I.Chevron size={16} color="var(--fg-4)" />
                    </div>
                  );
                })}
                {filtered.length === 0 && <div className="empty"><div className="empty-sub">Sin resultados</div></div>}
              </div>
            </>
          )}
          {creating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="field-label required">Nombre</label>
                <input className="input" value={nn.name} onChange={e => setNN(v => ({ ...v, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="field-label required">Grupo muscular</label>
                <select className="input" value={nn.group} onChange={e => setNN(v => ({ ...v, group: e.target.value }))}>
                  {groups.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label required">Tipo de registro</label>
                <select className="input" value={nn.kind} onChange={e => setNN(v => ({ ...v, kind: e.target.value }))}>
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
                    const active = nn.equipment === eq.id;
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => setNN(v => ({ ...v, equipment: eq.id }))}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                          background: active ? 'var(--accent-weak, var(--bg-2))' : 'var(--bg-1)',
                          border: `1.5px solid ${active ? 'var(--accent, var(--fg-1))' : 'var(--line-1)'}`,
                          color: active ? 'var(--fg-1)' : 'var(--fg-2)',
                          fontWeight: 600, fontSize: 12, transition: 'all 0.12s ease',
                        }}
                      >
                        <EqIcon size={20} />
                        <span>{eq.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        {creating && (
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setCreating(false)}>Cancelar</button>
            <button className="btn primary" onClick={saveNew}><I.Check size={14} /> Crear y agregar</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SessionView, ExercisePickerModal });
