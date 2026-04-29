// shareCard.jsx — Instagram-ready share card (1080x1920 PNG)

function ShareCardModal({ sess, state, onClose }) {
  const unit = state.weightUnit || 'kg';
  const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e]));
  const [variant, setVariant] = React.useState('bold');
  const [accent, setAccent] = React.useState(() => state.accentKey || 'teal');
  const [exporting, setExporting] = React.useState(false);
  const [noBackground, setNoBackground] = React.useState(false);

  const prior = state.sessions.filter(x => x.id !== sess.id && (x.date < sess.date || (x.date === sess.date && x.startedAt < sess.startedAt)));
  const volume = sessionVolume(sess);
  const duration = sessionDuration(sess);
  const totalSets = sess.blocks.reduce((n, b) => n + b.sets.length, 0);
  const totalReps = sess.blocks.reduce((n, b) => n + b.sets.reduce((m, s) => m + (Number(s.reps) || 0), 0), 0);

  // Top sets per block + PRs
  const rows = [];
  let prCount = 0;
  for (const b of sess.blocks) {
    const ex = exMap[b.exerciseId];
    if (!ex) continue;
    let top = null;
    for (const st of b.sets) {
      const wKg = Number(st.weight) || 0, r = Number(st.reps) || 0;
      const e1Kg = estOneRM(wKg, r);
      const w = kgToDisplay(wKg, unit), e1 = kgToDisplay(e1Kg, unit);
      if (!top || e1 > top.e1) top = { w, r, e1, kind: b.kind, duration: Number(st.duration) || 0, distance: Number(st.distance) || 0 };
    }
    if (bestPRSetId(b, prior) !== null) prCount++;
    rows.push({ ex, top, sets: b.sets.length, kind: b.kind });
  }

  const ACCENTS_SC = {
    teal:   { bg1: '#0A1D24', bg2: '#0A0D12', c: '#2FB4C8', c2: '#1EA2B8', ink: '#E8FBFF' },
    amber:  { bg1: '#251604', bg2: '#0A0D12', c: '#FBBF24', c2: '#F59E0B', ink: '#FFF7E6' },
    violet: { bg1: '#1B1033', bg2: '#0A0D12', c: '#A78BFA', c2: '#8B5CF6', ink: '#F1ECFF' },
    rose:   { bg1: '#2B0910', bg2: '#0A0D12', c: '#F87171', c2: '#EF4444', ink: '#FFECEC' },
    green:  { bg1: '#0A1F14', bg2: '#0A0D12', c: '#34D399', c2: '#10B981', ink: '#EDFFF5' },
  };
  const A = ACCENTS_SC[accent];

  // Render poster as scaled HTML preview, export via canvas manual draw
  const posterRef = React.useRef(null);
  const W = 1080, H = 1920;
  const previewScale = 0.38;

  const downloadPNG = async () => {
    setExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      drawPoster(ctx, W, H, { sess, rows, volume, duration, totalSets, totalReps, prCount, A, variant, unit, noBackground });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bitacora-${sess.date}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { alert('No se pudo exportar: ' + e.message); }
    setExporting(false);
  };

  const shareNative = async () => {
    setExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      drawPoster(ctx, W, H, { sess, rows, volume, duration, totalSets, totalReps, prCount, A, variant, unit, noBackground });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], `bitacora-${sess.date}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi entrenamiento', text: `Entrenamiento · ${kgToDisplay(volume, unit).toLocaleString('es-MX')} ${unitLabel(unit)} de volumen` });
      } else {
        downloadPNG();
      }
    } catch (e) { if (e.name !== 'AbortError') alert('No se pudo compartir: ' + e.message); }
    setExporting(false);
  };

  const copyPNG = async () => {
    setExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      drawPoster(ctx, W, H, { sess, rows, volume, duration, totalSets, totalReps, prCount, A, variant, unit, noBackground });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Imagen copiada al portapapeles');
    } catch (e) { alert('Navegador no soporta copiar imagen. Usa Descargar.'); }
    setExporting(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 860 }}>
        <div className="modal-head">
          <div className="modal-title">Compartir sesión</div>
          <button className="btn ghost sm" onClick={onClose}><I.X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: `${W * previewScale}px 1fr`, gap: 20 }} className="share-grid">
            <div style={{ width: W * previewScale, height: H * previewScale, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.55)', border: '1px solid var(--line-2)', background: noBackground ? 'repeating-conic-gradient(#3a3a3a 0% 25%, #2a2a2a 0% 50%) 0 0 / 24px 24px' : undefined }}>
              <div ref={posterRef} style={{
                width: W, height: H,
                transform: `scale(${previewScale})`, transformOrigin: 'top left',
              }}>
                <PosterHTML variant={variant} A={A} sess={sess} rows={rows} volume={volume} duration={duration} totalSets={totalSets} totalReps={totalReps} prCount={prCount} unit={unit} noBackground={noBackground} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Estilo</label>
                <div className="seg" style={{ width: '100%' }}>
                  <button className={variant === 'bold' ? 'active' : ''} onClick={() => setVariant('bold')} style={{ flex: 1 }}>Bold</button>
                  <button className={variant === 'ticket' ? 'active' : ''} onClick={() => setVariant('ticket')} style={{ flex: 1 }}>Ticket</button>
                  <button className={variant === 'minimal' ? 'active' : ''} onClick={() => setVariant('minimal')} style={{ flex: 1 }}>Minimal</button>
                  <button className={variant === 'stats' ? 'active' : ''} onClick={() => setVariant('stats')} style={{ flex: 1 }}>Stats</button>
                </div>
              </div>
              <div>
                <label className="field-label">Color</label>
                <div className="tweak-swatches">
                  {Object.entries(ACCENTS_SC).map(([k, a]) => (
                    <button key={k} className={`tweak-sw ${accent === k ? 'active' : ''}`} style={{ background: a.c }} onClick={() => setAccent(k)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">Fondo</label>
                <div className="seg" style={{ width: '100%' }}>
                  <button className={!noBackground ? 'active' : ''} onClick={() => setNoBackground(false)} style={{ flex: 1 }}>Con fondo</button>
                  <button className={noBackground ? 'active' : ''} onClick={() => setNoBackground(true)} style={{ flex: 1 }}>Sin fondo</button>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn primary" onClick={shareNative} disabled={exporting}>
                  <I.Share size={14} /> {exporting ? 'Preparando…' : 'Compartir'}
                </button>
                <button className="btn secondary" onClick={downloadPNG} disabled={exporting}>
                  <I.Download size={14} /> Descargar PNG
                </button>
                <button className="btn ghost" onClick={copyPNG} disabled={exporting}>
                  <I.Copy size={14} /> Copiar imagen
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 4 }}>1080 × 1920 · optimizado para Instagram Stories y Reels.</div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 700px) {
          .share-grid { grid-template-columns: 1fr !important; }
          .share-grid > div:first-child { margin: 0 auto; }
        }
      `}</style>
    </div>
  );
}

// ---------- Poster HTML preview (for visual fidelity in modal) ----------
function PosterHTML({ variant, A: Aorig, sess, rows, volume, duration, totalSets, totalReps, prCount, unit = 'kg', noBackground }) {
  const A = noBackground ? { ...Aorig, bg1: 'transparent', bg2: 'transparent' } : Aorig;
  const dateLong = fmtDate(sess.date, { long: true });
  const weekday = fmtWeekday(sess.date);
  const baseStyle = { width: 1080, height: 1920, fontFamily: 'Inter, sans-serif', color: A.ink, position: 'relative', overflow: 'hidden' };

  if (variant === 'bold') {
    return (
      <div style={{ ...baseStyle, background: noBackground ? 'transparent' : `radial-gradient(circle at 30% 0%, ${Aorig.bg1}, ${Aorig.bg2} 65%)` }}>
        {!noBackground && <div style={{ position: 'absolute', top: -200, right: -200, width: 700, height: 700, borderRadius: '50%', background: A.c, opacity: 0.12, filter: 'blur(60px)' }} />}
        <div style={{ padding: '80px 90px 160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${A.c}, ${A.c2})`, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 26, color: '#05222a' }}>GT</div>
            <div>
              <div style={{ fontSize: 29, fontWeight: 700, letterSpacing: '-0.02em' }}>GymTracker</div>
              <div style={{ fontSize: 19, color: A.c, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>Entrenamiento</div>
            </div>
          </div>

          <div style={{ fontSize: 30, color: A.c, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, marginBottom: 10 }}>{weekday}</div>
          <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 50 }}>
            {sess.name || dateLong}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 50 }}>
            <StatBlock label="Volumen" value={kgToDisplay(volume, unit).toLocaleString('es-MX')} unit={unitLabelUpper(unit)} A={A} big />
            <StatBlock label="Duración" value={duration} unit="MIN" A={A} big />
            <StatBlock label="Ejercicios" value={rows.length} A={A} />
            <StatBlock label="Series" value={totalSets} A={A} />
          </div>

          {prCount > 0 && (
            <div style={{ background: 'rgba(251,191,36,0.14)', border: '2px solid rgba(251,191,36,0.45)', borderRadius: 20, padding: 22, display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
              <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(251,191,36,0.25)', display: 'grid', placeItems: 'center', fontSize: 32 }}>🏆</div>
              <div>
                <div style={{ fontSize: 20, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>Record personal</div>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>{prCount} nuevo{prCount === 1 ? '' : 's'} PR</div>
              </div>
            </div>
          )}

          <div style={{ borderTop: `2px solid ${A.c}40`, paddingTop: 20 }}>
            {rows.slice(0, 10).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '13px 0', borderBottom: `1px solid ${A.c}18` }}>
                <div>
                  <div style={{ fontSize: 31, fontWeight: 700, letterSpacing: '-0.01em' }}>{r.ex.name}</div>
                  <div style={{ fontSize: 21, color: `${A.ink}80`, marginTop: 3 }}>{r.ex.group}{r.ex.equipment ? ` · ${equipmentLabel(r.ex.equipment)}` : ''} · {r.sets} series</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: A.c, fontVariantNumeric: 'tabular-nums' }}>
                  {r.kind === 'cardio' ? `${r.top?.duration || 0}' · ${r.top?.distance || 0}km`
                    : r.kind === 'time' ? `${r.top?.duration || 0}s`
                      : `${r.top?.w || 0} ${unitLabel(unit)} × ${r.top?.r || 0}`}
                </div>
              </div>
            ))}
            {rows.length > 10 && (
              <div style={{ padding: '13px 0', fontSize: 21, fontWeight: 600, color: `${A.ink}55`, letterSpacing: '0.06em' }}>
                +{rows.length - 10} ejercicio{rows.length - 10 === 1 ? '' : 's'} más…
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 70, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: `${A.ink}60`, fontSize: 18, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          <span>@GymTracker</span>
          <span>{dateLong}</span>
        </div>
      </div>
    );
  }

  if (variant === 'ticket') {
    return (
      <div style={{ ...baseStyle, background: A.bg2, padding: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', background: `linear-gradient(180deg, ${A.bg1}, ${A.bg2})`, borderRadius: 36, border: `2px solid ${A.c}50`, padding: 60, position: 'relative' }}>
          <div style={{ textAlign: 'center', paddingBottom: 36, borderBottom: `2px dashed ${A.c}40` }}>
            <div style={{ fontSize: 22, color: A.c, textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, marginBottom: 14 }}>● Entrenamiento ●</div>
            <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{sess.name || 'Sesión completada'}</div>
            <div style={{ fontSize: 24, color: `${A.ink}80`, marginTop: 16 }}>{dateLong}</div>
          </div>

          <div style={{ padding: '50px 20px' }}>
            {rows.slice(0, 10).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px dotted ${A.c}25` }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 600 }}>{r.ex.name}</div>
                  {r.ex.equipment && <div style={{ fontSize: 18, color: `${A.ink}55`, marginTop: 2 }}>{r.ex.group} · {equipmentLabel(r.ex.equipment)}</div>}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: A.c, fontVariantNumeric: 'tabular-nums' }}>
                  {r.kind === 'cardio' ? `${r.top?.duration || 0}·${r.top?.distance || 0}km`
                    : r.kind === 'time' ? `${r.top?.duration || 0}s`
                      : `${r.top?.w || 0} ${unitLabel(unit)} × ${r.top?.r || 0}`}
                </div>
              </div>
            ))}
            {rows.length > 10 && (
              <div style={{ padding: '14px 0', fontSize: 22, fontWeight: 600, color: `${A.ink}55`, letterSpacing: '0.06em' }}>
                +{rows.length - 10} ejercicio{rows.length - 10 === 1 ? '' : 's'} más…
              </div>
            )}
          </div>

          <div style={{ paddingTop: 36, borderTop: `2px dashed ${A.c}40`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 18, color: `${A.ink}60`, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Volumen</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: A.c, letterSpacing: '-0.02em' }}>{kgToDisplay(volume, unit).toLocaleString('es-MX')}</div>
              <div style={{ fontSize: 18, color: `${A.ink}60` }}>{unitLabelUpper(unit)}</div>
            </div>
            <div>
              <div style={{ fontSize: 18, color: `${A.ink}60`, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Tiempo</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: A.c, letterSpacing: '-0.02em' }}>{duration}</div>
              <div style={{ fontSize: 18, color: `${A.ink}60` }}>MIN</div>
            </div>
            <div>
              <div style={{ fontSize: 18, color: `${A.ink}60`, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Series</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: A.c, letterSpacing: '-0.02em' }}>{totalSets}</div>
              <div style={{ fontSize: 18, color: `${A.ink}60` }}>TOTAL</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 50, fontSize: 20, color: `${A.ink}50`, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
            GymTracker · @GymTracker
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'stats') {
    return (
      <div style={{ ...baseStyle, background: A.bg2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 1920, textAlign: 'center', padding: '0 100px', position: 'relative' }}>
          <div style={{ fontSize: 22, color: A.c, textTransform: 'uppercase', letterSpacing: '0.32em', fontWeight: 700, marginBottom: 32 }}>GymTracker</div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 80, maxWidth: 800 }}>{sess.name || dateLong}</div>

          <div style={{ width: '100%', height: 2, background: `${A.c}40`, marginBottom: 80 }} />

          <div style={{ marginBottom: 70 }}>
            <div style={{ fontSize: 22, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, marginBottom: 10 }}>Volumen</div>
            <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.88, color: A.c }}>{kgToDisplay(volume, unit).toLocaleString('es-MX')}</div>
            <div style={{ fontSize: 44, fontWeight: 600, color: `${A.ink}70`, marginTop: 14 }}>{unitLabelUpper(unit)}</div>
          </div>

          <div style={{ marginBottom: 80 }}>
            <div style={{ fontSize: 22, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, marginBottom: 10 }}>Duración</div>
            <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.88, color: A.c }}>{duration}</div>
            <div style={{ fontSize: 44, fontWeight: 600, color: `${A.ink}70`, marginTop: 14 }}>MIN</div>
          </div>

          <div style={{ width: '100%', height: 2, background: `${A.c}40`, marginBottom: 60 }} />

          {prCount > 0 ? (
            <div style={{ background: 'rgba(251,191,36,0.14)', border: '2px solid rgba(251,191,36,0.45)', borderRadius: 28, padding: '34px 80px', fontSize: 52, fontWeight: 800, color: '#FBBF24' }}>
              🏆 {prCount} nuevo{prCount === 1 ? '' : 's'} PR
            </div>
          ) : (
            <div style={{ fontSize: 30, color: `${A.ink}35`, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sin records personales</div>
          )}

          <div style={{ position: 'absolute', bottom: 80, fontSize: 20, color: `${A.ink}40`, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 }}>{dateLong}</div>
        </div>
      </div>
    );
  }

  // minimal
  return (
    <div style={{ ...baseStyle, background: A.bg2, padding: 120 }}>
      <div style={{ fontSize: 22, color: A.c, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, marginBottom: 60 }}>
        Bitácora · {dateLong}
      </div>
      <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.85, color: A.c }}>
        {kgToDisplay(volume, unit).toLocaleString('es-MX')}
      </div>
      <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 10, marginBottom: 80 }}>
        {unitLabel(unit)} de volumen total
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 30, borderTop: `2px solid ${A.c}40`, borderBottom: `2px solid ${A.c}40`, padding: '36px 0' }}>
        <div>
          <div style={{ fontSize: 20, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Duración</div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>{duration}<span style={{ fontSize: 26, color: `${A.ink}60`, marginLeft: 6 }}>min</span></div>
        </div>
        <div>
          <div style={{ fontSize: 20, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Ejercicios</div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>{rows.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 20, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Series</div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>{totalSets}</div>
        </div>
      </div>
      <div style={{ marginTop: 50 }}>
        {rows.slice(0, 15).map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 500 }}>{r.ex.name}</div>
              {r.ex.equipment && <div style={{ fontSize: 18, color: `${A.ink}50`, marginTop: 2 }}>{r.ex.group} · {equipmentLabel(r.ex.equipment)}</div>}
            </div>
            <span style={{ fontSize: 30, fontWeight: 700, color: A.c, fontVariantNumeric: 'tabular-nums' }}>
              {r.kind === 'cardio' ? `${r.top?.duration || 0}'/${r.top?.distance || 0}km`
                : r.kind === 'time' ? `${r.top?.duration || 0}s`
                  : `${r.top?.w || 0} ${unitLabel(unit)} × ${r.top?.r || 0}`}
            </span>
          </div>
        ))}
        {rows.length > 15 && (
          <div style={{ padding: '16px 0', fontSize: 26, fontWeight: 500, color: `${A.ink}50` }}>
            +{rows.length - 15} ejercicio{rows.length - 15 === 1 ? '' : 's'} más…
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 100, left: 120, fontSize: 22, color: `${A.ink}40`, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 }}>
        GymTracker
      </div>
    </div>
  );
}

function StatBlock({ label, value, unit, A, big }) {
  return (
    <div>
      <div style={{ fontSize: 20, color: `${A.ink}70`, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: big ? 90 : 64, fontWeight: 800, letterSpacing: '-0.03em', color: A.c, lineHeight: 1 }}>{value}</div>
        {unit && <div style={{ fontSize: 22, color: `${A.ink}60`, fontWeight: 600, letterSpacing: '0.08em' }}>{unit}</div>}
      </div>
    </div>
  );
}

// ---------- Canvas poster renderer (for PNG export) ----------
function drawPoster(ctx, W, H, d) {
  const { sess, rows, volume, duration, totalSets, totalReps, prCount, A, variant, unit = 'kg', noBackground } = d;
  const dateLong = fmtDate(sess.date, { long: true });
  const weekday = fmtWeekday(sess.date);

  // background
  if (!noBackground) {
    if (variant === 'minimal') {
      ctx.fillStyle = A.bg2; ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createRadialGradient(W * 0.3, 0, 0, W * 0.3, 0, W);
      grad.addColorStop(0, A.bg1); grad.addColorStop(1, A.bg2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }
  }

  ctx.textBaseline = 'top';
  const font = (s, w = 400) => `${w} ${s}px Inter, system-ui, sans-serif`;
  const setFill = (c) => { ctx.fillStyle = c; };

  if (variant === 'bold') {
    // blob
    if (!noBackground) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      const rg = ctx.createRadialGradient(W - 100, 100, 0, W - 100, 100, 600);
      rg.addColorStop(0, A.c); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 900);
      ctx.restore();
    }

    // logo block
    const lx = 90, ly = 90;
    const g = ctx.createLinearGradient(lx, ly, lx + 64, ly + 64);
    g.addColorStop(0, A.c); g.addColorStop(1, A.c2);
    ctx.fillStyle = g;
    roundRect(ctx, lx, ly, 64, 64, 16, true);
    ctx.fillStyle = '#05222a'; ctx.font = font(28, 800); ctx.fillText('GT', lx + 12, ly + 16);

    setFill(A.ink); ctx.font = font(30, 700); ctx.fillText('GymTracker', lx + 82, ly + 5);
    setFill(A.c); ctx.font = font(20, 600); ctx.fillText('ENTRENAMIENTO', lx + 82, ly + 42);

    // weekday + title
    let y = 260;
    setFill(A.c); ctx.font = font(32, 600); ctx.fillText(weekday.toUpperCase(), 90, y);
    y += 50; setFill(A.ink); ctx.font = font(72, 800);
    wrapText(ctx, sess.name || dateLong, 90, y, W - 180, 82);
    y += 82 * Math.max(1, countLines(ctx, sess.name || dateLong, W - 180)) + 60;

    // stats grid
    const stats = [
      { l: 'VOLUMEN', v: kgToDisplay(volume, unit).toLocaleString('es-MX'), u: unitLabelUpper(unit), big: true },
      { l: 'DURACIÓN', v: String(duration), u: 'MIN', big: true },
      { l: 'EJERCICIOS', v: String(rows.length), u: '' },
      { l: 'SERIES', v: String(totalSets), u: '' },
    ];
    for (let i = 0; i < stats.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const sx = 90 + col * ((W - 180) / 2);
      const sy = y + row * 170;
      const s = stats[i];
      setFill(A.ink + 'B0'); ctx.font = font(20, 600); ctx.fillText(s.l, sx, sy);
      setFill(A.c); ctx.font = font(s.big ? 90 : 64, 800);
      ctx.fillText(s.v, sx, sy + 30);
      if (s.u) {
        setFill(A.ink + '90'); ctx.font = font(22, 600);
        const tw = ctx.measureText(s.v).width;
        ctx.font = font(s.big ? 90 : 64, 800);
        const num = ctx.measureText(s.v).width;
        ctx.font = font(22, 600); ctx.fillText(s.u, sx + num + 12, sy + (s.big ? 90 : 70));
      }
    }
    y += 320;

    // PR banner
    if (prCount > 0) {
      ctx.fillStyle = 'rgba(251,191,36,0.14)';
      roundRect(ctx, 90, y, W - 180, 130, 24, true);
      ctx.strokeStyle = 'rgba(251,191,36,0.45)'; ctx.lineWidth = 3;
      roundRect(ctx, 90, y, W - 180, 130, 24, false, true);
      ctx.fillStyle = 'rgba(251,191,36,0.25)';
      roundRect(ctx, 120, y + 29, 72, 72, 18, true);
      ctx.save();
      ctx.textAlign = 'center'; ctx.font = font(42); ctx.fillStyle = '#FBBF24';
      ctx.fillText('🏆', 156, y + 44);
      ctx.restore();
      ctx.fillStyle = '#FBBF24'; ctx.font = font(22, 700); ctx.fillText('RECORD PERSONAL', 220, y + 28);
      ctx.fillStyle = A.ink; ctx.font = font(38, 800); ctx.fillText(`${prCount} nuevo${prCount === 1 ? '' : 's'} PR`, 220, y + 60);
      y += 170;
    }

    // exercises
    ctx.strokeStyle = A.c + '40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(W - 90, y); ctx.stroke();
    y += 20;
    const boldVisible = rows.slice(0, 10);
    for (const r of boldVisible) {
      if (y > H - 220) break;
      setFill(A.ink); ctx.font = font(25, 700); ctx.fillText(r.ex.name, 90, y + 16);
      const boldSub = r.ex.equipment ? `${r.ex.group} · ${equipmentLabel(r.ex.equipment)} · ${r.sets} series` : `${r.ex.group} · ${r.sets} series`;
      setFill(A.ink + '80'); ctx.font = font(16, 500); ctx.fillText(boldSub, 90, y + 46);
      const val = r.kind === 'cardio' ? `${r.top?.duration || 0}' · ${r.top?.distance || 0}km`
        : r.kind === 'time' ? `${r.top?.duration || 0}s`
          : `${r.top?.w || 0} ${unitLabel(unit)} × ${r.top?.r || 0}`;
      setFill(A.c); ctx.font = font(26, 800);
      ctx.textAlign = 'right';
      ctx.fillText(val, W - 90, y + 26);
      ctx.textAlign = 'left';
      y += 76;
      ctx.strokeStyle = A.c + '18'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(W - 90, y); ctx.stroke();
    }
    if (rows.length > 8 && y < H - 220) {
      setFill(A.ink + '55'); ctx.font = font(20, 600);
      ctx.fillText(`+${rows.length - 10} ejercicio${rows.length - 10 === 1 ? '' : 's'} más…`, 90, y + 15);
    }

    // footer
    setFill(A.ink + '60'); ctx.font = font(20, 600);
    ctx.fillText('@GymTracker', 90, H - 110);
    ctx.textAlign = 'right';
    ctx.fillText(dateLong.toUpperCase(), W - 90, H - 110);
    ctx.textAlign = 'left';
    return;
  }

  if (variant === 'ticket') {
    const tx = 80, ty = 160, tw = W - 160;
    // Dynamic card height: header (330) + exercises + gap (60) + stats (160) + footer pad (60)
    const nRows = Math.min(rows.length, 10);
    const rowHeights = rows.slice(0, nRows).reduce((n, r) => n + (r.ex.equipment ? 68 : 54), 0);
    const th = Math.max(330 + rowHeights + 60 + 160 + 60, 700);

    if (!noBackground) {
      const tgrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
      tgrad.addColorStop(0, A.bg1); tgrad.addColorStop(1, A.bg2);
      ctx.fillStyle = tgrad; roundRect(ctx, tx, ty, tw, th, 36, true);
    }
    ctx.strokeStyle = A.c + '80'; ctx.lineWidth = 4; roundRect(ctx, tx, ty, tw, th, 36, false, true);

    // header
    ctx.textAlign = 'center';
    setFill(A.c); ctx.font = font(22, 700);
    ctx.fillText('● ENTRENAMIENTO ●', W / 2, ty + 60);
    setFill(A.ink); ctx.font = font(56, 800);
    wrapText(ctx, sess.name || 'Sesión completada', tx + 40, ty + 110, tw - 80, 64, 'center');
    setFill(A.ink + '80'); ctx.font = font(24, 500);
    ctx.fillText(dateLong, W / 2, ty + 230);

    // dashed separator
    drawDashed(ctx, tx + 40, ty + 290, tx + tw - 40, ty + 290, A.c + '60', 8);

    ctx.textAlign = 'left';
    let ey = ty + 330;
    for (const r of rows.slice(0, nRows)) {
      const hasEq = !!r.ex.equipment;
      setFill(A.ink); ctx.font = font(26, 600); ctx.fillText(r.ex.name, tx + 60, ey + (hasEq ? 0 : 5) + 5);
      if (hasEq) { setFill(A.ink + '55'); ctx.font = font(18, 500); ctx.fillText(`${r.ex.group} · ${equipmentLabel(r.ex.equipment)}`, tx + 60, ey + 30); }
      const val = r.kind === 'cardio' ? `${r.top?.duration || 0}·${r.top?.distance || 0}km`
        : r.kind === 'time' ? `${r.top?.duration || 0}s`
          : `${r.top?.w || 0} ${unitLabel(unit)} × ${r.top?.r || 0}`;
      setFill(A.c); ctx.font = font(26, 700); ctx.textAlign = 'right';
      ctx.fillText(val, tx + tw - 60, ey + (hasEq ? 10 : 5) + 5);
      ctx.textAlign = 'left';
      ey += hasEq ? 68 : 54;
      drawDashed(ctx, tx + 60, ey - 10, tx + tw - 60, ey - 10, A.c + '30', 4);
    }
    if (rows.length > 10) {
      setFill(A.ink + '55'); ctx.font = font(22, 600);
      ctx.fillText(`+${rows.length - 10} ejercicio${rows.length - 10 === 1 ? '' : 's'} más…`, tx + 60, ey);
      ey += 36;
    }

    // bottom stats — positioned right after exercises
    const sy = ey + 60;
    drawDashed(ctx, tx + 40, sy, tx + tw - 40, sy, A.c + '60', 8);
    ctx.textAlign = 'center';
    const stats = [
      { l: 'VOLUMEN', v: kgToDisplay(volume, unit).toLocaleString('es-MX'), u: unitLabelUpper(unit) },
      { l: 'TIEMPO', v: String(duration), u: 'MIN' },
      { l: 'SERIES', v: String(totalSets), u: 'TOTAL' },
    ];
    const colW = (tw - 80) / 3;
    stats.forEach((s, i) => {
      const cx = tx + 40 + colW * i + colW / 2;
      setFill(A.ink + '60'); ctx.font = font(18, 600); ctx.fillText(s.l, cx, sy + 30);
      setFill(A.c); ctx.font = font(42, 800); ctx.fillText(s.v, cx, sy + 58);
      setFill(A.ink + '60'); ctx.font = font(18, 500); ctx.fillText(s.u, cx, sy + 116);
    });
    setFill(A.ink + '50'); ctx.font = font(20, 600);
    ctx.fillText('GymTracker · @GYMTRACKER', W / 2, sy + 160);
    ctx.textAlign = 'left';
    return;
  }

  if (variant === 'stats') {
    ctx.textAlign = 'center';
    const cx = W / 2;
    setFill(A.c); ctx.font = font(24, 700);
    ctx.fillText('GYMTRACKER', cx, 160);
    setFill(A.ink); ctx.font = font(56, 800);
    wrapText(ctx, sess.name || dateLong, 100, 240, W - 200, 68, 'center');
    ctx.strokeStyle = A.c + '40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, 430); ctx.lineTo(W - 100, 430); ctx.stroke();
    let y = 510;
    setFill(A.ink + '60'); ctx.font = font(22, 600); ctx.fillText('VOLUMEN', cx, y);
    y += 38; setFill(A.c); ctx.font = font(160, 800);
    ctx.fillText(kgToDisplay(volume, unit).toLocaleString('es-MX'), cx, y);
    y += 175; setFill(A.ink + '70'); ctx.font = font(44, 600); ctx.fillText(unitLabelUpper(unit), cx, y);
    y += 80; setFill(A.ink + '60'); ctx.font = font(22, 600); ctx.fillText('DURACIÓN', cx, y);
    y += 38; setFill(A.c); ctx.font = font(160, 800); ctx.fillText(String(duration), cx, y);
    y += 175; setFill(A.ink + '70'); ctx.font = font(44, 600); ctx.fillText('MIN', cx, y);
    y += 80; ctx.strokeStyle = A.c + '40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(W - 100, y); ctx.stroke();
    y += 60;
    if (prCount > 0) {
      ctx.fillStyle = 'rgba(251,191,36,0.14)';
      roundRect(ctx, 100, y, W - 200, 140, 28, true);
      ctx.strokeStyle = 'rgba(251,191,36,0.45)'; ctx.lineWidth = 3;
      roundRect(ctx, 100, y, W - 200, 140, 28, false, true);
      ctx.fillStyle = '#FBBF24'; ctx.font = font(52, 800);
      ctx.fillText(`🏆 ${prCount} nuevo${prCount === 1 ? '' : 's'} PR`, cx, y + 44);
    } else {
      setFill(A.ink + '35'); ctx.font = font(30, 600);
      ctx.fillText('SIN RECORDS PERSONALES', cx, y + 20);
    }
    setFill(A.ink + '40'); ctx.font = font(20, 600);
    ctx.fillText(dateLong.toUpperCase(), cx, H - 110);
    ctx.textAlign = 'left';
    return;
  }

  // minimal
  setFill(A.c); ctx.font = font(22, 700);
  ctx.fillText(`BITÁCORA · ${dateLong.toUpperCase()}`, 120, 120);
  setFill(A.c); ctx.font = font(160, 800);
  ctx.fillText(kgToDisplay(volume, unit).toLocaleString('es-MX'), 110, 220);
  setFill(A.ink); ctx.font = font(60, 700);
  ctx.fillText(`${unitLabel(unit)} de volumen total`, 120, 520);

  // rule
  ctx.strokeStyle = A.c + '40'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(120, 660); ctx.lineTo(W - 120, 660); ctx.stroke();

  const stats = [
    { l: 'DURACIÓN', v: String(duration), u: 'min' },
    { l: 'EJERCICIOS', v: String(rows.length), u: '' },
    { l: 'SERIES', v: String(totalSets), u: '' },
  ];
  const colW = (W - 240) / 3;
  stats.forEach((s, i) => {
    const cx = 120 + colW * i;
    setFill(A.ink + '60'); ctx.font = font(20, 600); ctx.fillText(s.l, cx, 690);
    setFill(A.ink); ctx.font = font(60, 800); ctx.fillText(s.v, cx, 720);
    if (s.u) {
      setFill(A.ink + '60'); ctx.font = font(26, 500);
      const w = ctx.measureText(s.v).width * 60 / 60;
      ctx.font = font(60, 800); const num = ctx.measureText(s.v).width;
      ctx.font = font(26, 500); ctx.fillText(s.u, cx + num + 10, 750);
    }
  });
  ctx.beginPath(); ctx.moveTo(120, 830); ctx.lineTo(W - 120, 830); ctx.stroke();

  let ey = 900;
  for (const r of rows.slice(0, 10)) {
    const hasEq = !!r.ex.equipment;
    setFill(A.ink); ctx.font = font(30, 500); ctx.fillText(r.ex.name, 120, ey);
    if (hasEq) { setFill(A.ink + '50'); ctx.font = font(20, 400); ctx.fillText(`${r.ex.group} · ${equipmentLabel(r.ex.equipment)}`, 120, ey + 34); }
    const val = r.kind === 'cardio' ? `${r.top?.duration || 0}'/${r.top?.distance || 0}km`
      : r.kind === 'time' ? `${r.top?.duration || 0}s`
        : `${r.top?.w || 0} ${unitLabel(unit)} × ${r.top?.r || 0}`;
    setFill(A.c); ctx.font = font(30, 700); ctx.textAlign = 'right';
    ctx.fillText(val, W - 120, ey + (hasEq ? 10 : 0));
    ctx.textAlign = 'left';
    ey += hasEq ? 80 : 70;
  }
  if (rows.length > 10) {
    setFill(A.ink + '50'); ctx.font = font(26, 500);
    ctx.fillText(`+${rows.length - 10} ejercicio${rows.length - 10 === 1 ? '' : 's'} más…`, 120, ey);
    ey += 50;
  }
  ctx.strokeStyle = A.c + '40'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(120, ey + 24); ctx.lineTo(W - 120, ey + 24); ctx.stroke();
  setFill(A.ink + '40'); ctx.font = font(22, 600);
  ctx.fillText('GYMTRACKER', 120, ey + 54);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
function drawDashed(ctx, x1, y1, x2, y2, color, dash = 6) {
  ctx.save();
  ctx.setLineDash([dash, dash]);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}
function wrapText(ctx, text, x, y, maxW, lineH, align = 'left') {
  const words = String(text).split(' ');
  let line = '', yy = y;
  const prevAlign = ctx.textAlign; if (align) ctx.textAlign = align;
  const xx = align === 'center' ? x + maxW / 2 : x;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), xx, yy); line = words[i] + ' '; yy += lineH;
    } else line = test;
  }
  ctx.fillText(line.trim(), xx, yy);
  ctx.textAlign = prevAlign;
}
function countLines(ctx, text, maxW) {
  const words = String(text).split(' ');
  let line = '', n = 1;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxW && line) { n++; line = words[i] + ' '; } else line = test;
  }
  return n;
}

// =========================================================================
// ShareExerciseCardModal — comparte el progreso de UN ejercicio
// =========================================================================

function ShareExerciseCardModal({ ex, state, onClose }) {
  const unit = state.weightUnit || 'kg';
  const [variant, setVariant] = React.useState('progress');
  const [accent, setAccent] = React.useState(() => state.accentKey || 'teal');
  const [exporting, setExporting] = React.useState(false);

  const series = exerciseSeries(ex.id, state.sessions); // [{date, topWeight, topE1rm, volume}]
  const best = bestOneRMPerExercise(state.sessions)[ex.id];

  // Compute PR progression
  const prDates = new Set();
  let run = 0;
  for (const p of series) { if (p.topE1rm > run) { prDates.add(p.date); run = p.topE1rm; } }

  // Gather recent sets for this exercise
  const recentSets = [];
  for (const s of [...state.sessions].reverse()) {
    for (const b of s.blocks) {
      if (b.exerciseId !== ex.id) continue;
      for (const st of b.sets) recentSets.push({ ...st, date: s.date, sessionId: s.id });
    }
  }
  const totalSessions = series.length;
  const totalVolumeKg = series.reduce((n, p) => n + (p.volume || 0), 0);
  const totalReps = recentSets.reduce((n, st) => n + (Number(st.reps) || 0), 0);
  const totalSetsCount = recentSets.length;

  // Progress delta (first vs last topE1rm, strength only)
  const firstPt = series[0];
  const lastPt = series[series.length - 1];
  const deltaPct = (firstPt && lastPt && firstPt.topE1rm > 0)
    ? Math.round(((lastPt.topE1rm - firstPt.topE1rm) / firstPt.topE1rm) * 100)
    : 0;

  const ACCENTS_EX = {
    teal:   { bg1: '#0A1D24', bg2: '#0A0D12', c: '#2FB4C8', c2: '#1EA2B8', ink: '#E8FBFF' },
    amber:  { bg1: '#251604', bg2: '#0A0D12', c: '#FBBF24', c2: '#F59E0B', ink: '#FFF7E6' },
    violet: { bg1: '#1B1033', bg2: '#0A0D12', c: '#A78BFA', c2: '#8B5CF6', ink: '#F1ECFF' },
    rose:   { bg1: '#2B0910', bg2: '#0A0D12', c: '#F87171', c2: '#EF4444', ink: '#FFECEC' },
    green:  { bg1: '#0A1F14', bg2: '#0A0D12', c: '#34D399', c2: '#10B981', ink: '#EDFFF5' },
  };
  const A = ACCENTS_EX[accent];

  const W = 1080, H = 1920;
  const previewScale = 0.32;

  const buildCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    drawExercisePoster(ctx, W, H, {
      ex, series, recentSets, best, prDates,
      totalSessions, totalVolumeKg, totalReps, totalSetsCount,
      deltaPct, A, variant, unit,
    });
    return canvas;
  };

  const downloadPNG = async () => {
    setExporting(true);
    try {
      const blob = await new Promise(res => buildCanvas().toBlob(res, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `progreso-${slug(ex.name)}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { alert('No se pudo exportar: ' + e.message); }
    setExporting(false);
  };

  const shareNative = async () => {
    setExporting(true);
    try {
      const blob = await new Promise(res => buildCanvas().toBlob(res, 'image/png'));
      const file = new File([blob], `progreso-${slug(ex.name)}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Progreso · ${ex.name}`, text: `Mi progreso en ${ex.name}` });
      } else {
        downloadPNG();
      }
    } catch (e) { if (e.name !== 'AbortError') alert('No se pudo compartir: ' + e.message); }
    setExporting(false);
  };

  const copyPNG = async () => {
    setExporting(true);
    try {
      const blob = await new Promise(res => buildCanvas().toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Imagen copiada al portapapeles');
    } catch (e) { alert('Navegador no soporta copiar imagen. Usa Descargar.'); }
    setExporting(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-head">
          <div className="modal-title">Compartir progreso</div>
          <button className="btn ghost sm" onClick={onClose}><I.X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: `${W * previewScale}px 1fr`, gap: 20 }} className="share-grid">
            <div style={{ width: W * previewScale, height: H * previewScale, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.55)', border: '1px solid var(--line-2)' }}>
              <div style={{ width: W, height: H, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                <ExercisePosterHTML
                  variant={variant} A={A} ex={ex} series={series} recentSets={recentSets}
                  best={best} prDates={prDates} totalSessions={totalSessions}
                  totalVolumeKg={totalVolumeKg} totalReps={totalReps} totalSetsCount={totalSetsCount}
                  deltaPct={deltaPct} unit={unit}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Estilo</label>
                <div className="seg" style={{ width: '100%' }}>
                  <button className={variant === 'progress' ? 'active' : ''} onClick={() => setVariant('progress')} style={{ flex: 1 }}>Progreso</button>
                  <button className={variant === 'record' ? 'active' : ''} onClick={() => setVariant('record')} style={{ flex: 1 }}>Record</button>
                  <button className={variant === 'timeline' ? 'active' : ''} onClick={() => setVariant('timeline')} style={{ flex: 1 }}>Línea</button>
                </div>
              </div>
              <div>
                <label className="field-label">Color</label>
                <div className="tweak-swatches">
                  {Object.entries(ACCENTS_EX).map(([k, a]) => (
                    <button key={k} className={`tweak-sw ${accent === k ? 'active' : ''}`} style={{ background: a.c }} onClick={() => setAccent(k)} />
                  ))}
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn primary" onClick={shareNative} disabled={exporting}>
                  <I.Share size={14} /> {exporting ? 'Preparando…' : 'Compartir'}
                </button>
                <button className="btn secondary" onClick={downloadPNG} disabled={exporting}>
                  <I.Download size={14} /> Descargar PNG
                </button>
                <button className="btn ghost" onClick={copyPNG} disabled={exporting}>
                  <I.Copy size={14} /> Copiar imagen
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 4 }}>1080 × 1920 · optimizado para Instagram Stories y Reels.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function slug(s) {
  return String(s || 'ejercicio').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ---------- Sparkline geometry helper (DOM + Canvas) ----------
function sparkGeom(points, yKey, w, h, padX = 0, padY = 0) {
  if (!points || points.length === 0) return { coords: [], min: 0, max: 0 };
  const vals = points.map(p => Number(p[yKey]) || 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const iw = w - padX * 2, ih = h - padY * 2;
  const coords = points.map((p, i) => {
    const x = padX + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const y = padY + ih - ((Number(p[yKey]) || 0) - min) / span * ih;
    return { x, y, p };
  });
  return { coords, min, max };
}

function pathFromCoords(coords) {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  return coords.map((c, i) => (i === 0 ? 'M' : 'L') + ` ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
}

// ---------- ExercisePosterHTML (preview) ----------
function ExercisePosterHTML(props) {
  const { variant, A, ex, series, recentSets, best, prDates, totalSessions, totalVolumeKg, totalReps, totalSetsCount, deltaPct, unit } = props;
  const base = { width: 1080, height: 1920, fontFamily: 'Inter, sans-serif', color: A.ink, position: 'relative', overflow: 'hidden' };
  const isStrength = ex.kind === 'strength';

  if (variant === 'progress') {
    const chartW = 900, chartH = 560;
    const yKey = isStrength ? 'topE1rm' : (ex.kind === 'cardio' ? 'volume' : 'volume');
    const { coords, min, max } = sparkGeom(series, yKey, chartW, chartH, 20, 30);
    const path = pathFromCoords(coords);
    const area = coords.length > 1
      ? path + ` L ${coords[coords.length - 1].x} ${chartH - 10} L ${coords[0].x} ${chartH - 10} Z`
      : '';

    const firstV = series[0] ? (series[0][yKey] || 0) : 0;
    const lastV = series[series.length - 1] ? (series[series.length - 1][yKey] || 0) : 0;

    return (
      <div style={{ ...base, background: `radial-gradient(circle at 20% 0%, ${A.bg1}, ${A.bg2} 65%)` }}>
        <div style={{ position: 'absolute', top: -180, right: -180, width: 640, height: 640, borderRadius: '50%', background: A.c, opacity: 0.14, filter: 'blur(70px)' }} />
        <div style={{ padding: '90px 90px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 50 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${A.c}, ${A.c2})`, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 28, color: '#05222a' }}>GT</div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>GYMTRACKER</div>
              <div style={{ fontSize: 20, color: A.c, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>Progreso</div>
            </div>
          </div>

          <div style={{ fontSize: 28, color: A.c, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, marginBottom: 14 }}>{ex.group}</div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 0.95, marginBottom: 18 }}>{ex.name}</div>
          <div style={{ fontSize: 24, color: `${A.ink}80`, marginBottom: 50 }}>
            {isStrength ? 'Evolución de tu e1RM' : 'Volumen por sesión'}{ex.equipment ? ` · ${equipmentLabel(ex.equipment)}` : ''} · {totalSessions} sesiones
          </div>

          {/* Chart card */}
          <div style={{ background: `${A.ink}08`, border: `1px solid ${A.c}30`, borderRadius: 28, padding: 40, marginBottom: 50 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
              <div style={{ fontSize: 22, color: `${A.ink}80`, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
                {isStrength ? `e1RM · ${unitLabel(unit)}` : `Volumen · ${unitLabel(unit)}`}
              </div>
              {isStrength && deltaPct !== 0 && (
                <div style={{ fontSize: 28, fontWeight: 800, color: deltaPct > 0 ? A.c : '#F87171', letterSpacing: '-0.01em' }}>
                  {deltaPct > 0 ? '+' : ''}{deltaPct}%
                </div>
              )}
            </div>
            <svg width={chartW} height={chartH} style={{ display: 'block' }}>
              <defs>
                <linearGradient id={`sparkFill-${accent_key(A)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={A.c} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={A.c} stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                <line key={i} x1={20} x2={chartW - 20} y1={30 + t * (chartH - 60)} y2={30 + t * (chartH - 60)} stroke={`${A.c}15`} strokeWidth="1" />
              ))}
              {area && <path d={area} fill={`url(#sparkFill-${accent_key(A)})`} />}
              {path && <path d={path} fill="none" stroke={A.c} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />}
              {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={prDates.has(c.p.date) ? 11 : 6}
                  fill={prDates.has(c.p.date) ? '#FBBF24' : A.c}
                  stroke={prDates.has(c.p.date) ? '#FBBF2488' : 'none'} strokeWidth={prDates.has(c.p.date) ? 6 : 0} />
              ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 20, color: `${A.ink}60`, fontVariantNumeric: 'tabular-nums' }}>
              <span>{fmtDate(series[0]?.date || '')}</span>
              <span>{fmtDate(series[series.length - 1]?.date || '')}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            {isStrength ? (
              <>
                <ExStat label="Mejor peso" value={best ? `${kgToDisplay(best.weight, unit)}` : '—'} unit={best ? `${unitLabel(unit)} × ${best.reps}` : ''} A={A} big />
                <ExStat label="e1RM máximo" value={best ? `${kgToDisplay(best.e1rm, unit)}` : '—'} unit={unitLabelUpper(unit)} A={A} big />
                <ExStat label="Sesiones" value={totalSessions} A={A} />
                <ExStat label="Series totales" value={totalSetsCount} A={A} />
              </>
            ) : (
              <>
                <ExStat label="Sesiones" value={totalSessions} A={A} big />
                <ExStat label="Series" value={totalSetsCount} A={A} big />
                <ExStat label="Reps totales" value={totalReps} A={A} />
                <ExStat label="Volumen" value={kgToDisplay(totalVolumeKg, unit).toLocaleString('es-MX')} unit={unitLabelUpper(unit)} A={A} />
              </>
            )}
          </div>

          <div style={{ position: 'absolute', bottom: 70, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: `${A.ink}60`, fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            <span>@gymtracker</span>
            <span>● Puntos dorados = PR</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'record') {
    const prSeries = series.filter(p => prDates.has(p.date));
    return (
      <div style={{ ...base, background: A.bg2 }}>
        {/* Top stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520, background: `linear-gradient(180deg, ${A.bg1}, transparent)` }} />
        <div style={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, borderRadius: '50%', background: A.c, opacity: 0.15, filter: 'blur(80px)' }} />

        <div style={{ padding: '90px 90px', position: 'relative' }}>
          <div style={{ fontSize: 24, color: A.c, textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, marginBottom: 18 }}>● Record Personal ●</div>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 0.95, marginBottom: 10 }}>{ex.name}</div>
          <div style={{ fontSize: 24, color: `${A.ink}80`, marginBottom: 60 }}>{ex.group}{ex.equipment ? ` · ${equipmentLabel(ex.equipment)}` : ''} · {totalSessions} sesiones registradas</div>

          {/* Hero PR number */}
          {isStrength && best ? (
            <div style={{ textAlign: 'center', padding: '30px 0 20px' }}>
              <div style={{ fontSize: 300, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.85, color: A.c, fontVariantNumeric: 'tabular-nums' }}>
                {kgToDisplay(best.weight, unit)}
              </div>
              <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-0.02em', marginTop: -10, marginBottom: 8 }}>
                {unitLabel(unit)} × {best.reps} reps
              </div>
              <div style={{ display: 'inline-flex', gap: 16, padding: '16px 28px', background: `${A.c}18`, borderRadius: 999, border: `2px solid ${A.c}40` }}>
                <span style={{ fontSize: 22, color: `${A.ink}90`, fontWeight: 600 }}>e1RM estimado</span>
                <span style={{ fontSize: 22, color: A.c, fontWeight: 800 }}>{kgToDisplay(best.e1rm, unit)} {unitLabel(unit)}</span>
              </div>
              <div style={{ fontSize: 22, color: `${A.ink}60`, marginTop: 22, letterSpacing: '0.08em' }}>
                {fmtDate(best.date, { long: true })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 220, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.85, color: A.c }}>
                {totalSessions}
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, marginTop: 4 }}>sesiones</div>
              <div style={{ fontSize: 22, color: `${A.ink}60`, marginTop: 14 }}>{kgToDisplay(totalVolumeKg, unit).toLocaleString('es-MX')} {unitLabel(unit)} de volumen acumulado</div>
            </div>
          )}

          {/* PR timeline */}
          <div style={{ marginTop: 70, borderTop: `2px solid ${A.c}30`, paddingTop: 36 }}>
            <div style={{ fontSize: 22, color: A.c, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, marginBottom: 20 }}>
              Progresión de PRs
            </div>
            {prSeries.length === 0 ? (
              <div style={{ fontSize: 24, color: `${A.ink}60` }}>Aún sin records registrados.</div>
            ) : prSeries.slice(-5).map((p, i) => {
              const isLast = i === prSeries.slice(-5).length - 1;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: isLast ? 'none' : `1px dotted ${A.c}20` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: isLast ? '#FBBF24' : A.c, boxShadow: isLast ? '0 0 24px #FBBF24' : 'none' }} />
                    <span style={{ fontSize: 24, color: `${A.ink}90` }}>{fmtDate(p.date)}</span>
                  </div>
                  <span style={{ fontSize: 28, fontWeight: 800, color: isLast ? '#FBBF24' : A.c, fontVariantNumeric: 'tabular-nums' }}>
                    {isStrength ? `${kgToDisplay(p.topWeight, unit)} ${unitLabel(unit)} × ${p.topReps || ''}`.trim() : `${kgToDisplay(p.volume, unit).toLocaleString('es-MX')} ${unitLabel(unit)}`}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ position: 'absolute', bottom: 70, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: `${A.ink}60`, fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            <span>GymTracker</span>
            <span>@GymTracker</span>
          </div>
        </div>
      </div>
    );
  }

  // timeline — minimalista con barras por sesión
  const yKey = isStrength ? 'topE1rm' : 'volume';
  const maxVal = Math.max(...series.map(p => p[yKey] || 0), 1);
  const bars = series.slice(-24);

  return (
    <div style={{ ...base, background: A.bg2, padding: 120 }}>
      <div style={{ fontSize: 22, color: A.c, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, marginBottom: 50 }}>
        Progreso · {ex.group}{ex.equipment ? ` · ${equipmentLabel(ex.equipment)}` : ''}
      </div>
      <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.9, marginBottom: 24 }}>
        {ex.name}
      </div>

      {isStrength && best ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginBottom: 60 }}>
          <div style={{ fontSize: 140, fontWeight: 800, letterSpacing: '-0.04em', color: A.c, lineHeight: 1 }}>
            {kgToDisplay(best.weight, unit)}
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{unitLabel(unit)} × {best.reps}</div>
            <div style={{ fontSize: 22, color: `${A.ink}60`, marginTop: 6 }}>mejor serie</div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontSize: 140, fontWeight: 800, letterSpacing: '-0.04em', color: A.c, lineHeight: 1 }}>
            {totalSessions}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>sesiones</div>
        </div>
      )}

      {/* Bar chart */}
      <div style={{ borderTop: `2px solid ${A.c}40`, borderBottom: `2px solid ${A.c}40`, padding: '40px 0', marginBottom: 50 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 320 }}>
          {bars.map((p, i) => {
            const h = Math.max(8, ((p[yKey] || 0) / maxVal) * 320);
            const isPR = prDates.has(p.date);
            return (
              <div key={i} style={{
                flex: 1, height: h,
                background: isPR ? '#FBBF24' : A.c,
                opacity: isPR ? 1 : 0.8,
                borderRadius: '6px 6px 0 0',
              }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 20, color: `${A.ink}60` }}>
          <span>{fmtDate(bars[0]?.date || '')}</span>
          <span>Últimas {bars.length} sesiones</span>
          <span>{fmtDate(bars[bars.length - 1]?.date || '')}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 30 }}>
        <div>
          <div style={{ fontSize: 18, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Sesiones</div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>{totalSessions}</div>
        </div>
        <div>
          <div style={{ fontSize: 18, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>PRs</div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, color: '#FBBF24' }}>{prDates.size}</div>
        </div>
        <div>
          <div style={{ fontSize: 18, color: `${A.ink}60`, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Volumen</div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>
            {kgToDisplay(totalVolumeKg / 1000, unit).toFixed(1)}<span style={{ fontSize: 24, color: `${A.ink}60`, marginLeft: 4 }}>t</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 100, left: 120, right: 120, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: `${A.ink}40`, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 }}>
        <span>GymTracker</span>
        <span>@GymTracker</span>
      </div>
    </div>
  );
}

function accent_key(A) { return (A.c || '').replace(/[^a-z0-9]/gi, ''); }

function ExStat({ label, value, unit, A, big }) {
  return (
    <div>
      <div style={{ fontSize: 20, color: `${A.ink}70`, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: big ? 82 : 60, fontWeight: 800, letterSpacing: '-0.03em', color: A.c, lineHeight: 1 }}>{value}</div>
        {unit && <div style={{ fontSize: 22, color: `${A.ink}60`, fontWeight: 600, letterSpacing: '0.08em' }}>{unit}</div>}
      </div>
    </div>
  );
}

// ---------- Canvas renderer for exercise poster ----------
function drawExercisePoster(ctx, W, H, d) {
  const {
    ex, series, recentSets, best, prDates,
    totalSessions, totalVolumeKg, totalReps, totalSetsCount,
    deltaPct, A, variant, unit,
  } = d;
  const isStrength = ex.kind === 'strength';
  const font = (s, w = 400) => `${w} ${s}px Inter, system-ui, sans-serif`;
  const setFill = (c) => { ctx.fillStyle = c; };

  ctx.textBaseline = 'top';

  if (variant === 'progress') {
    // bg
    const g = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, W * 1.1);
    g.addColorStop(0, A.bg1); g.addColorStop(1, A.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // blob
    ctx.save(); ctx.globalAlpha = 0.2;
    const rg = ctx.createRadialGradient(W - 120, 120, 0, W - 120, 120, 600);
    rg.addColorStop(0, A.c); rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 900);
    ctx.restore();

    // logo
    const lx = 90, ly = 90;
    const lg = ctx.createLinearGradient(lx, ly, lx + 64, ly + 64);
    lg.addColorStop(0, A.c); lg.addColorStop(1, A.c2);
    ctx.fillStyle = lg; roundRect(ctx, lx, ly, 64, 64, 16, true);
    setFill('#05222a'); ctx.font = font(28, 800); ctx.fillText('GT', lx + 12, ly + 16);
    setFill(A.ink); ctx.font = font(30, 700); ctx.fillText('GymTracker', lx + 82, ly + 5);
    setFill(A.c); ctx.font = font(20, 600); ctx.fillText('PROGRESO', lx + 82, ly + 42);

    // group + name + sub
    let y = 230;
    setFill(A.c); ctx.font = font(28, 600); ctx.fillText(ex.group.toUpperCase(), 90, y);
    y += 46;
    setFill(A.ink); ctx.font = font(84, 800);
    wrapText(ctx, ex.name, 90, y, W - 180, 90);
    y += 90 * Math.max(1, countLines(ctx, ex.name, W - 180)) + 8;
    setFill(A.ink + '80'); ctx.font = font(24, 500);
    const subtitle = `${isStrength ? 'Evolución de tu e1RM' : 'Volumen por sesión'}${ex.equipment ? ` · ${equipmentLabel(ex.equipment)}` : ''} · ${totalSessions} sesiones`;
    ctx.fillText(subtitle, 90, y);
    y += 60;

    // chart card
    const cardX = 90, cardY = y, cardW = W - 180, cardH = 720;
    ctx.fillStyle = A.ink + '14'; roundRect(ctx, cardX, cardY, cardW, cardH, 28, true);
    ctx.strokeStyle = A.c + '30'; ctx.lineWidth = 2; roundRect(ctx, cardX, cardY, cardW, cardH, 28, false, true);

    setFill(A.ink + 'B0'); ctx.font = font(22, 600);
    ctx.fillText((isStrength ? 'E1RM · ' : 'VOLUMEN · ') + unitLabel(unit).toUpperCase(), cardX + 40, cardY + 40);

    if (isStrength && deltaPct !== 0) {
      ctx.textAlign = 'right';
      setFill(deltaPct > 0 ? A.c : '#F87171'); ctx.font = font(28, 800);
      ctx.fillText((deltaPct > 0 ? '+' : '') + deltaPct + '%', cardX + cardW - 40, cardY + 36);
      ctx.textAlign = 'left';
    }

    // chart area
    const chX = cardX + 40, chY = cardY + 110, chW = cardW - 80, chH = cardH - 200;
    const yKey = isStrength ? 'topE1rm' : 'volume';
    const { coords } = sparkGeom(series, yKey, chW, chH, 0, 0);

    // grid
    ctx.strokeStyle = A.c + '18'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = chY + (i / 4) * chH;
      ctx.beginPath(); ctx.moveTo(chX, yy); ctx.lineTo(chX + chW, yy); ctx.stroke();
    }

    // area fill
    if (coords.length > 1) {
      const grad = ctx.createLinearGradient(0, chY, 0, chY + chH);
      grad.addColorStop(0, A.c + '75'); grad.addColorStop(1, A.c + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(chX + coords[0].x, chY + coords[0].y);
      for (let i = 1; i < coords.length; i++) ctx.lineTo(chX + coords[i].x, chY + coords[i].y);
      ctx.lineTo(chX + coords[coords.length - 1].x, chY + chH);
      ctx.lineTo(chX + coords[0].x, chY + chH);
      ctx.closePath(); ctx.fill();
    }
    // line
    if (coords.length > 0) {
      ctx.strokeStyle = A.c; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      coords.forEach((c, i) => { const px = chX + c.x, py = chY + c.y; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      ctx.stroke();
    }
    // points
    coords.forEach(c => {
      const isPR = prDates.has(c.p.date);
      ctx.fillStyle = isPR ? '#FBBF24' : A.c;
      ctx.beginPath(); ctx.arc(chX + c.x, chY + c.y, isPR ? 12 : 7, 0, Math.PI * 2); ctx.fill();
      if (isPR) {
        ctx.strokeStyle = '#FBBF2488'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(chX + c.x, chY + c.y, 14, 0, Math.PI * 2); ctx.stroke();
      }
    });

    // chart date range
    setFill(A.ink + '60'); ctx.font = font(20, 500);
    ctx.fillText(fmtDate(series[0]?.date || ''), cardX + 40, cardY + cardH - 50);
    ctx.textAlign = 'right';
    ctx.fillText(fmtDate(series[series.length - 1]?.date || ''), cardX + cardW - 40, cardY + cardH - 50);
    ctx.textAlign = 'left';

    y = cardY + cardH + 50;

    // stats grid
    const stats = isStrength ? [
      { l: 'MEJOR PESO', v: best ? String(kgToDisplay(best.weight, unit)) : '—', u: best ? `${unitLabel(unit)} × ${best.reps}` : '', big: true },
      { l: 'E1RM MÁXIMO', v: best ? String(kgToDisplay(best.e1rm, unit)) : '—', u: unitLabelUpper(unit), big: true },
      { l: 'SESIONES', v: String(totalSessions), u: '' },
      { l: 'SERIES TOTALES', v: String(totalSetsCount), u: '' },
    ] : [
      { l: 'SESIONES', v: String(totalSessions), u: '', big: true },
      { l: 'SERIES', v: String(totalSetsCount), u: '', big: true },
      { l: 'REPS TOTALES', v: String(totalReps), u: '' },
      { l: 'VOLUMEN', v: kgToDisplay(totalVolumeKg, unit).toLocaleString('es-MX'), u: unitLabelUpper(unit) },
    ];
    for (let i = 0; i < stats.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const sx = 90 + col * ((W - 180) / 2);
      const sy = y + row * 150;
      const s = stats[i];
      setFill(A.ink + 'B0'); ctx.font = font(20, 600); ctx.fillText(s.l, sx, sy);
      setFill(A.c); ctx.font = font(s.big ? 82 : 60, 800);
      ctx.fillText(s.v, sx, sy + 30);
      if (s.u) {
        const num = ctx.measureText(s.v).width;
        setFill(A.ink + '90'); ctx.font = font(22, 600);
        ctx.fillText(s.u, sx + num + 12, sy + (s.big ? 80 : 62));
      }
    }

    // footer
    setFill(A.ink + '60'); ctx.font = font(20, 600);
    ctx.fillText('@GymTracker', 90, H - 110);
    ctx.textAlign = 'right';
    ctx.fillText('● PUNTOS DORADOS = PR', W - 90, H - 110);
    ctx.textAlign = 'left';
    return;
  }

  if (variant === 'record') {
    ctx.fillStyle = A.bg2; ctx.fillRect(0, 0, W, H);
    // stripe
    const top = ctx.createLinearGradient(0, 0, 0, 520);
    top.addColorStop(0, A.bg1); top.addColorStop(1, A.bg2);
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 520);
    // blob
    ctx.save(); ctx.globalAlpha = 0.25;
    const rg = ctx.createRadialGradient(80, 120, 0, 80, 120, 520);
    rg.addColorStop(0, A.c); rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 900);
    ctx.restore();

    // header
    setFill(A.c); ctx.font = font(24, 700);
    ctx.fillText('● RECORD PERSONAL ●', 90, 110);
    setFill(A.ink); ctx.font = font(72, 800);
    wrapText(ctx, ex.name, 90, 155, W - 180, 80);
    const nameLines = countLines(ctx, ex.name, W - 180);
    setFill(A.ink + '80'); ctx.font = font(24, 500);
    ctx.fillText(`${ex.group}${ex.equipment ? ` · ${equipmentLabel(ex.equipment)}` : ''} · ${totalSessions} sesiones registradas`, 90, 155 + nameLines * 80 + 12);

    // hero number
    let hy = 155 + nameLines * 80 + 90;
    ctx.textAlign = 'center';
    if (isStrength && best) {
      setFill(A.c); ctx.font = font(300, 800);
      ctx.fillText(String(kgToDisplay(best.weight, unit)), W / 2, hy);
      setFill(A.ink); ctx.font = font(60, 700);
      ctx.fillText(`${unitLabel(unit)} × ${best.reps} reps`, W / 2, hy + 260);

      // pill
      const pillW = 640, pillH = 72, pillX = (W - pillW) / 2, pillY = hy + 340;
      ctx.fillStyle = A.c + '20'; roundRect(ctx, pillX, pillY, pillW, pillH, 999, true);
      ctx.strokeStyle = A.c + '55'; ctx.lineWidth = 3; roundRect(ctx, pillX, pillY, pillW, pillH, 999, false, true);
      setFill(A.ink + 'B0'); ctx.font = font(22, 600);
      ctx.fillText(`e1RM estimado · ${kgToDisplay(best.e1rm, unit)} ${unitLabel(unit)}`, W / 2, pillY + 22);

      setFill(A.ink + '70'); ctx.font = font(22, 500);
      ctx.fillText(fmtDate(best.date, { long: true }).toUpperCase(), W / 2, pillY + pillH + 30);
      hy = pillY + pillH + 90;
    } else {
      setFill(A.c); ctx.font = font(220, 800);
      ctx.fillText(String(totalSessions), W / 2, hy);
      setFill(A.ink); ctx.font = font(48, 700);
      ctx.fillText('sesiones', W / 2, hy + 200);
      setFill(A.ink + '70'); ctx.font = font(22, 500);
      ctx.fillText(`${kgToDisplay(totalVolumeKg, unit).toLocaleString('es-MX')} ${unitLabel(unit)} de volumen acumulado`, W / 2, hy + 260);
      hy = hy + 340;
    }
    ctx.textAlign = 'left';

    // PR timeline
    const prSeries = series.filter(p => prDates.has(p.date)).slice(-5);
    const tlY = Math.min(hy + 40, H - 520);
    ctx.strokeStyle = A.c + '30'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(90, tlY); ctx.lineTo(W - 90, tlY); ctx.stroke();
    setFill(A.c); ctx.font = font(22, 700);
    ctx.fillText('PROGRESIÓN DE PRS', 90, tlY + 36);

    let ey = tlY + 90;
    if (prSeries.length === 0) {
      setFill(A.ink + '60'); ctx.font = font(24, 500);
      ctx.fillText('Aún sin records registrados.', 90, ey);
    } else {
      prSeries.forEach((p, i) => {
        const isLast = i === prSeries.length - 1;
        // dot
        ctx.fillStyle = isLast ? '#FBBF24' : A.c;
        ctx.beginPath(); ctx.arc(108, ey + 16, 8, 0, Math.PI * 2); ctx.fill();
        if (isLast) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(108, ey + 16, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }

        setFill(A.ink + 'B0'); ctx.font = font(24, 500);
        ctx.fillText(fmtDate(p.date), 140, ey + 4);

        const val = isStrength
          ? `${kgToDisplay(p.topWeight, unit)} ${unitLabel(unit)} × ${p.topReps || ''}`.trim()
          : `${kgToDisplay(p.volume, unit).toLocaleString('es-MX')} ${unitLabel(unit)}`;
        ctx.textAlign = 'right';
        setFill(isLast ? '#FBBF24' : A.c); ctx.font = font(28, 800);
        ctx.fillText(val, W - 90, ey);
        ctx.textAlign = 'left';
        ey += 60;
      });
    }

    // footer
    setFill(A.ink + '60'); ctx.font = font(20, 600);
    ctx.fillText('GYMTRACKER', 90, H - 110);
    ctx.textAlign = 'right';
    ctx.fillText('@GymTracker', W - 90, H - 110);
    ctx.textAlign = 'left';
    return;
  }

  // timeline
  ctx.fillStyle = A.bg2; ctx.fillRect(0, 0, W, H);
  setFill(A.c); ctx.font = font(22, 700);
  ctx.fillText(`PROGRESO · ${ex.group.toUpperCase()}${ex.equipment ? ` · ${equipmentLabel(ex.equipment).toUpperCase()}` : ''}`, 120, 120);
  setFill(A.ink); ctx.font = font(110, 800);
  wrapText(ctx, ex.name, 120, 180, W - 240, 110);
  const nameLines = countLines(ctx, ex.name, W - 240);
  let y = 180 + nameLines * 110 + 30;

  if (isStrength && best) {
    setFill(A.c); ctx.font = font(140, 800);
    ctx.fillText(String(kgToDisplay(best.weight, unit)), 120, y);
    const numW = ctx.measureText(String(kgToDisplay(best.weight, unit))).width;
    setFill(A.ink); ctx.font = font(36, 700);
    ctx.fillText(`${unitLabel(unit)} × ${best.reps}`, 140 + numW, y + 30);
    setFill(A.ink + '60'); ctx.font = font(22, 500);
    ctx.fillText('mejor serie', 140 + numW, y + 80);
    y += 190;
  } else {
    setFill(A.c); ctx.font = font(140, 800);
    ctx.fillText(String(totalSessions), 120, y);
    setFill(A.ink); ctx.font = font(36, 700);
    const numW = ctx.measureText(String(totalSessions)).width;
    ctx.fillText('sesiones', 140 + numW, y + 60);
    y += 190;
  }

  // bar chart
  ctx.strokeStyle = A.c + '40'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(120, y); ctx.lineTo(W - 120, y); ctx.stroke();
  const chartY = y + 40, chartH = 320;
  const yKey = isStrength ? 'topE1rm' : 'volume';
  const bars = series.slice(-24);
  const maxV = Math.max(...bars.map(p => p[yKey] || 0), 1);
  const availW = W - 240, gap = 10;
  const barW = Math.max(4, (availW - gap * (bars.length - 1)) / Math.max(bars.length, 1));
  bars.forEach((p, i) => {
    const bh = Math.max(8, ((p[yKey] || 0) / maxV) * chartH);
    const bx = 120 + i * (barW + gap);
    const by = chartY + chartH - bh;
    const isPR = prDates.has(p.date);
    ctx.fillStyle = isPR ? '#FBBF24' : A.c;
    ctx.globalAlpha = isPR ? 1 : 0.8;
    roundRect(ctx, bx, by, barW, bh, 6, true);
    ctx.globalAlpha = 1;
  });
  ctx.beginPath(); ctx.moveTo(120, chartY + chartH + 20); ctx.lineTo(W - 120, chartY + chartH + 20); ctx.stroke();
  setFill(A.ink + '60'); ctx.font = font(20, 500);
  ctx.fillText(fmtDate(bars[0]?.date || ''), 120, chartY + chartH + 36);
  ctx.textAlign = 'center';
  ctx.fillText(`Últimas ${bars.length} sesiones`, W / 2, chartY + chartH + 36);
  ctx.textAlign = 'right';
  ctx.fillText(fmtDate(bars[bars.length - 1]?.date || ''), W - 120, chartY + chartH + 36);
  ctx.textAlign = 'left';

  y = chartY + chartH + 100;

  // stats
  const colW = (W - 240) / 3;
  const stats = [
    { l: 'SESIONES', v: String(totalSessions), color: A.ink },
    { l: 'PRS', v: String(prDates.size), color: '#FBBF24' },
    { l: 'VOLUMEN', v: (totalVolumeKg / 1000).toFixed(1), u: 't', color: A.ink },
  ];
  stats.forEach((s, i) => {
    const cx = 120 + colW * i;
    setFill(A.ink + '60'); ctx.font = font(20, 600); ctx.fillText(s.l, cx, y);
    setFill(s.color); ctx.font = font(56, 800); ctx.fillText(s.v, cx, y + 30);
    if (s.u) {
      const num = ctx.measureText(s.v).width;
      setFill(A.ink + '60'); ctx.font = font(24, 500);
      ctx.fillText(s.u, cx + num + 8, y + 62);
    }
  });

  // footer
  setFill(A.ink + '40'); ctx.font = font(22, 600);
  ctx.fillText('GYMTRACKER', 120, H - 150);
  ctx.textAlign = 'right';
  ctx.fillText('@GymTracker', W - 120, H - 150);
  ctx.textAlign = 'left';
}

// =========================================================================
// ShareStatsCardModal — comparte una gráfica de estadísticas
// =========================================================================

function StatsPosterHTML({ chartType, A, chartTitle, rangeLabel, totalVol, totalSets, avgDur, unit, groupList, maxG, sparkPoints, radarGroups, maxRadar }) {
  const base = { width: 1080, height: 1920, fontFamily: 'Inter, sans-serif', color: A.ink, position: 'relative', overflow: 'hidden' };

  const SparkSVG = () => {
    if (!sparkPoints || sparkPoints.length < 2) return (
      <div style={{ height: 460, display: 'grid', placeItems: 'center', color: A.ink + '40', fontSize: 28 }}>Sin datos</div>
    );
    const sw = 900, sh = 460;
    const { coords } = sparkGeom(sparkPoints, 'y', sw, sh, 30, 30);
    const path = pathFromCoords(coords);
    const area = path + ` L ${coords[coords.length - 1].x} ${sh - 10} L ${coords[0].x} ${sh - 10} Z`;
    const gid = `sps-${accent_key(A)}`;
    return (
      <svg width={sw} height={sh} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={A.c} stopOpacity="0.45" />
            <stop offset="100%" stopColor={A.c} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={30} x2={sw - 30} y1={30 + t * (sh - 60)} y2={30 + t * (sh - 60)} stroke={A.c + '18'} strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={A.c} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={5} fill={A.c} />)}
      </svg>
    );
  };

  const RadarSVG = () => {
    const n = radarGroups.length;
    if (n < 2) return (
      <div style={{ height: 460, display: 'grid', placeItems: 'center', color: A.ink + '40', fontSize: 28 }}>Sin datos</div>
    );
    const rcx = 450, rcy = 260, rr = 200;
    const ang = i => (i / n) * 2 * Math.PI - Math.PI / 2;
    const pts = radarGroups.map(([g, v], i) => ({
      x: rcx + Math.cos(ang(i)) * rr * (v / maxRadar),
      y: rcy + Math.sin(ang(i)) * rr * (v / maxRadar),
      lx: rcx + Math.cos(ang(i)) * (rr + 42),
      ly: rcy + Math.sin(ang(i)) * (rr + 42),
      g,
    }));
    const poly = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
    return (
      <svg width={900} height={540} style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75, 1].map((t, gi) => {
          const gp = radarGroups.map((_, i) => `${i === 0 ? 'M' : 'L'}${(rcx + Math.cos(ang(i)) * rr * t).toFixed(1)},${(rcy + Math.sin(ang(i)) * rr * t).toFixed(1)}`).join(' ') + 'Z';
          return <path key={gi} d={gp} fill="none" stroke={A.c + '22'} strokeWidth="1" />;
        })}
        {radarGroups.map((_, i) => (
          <line key={i} x1={rcx} y1={rcy} x2={(rcx + Math.cos(ang(i)) * rr).toFixed(1)} y2={(rcy + Math.sin(ang(i)) * rr).toFixed(1)} stroke={A.c + '22'} strokeWidth="1" />
        ))}
        <path d={poly} fill={A.c + '30'} stroke={A.c} strokeWidth="3" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={7} fill={A.c} />)}
        {pts.map((p, i) => (
          <text key={i} x={p.lx} y={p.ly} fill={A.ink + '90'} fontSize="18" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">{p.g}</text>
        ))}
      </svg>
    );
  };

  return (
    <div style={{ ...base, background: `radial-gradient(circle at 30% 0%, ${A.bg1}, ${A.bg2} 65%)` }}>
      <div style={{ position: 'absolute', top: -200, right: -200, width: 700, height: 700, borderRadius: '50%', background: A.c, opacity: 0.12, filter: 'blur(60px)' }} />
      <div style={{ padding: '80px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 50 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${A.c}, ${A.c2})`, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 28, color: '#05222a' }}>GT</div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>GymTracker</div>
            <div style={{ fontSize: 20, color: A.c, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>Estadísticas</div>
          </div>
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 16 }}>{chartTitle}</div>
        <div style={{ fontSize: 26, color: A.c, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600, marginBottom: 50 }}>{rangeLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 50, background: A.c + '18', borderRadius: 22, padding: '28px 16px', border: `1px solid ${A.c}30` }}>
          {[
            { l: 'Volumen', v: (totalVol / 1000).toFixed(1), u: 't' },
            { l: 'Series', v: String(totalSets) },
            { l: 'Dur. prom.', v: String(avgDur), u: 'min' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: A.ink + '70', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>{s.l}</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: A.c, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.v}<span style={{ fontSize: 22, fontWeight: 600 }}>{s.u || ''}</span></div>
            </div>
          ))}
        </div>
        <div style={{ background: A.bg2 + 'BB', borderRadius: 24, padding: '36px 40px', border: `1px solid ${A.c}25`, overflow: 'hidden' }}>
          {chartType === 'radar' ? <RadarSVG /> : chartType === 'progress' ? <SparkSVG /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {groupList.slice(0, 10).map(([g, v]) => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 130, fontSize: 20, color: A.ink, fontWeight: 600, flexShrink: 0 }}>{g}</div>
                  <div style={{ flex: 1, height: 18, background: A.bg1, borderRadius: 999 }}>
                    <div style={{ height: '100%', width: `${(v / maxG) * 100}%`, background: groupColor(g), borderRadius: 999 }} />
                  </div>
                  <div style={{ width: 110, textAlign: 'right', fontSize: 18, color: A.c, fontWeight: 700 }}>
                    {kgToDisplay(v, unit).toLocaleString('es-MX')} {unitLabel(unit)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 70, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', color: A.ink + '60', fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        <span>@GymTracker</span>
        <span>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

function drawStatsPoster(ctx, W, H, d) {
  const { chartType, chartTitle, rangeLabel, groupList, maxG, totalVol, totalSets, avgDur, unit, A, sparkPoints, radarGroups, maxRadar } = d;

  const grad = ctx.createRadialGradient(W * 0.3, 0, 0, W * 0.3, 0, W);
  grad.addColorStop(0, A.bg1); grad.addColorStop(1, A.bg2);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  ctx.save(); ctx.globalAlpha = 0.12;
  const rg = ctx.createRadialGradient(W - 100, 100, 0, W - 100, 100, 600);
  rg.addColorStop(0, A.c); rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 900);
  ctx.restore();

  ctx.textBaseline = 'top';
  const font = (s, w = 400) => `${w} ${s}px Inter, system-ui, sans-serif`;
  const setFill = c => { ctx.fillStyle = c; };

  const lx = 90, ly = 90;
  const lg = ctx.createLinearGradient(lx, ly, lx + 64, ly + 64);
  lg.addColorStop(0, A.c); lg.addColorStop(1, A.c2);
  ctx.fillStyle = lg; roundRect(ctx, lx, ly, 64, 64, 16, true);
  setFill('#05222a'); ctx.font = font(28, 800); ctx.fillText('GT', lx + 12, ly + 16);
  setFill(A.ink); ctx.font = font(30, 700); ctx.fillText('GymTracker', lx + 82, ly + 5);
  setFill(A.c); ctx.font = font(20, 600); ctx.fillText('ESTADÍSTICAS', lx + 82, ly + 42);

  let y = 230;
  setFill(A.ink); ctx.font = font(68, 800);
  wrapText(ctx, chartTitle, 90, y, W - 180, 80);
  y += 80 + 20;
  setFill(A.c); ctx.font = font(26, 600); ctx.fillText(rangeLabel.toUpperCase(), 90, y);
  y += 66;

  ctx.fillStyle = A.c + '25'; roundRect(ctx, 90, y, W - 180, 130, 22, true);
  const colW = (W - 180) / 3;
  ctx.textAlign = 'center';
  [{ l: 'VOLUMEN', v: (totalVol / 1000).toFixed(1) + 't' }, { l: 'SERIES', v: String(totalSets) }, { l: 'DUR. PROM.', v: avgDur + 'min' }].forEach((s, i) => {
    const cx = 90 + colW * i + colW / 2;
    setFill(A.ink + '70'); ctx.font = font(18, 600); ctx.fillText(s.l, cx, y + 18);
    setFill(A.c); ctx.font = font(50, 800); ctx.fillText(s.v, cx, y + 46);
  });
  ctx.textAlign = 'left';
  y += 160;

  const chartAreaH = 820;
  ctx.fillStyle = A.bg2 + 'BB'; roundRect(ctx, 90, y, W - 180, chartAreaH, 24, true);
  ctx.strokeStyle = A.c + '25'; ctx.lineWidth = 2; roundRect(ctx, 90, y, W - 180, chartAreaH, 24, false, true);

  const cx0 = 90 + 40, cy0 = y + 40, chartW0 = W - 180 - 80, chartH0 = chartAreaH - 80;

  if (chartType === 'dist') {
    const n = Math.min(groupList.length, 12);
    const rowH = Math.min(60, chartH0 / Math.max(n, 1));
    let by = cy0;
    groupList.slice(0, n).forEach(([g, v]) => {
      setFill(A.ink + '90'); ctx.font = font(20, 600); ctx.fillText(g, cx0, by + 6);
      const bx = cx0 + 145, bw = chartW0 - 145 - 110;
      ctx.fillStyle = A.bg1; ctx.beginPath(); ctx.rect(bx, by, bw, 22); ctx.fill();
      const fw = Math.max((v / maxG) * bw, 4);
      ctx.fillStyle = groupColor(g); ctx.beginPath(); ctx.rect(bx, by, fw, 22); ctx.fill();
      setFill(A.ink + '80'); ctx.font = font(18, 600); ctx.textAlign = 'right';
      ctx.fillText(`${kgToDisplay(v, unit).toLocaleString('es-MX')} ${unitLabel(unit)}`, cx0 + chartW0, by + 18);
      ctx.textAlign = 'left';
      by += rowH;
    });
  } else if (chartType === 'progress' && sparkPoints && sparkPoints.length > 1) {
    const vals = sparkPoints.map(p => p.y);
    const mn = Math.min(...vals), mx = Math.max(...vals, mn + 1);
    const span = mx - mn;
    const coords = sparkPoints.map((p, i) => ({
      x: cx0 + (i / (sparkPoints.length - 1)) * chartW0,
      y: cy0 + chartH0 - ((p.y - mn) / span) * (chartH0 - 20) - 10,
    }));
    ctx.strokeStyle = A.c + '18'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = cy0 + (i / 4) * chartH0;
      ctx.beginPath(); ctx.moveTo(cx0, yy); ctx.lineTo(cx0 + chartW0, yy); ctx.stroke();
    }
    const agrad = ctx.createLinearGradient(0, cy0, 0, cy0 + chartH0);
    agrad.addColorStop(0, A.c + '70'); agrad.addColorStop(1, A.c + '00');
    ctx.fillStyle = agrad;
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].x, coords[i].y);
    ctx.lineTo(coords[coords.length - 1].x, cy0 + chartH0);
    ctx.lineTo(coords[0].x, cy0 + chartH0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A.c; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    coords.forEach((c, i) => i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y));
    ctx.stroke();
    ctx.fillStyle = A.c;
    coords.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill(); });
  } else if (chartType === 'radar' && radarGroups && radarGroups.length > 1) {
    const n = radarGroups.length;
    const rcx = cx0 + chartW0 / 2, rcy = cy0 + chartH0 / 2;
    const rr = Math.min(chartW0, chartH0) / 2 - 70;
    const ang = i => (i / n) * 2 * Math.PI - Math.PI / 2;
    ctx.strokeStyle = A.c + '22'; ctx.lineWidth = 1;
    for (const t of [0.25, 0.5, 0.75, 1]) {
      ctx.beginPath();
      radarGroups.forEach((_, i) => {
        const x = rcx + Math.cos(ang(i)) * rr * t, yy = rcy + Math.sin(ang(i)) * rr * t;
        i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      });
      ctx.closePath(); ctx.stroke();
    }
    radarGroups.forEach((_, i) => {
      ctx.beginPath(); ctx.moveTo(rcx, rcy);
      ctx.lineTo(rcx + Math.cos(ang(i)) * rr, rcy + Math.sin(ang(i)) * rr);
      ctx.stroke();
    });
    const pts = radarGroups.map(([g, v], i) => ({
      x: rcx + Math.cos(ang(i)) * rr * (v / maxRadar),
      y: rcy + Math.sin(ang(i)) * rr * (v / maxRadar),
      lx: rcx + Math.cos(ang(i)) * (rr + 48),
      ly: rcy + Math.sin(ang(i)) * (rr + 48),
      g,
    }));
    ctx.fillStyle = A.c + '35';
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A.c; ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath(); ctx.stroke();
    pts.forEach(p => {
      ctx.fillStyle = A.c; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
      setFill(A.ink + 'A0'); ctx.font = font(18, 600); ctx.textAlign = 'center';
      ctx.fillText(p.g, p.lx, p.ly); ctx.textAlign = 'left';
    });
  }

  setFill(A.ink + '60'); ctx.font = font(20, 600);
  ctx.fillText('@GymTracker', 90, H - 110);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase(), W - 90, H - 110);
  ctx.textAlign = 'left';
}

function ShareStatsCardModal({ chartType, chartTitle, rangeLabel, rangedSessions, groupList, maxG, totalVol, totalSets, avgDur, exMap, progMetric, progGroup, state, onClose }) {
  const unit = state.weightUnit || 'kg';
  const [accent, setAccent] = React.useState(() => state.accentKey || 'teal');
  const [exporting, setExporting] = React.useState(false);

  const ACCENTS_ST = {
    teal:   { bg1: '#0A1D24', bg2: '#0A0D12', c: '#2FB4C8', c2: '#1EA2B8', ink: '#E8FBFF' },
    amber:  { bg1: '#251604', bg2: '#0A0D12', c: '#FBBF24', c2: '#F59E0B', ink: '#FFF7E6' },
    violet: { bg1: '#1B1033', bg2: '#0A0D12', c: '#A78BFA', c2: '#8B5CF6', ink: '#F1ECFF' },
    rose:   { bg1: '#2B0910', bg2: '#0A0D12', c: '#F87171', c2: '#EF4444', ink: '#FFECEC' },
    green:  { bg1: '#0A1F14', bg2: '#0A0D12', c: '#34D399', c2: '#10B981', ink: '#EDFFF5' },
  };
  const A = ACCENTS_ST[accent];
  const W = 1080, H = 1920;
  const previewScale = 0.32;

  const progSessions = React.useMemo(() => {
    if (progGroup === 'all') return rangedSessions;
    return rangedSessions
      .map(s => ({ ...s, blocks: s.blocks.filter(b => { const ex = exMap[b.exerciseId]; return ex && ex.group === progGroup; }) }))
      .filter(s => s.blocks.length > 0);
  }, [rangedSessions, progGroup, exMap]);

  const sparkPoints = React.useMemo(() =>
    [...progSessions].sort((a, b) => a.date.localeCompare(b.date)).map(s => ({
      y: progMetric === 'volume' ? sessionVolume(s) : progMetric === 'duration' ? sessionDuration(s) : s.blocks.reduce((n, b) => n + b.sets.length, 0),
      date: s.date,
    })), [progSessions, progMetric]);

  const progMetricLabel = progMetric === 'volume' ? 'Volumen' : progMetric === 'duration' ? 'Duración' : 'Series';
  const chartSub = chartType === 'progress'
    ? `${progMetricLabel}${progGroup !== 'all' ? ` · ${progGroup}` : ''} · ${rangeLabel}`
    : rangeLabel;

  const { radarGroups, maxRadar } = React.useMemo(() => {
    const byGroup = {};
    for (const s of rangedSessions) {
      for (const b of s.blocks) {
        const ex = exMap[b.exerciseId]; if (!ex) continue;
        let v = 0;
        for (const st of b.sets) if (st.done) v += (Number(st.weight) || 0) * (Number(st.reps) || 0);
        byGroup[ex.group] = (byGroup[ex.group] || 0) + v;
      }
    }
    const rg = Object.entries(byGroup).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { radarGroups: rg, maxRadar: Math.max(...rg.map(g => g[1]), 1) };
  }, [rangedSessions, exMap]);

  const filename = `gymtracker-estadisticas-${chartType}-${new Date().toISOString().slice(0, 10)}.png`;

  const buildBlob = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    drawStatsPoster(ctx, W, H, { chartType, chartTitle, rangeLabel: chartSub, groupList, maxG, totalVol, totalSets, avgDur, unit, A, sparkPoints, radarGroups, maxRadar });
    return new Promise(res => canvas.toBlob(res, 'image/png'));
  };

  const downloadPNG = async () => {
    setExporting(true);
    try {
      const blob = await buildBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { alert('No se pudo exportar: ' + e.message); }
    setExporting(false);
  };

  const shareNative = async () => {
    setExporting(true);
    try {
      const blob = await buildBlob();
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: chartTitle, text: `${chartTitle} · ${chartSub}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) { if (e.name !== 'AbortError') alert('No se pudo compartir: ' + e.message); }
    setExporting(false);
  };

  const copyPNG = async () => {
    setExporting(true);
    try {
      const blob = await buildBlob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Imagen copiada al portapapeles');
    } catch (e) { alert('Navegador no soporta copiar imagen. Usa Descargar.'); }
    setExporting(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-head">
          <div className="modal-title">Compartir · {chartTitle}</div>
          <button className="btn ghost sm" onClick={onClose}><I.X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: `${W * previewScale}px 1fr`, gap: 20 }} className="share-grid">
            <div style={{ width: W * previewScale, height: H * previewScale, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.55)', border: '1px solid var(--line-2)' }}>
              <div style={{ width: W, height: H, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                <StatsPosterHTML
                  chartType={chartType} A={A} chartTitle={chartTitle} rangeLabel={chartSub}
                  totalVol={totalVol} totalSets={totalSets} avgDur={avgDur} unit={unit}
                  groupList={groupList} maxG={maxG} sparkPoints={sparkPoints} radarGroups={radarGroups} maxRadar={maxRadar}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Color</label>
                <div className="tweak-swatches">
                  {Object.entries(ACCENTS_ST).map(([k, a]) => (
                    <button key={k} className={`tweak-sw ${accent === k ? 'active' : ''}`} style={{ background: a.c }} onClick={() => setAccent(k)} />
                  ))}
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn primary" onClick={shareNative} disabled={exporting}>
                  <I.Share size={14} /> {exporting ? 'Preparando…' : 'Compartir'}
                </button>
                <button className="btn secondary" onClick={downloadPNG} disabled={exporting}>
                  <I.Download size={14} /> Descargar PNG
                </button>
                <button className="btn ghost" onClick={copyPNG} disabled={exporting}>
                  <I.Copy size={14} /> Copiar imagen
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 4 }}>1080 × 1920 · optimizado para Instagram Stories.</div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 700px) {
          .share-grid { grid-template-columns: 1fr !important; }
          .share-grid > div:first-child { margin: 0 auto; }
        }
      `}</style>
    </div>
  );
}

// =========================================================================
// exportSessionPDF — opens a print-ready page with full session detail
// =========================================================================

function exportSessionPDF(sess, state) {
  const unit = state.weightUnit || 'kg';
  const exMap = Object.fromEntries(state.exercises.map(e => [e.id, e]));
  const prior = state.sessions.filter(x => x.date < sess.date || (x.date === sess.date && x.startedAt < sess.startedAt));

  const volume = sessionVolume(sess);
  const duration = sessionDuration(sess);
  const totalSets = sess.blocks.reduce((n, b) => n + b.sets.length, 0);
  const totalReps = sess.blocks.reduce((n, b) => n + b.sets.reduce((m, s) => m + (Number(s.reps) || 0), 0), 0);

  const sessionName = (() => {
    const groups = new Set();
    for (const b of sess.blocks) { const ex = exMap[b.exerciseId]; if (ex) groups.add(ex.group); }
    return sess.name || [...groups].slice(0, 3).join(' + ') || 'Sesión de entrenamiento';
  })();

  const dateStr = fmtDate(sess.date, { long: true });
  const startTime = sess.startedAt
    ? new Date(sess.startedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : '';

  const svgAttrs = `width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`;
  const EQUIP_SVG = {
    mancuernas: `<svg ${svgAttrs}><rect x="2" y="8" width="3" height="8" rx="0.5"/><rect x="5" y="10" width="2" height="4"/><path d="M7 12h10"/><rect x="17" y="10" width="2" height="4"/><rect x="19" y="8" width="3" height="8" rx="0.5"/></svg>`,
    barra:      `<svg ${svgAttrs}><path d="M2 12h2"/><rect x="4" y="6" width="3" height="12" rx="0.5"/><rect x="7" y="9" width="2" height="6"/><path d="M9 12h6"/><rect x="15" y="9" width="2" height="6"/><rect x="17" y="6" width="3" height="12" rx="0.5"/><path d="M20 12h2"/></svg>`,
    maquina:    `<svg ${svgAttrs}><rect x="4" y="3" width="7" height="18" rx="1"/><path d="M4 7h7M4 11h7M4 15h7"/><path d="M11 5h7M18 5v10"/><path d="M18 15l-4 5"/><rect x="12" y="19" width="5" height="2" rx="0.5"/></svg>`,
    calistenia: `<svg ${svgAttrs}><path d="M3 4h18"/><path d="M8 4v3M16 4v3"/><circle cx="12" cy="9" r="2"/><path d="M12 11v5"/><path d="M12 13l-3 2M12 13l3 2"/><path d="M12 16l-2 5M12 16l2 5"/></svg>`,
  };

  let exercisesHTML = '';
  for (let bi = 0; bi < sess.blocks.length; bi++) {
    const b = sess.blocks[bi];
    const ex = exMap[b.exerciseId];
    if (!ex) continue;
    const prSetId = bestPRSetId(b, prior);

    let headers = '';
    if (b.kind === 'cardio') {
      headers = '<th>#</th><th>Tiempo</th><th>Distancia</th><th>Ritmo</th><th></th>';
    } else if (b.kind === 'time') {
      headers = '<th>#</th><th>Duración</th><th>Notas</th>';
    } else {
      headers = '<th>#</th><th>Peso</th><th>Reps</th><th>e1RM</th><th></th>';
    }

    let rowsHTML = '';
    for (let i = 0; i < b.sets.length; i++) {
      const st = b.sets[i];
      const isPR = prSetId === st.id;
      const prBadge = isPR ? '<span class="pr-badge">&#9733; PR</span>' : '';
      let cells = '';
      if (b.kind === 'cardio') {
        const pace = st.distance && st.duration ? (st.duration / st.distance).toFixed(2) + ' min/km' : '&#8212;';
        cells = `<td>${i + 1}</td><td>${st.duration || 0} min</td><td>${st.distance || 0} km</td><td>${pace}</td><td>${prBadge}</td>`;
      } else if (b.kind === 'time') {
        cells = `<td>${i + 1}</td><td>${st.duration || 0} seg</td><td class="dim">${st.note || '&#8212;'}</td>`;
      } else {
        const w = kgToDisplay(st.weight || 0, unit);
        const e1rm = (() => { const e = estOneRM(Number(st.weight), Number(st.reps)); return e ? kgToDisplay(e, unit) + ' ' + unitLabel(unit) : '&#8212;'; })();
        cells = `<td>${i + 1}</td><td class="bold">${w} ${unitLabel(unit)}</td><td>${st.reps || 0}</td><td class="dim">${e1rm}</td><td>${prBadge}</td>`;
      }
      rowsHTML += `<tr class="${isPR ? 'pr-row' : ''}">${cells}</tr>`;
    }

    exercisesHTML += `
      <div class="exercise">
        <div class="ex-header">
          <span class="ex-num">${bi + 1}.</span>
          <span class="ex-name">${ex.name}</span>
          <span class="ex-group">${ex.group}</span>${ex.equipment ? `<span class="ex-equip">${EQUIP_SVG[ex.equipment] || ''}${equipmentLabel(ex.equipment)}</span>` : ''}
          <span class="ex-sets">${b.sets.length} serie${b.sets.length === 1 ? '' : 's'}</span>
        </div>
        <table><thead><tr>${headers}</tr></thead><tbody>${rowsHTML}</tbody></table>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${sessionName} · ${dateStr}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#111;background:#fff;padding:32px;font-size:13px;line-height:1.5}
    .header{border-bottom:2px solid #111;padding-bottom:18px;margin-bottom:24px;display:flex;align-items:flex-start;gap:16px}
    .logo-icon{width:44px;height:44px;min-width:44px;border-radius:10px;background:linear-gradient(135deg,#2FB4C8,#1EA2B8);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#05222a;letter-spacing:-.02em}
    .logo-text{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2FB4C8;margin-top:2px}
    .header-info{flex:1}
    .session-title{font-size:22px;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px}
    .session-date{font-size:13px;color:#666;margin-bottom:14px}
    .stats{display:flex;gap:28px;flex-wrap:wrap}
    .stat-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.1em;font-weight:600}
    .stat-value{font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.1}
    .stat-unit{font-size:11px;color:#666;font-weight:400;margin-left:3px}
    .exercise{margin-bottom:22px}
    .ex-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
    .ex-num{font-size:12px;color:#aaa;font-weight:600;min-width:20px}
    .ex-name{font-size:14px;font-weight:700}
    .ex-group{font-size:10px;color:#555;background:#f0f0f0;padding:2px 7px;border-radius:3px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
    .ex-equip{font-size:10px;color:#6b5;background:#f0f7ed;padding:2px 7px;border-radius:3px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;display:inline-flex;align-items:center;gap:4px}
    .ex-sets{margin-left:auto;font-size:11px;color:#999}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#f7f7f7}
    th{padding:6px 10px;text-align:left;font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid #e0e0e0}
    td{padding:6px 10px;border-bottom:1px solid #eee}
    td:first-child{color:#bbb;width:32px}
    .bold{font-weight:600;color:#111}
    .dim{color:#999}
    .pr-row td{background:#fffbea}
    .pr-badge{font-size:9px;font-weight:700;color:#92600a;background:#fef3c7;padding:2px 6px;border-radius:3px;white-space:nowrap}
    .footer{margin-top:28px;padding-top:12px;border-top:1px solid #ddd;display:flex;justify-content:space-between;color:#ccc;font-size:10px}
    @media print{body{padding:16px}@page{margin:12mm}}
  </style>
</head>
<body>
  <div class="header">
    <div><div class="logo-icon">GT</div><div class="logo-text">GymTracker</div></div>
    <div class="header-info">
    <div class="session-title">${sessionName}</div>
    <div class="session-date">${dateStr}${startTime ? ' · ' + startTime : ''}</div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Duración</div><div class="stat-value">${duration}<span class="stat-unit">min</span></div></div>
      <div class="stat"><div class="stat-label">Volumen</div><div class="stat-value">${kgToDisplay(volume, unit).toLocaleString('es-MX')}<span class="stat-unit">${unitLabel(unit)}</span></div></div>
      <div class="stat"><div class="stat-label">Series</div><div class="stat-value">${totalSets}</div></div>
      <div class="stat"><div class="stat-label">Reps</div><div class="stat-value">${totalReps}</div></div>
      <div class="stat"><div class="stat-label">Ejercicios</div><div class="stat-value">${sess.blocks.length}</div></div>
    </div>
    </div>
  </div>
  ${exercisesHTML}
  <div class="footer"><span>GymTracker</span><span>${dateStr}</span></div>
  <script>window.onload=()=>window.print();<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { alert('Permite ventanas emergentes para exportar el PDF.'); return; }
  win.document.write(html);
  win.document.close();
}

window.ShareCardModal = ShareCardModal;
window.ShareExerciseCardModal = ShareExerciseCardModal;
window.ShareStatsCardModal = ShareStatsCardModal;
window.exportSessionPDF = exportSessionPDF;
