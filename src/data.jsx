// data.jsx — data model, storage, helpers

const STORAGE_KEY = 'bitacora-gym-v1';

const DEFAULT_EXERCISES = [
  { id: 'e1', name: 'Press Banca', group: 'Pecho', kind: 'strength', muscleColor: 'chest', equipment: 'barra' },
  { id: 'e2', name: 'Sentadilla', group: 'Piernas', kind: 'strength', muscleColor: 'legs', equipment: 'barra' },
  { id: 'e3', name: 'Peso Muerto', group: 'Espalda', kind: 'strength', muscleColor: 'back', equipment: 'barra' },
  { id: 'e4', name: 'Press Militar', group: 'Hombros', kind: 'strength', muscleColor: 'mobility', equipment: 'barra' },
  { id: 'e5', name: 'Dominadas', group: 'Espalda', kind: 'strength', muscleColor: 'back', equipment: 'calistenia' },
  { id: 'e6', name: 'Remo con Barra', group: 'Espalda', kind: 'strength', muscleColor: 'back', equipment: 'barra' },
  { id: 'e7', name: 'Curl de Bíceps', group: 'Bíceps', kind: 'strength', muscleColor: 'biceps', equipment: 'mancuernas' },
  { id: 'e13', name: 'Press Francés', group: 'Tríceps', kind: 'strength', muscleColor: 'triceps', equipment: 'barra' },
  { id: 'e8', name: 'Fondos en Paralelas', group: 'Pecho', kind: 'strength', muscleColor: 'chest', equipment: 'calistenia' },
  { id: 'e9', name: 'Carrera', group: 'Cardio', kind: 'cardio', muscleColor: 'cardio', equipment: 'calistenia' },
  { id: 'e10', name: 'Bicicleta', group: 'Cardio', kind: 'cardio', muscleColor: 'cardio', equipment: 'maquina' },
  { id: 'e11', name: 'Plancha', group: 'Core', kind: 'time', muscleColor: 'core', equipment: 'calistenia' },
  { id: 'e12', name: 'Hip Thrust', group: 'Piernas', kind: 'strength', muscleColor: 'legs', equipment: 'barra' },
];

// ---- equipment (tipo de equipo) ----
const EQUIPMENT_TYPES = [
  { id: 'mancuernas', label: 'Mancuernas', icon: 'Mancuerna' },
  { id: 'barra', label: 'Barra', icon: 'Barra' },
  { id: 'maquina', label: 'Máquina', icon: 'Maquina' },
  { id: 'calistenia', label: 'Calistenia', icon: 'Calistenia' },
];
const EQUIPMENT_MAP = Object.fromEntries(EQUIPMENT_TYPES.map(e => [e.id, e]));
function equipmentInfo(id) { return EQUIPMENT_MAP[id] || null; }
function equipmentLabel(id) { return EQUIPMENT_MAP[id]?.label || '—'; }

// ---- storage ----
const API_BASE = 'http://localhost:3001/api';

function defaultState() {
  return {
    exercises: DEFAULT_EXERCISES,
    sessions: [],
    activeSession: null,
    createdAt: Date.now(),
  };
}

async function fetchState() {
  try {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error('server error');
    const data = await res.json();
    if (!data.exercises || data.exercises.length === 0) return defaultState();
    if (!data.sessions) data.sessions = [];
    if (data.activeSession === undefined) data.activeSession = null;
    return data;
  } catch {
    console.warn('GymTracker: could not reach server, using defaults');
    return defaultState();
  }
}

let _saveTimer = null;
function persistState(s) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    fetch(`${API_BASE}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    }).catch(() => { });
  }, 500);
}

// ---- helpers ----
function uid() { return Math.random().toString(36).slice(2, 10); }
function todayISO() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Phoenix' }); }
function fmtDate(iso, opts = {}) {
  const d = new Date(iso + 'T00:00:00');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  if (opts.long) return `${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
function fmtWeekday(iso) {
  const d = new Date(iso + 'T00:00:00');
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
}
function weekKey(iso) {
  // ISO week approx: year-W##
  const d = new Date(iso + 'T00:00:00');
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Epley 1RM
function estOneRM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// volume for a session (kg x reps summed)
function sessionVolume(sess) {
  let v = 0;
  for (const blk of sess.blocks || []) {
    for (const s of blk.sets || []) {
      if (s.done && s.weight && s.reps) v += Number(s.weight) * Number(s.reps);
    }
  }
  return Math.round(v);
}
function sessionDuration(sess) {
  if (!sess.startedAt || !sess.endedAt) return 0;
  return Math.max(1, Math.round((sess.endedAt - sess.startedAt) / 60000));
}

// Best e1RM across history per exercise
function bestOneRMPerExercise(sessions) {
  const out = {};
  for (const sess of sessions) {
    for (const blk of sess.blocks || []) {
      for (const s of blk.sets || []) {
        if (!s.done) continue;
        const w = Number(s.weight), r = Number(s.reps);
        if (!w || !r) continue;
        const e = estOneRM(w, r);
        if (!out[blk.exerciseId] || e > out[blk.exerciseId].e1rm) {
          out[blk.exerciseId] = { e1rm: e, weight: w, reps: r, date: sess.date };
        }
      }
    }
  }
  return out;
}

// PR detection: was this set (weight,reps) a PR in context of prior sessions?
function isPRSet(set, exerciseId, priorSessions) {
  if (!set.done) return false;
  const e = estOneRM(Number(set.weight), Number(set.reps));
  if (!e) return false;
  let bestPrior = 0;
  for (const sess of priorSessions) {
    for (const blk of sess.blocks || []) {
      if (blk.exerciseId !== exerciseId) continue;
      for (const s of blk.sets || []) {
        if (!s.done) continue;
        const e2 = estOneRM(Number(s.weight), Number(s.reps));
        if (e2 > bestPrior) bestPrior = e2;
      }
    }
  }
  return e > bestPrior;
}

// Returns the ID of the single best PR set in a block vs priorSessions (one PR per exercise per session).
function bestPRSetId(block, priorSessions) {
  let bestPrior = 0;
  for (const sess of priorSessions) {
    for (const blk of sess.blocks || []) {
      if (blk.exerciseId !== block.exerciseId) continue;
      for (const s of blk.sets || []) {
        if (!s.done) continue;
        const e = estOneRM(Number(s.weight), Number(s.reps));
        if (e > bestPrior) bestPrior = e;
      }
    }
  }
  let bestId = null, bestE = 0;
  for (const s of block.sets || []) {
    if (!s.done || !s.weight || !s.reps) continue;
    const e = estOneRM(Number(s.weight), Number(s.reps));
    if (e > bestE) { bestE = e; bestId = s.id; }
  }
  return bestE > bestPrior ? bestId : null;
}

// Series history per exercise (array of {date, topWeight, topE1rm, volume})
function exerciseSeries(exerciseId, sessions) {
  const points = [];
  for (const sess of sessions) {
    let topW = 0, topE = 0, vol = 0;
    let found = false;
    for (const blk of (sess.blocks || [])) {
      if (blk.exerciseId !== exerciseId) continue;
      for (const s of blk.sets || []) {
        if (!s.done) continue;
        found = true;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > topW) topW = w;
        const e = estOneRM(w, r);
        if (e > topE) topE = e;
        vol += w * r;
      }
    }
    if (found) points.push({ date: sess.date, topWeight: topW, topE1rm: topE, volume: Math.round(vol) });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

// ---- color map for categories ----
const GROUP_COLORS = {
  'Pecho': '--cat-chest',
  'Piernas': '--cat-legs',
  'Espalda': '--cat-pull',
  'Hombros': '--cat-mobility',
  'Bíceps': '--cat-strength',
  'Tríceps': '--cat-triceps',
  'Core': '--cat-core',
  'Cardio': '--cat-cardio',
  'Otros': '--cat-other',
};
function groupColor(group) {
  const v = GROUP_COLORS[group] || '--cat-strength';
  return `var(${v})`;
}

// --- Units ---
// Canonical storage: kg. Display unit is read from state.weightUnit ('kg' | 'lb').
const KG_PER_LB = 0.45359237;
function kgToDisplay(kg, unit) {
  if (kg == null || kg === '') return '';
  const n = Number(kg);
  if (!isFinite(n)) return '';
  if (unit === 'lb') return Math.round(n / KG_PER_LB * 10) / 10;
  return Math.round(n * 10) / 10;
}
function displayToKg(val, unit) {
  if (val === '' || val == null) return '';
  const n = Number(val);
  if (!isFinite(n)) return '';
  if (unit === 'lb') return Math.round(n * KG_PER_LB * 100) / 100;
  return n;
}
function unitLabel(unit) { return unit === 'lb' ? 'lb' : 'kg'; }
function unitLabelUpper(unit) { return unit === 'lb' ? 'LB' : 'KG'; }

Object.assign(window, {
  DEFAULT_EXERCISES,
  EQUIPMENT_TYPES, EQUIPMENT_MAP, equipmentInfo, equipmentLabel,
  fetchState, persistState, defaultState,
  uid, todayISO, fmtDate, fmtWeekday, weekKey,
  estOneRM, sessionVolume, sessionDuration,
  bestOneRMPerExercise, isPRSet, bestPRSetId, exerciseSeries,
  GROUP_COLORS, groupColor,
  kgToDisplay, displayToKg, unitLabel, unitLabelUpper,
});
