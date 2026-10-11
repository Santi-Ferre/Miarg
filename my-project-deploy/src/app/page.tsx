'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type FormEvent } from 'react';
import { Activity, ArrowLeft, FileText, FilePlus2, Home, LockKeyhole, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { createDemoProfile } from '@/lib/demo-data';

type ActivityType = 'visit' | 'generated' | 'credential' | 'service';
type AdminStats = {
  totals: Record<ActivityType, number>;
  days: { date: string; count: number }[];
};

const ink = '#20233a';
const violet = '#4b43c6';
const panel: CSSProperties = { background: '#fff', border: '1px solid #e9e8f2', borderRadius: 16, boxShadow: '0 5px 20px #22203b0a' };

function trackActivity(type: ActivityType) {
  void fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
    keepalive: true,
  }).catch(() => {});
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('.', '');
}

export default function MiArgentinaDemo() {
  const { profile, view, setView, setProfile } = useAppStore();
  const visitTracked = useRef(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    // Clean state and caches from the old prototype. No generated profile is sent to the server.
    try { localStorage.removeItem('mi-argentina-session'); } catch { /* Browser storage may be disabled. */ }
    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('mi-argentina-')).map((key) => caches.delete(key)),
      )).catch(() => {});
    }
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.filter((registration) =>
          [registration.active, registration.waiting, registration.installing]
            .some((worker) => worker?.scriptURL === `${window.location.origin}/sw.js`),
        ).map((registration) => registration.unregister())),
      ).catch(() => {});
    }
    if (!visitTracked.current) {
      visitTracked.current = true;
      trackActivity('visit');
    }
  }, []);

  const loadAdminStats = useCallback(async () => {
    const response = await fetch('/api/admin/stats', { cache: 'no-store' });
    if (response.status === 401) {
      setAdminAuthorized(false);
      setStats(null);
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las estadísticas.');
    setStats(data as AdminStats);
    setAdminAuthorized(true);
    setAdminError('');
  }, []);

  useEffect(() => {
    if (view !== 'admin') return;
    setAdminError('');
    void loadAdminStats().catch((error: unknown) => {
      setAdminAuthorized(false);
      setAdminError(error instanceof Error ? error.message : 'Error al cargar el panel.');
    });
  }, [view, loadAdminStats]);

  const generate = () => {
    setProfile(createDemoProfile());
    trackActivity('generated');
    setView('home');
  };

  const openCredential = () => {
    if (!profile) return;
    trackActivity('credential');
    setView('credential');
  };

  const loginAdmin = async (event: FormEvent) => {
    event.preventDefault();
    setAdminBusy(true);
    setAdminError('');
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Acceso denegado.');
      setAdminPassword('');
      await loadAdminStats();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setAdminBusy(false);
    }
  };

  const logoutAdmin = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => {});
    setAdminAuthorized(false);
    setStats(null);
    setAdminPassword('');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f6f6fb', color: ink, fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ background: violet, color: '#fff' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <button onClick={() => setView(profile ? 'home' : 'generator')} aria-label="Ir al inicio" style={iconButton}><Home size={20} /></button>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 750 }}>Portal de muestra</div><div style={{ fontSize: 12, opacity: .82 }}>Perfiles ficticios · sin validez oficial</div></div>
          <button onClick={() => { setProfile(null); setView('generator'); }} style={headerButton}><RotateCcw size={15} /> Reiniciar</button>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 18px 44px' }}>
        <div style={warning}><ShieldAlert size={19} /><div><strong>DEMOSTRACIÓN · SIN VALIDEZ OFICIAL</strong><br /><span>Solo genera identidades inventadas. No ingreses datos personales reales.</span></div></div>

        {view === 'generator' && (
          <section style={{ ...panel, maxWidth: 650, margin: '28px auto', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: '#efedff', color: violet, display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Sparkles size={28} /></div>
            <h1 style={{ margin: '0 0 10px', fontSize: 27 }}>Generá tu DNI ficticio</h1>
            <p style={{ color: '#62647a', lineHeight: 1.65, margin: '0 auto 22px', maxWidth: 480 }}>Cada clic inventa un perfil al azar para explorar la demo. No hay registro, contraseña, carga de fotos ni envío de datos personales.</p>
            <button onClick={generate} style={primaryButton}><FilePlus2 size={18} /> Generar perfil de muestra</button>
            <p style={{ color: '#77798b', fontSize: 12, lineHeight: 1.5, margin: '18px 0 0' }}>El perfil solo vive en esta pestaña. Las estadísticas administrativas guardan únicamente contadores agregados.</p>
          </section>
        )}

        {view === 'home' && profile && (
          <>
            <div style={{ margin: '22px 0 16px' }}><p style={eyebrow}>PERFIL FICTICIO</p><h1 style={{ margin: '4px 0 5px', fontSize: 28 }}>Hola, {profile.firstName}</h1><p style={{ margin: 0, color: '#66687b' }}>Explorá tu espacio personal de demostración.</p></div>
            <section style={{ ...panel, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div><p style={eyebrow}>IDENTIFICADOR DE MUESTRA</p><strong style={{ fontSize: 22 }}>{profile.code}</strong><p style={{ margin: '5px 0 0', color: '#6e7082', fontSize: 13 }}>{profile.firstName} {profile.lastName} · {profile.address}</p></div>
              <button onClick={openCredential} style={primaryButton}><FileText size={17} /> Ver credencial ficticia</button>
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
              <button onClick={() => { trackActivity('service'); setView('credential'); }} style={{ ...actionCard, textAlign: 'left' }}><FileText color={violet} /><strong>Credencial de muestra</strong><span>Ver el documento ficticio generado</span></button>
              <button onClick={generate} style={{ ...actionCard, textAlign: 'left' }}><FilePlus2 color={violet} /><strong>Crear otro perfil</strong><span>Genera otra identidad inventada</span></button>
              <button onClick={() => { trackActivity('service'); setView('admin'); }} style={{ ...actionCard, textAlign: 'left' }}><Activity color={violet} /><strong>Acceso administrador</strong><span>Panel privado protegido por clave</span></button>
            </div>
            <button onClick={generate} style={{ ...secondaryButton, marginTop: 16 }}>Generar otro DNI ficticio</button>
          </>
        )}

        {view === 'credential' && profile && (
          <section style={{ maxWidth: 620, margin: '22px auto' }}>
            <button onClick={() => setView('home')} style={backButton}><ArrowLeft size={17} /> Volver al perfil</button>
            <article style={{ ...panel, position: 'relative', overflow: 'hidden', padding: 26, marginTop: 14, minHeight: 300, background: 'linear-gradient(135deg, #fff 0%, #f0efff 100%)' }}>
              <div style={{ position: 'absolute', top: 15, right: 15, padding: '7px 10px', borderRadius: 20, background: '#fff0d3', color: '#704d00', fontWeight: 800, fontSize: 11 }}>FICTICIO · NO VÁLIDO</div>
              <p style={eyebrow}>CREDENCIAL DE EJEMPLO</p>
              <div style={{ marginTop: 36, display: 'grid', gap: 20 }}><div><div style={fieldLabel}>NOMBRE</div><strong style={{ fontSize: 22 }}>{profile.firstName} {profile.lastName}</strong></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div><div style={fieldLabel}>CÓDIGO DEMO</div><strong>{profile.code}</strong></div><div><div style={fieldLabel}>NACIMIENTO DE MUESTRA</div><strong>{profile.birthDate}</strong></div></div><div><div style={fieldLabel}>DOMICILIO INVENTADO</div><strong>{profile.address}</strong></div></div>
              <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', left: '8%', top: '48%', transform: 'rotate(-19deg)', color: '#b3424230', fontSize: 'clamp(24px, 7vw, 48px)', fontWeight: 900, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>SOLO DEMO · NO VÁLIDO</div>
            </article>
          </section>
        )}

        {view === 'admin' && (
          <section style={{ margin: '24px auto', maxWidth: 850 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><div><p style={eyebrow}>ACCESO PRIVADO</p><h1 style={{ margin: '4px 0', fontSize: 27 }}>Panel administrador</h1></div><button onClick={() => setView(profile ? 'home' : 'generator')} style={backButton}><ArrowLeft size={17} /> Volver</button></div>
            {!adminAuthorized ? (
              <form onSubmit={loginAdmin} style={{ ...panel, maxWidth: 430, margin: '22px auto', padding: 22 }}>
                <LockKeyhole size={24} color={violet} /><h2 style={{ fontSize: 18, margin: '10px 0 6px' }}>Ingresá tu clave de administrador</h2><p style={{ fontSize: 13, color: '#66687b', lineHeight: 1.5 }}>La verificación ocurre en el servidor. La clave no está incluida en el código del navegador.</p>
                <input autoComplete="current-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} required aria-label="Clave de administrador" style={passwordInput} />
                {adminError && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{adminError}</p>}
                <button type="submit" disabled={adminBusy || !adminPassword} style={{ ...primaryButton, width: '100%', marginTop: 12 }}>{adminBusy ? 'Verificando…' : 'Entrar'}</button>
              </form>
            ) : stats ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 12px' }}><p style={{ color: '#66687b', fontSize: 13 }}>Datos agregados globales · no se registran perfiles, IP ni identificadores.</p><button onClick={() => void loadAdminStats()} style={secondaryButton}>Actualizar</button></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <Metric label="Visitas a la demo" value={stats.totals.visit} icon={<Home color={violet} />} />
                  <Metric label="Perfiles ficticios generados" value={stats.totals.generated} icon={<FilePlus2 color={violet} />} />
                  <Metric label="Credenciales abiertas" value={stats.totals.credential} icon={<FileText color={violet} />} />
                  <Metric label="Secciones de muestra abiertas" value={stats.totals.service} icon={<Activity color={violet} />} />
                </div>
                <section style={{ ...panel, padding: 20, marginTop: 14 }}><h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Actividad de los últimos 7 días</h2><p style={{ margin: '0 0 18px', color: '#737588', fontSize: 13 }}>Total de acciones públicas registradas por fecha (UTC)</p><WeeklyChart days={stats.days} /></section>
                <p style={{ fontSize: 12, color: '#77798b', lineHeight: 1.5, marginTop: 14 }}>Los contadores son anónimos y pueden ser alterados por solicitudes automatizadas; sirven para observar uso general, no para decisiones de seguridad o facturación.</p>
                <button onClick={() => void logoutAdmin()} style={secondaryButton}>Cerrar sesión de administrador</button>
              </>
            ) : <p role="status" style={{ color: '#66687b' }}>Cargando datos del panel…</p>}
          </section>
        )}

        {view !== 'admin' && <footer style={{ textAlign: 'center', paddingTop: 28 }}><button onClick={() => setView('admin')} style={{ ...backButton, fontSize: 12 }}>Acceso administrador</button><p style={{ color: '#77798b', fontSize: 12, margin: '8px 0' }}>Los perfiles son inventados y solo existen en esta pestaña. Las estadísticas globales guardan únicamente contadores anónimos.</p></footer>}
      </main>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <article style={{ ...panel, padding: 17 }}>{icon}<div style={{ fontSize: 28, fontWeight: 800, marginTop: 9 }}>{value.toLocaleString('es-AR')}</div><div style={{ fontSize: 13, color: '#696b7e', lineHeight: 1.4 }}>{label}</div></article>;
}

function WeeklyChart({ days }: { days: AdminStats['days'] }) {
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  return <div role="img" aria-label="Gráfico de interacciones de los últimos siete días" style={{ height: 170, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'end', gap: 10 }}>{days.map((day) => <div key={day.date} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, color: '#57596d' }}>{day.count}</span><div style={{ height: `${Math.max(5, day.count / maxCount * 115)}px`, width: 'min(34px, 100%)', borderRadius: '7px 7px 2px 2px', background: day.count ? violet : '#e9e8f2' }} /><span style={{ fontSize: 11, color: '#747689' }}>{dayLabel(day.date)}</span></div>)}</div>;
}

const iconButton: CSSProperties = { border: 0, background: '#ffffff20', color: '#fff', borderRadius: 10, width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const headerButton: CSSProperties = { border: '1px solid #ffffff70', background: 'transparent', color: '#fff', borderRadius: 9, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' };
const primaryButton: CSSProperties = { border: 0, background: violet, color: '#fff', borderRadius: 10, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, cursor: 'pointer' };
const secondaryButton: CSSProperties = { border: '1px solid #d9d7eb', background: '#fff', color: violet, borderRadius: 10, padding: '11px 15px', fontWeight: 700, cursor: 'pointer' };
const backButton: CSSProperties = { border: 0, background: 'transparent', color: violet, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 650, cursor: 'pointer', padding: '6px 0' };
const actionCard: CSSProperties = { ...panel, color: ink, padding: 18, cursor: 'pointer', display: 'grid', gap: 9 };
const warning: CSSProperties = { maxWidth: 740, margin: '0 auto', border: '1px solid #ecd38c', background: '#fff6d9', color: '#6d5111', borderRadius: 12, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 11, fontSize: 13, lineHeight: 1.45 };
const eyebrow: CSSProperties = { fontSize: 11, letterSpacing: '.08em', color: '#77798b', fontWeight: 750, margin: 0 };
const fieldLabel: CSSProperties = { color: '#77798b', fontWeight: 750, fontSize: 10, letterSpacing: '.08em', marginBottom: 5 };
const passwordInput: CSSProperties = { width: '100%', boxSizing: 'border-box', marginTop: 8, border: '1px solid #d9d7eb', borderRadius: 9, padding: '12px 13px', fontSize: 16 };

