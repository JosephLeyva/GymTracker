// charts.jsx — inline SVG chart primitives

function LineChart({ points, width = 520, height = 180, prDates = new Set(), yKey = 'topE1rm', unit = 'kg' }) {
  const pad = { t: 20, r: 16, b: 28, l: 40 };
  const w = width, h = height;
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  if (!points || points.length === 0) {
    return (
      <div className="empty" style={{ padding: 36 }}>
        <div className="empty-sub">Sin datos aún. Registra sesiones para ver tu progresión.</div>
      </div>
    );
  }

  const vals = points.map(p => kgToDisplay(p[yKey] || 0, unit));
  const min = Math.min(...vals, 0);
  const maxRaw = Math.max(...vals, 1);
  const max = maxRaw + (maxRaw - min) * 0.15 || 1;
  const minY = Math.max(0, min - (max - min) * 0.1);

  const x = (i) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => pad.t + ih - ((v - minY) / (max - minY || 1)) * ih;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(kgToDisplay(p[yKey] || 0, unit))}`).join(' ');
  const area = path + ` L ${x(points.length - 1)} ${pad.t + ih} L ${x(0)} ${pad.t + ih} Z`;

  // y ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => minY + ((max - minY) * i) / ticks);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', maxHeight: h }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1EA2B8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1EA2B8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {tickVals.map((v, i) => (
        <g key={i}>
          <line className="chart-grid" x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} strokeDasharray="2 4" />
          <text className="chart-axis" x={pad.l - 8} y={y(v) + 3} textAnchor="end">{Math.round(v)}</text>
        </g>
      ))}
      <path className="chart-area" d={area} />
      <path className="chart-line" d={path} />
      {points.map((p, i) => {
        const isPR = prDates.has(p.date);
        return (
          <g key={i}>
            <circle className={`chart-dot ${isPR ? 'pr' : ''}`} cx={x(i)} cy={y(kgToDisplay(p[yKey] || 0, unit))} r={isPR ? 5 : 3.5} />
            {(i === 0 || i === points.length - 1 || isPR) && (
              <text className="chart-axis" x={x(i)} y={h - 8} textAnchor="middle">{fmtDate(p.date)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Heatmap({ sessions, weeks = 26 }) {
  // Grid: 7 rows (day of week) x `weeks` cols
  const today = new Date();
  const counts = {};
  for (const s of sessions) counts[s.date] = (counts[s.date] || 0) + 1;

  const cells = [];
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - (weeks * 7 - 1));
  // Align to Monday
  const startOffset = (startDay.getDay() + 6) % 7;
  startDay.setDate(startDay.getDate() - startOffset);

  const rows = 7, cols = weeks + 1;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const d = new Date(startDay);
      d.setDate(d.getDate() + c * 7 + r);
      if (d > today) continue;
      const iso = d.toISOString().slice(0, 10);
      const n = counts[iso] || 0;
      cells.push({ iso, n, r, c });
    }
  }

  const cellSize = 12, gap = 3;
  const w = cols * (cellSize + gap);
  const h = rows * (cellSize + gap);
  const level = (n) => n === 0 ? '' : n === 1 ? 'l2' : n === 2 ? 'l3' : 'l4';

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, maxWidth: '100%', height: 'auto' }}>
        {cells.map((c, i) => {
          const cls = level(c.n);
          const bg = cls === 'l2' ? 'rgba(30,162,184,0.3)' :
            cls === 'l3' ? 'rgba(30,162,184,0.6)' :
              cls === 'l4' ? '#1EA2B8' : '#161B24';
          const border = cls ? 'rgba(30,162,184,0.4)' : '#1F2530';
          return (
            <rect key={i}
              x={c.c * (cellSize + gap)} y={c.r * (cellSize + gap)}
              width={cellSize} height={cellSize} rx={2}
              fill={bg} stroke={border} strokeWidth={1}>
              <title>{`${c.iso} — ${c.n} sesión${c.n === 1 ? '' : 'es'}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

function WeekBars({ sessions, weeks = 8, unit = 'kg' }) {
  const byWeek = {};
  for (const s of sessions) {
    const k = weekKey(s.date);
    byWeek[k] = (byWeek[k] || 0) + sessionVolume(s);
  }
  // Build last N weeks from today
  const today = new Date();
  const list = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    const iso = d.toISOString().slice(0, 10);
    const k = weekKey(iso);
    list.push({ key: k, vol: byWeek[k] || 0 });
  }
  const max = Math.max(...list.map(l => l.vol), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((l, i) => (
        <div className="week-bar" key={i}>
          <div className="label">{l.key.split('-W').join(' W')}</div>
          <div className="track"><div className="fill" style={{ width: `${(l.vol / max) * 100}%` }} /></div>
          <div className="val">{kgToDisplay(l.vol, unit).toLocaleString('es-MX')} {unitLabel(unit)}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { LineChart, Heatmap, WeekBars, MuscleRadar, SessionProgressChart, MuscleDistributionChart });

// -------------------------------------------------------------------------
// MuscleDistributionChart — barras horizontales de volumen por grupo muscular
// -------------------------------------------------------------------------
function MuscleDistributionChart({ groupList, unit = 'kg' }) {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);

  const resolveColor = (cssVar) => {
    const name = cssVar.replace(/^var\(/, '').replace(/\)$/, '').trim();
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  const withAlpha = (hex, a) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  React.useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    if (!groupList || groupList.length === 0) {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      return;
    }

    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    const toUnit = v => typeof kgToDisplay === 'function' ? kgToDisplay(v, unit) : v;
    const labels = groupList.map(([g]) => g);
    const values = groupList.map(([, v]) => toUnit(v));
    const gc = groupList.map(([g]) => resolveColor(groupColor(g)));

    chartRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: gc.map(c => withAlpha(c, 0.75)),
          borderColor: gc,
          borderWidth: 2,
          borderRadius: { topRight: 6, bottomRight: 6, topLeft: 0, bottomLeft: 0 },
          borderSkipped: 'start',
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#94A3B8',
            bodyColor: '#F1F5F9',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: item => ` ${item.parsed.x.toLocaleString('es-MX')} ${unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#64748B',
              font: { size: 11 },
              callback: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v,
            },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#CBD5E1', font: { size: 12.5, weight: '600' } },
            border: { display: false },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [groupList, unit]);

  if (!groupList || groupList.length === 0) return null;

  return (
    <div style={{ position: 'relative', height: Math.max(groupList.length * 46 + 24, 100) }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// -------------------------------------------------------------------------
// SessionProgressChart — línea de progreso por sesión con Chart.js
// -------------------------------------------------------------------------
function SessionProgressChart({ sessions, exercises, range = 90, metric = 'volume', color = '#2FB4C8', showMA = true, unit = 'kg' }) {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);

  const exMap = React.useMemo(
    () => Object.fromEntries(exercises.map(e => [e.id, e])),
    [exercises]
  );

  // Build sorted session points
  const { points, hasData, metricMeta } = React.useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startedAt || 0) - (b.startedAt || 0);
    });

    // Range filter
    let cutoffISO = null;
    if (range !== 'all') {
      const d = new Date();
      const days = range === '6m' ? 180 : Number(range);
      d.setDate(d.getDate() - days);
      cutoffISO = d.toISOString().slice(0, 10);
    }
    const filtered = cutoffISO ? sorted.filter(s => s.date >= cutoffISO) : sorted;

    // Precompute best-e1RM-per-exercise-up-to-this-date for PR detection
    const bestByExUpTo = {}; // { exId: currentBestE1rm }
    const prFlags = new Set(); // session ids that set at least one PR
    const ptsRaw = [];

    for (const s of sorted) {
      let sessionPR = false;
      for (const b of s.blocks) {
        const ex = exMap[b.exerciseId]; if (!ex || ex.kind !== 'strength') continue;
        let topE1 = 0;
        for (const st of b.sets) {
          if (!st.done) continue;
          const w = Number(st.weight) || 0, r = Number(st.reps) || 0;
          const e1 = (typeof estOneRM === 'function') ? estOneRM(w, r) : (w * (1 + r / 30));
          if (e1 > topE1) topE1 = e1;
        }
        if (topE1 > 0) {
          const prev = bestByExUpTo[b.exerciseId] || 0;
          if (topE1 > prev) { bestByExUpTo[b.exerciseId] = topE1; sessionPR = true; }
        }
      }
      if (sessionPR) prFlags.add(s.id);
      ptsRaw.push({ s, pr: sessionPR });
    }

    // Filter to range now (preserving PR flag computed on full history)
    const inRange = ptsRaw.filter(p => !cutoffISO || p.s.date >= cutoffISO);

    const meta = {
      volume: { label: 'Volumen', yLabel: `Volumen · ${unit}`, fmt: v => `${v.toLocaleString('es-MX')} ${unit}` },
      duration: { label: 'Duración', yLabel: 'Duración · min', fmt: v => `${v} min` },
      sets: { label: 'Series', yLabel: 'Series totales', fmt: v => `${v} series` },
    };

    const toUnit = v => (typeof kgToDisplay === 'function' ? kgToDisplay(v || 0, unit) : v || 0);

    const points = inRange.map(({ s, pr }) => {
      let y = 0;
      if (metric === 'volume') {
        y = toUnit(typeof sessionVolume === 'function' ? sessionVolume(s) : s.blocks.reduce((n, b) => n + b.sets.reduce((m, st) => m + (st.done ? (Number(st.weight) || 0) * (Number(st.reps) || 0) : 0), 0), 0));
      } else if (metric === 'duration') {
        y = typeof sessionDuration === 'function' ? sessionDuration(s) : 0;
      } else if (metric === 'sets') {
        y = s.blocks.reduce((n, b) => n + b.sets.length, 0);
      }
      return { x: s.date, y, pr, s };
    });

    return { points, hasData: points.length > 0, metricMeta: meta[metric] };
  }, [sessions, exMap, range, metric, unit]);

  // Moving average (window 7)
  const ma = React.useMemo(() => {
    if (!showMA || points.length < 3) return null;
    const W = 7;
    return points.map((p, i) => {
      const from = Math.max(0, i - W + 1);
      const slice = points.slice(from, i + 1);
      const avg = slice.reduce((n, q) => n + q.y, 0) / slice.length;
      return avg;
    });
  }, [points, showMA]);

  const rgba = (hex, a) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  React.useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    if (!hasData) {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      return;
    }

    const ctx = canvasRef.current.getContext('2d');

    // Gradient fill under the line
    const canvasH = canvasRef.current.parentElement.clientHeight || 320;
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
    grad.addColorStop(0, rgba(color, 0.42));
    grad.addColorStop(0.6, rgba(color, 0.08));
    grad.addColorStop(1, rgba(color, 0));

    const labels = points.map(p => p.x);
    const data = points.map(p => p.y);

    const datasets = [];

    // Moving average (drawn behind)
    if (ma) {
      datasets.push({
        label: 'Promedio móvil (7)',
        data: ma,
        borderColor: 'rgba(255,255,255,0.55)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 5],
        pointRadius: 0,
        tension: 0.35,
        fill: false,
        order: 0,
      });
    }

    // Main line + gradient area
    datasets.push({
      label: metricMeta.label,
      data,
      borderColor: color,
      backgroundColor: grad,
      borderWidth: 3,
      tension: 0.32,
      fill: true,
      pointRadius: points.map(p => p.pr ? 7 : 4),
      pointHoverRadius: points.map(p => p.pr ? 10 : 7),
      pointBackgroundColor: points.map(p => p.pr ? '#FBBF24' : color),
      pointBorderColor: points.map(p => p.pr ? 'rgba(251,191,36,0.45)' : '#0A0D12'),
      pointBorderWidth: points.map(p => p.pr ? 4 : 2),
      order: 1,
    });

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new window.Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 500, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            display: !!ma,
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.75)',
              font: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '600' },
              boxWidth: 18, boxHeight: 3, padding: 14, usePointStyle: false,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(10,13,18,0.95)',
            borderColor: rgba(color, 0.5),
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.9)',
            padding: 12,
            displayColors: false,
            callbacks: {
              title(items) {
                if (!items.length) return '';
                const p = points[items[0].dataIndex];
                const d = new Date(p.s.date + 'T00:00:00');
                return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
              },
              label(item) {
                const p = points[item.dataIndex];
                const lines = [];
                if (item.datasetIndex === 0 && ma) {
                  lines.push(` Promedio móvil: ${metricMeta.fmt(Math.round(item.parsed.y))}`);
                } else {
                  lines.push(` ${metricMeta.label}: ${metricMeta.fmt(Math.round(p.y))}`);
                  if (p.s.name) lines.push(` ${p.s.name}`);
                  if (p.pr) lines.push(' 🏆 Nuevo PR en esta sesión');
                }
                return lines;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: 'rgba(255,255,255,0.55)',
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7,
              callback(v) {
                const label = this.getLabelForValue(v);
                if (!label) return '';
                const d = new Date(label + 'T00:00:00');
                return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.07)' },
            ticks: {
              color: 'rgba(255,255,255,0.55)',
              font: { size: 11 },
              callback: v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : v,
            },
          },
        },
        elements: { line: { borderJoinStyle: 'round', capBezierPoints: true } },
      },
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [points, ma, color, hasData, metricMeta]);

  if (!hasData) {
    return (
      <div className="empty" style={{ minHeight: 280 }}>
        <div className="empty-sub">Aún no hay sesiones en este rango.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: 340 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// -------------------------------------------------------------------------
// MuscleRadar — gráfico de araña con Chart.js, comparando dos períodos
// -------------------------------------------------------------------------
function MuscleRadar({ sessions, exercises, period = 30, compare = true, color = '#2FB4C8', unit = 'kg' }) {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);

  const exMap = React.useMemo(
    () => Object.fromEntries(exercises.map(e => [e.id, e])),
    [exercises]
  );

  // Compute volume-by-muscle-group for a date range
  const computeGroupVolumes = React.useCallback((fromISO, toISO) => {
    const byG = {};
    for (const s of sessions) {
      if (fromISO && s.date < fromISO) continue;
      if (toISO && s.date > toISO) continue;
      for (const b of s.blocks) {
        const ex = exMap[b.exerciseId]; if (!ex) continue;
        let v = 0;
        for (const st of b.sets) if (st.done) v += (Number(st.weight) || 0) * (Number(st.reps) || 0);
        byG[ex.group] = (byG[ex.group] || 0) + v;
      }
    }
    return byG;
  }, [sessions, exMap]);

  const { labels, current, previous, hasData } = React.useMemo(() => {
    const today = new Date();
    const toISO = today.toISOString().slice(0, 10);

    let curData, prevMap = {};
    if (period === 'all') {
      curData = computeGroupVolumes(null, toISO);
    } else {
      const curFrom = new Date(today); curFrom.setDate(curFrom.getDate() - period);
      const curFromISO = curFrom.toISOString().slice(0, 10);
      const prevTo = new Date(curFrom); prevTo.setDate(prevTo.getDate() - 1);
      const prevToISO = prevTo.toISOString().slice(0, 10);
      const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - period);
      const prevFromISO = prevFrom.toISOString().slice(0, 10);
      curData = computeGroupVolumes(curFromISO, toISO);
      prevMap = compare ? computeGroupVolumes(prevFromISO, prevToISO) : {};
    }

    // Preferred group order (keeps the chart shape stable)
    const preferred = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Glúteos', 'Cardio', 'Movilidad'];
    const allGroups = new Set([...Object.keys(curData), ...Object.keys(prevMap)]);
    const ordered = preferred.filter(g => allGroups.has(g));
    const extras = [...allGroups].filter(g => !preferred.includes(g));
    const labels = [...ordered, ...extras];

    const toUnit = v => (typeof kgToDisplay === 'function' ? kgToDisplay(v || 0, unit) : v || 0);
    const current = labels.map(g => toUnit(curData[g] || 0));
    const previous = labels.map(g => toUnit(prevMap[g] || 0));
    const hasData = labels.length > 0 && current.some(v => v > 0);

    return { labels, current, previous, hasData };
  }, [sessions, exMap, period, compare, unit, computeGroupVolumes]);

  // Utility: hex -> rgba
  const rgba = (hex, a) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  React.useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    if (!hasData) {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      return;
    }

    const ctx = canvasRef.current.getContext('2d');

    // Glow plugin — draws the radar line twice, blurred, before the main stroke
    const glowPlugin = {
      id: 'radarGlow',
      beforeDatasetDraw(chart, args) {
        const { ctx: c } = chart;
        const meta = args.meta;
        if (!meta || meta.type !== 'radar') return;
        const ds = chart.data.datasets[args.index];
        if (!ds || ds._glow === false) return;
        c.save();
        c.shadowColor = ds.borderColor;
        c.shadowBlur = 22;
        c.globalCompositeOperation = 'lighter';
        // We just set shadow; Chart.js will draw the line and pick up the shadow.
        // restore happens afterDatasetDraw.
      },
      afterDatasetDraw(chart, args) {
        const { ctx: c } = chart;
        const meta = args.meta;
        if (!meta || meta.type !== 'radar') return;
        const ds = chart.data.datasets[args.index];
        if (!ds || ds._glow === false) return;
        c.restore();
      },
    };

    const datasets = [];
    if (compare && previous.some(v => v > 0)) {
      datasets.push({
        label: 'Período anterior',
        data: previous,
        borderColor: 'rgba(255,255,255,0.38)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 2,
        pointBackgroundColor: 'rgba(255,255,255,0.6)',
        pointBorderColor: 'transparent',
        _glow: false,
      });
    }
    datasets.push({
      label: period === 'all' ? 'Todo el historial' : `Últimos ${period} días`,
      data: current,
      borderColor: color,
      backgroundColor: rgba(color, 0.35),
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: color,
      pointBorderColor: '#0A0D12',
      pointBorderWidth: 2,
      fill: true,
      tension: 0.15,
    });

    // Also strengthen the previous-period fill so its area is visible
    if (datasets.length > 1 && datasets[0].label === 'Período anterior') {
      datasets[0].backgroundColor = 'rgba(255,255,255,0.08)';
      datasets[0].fill = true;
    }

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new window.Chart(ctx, {
      type: 'radar',
      data: { labels, datasets },
      plugins: [glowPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 550, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.75)',
              font: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '600' },
              boxWidth: 14, boxHeight: 3, padding: 14, usePointStyle: false,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(10,13,18,0.95)',
            borderColor: rgba(color, 0.5),
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.85)',
            padding: 10,
            callbacks: {
              label(c) {
                const v = c.parsed.r;
                return ` ${c.dataset.label}: ${v.toLocaleString('es-MX')} ${unit}`;
              },
            },
          },
        },
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: {
              color: 'rgba(255,255,255,0.85)',
              font: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '600' },
            },
            ticks: {
              display: true,
              color: 'rgba(255,255,255,0.35)',
              backdropColor: 'transparent',
              font: { size: 10 },
              maxTicksLimit: 4,
              callback: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v,
            },
            beginAtZero: true,
            suggestedMin: 0,
          },
        },
        elements: {
          line: { borderJoinStyle: 'round' },
        },
      },
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [labels, current, previous, color, compare, period, unit, hasData]);

  if (!hasData) {
    return (
      <div className="empty" style={{ minHeight: 260 }}>
        <div className="empty-sub">Aún no hay volumen registrado en este período.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: 360 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
