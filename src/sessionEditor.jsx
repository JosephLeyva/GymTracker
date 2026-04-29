// sessionEditor.jsx — modal to add / edit a past session from History

function SessionEditorModal({ initial, isNew = false, state, onClose, onSave, onDelete }) {
  const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e]));

  const [form, setForm] = React.useState(() => initial
    ? JSON.parse(JSON.stringify(initial))
    : {
        id: uid(),
        name: '',
        date: todayISO(),
        startedAt: Date.now(),
        endedAt: Date.now(),
        blocks: [],
      }
  );
  const [duration, setDuration] = React.useState(() => {
    if (initial && initial.startedAt && initial.endedAt) {
      return Math.max(1, Math.round((initial.endedAt - initial.startedAt) / 60000));
    }
    return 60;
  });
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const setField = (patch) => setForm(f => ({ ...f, ...patch }));
  const updateBlock = (bid, patch) => setForm(f => ({
    ...f,
    blocks: f.blocks.map(b => b.id === bid ? { ...b, ...patch } : b),
  }));
  const updateSet = (bid, sid, patch) => setForm(f => ({
    ...f,
    blocks: f.blocks.map(b => b.id !== bid ? b : {
      ...b,
      sets: b.sets.map(s => s.id === sid ? { ...s, ...patch } : s),
    }),
  }));
  const removeBlock = (bid) => setForm(f => ({ ...f, blocks: f.blocks.filter(b => b.id !== bid) }));
  const addSet = (bid) => {
    const blk = form.blocks.find(b => b.id === bid);
    const last = blk.sets[blk.sets.length - 1];
    const ns = last
      ? { id: uid(), weight: last.weight, reps: last.reps, duration: last.duration, distance: last.distance, done: true }
      : { id: uid(), weight: '', reps: '', duration: '', distance: '', done: true };
    updateBlock(bid, { sets: [...blk.sets, ns] });
  };
  const removeSet = (bid, sid) => {
    const blk = form.blocks.find(b => b.id === bid);
    updateBlock(bid, { sets: blk.sets.filter(s => s.id !== sid) });
  };
  const addExercise = (exId) => {
    const ex = exMap[exId];
    if (!ex) return;
    const blk = {
      id: uid(),
      exerciseId: exId,
      kind: ex.kind,
      sets: [{ id: uid(), weight: '', reps: '', duration: '', distance: '', done: true }],
    };
    setForm(f => ({ ...f, blocks: [...f.blocks, blk] }));
    setPickerOpen(false);
  };

  const doSave = () => {
    // Normalize: mark sets done (editing in history implies they happened),
    // compute startedAt/endedAt from date + duration so fmt/sessionDuration work.
    const dateMidday = new Date(form.date + 'T12:00:00').getTime();
    const startedAt = form.startedAt && new Date(form.startedAt).toString() !== 'Invalid Date' && new Date(form.startedAt).toISOString().slice(0,10) === form.date
      ? form.startedAt
      : dateMidday;
    const endedAt = startedAt + Math.max(1, Number(duration) || 1) * 60000;

    const cleaned = {
      ...form,
      startedAt,
      endedAt,
      blocks: form.blocks
        .map(b => ({ ...b, sets: b.sets.map(s => ({ ...s, done: true })) }))
        .filter(b => b.sets.length > 0),
    };
    onSave(cleaned);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{isNew ? 'Nueva sesión' : 'Editar sesión'}</div>
          <button className="btn ghost sm" onClick={onClose}><I.X size={16}/></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label className="field-label">Nombre (opcional)</label>
              <input className="input" placeholder="Ej. Push day" value={form.name || ''} onChange={e => setField({ name: e.target.value })}/>
            </div>
            <div>
              <label className="field-label required">Fecha</label>
              <input className="input" type="date" value={form.date} onChange={e => setField({ date: e.target.value })}/>
            </div>
            <div>
              <label className="field-label">Duración (min)</label>
              <input className="input" type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)}/>
            </div>
          </div>

          {form.blocks.length === 0 && (
            <div className="empty" style={{ padding: 28 }}>
              <div className="empty-icon"><I.Dumbbell size={22}/></div>
              <div className="empty-title">Sin ejercicios</div>
              <div className="empty-sub">Agrega los ejercicios que hiciste en esta sesión.</div>
              <button className="btn primary" onClick={() => setPickerOpen(true)}><I.Plus size={14}/> Agregar ejercicio</button>
            </div>
          )}

          {form.blocks.map(blk => {
            const ex = exMap[blk.exerciseId];
            if (!ex) return null;
            const isCardio = blk.kind === 'cardio';
            const isTime = blk.kind === 'time';
            const eqInfo = equipmentInfo(ex.equipment);
            const EqIcon = eqInfo ? I[eqInfo.icon] : null;
            return (
              <div key={blk.id} className="exercise-card" style={{ marginBottom: 12 }}>
                <div className="exercise-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="ex-chip" style={{ width: 32, height: 32, background: groupColor(ex.group), borderRadius: 8 }}>
                      {isCardio ? <I.Run size={16}/> : <I.Dumbbell size={16}/>}
                    </div>
                    <div>
                      <div className="exercise-title" style={{ fontSize: 14 }}>{ex.name}</div>
                      <div className="exercise-meta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>{ex.group}</span>
                        {eqInfo && <><span style={{ opacity: 0.4 }}>·</span><EqIcon size={11} /><span>{eqInfo.label}</span></>}
                      </div>
                    </div>
                  </div>
                  <button className="btn ghost sm" onClick={() => removeBlock(blk.id)}><I.Trash size={14}/></button>
                </div>

                <div className={`sets-grid ${isCardio ? 'cardio' : ''} sets-grid-head`}>
                  <div>Serie</div>
                  {isCardio ? (
                    <><div>Tiempo</div><div>Distancia</div><div></div><div></div></>
                  ) : isTime ? (
                    <><div>Seg</div><div>Notas</div><div></div><div></div></>
                  ) : (
                    <><div>Peso ({unitLabel(state.weightUnit || 'kg')})</div><div>Reps</div><div>e1RM</div><div></div></>
                  )}
                </div>
                {blk.sets.map((st, i) => {
                  const e1 = estOneRM(Number(st.weight) || 0, Number(st.reps) || 0);
                  return (
                    <div key={st.id} className={`sets-grid ${isCardio ? 'cardio' : ''} set-row done`} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="set-idx">{i + 1}</div>
                      </div>
                      {isCardio ? (
                        <>
                          <input type="number" placeholder="min" value={st.duration || ''} onChange={e => updateSet(blk.id, st.id, { duration: e.target.value })}/>
                          <input type="number" placeholder="km" value={st.distance || ''} onChange={e => updateSet(blk.id, st.id, { distance: e.target.value })}/>
                          <input value="" readOnly/>
                        </>
                      ) : isTime ? (
                        <>
                          <input type="number" placeholder="seg" value={st.duration || ''} onChange={e => updateSet(blk.id, st.id, { duration: e.target.value })}/>
                          <input placeholder="—" value={st.note || ''} onChange={e => updateSet(blk.id, st.id, { note: e.target.value })}/>
                          <input value="" readOnly/>
                        </>
                      ) : (
                        <>
                          <input type="number" placeholder={unitLabel(state.weightUnit || 'kg')} value={st.weight === '' || st.weight == null ? '' : kgToDisplay(st.weight, state.weightUnit || 'kg')} onChange={e => updateSet(blk.id, st.id, { weight: e.target.value === '' ? '' : displayToKg(e.target.value, state.weightUnit || 'kg') })}/>
                          <input type="number" placeholder="reps" value={st.reps || ''} onChange={e => updateSet(blk.id, st.id, { reps: e.target.value })}/>
                          <input value={e1 ? `${kgToDisplay(e1, state.weightUnit || 'kg')} ${unitLabel(state.weightUnit || 'kg')}` : ''} readOnly placeholder="—"/>
                        </>
                      )}
                      <button className="set-check" onClick={() => removeSet(blk.id, st.id)} title="Eliminar serie">
                        <I.X size={14}/>
                      </button>
                    </div>
                  );
                })}
                <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => addSet(blk.id)}>
                  <I.Plus size={14}/> Serie
                </button>
              </div>
            );
          })}

          {form.blocks.length > 0 && (
            <button className="btn secondary" onClick={() => setPickerOpen(true)}>
              <I.Plus size={14}/> Agregar ejercicio
            </button>
          )}
        </div>
        <div className="modal-foot">
          {onDelete && !isNew && <button className="btn danger" onClick={onDelete}><I.Trash size={14}/> Eliminar</button>}
          <div style={{ flex: 1 }}/>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={doSave}><I.Check size={14}/> {isNew ? 'Crear sesión' : 'Guardar cambios'}</button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePickerModal
          exercises={state.exercises}
          onClose={() => setPickerOpen(false)}
          onPick={addExercise}
          onCreate={(ex) => { state.__addExercise && state.__addExercise(ex); addExercise(ex.id); }}
        />
      )}
    </div>
  );
}

window.SessionEditorModal = SessionEditorModal;
