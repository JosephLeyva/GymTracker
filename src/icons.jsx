// icons.jsx — Lucide-style inline SVGs (1.75 stroke to match Pinnacle feel)

const iconProps = (size = 18, color = 'currentColor', sw = 1.75) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: color, strokeWidth: sw,
  strokeLinecap: 'round', strokeLinejoin: 'round',
});

const I = {
  Home: (p) => <svg {...iconProps(p.size, p.color)}><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10.5Z" /></svg>,
  Dumbbell: (p) => <svg {...iconProps(p.size, p.color)}><path d="M6 7v10M10 5v14M14 5v14M18 7v10M3 10v4M21 10v4" /></svg>,
  Calendar: (p) => <svg {...iconProps(p.size, p.color)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  Chart: (p) => <svg {...iconProps(p.size, p.color)}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>,
  Library: (p) => <svg {...iconProps(p.size, p.color)}><path d="M4 4h6v16H4zM14 4h6v16h-6z" /></svg>,
  Plus: (p) => <svg {...iconProps(p.size, p.color)}><path d="M12 5v14M5 12h14" /></svg>,
  Check: (p) => <svg {...iconProps(p.size, p.color, 2.25)}><path d="m5 12 5 5L20 7" /></svg>,
  X: (p) => <svg {...iconProps(p.size, p.color, 2)}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  Trash: (p) => <svg {...iconProps(p.size, p.color)}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>,
  Edit: (p) => <svg {...iconProps(p.size, p.color)}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  Clock: (p) => <svg {...iconProps(p.size, p.color)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  Timer: (p) => <svg {...iconProps(p.size, p.color)}><path d="M10 2h4M12 14l4-4" /><circle cx="12" cy="14" r="8" /></svg>,
  Flame: (p) => <svg {...iconProps(p.size, p.color)}><path d="M12 2c1.5 4 6 6 6 11a6 6 0 0 1-12 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-7 2-10Z" /></svg>,
  Trophy: (p) => <svg {...iconProps(p.size, p.color)}><path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" /><path d="M6 6H4a2 2 0 0 0 2 4M18 6h2a2 2 0 0 1-2 4M10 14v3h4v-3M8 20h8" /></svg>,
  Play: (p) => <svg {...iconProps(p.size, p.color, 2)}><path d="M6 4l14 8-14 8V4Z" fill={p.color || 'currentColor'} /></svg>,
  Pause: (p) => <svg {...iconProps(p.size, p.color)}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>,
  Stop: (p) => <svg {...iconProps(p.size, p.color, 2)}><rect x="5" y="5" width="14" height="14" rx="2" fill={p.color || 'currentColor'} /></svg>,
  ArrowUp: (p) => <svg {...iconProps(p.size, p.color, 2.25)}><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
  ArrowDown: (p) => <svg {...iconProps(p.size, p.color, 2.25)}><path d="M12 5v14M5 12l7 7 7-7" /></svg>,
  Search: (p) => <svg {...iconProps(p.size, p.color)}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>,
  Chevron: (p) => <svg {...iconProps(p.size, p.color)}><path d="m9 18 6-6-6-6" /></svg>,
  ChevronL: (p) => <svg {...iconProps(p.size, p.color)}><path d="m15 18-6-6 6-6" /></svg>,
  Settings: (p) => <svg {...iconProps(p.size, p.color)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>,
  Target: (p) => <svg {...iconProps(p.size, p.color)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={p.color || 'currentColor'} /></svg>,
  Activity: (p) => <svg {...iconProps(p.size, p.color)}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  Zap: (p) => <svg {...iconProps(p.size, p.color)}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>,
  Copy: (p) => <svg {...iconProps(p.size, p.color)}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Filter: (p) => <svg {...iconProps(p.size, p.color)}><path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z" /></svg>,
  Book: (p) => <svg {...iconProps(p.size, p.color)}><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V4Z" /><path d="M4 4v16" /></svg>,
  Weight: (p) => <svg {...iconProps(p.size, p.color)}><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>,
  Bolt: (p) => <svg {...iconProps(p.size, p.color, 2)}><path d="M13 2 3 14h8l-1 8 11-13h-8l0-7Z" fill={p.color || 'currentColor'} /></svg>,
  Heart: (p) => <svg {...iconProps(p.size, p.color)}><path d="M20.8 6.6a5.5 5.5 0 0 0-9.3-2.2L12 5l-.5-.6A5.5 5.5 0 0 0 3 6.6c0 3.8 9 13.4 9 13.4s9-9.6 9-13.4Z" /></svg>,
  Run: (p) => <svg {...iconProps(p.size, p.color)}><circle cx="17" cy="4" r="2" /><path d="M15 22l-3-7 4-4-3-4-5 1-3 5M10 11l-1 5" /></svg>,
  Share: (p) => <svg {...iconProps(p.size, p.color)}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M16 6l-4-4-4 4M12 2v14" /></svg>,
  Download: (p) => <svg {...iconProps(p.size, p.color)}><path d="M12 3v13M7 11l5 5 5-5M5 21h14" /></svg>,
  FilePdf: (p) => <svg {...iconProps(p.size, p.color)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><text x="6" y="19" style={{fontSize:'5px',fontWeight:'700',fill:'currentColor',stroke:'none',fontFamily:'system-ui,sans-serif'}}>PDF</text></svg>,

  // Equipment icons
  // Mancuerna: handle central + cabezas cuadradas a los lados
  Mancuerna: (p) => <svg {...iconProps(p.size, p.color)}>
    <rect x="2" y="8" width="3" height="8" rx="0.5" />
    <rect x="5" y="10" width="2" height="4" />
    <path d="M7 12h10" />
    <rect x="17" y="10" width="2" height="4" />
    <rect x="19" y="8" width="3" height="8" rx="0.5" />
  </svg>,
  // Barra: barra larga con discos grandes en los extremos
  Barra: (p) => <svg {...iconProps(p.size, p.color)}>
    <path d="M2 12h2" />
    <rect x="4" y="6" width="3" height="12" rx="0.5" />
    <rect x="7" y="9" width="2" height="6" />
    <path d="M9 12h6" />
    <rect x="15" y="9" width="2" height="6" />
    <rect x="17" y="6" width="3" height="12" rx="0.5" />
    <path d="M20 12h2" />
  </svg>,
  // Maquina: polea/máquina de cables con peso apilado
  Maquina: (p) => <svg {...iconProps(p.size, p.color)}>
    <rect x="4" y="3" width="7" height="18" rx="1" />
    <path d="M4 7h7M4 11h7M4 15h7" />
    <path d="M11 5h7M18 5v10" />
    <path d="M18 15l-4 5" />
    <rect x="12" y="19" width="5" height="2" rx="0.5" />
  </svg>,
  // Calistenia: figura de persona en dominadas / barra fija
  Calistenia: (p) => <svg {...iconProps(p.size, p.color)}>
    <path d="M3 4h18" />
    <path d="M8 4v3M16 4v3" />
    <circle cx="12" cy="9" r="2" />
    <path d="M12 11v5" />
    <path d="M12 13l-3 2M12 13l3 2" />
    <path d="M12 16l-2 5M12 16l2 5" />
  </svg>,

  // Period icons — Semana / Mes / Histórico
  // Week: calendario con fila de semana resaltada
  Week: (p) => <svg {...iconProps(p.size, p.color)}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
    <rect x="5" y="13" width="14" height="4" rx="0.5" fill={p.color || 'currentColor'} stroke="none" opacity="0.9" />
  </svg>,
  // Month: calendario con grid de cuadrículas
  Month: (p) => <svg {...iconProps(p.size, p.color)}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
    <path d="M9 10v11M15 10v11M3 14h18M3 17h18" />
  </svg>,
  // History: reloj con flecha circular hacia atrás
  History: (p) => <svg {...iconProps(p.size, p.color)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </svg>,
};

window.I = I;
