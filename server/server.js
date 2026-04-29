process.env.TZ = 'America/Phoenix';

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = new Database(path.join(__dirname, 'gym.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS exercises (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    grp         TEXT NOT NULL,
    kind        TEXT NOT NULL,
    muscle_color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    name        TEXT DEFAULT '',
    date        TEXT NOT NULL,
    started_at  INTEGER,
    ended_at    INTEGER,
    is_active   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES sessions(id),
    exercise_id TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sets (
    id          TEXT PRIMARY KEY,
    block_id    TEXT NOT NULL REFERENCES blocks(id),
    weight      REAL,
    reps        INTEGER,
    duration    REAL,
    distance    REAL,
    done        INTEGER DEFAULT 0,
    position    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

function buildSession(sessRow) {
  const blocks = db.prepare(
    'SELECT * FROM blocks WHERE session_id = ? ORDER BY position'
  ).all(sessRow.id);

  for (const blk of blocks) {
    blk.exerciseId = blk.exercise_id;
    delete blk.exercise_id;
    delete blk.session_id;
    delete blk.position;

    const rows = db.prepare(
      'SELECT * FROM sets WHERE block_id = ? ORDER BY position'
    ).all(blk.id);

    blk.sets = rows.map(s => ({
      id:       s.id,
      weight:   s.weight  ?? '',
      reps:     s.reps    ?? '',
      duration: s.duration ?? '',
      distance: s.distance ?? '',
      done:     Boolean(s.done),
    }));
  }

  return {
    id:        sessRow.id,
    name:      sessRow.name,
    date:      sessRow.date,
    startedAt: sessRow.started_at,
    endedAt:   sessRow.ended_at,
    blocks,
  };
}

function deleteSession(id) {
  const blockIds = db.prepare('SELECT id FROM blocks WHERE session_id = ?').all(id).map(b => b.id);
  for (const bid of blockIds) {
    db.prepare('DELETE FROM sets WHERE block_id = ?').run(bid);
  }
  db.prepare('DELETE FROM blocks WHERE session_id = ?').run(id);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

// Migraciones — agregar columnas que no existían al crear la BD
try { db.exec(`ALTER TABLE exercises ADD COLUMN equipment TEXT NOT NULL DEFAULT 'otro'`); } catch {}

// ---- GET /api/state ----
app.get('/api/state', (req, res) => {
  const exercises = db.prepare(
    'SELECT id, name, grp AS "group", kind, muscle_color AS muscleColor, equipment FROM exercises'
  ).all();

  const sessionRows = db.prepare(
    'SELECT * FROM sessions WHERE is_active = 0 ORDER BY date DESC'
  ).all();
  const sessions = sessionRows.map(buildSession);

  const activeRow = db.prepare(
    'SELECT * FROM sessions WHERE is_active = 1 LIMIT 1'
  ).get();
  const activeSession = activeRow ? buildSession(activeRow) : null;

  const createdAtRow = db.prepare('SELECT value FROM meta WHERE key = ?').get('createdAt');

  res.json({
    exercises,
    sessions,
    activeSession,
    createdAt: createdAtRow ? Number(createdAtRow.value) : Date.now(),
  });
});

// ---- POST /api/state ----
app.post('/api/state', (req, res) => {
  const { exercises, sessions, activeSession, createdAt } = req.body;

  // Safety: never wipe existing sessions if the incoming payload has none
  const existingCount = db.prepare('SELECT COUNT(*) as n FROM sessions WHERE is_active = 0').get().n;
  if (existingCount > 0 && (!sessions || sessions.length === 0)) {
    return res.json({ ok: true, skipped: 'session wipe blocked' });
  }

  const insertSession = db.prepare(
    'INSERT OR REPLACE INTO sessions (id, name, date, started_at, ended_at, is_active) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertBlock = db.prepare(
    'INSERT OR REPLACE INTO blocks (id, session_id, exercise_id, position) VALUES (?, ?, ?, ?)'
  );
  const insertSet = db.prepare(
    'INSERT OR REPLACE INTO sets (id, block_id, weight, reps, duration, distance, done, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const saveAll = db.transaction(() => {
    // Meta
    if (createdAt != null) {
      db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('createdAt', String(createdAt));
    }

    // Exercises — replace all
    db.prepare('DELETE FROM exercises').run();
    for (const ex of (exercises || [])) {
      db.prepare(
        'INSERT INTO exercises (id, name, grp, kind, muscle_color, equipment) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(ex.id, ex.name, ex.group, ex.kind, ex.muscleColor || 'other', ex.equipment || 'otro');
    }

    // Sessions — delete removed ones, upsert the rest
    const incomingIds = new Set((sessions || []).map(s => s.id));
    const existingIds = db.prepare('SELECT id FROM sessions WHERE is_active = 0').all().map(r => r.id);
    for (const id of existingIds) {
      if (!incomingIds.has(id)) deleteSession(id);
    }
    for (let i = 0; i < (sessions || []).length; i++) {
      const sess = sessions[i];
      insertSession.run(sess.id, sess.name || '', sess.date, sess.startedAt, sess.endedAt, 0);

      // Borrar bloques eliminados en la sesión editada
      const incomingBlockIds = new Set((sess.blocks || []).map(b => b.id));
      const existingBlocks = db.prepare('SELECT id FROM blocks WHERE session_id = ?').all(sess.id);
      for (const blk of existingBlocks) {
        if (!incomingBlockIds.has(blk.id)) {
          db.prepare('DELETE FROM sets WHERE block_id = ?').run(blk.id);
          db.prepare('DELETE FROM blocks WHERE id = ?').run(blk.id);
        }
      }

      for (let bi = 0; bi < (sess.blocks || []).length; bi++) {
        const blk = sess.blocks[bi];
        insertBlock.run(blk.id, sess.id, blk.exerciseId, bi);

        // Borrar series eliminadas dentro del bloque
        const incomingSetIds = new Set((blk.sets || []).map(s => s.id));
        const existingSets = db.prepare('SELECT id FROM sets WHERE block_id = ?').all(blk.id);
        for (const set of existingSets) {
          if (!incomingSetIds.has(set.id)) db.prepare('DELETE FROM sets WHERE id = ?').run(set.id);
        }

        for (let si = 0; si < (blk.sets || []).length; si++) {
          const st = blk.sets[si];
          insertSet.run(st.id, blk.id, st.weight || null, st.reps || null, st.duration || null, st.distance || null, st.done ? 1 : 0, si);
        }
      }
    }

    // Active session — replace entirely
    const existingActive = db.prepare('SELECT id FROM sessions WHERE is_active = 1').get();
    if (existingActive) deleteSession(existingActive.id);

    if (activeSession) {
      insertSession.run(activeSession.id, activeSession.name || '', activeSession.date, activeSession.startedAt, activeSession.endedAt, 1);
      for (let bi = 0; bi < (activeSession.blocks || []).length; bi++) {
        const blk = activeSession.blocks[bi];
        insertBlock.run(blk.id, activeSession.id, blk.exerciseId, bi);
        for (let si = 0; si < (blk.sets || []).length; si++) {
          const st = blk.sets[si];
          insertSet.run(st.id, blk.id, st.weight || null, st.reps || null, st.duration || null, st.distance || null, st.done ? 1 : 0, si);
        }
      }
    }
  });

  saveAll();
  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`GymTracker API → http://localhost:${PORT}`);
  console.log(`Database        → ${path.join(__dirname, 'gym.db')}`);
});
