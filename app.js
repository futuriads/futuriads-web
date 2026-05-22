/* ---- Custom dropdowns ---- */
function toggleCustomSelect(id) {
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
  if (!isOpen) {
    el.classList.add('open');
    const trigger = el.querySelector('.custom-select-trigger');
    const dropdown = el.querySelector('.custom-select-dropdown');
    const rect = trigger.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 6) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.minWidth = rect.width + 'px';
    // Limitar altura para que no se corte abajo del viewport
    const spaceBelow = window.innerHeight - rect.bottom - 20;
    dropdown.style.maxHeight = Math.max(180, Math.min(320, spaceBelow)) + 'px';
  }
}

function selectCustomOption(selectId, optionEl) {
  const el = document.getElementById(selectId);
  const trigger = el.querySelector('.custom-select-trigger span');
  // Si el option tiene HTML interior (ej: ar-visual con mini rectángulo), preservarlo;
  // si no, usar el texto plano.
  if (optionEl.querySelector('.ar-visual')) {
    trigger.innerHTML = optionEl.innerHTML;
  } else {
    trigger.textContent = optionEl.textContent;
  }
  el.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
  optionEl.classList.add('selected');
  el.classList.remove('open');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.custom-select')) {
    document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
  }
});
</script>

/* ---- Marquee ---- */
(function(){
  const items=['Actores IA realistas','Script a video en minutos','Meta · TikTok · Instagram','Prompts con IA incluidos','Formato 9:16 nativo','Audio sincronizado','Sin equipo de producción','Generá en minutos'];
  const t=document.getElementById('marqueeTrack');
  [...items,...items,...items,...items].forEach(s=>{
    const el=document.createElement('span');
    el.className='l-marquee-item'; el.textContent=s; t.appendChild(el);
  });
})();

/* ---- Hero parallax ---- */
const heroCards=document.querySelectorAll('.actor-card');
document.getElementById('heroSection').addEventListener('mousemove',e=>{
  const r=e.currentTarget.getBoundingClientRect();
  const dx=(e.clientX-(r.left+r.width/2))/r.width;
  const dy=(e.clientY-(r.top+r.height/2))/r.height;
  heroCards.forEach((c,i)=>{
    const d=0.5+(i%3)*0.25;
    c.style.marginLeft=(dx*14*d)+'px';
    c.style.marginTop=(dy*9*d)+'px';
  });
});

/* ---- Intersection observer ---- */
const io=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const idx=Array.from(e.target.parentElement.children).indexOf(e.target);
      setTimeout(()=>e.target.classList.add('visible'),idx*90);
      io.unobserve(e.target);
    }
  });
},{threshold:0.12});
document.querySelectorAll('.l-step,.l-feat-big,.l-feat-card,.l-testi-card,.fade-up').forEach(el=>io.observe(el));

/* ---- Landing ↔ App ---- */


/* ---- Supabase via fetch (no library needed) ---- */
const SUPA_URL = 'https://qhnvketzicgkvbnhjgxv.supabase.co';
const SUPA_KEY = 'sb_publishable_xaAOljOUbEnYDwK121HJdw_DIZ2xy3M';

const supa = {
  _headers: {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json'
  },
  _session: null,
  auth: {
    getSession: async () => {
      const stored = localStorage.getItem('sb_session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          // Verify token not expired
          if (session.expires_at && Date.now() / 1000 < session.expires_at) {
            supa._session = session;
            return { data: { session } };
          }
        } catch(e) {}
      }
      return { data: { session: null } };
    },
    getUser: async () => {
      const { data: { session } } = await supa.auth.getSession();
      return { data: { user: session ? session.user : null } };
    },
    signInWithPassword: async ({ email, password }) => {
      const res = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: supa._headers,
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: data };
      localStorage.setItem('sb_session', JSON.stringify(data));
      supa._session = data;
      return { data: { user: data.user, session: data }, error: null };
    },
    signUp: async ({ email, password, options }) => {
      const body = { email, password };
      if (options && options.data) {
        body.data = options.data;
      }
      const res = await fetch(SUPA_URL + '/auth/v1/signup', {
        method: 'POST',
        headers: supa._headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: data };
      if (data.access_token) {
        localStorage.setItem('sb_session', JSON.stringify(data));
        supa._session = data;
      }
      return { data: { user: data.user, session: data }, error: null };
    },
    signOut: async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (session?.access_token) {
        await fetch(SUPA_URL + '/auth/v1/logout', {
          method: 'POST',
          headers: { ...supa._headers, 'Authorization': 'Bearer ' + session.access_token }
        });
      }
      localStorage.removeItem('sb_session');
      supa._session = null;
      return { error: null };
    },
    onAuthStateChange: (callback) => {
      // Check session on load
      supa.auth.getSession().then(({ data: { session } }) => {
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      });
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  from: (table) => ({
    insert: (row) => ({
      then: async (resolve) => {
        const session = supa._session || JSON.parse(localStorage.getItem('sb_session') || 'null');
        const authHeader = session?.access_token ? 'Bearer ' + session.access_token : 'Bearer ' + SUPA_KEY;
        const res = await fetch(SUPA_URL + '/rest/v1/' + table, {
          method: 'POST',
          headers: { ...supa._headers, 'Authorization': authHeader, 'Prefer': 'return=representation' },
          body: JSON.stringify(row)
        });
        const data = await res.json();
        if (!res.ok) resolve({ data: null, error: data });
        else resolve({ data, error: null });
      }
    }),
    update: (changes) => ({
      eq: (col, val) => ({
        then: async (resolve) => {
          const session = supa._session || JSON.parse(localStorage.getItem('sb_session') || 'null');
          const authHeader = session?.access_token ? 'Bearer ' + session.access_token : 'Bearer ' + SUPA_KEY;
          const res = await fetch(SUPA_URL + '/rest/v1/' + table + '?' + col + '=eq.' + encodeURIComponent(val), {
            method: 'PATCH',
            headers: { ...supa._headers, 'Authorization': authHeader, 'Prefer': 'return=representation' },
            body: JSON.stringify(changes)
          });
          const data = await res.json();
          if (!res.ok) resolve({ data: null, error: data });
          else resolve({ data, error: null });
        }
      })
    }),
    select: (cols) => ({
      eq: (col, val) => ({
        single: () => ({
          then: async (resolve) => {
            const session = supa._session || JSON.parse(localStorage.getItem('sb_session') || 'null');
            const authHeader = session?.access_token ? 'Bearer ' + session.access_token : 'Bearer ' + SUPA_KEY;
            const res = await fetch(SUPA_URL + '/rest/v1/' + table + '?select=' + (cols || '*') + '&' + col + '=eq.' + encodeURIComponent(val), {
              headers: { ...supa._headers, 'Authorization': authHeader, 'Accept': 'application/vnd.pgrst.object+json' }
            });
            const data = await res.json();
            if (!res.ok) resolve({ data: null, error: data });
            else resolve({ data, error: null });
          }
        }),
        // .eq().then() → devuelve array de matches (sin requerir single)
        then: async (resolve) => {
          const session = supa._session || JSON.parse(localStorage.getItem('sb_session') || 'null');
          const authHeader = session?.access_token ? 'Bearer ' + session.access_token : 'Bearer ' + SUPA_KEY;
          const res = await fetch(SUPA_URL + '/rest/v1/' + table + '?select=' + (cols || '*') + '&' + col + '=eq.' + encodeURIComponent(val), {
            headers: { ...supa._headers, 'Authorization': authHeader }
          });
          const data = await res.json();
          if (!res.ok) resolve({ data: null, error: data });
          else resolve({ data, error: null });
        },
        // .eq().order(...) → devuelve array de matches ordenados
        order: (orderCol, opts) => ({
          then: async (resolve) => {
            const session = supa._session || JSON.parse(localStorage.getItem('sb_session') || 'null');
            const authHeader = session?.access_token ? 'Bearer ' + session.access_token : 'Bearer ' + SUPA_KEY;
            const res = await fetch(SUPA_URL + '/rest/v1/' + table + '?select=' + (cols || '*') + '&' + col + '=eq.' + encodeURIComponent(val) + '&order=' + orderCol + (opts?.ascending === false ? '.desc' : '.asc'), {
              headers: { ...supa._headers, 'Authorization': authHeader }
            });
            const data = await res.json();
            if (!res.ok) resolve({ data: null, error: data });
            else resolve({ data, error: null });
          }
        })
      }),
      order: (col, opts) => ({
        then: async (resolve) => {
          const session = supa._session || JSON.parse(localStorage.getItem('sb_session') || 'null');
          const authHeader = session?.access_token ? 'Bearer ' + session.access_token : 'Bearer ' + SUPA_KEY;
          const res = await fetch(SUPA_URL + '/rest/v1/' + table + '?select=' + (cols || '*') + '&order=' + col + (opts?.ascending === false ? '.desc' : '.asc'), {
            headers: { ...supa._headers, 'Authorization': authHeader }
          });
          const data = await res.json();
          if (!res.ok) resolve({ data: null, error: data });
          else resolve({ data, error: null });
        }
      })
    })
  })
};

const BACKEND_URL = 'https://futuriads-backend-production.up.railway.app';


async function loadHistory() {
  const container = document.getElementById('histContent');
  if (!container) return;
  container.innerHTML = '<div style="color:#888;padding:40px;text-align:center;">Cargando creaciones...</div>';
  try {
    const { data, error } = await supa.from('videos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    historyData = data || [];
  } catch (e) {
    console.error('Error historial:', e.message);
    historyData = [];
  }
  renderHistory();
  updateDashMetrics();
  loadDashRecent();
}

function updateDashMetrics() {
  // Videos este mes
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const videosThisMonth = historyData.filter(v => new Date(v.created_at) >= startOfMonth).length;
  // Diferencia vs mes pasado
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const videosLastMonth = historyData.filter(v => {
    const d = new Date(v.created_at);
    return d >= startOfLastMonth && d < startOfMonth;
  }).length;
  const diff = videosThisMonth - videosLastMonth;

  const metricVideos = document.getElementById('dashMetricVideos');
  const metricVideosSub = document.getElementById('dashMetricVideosSub');
  if (metricVideos) metricVideos.textContent = videosThisMonth;
  if (metricVideosSub) {
    if (videosLastMonth > 0 || diff !== 0) {
      const sign = diff >= 0 ? '+' : '';
      metricVideosSub.textContent = `${sign}${diff} vs. mes pasado`;
    } else {
      metricVideosSub.textContent = 'Este mes';
    }
  }

  // Subtexto del greeting
  const dashSub = document.getElementById('dashSub');
  if (dashSub) {
    if (videosThisMonth > 0) {
      dashSub.textContent = `Generaste ${videosThisMonth} anuncio${videosThisMonth !== 1 ? 's' : ''} este mes — vamos por más.`;
    } else {
      dashSub.textContent = '¿Qué estás creando hoy?';
    }
  }

  // Tiempo ahorrado: ~4 horas por video de producción tradicional
  const HOURS_PER_VIDEO = 4;
  const totalVideos = historyData.length;
  const hoursSaved = totalVideos * HOURS_PER_VIDEO;
  const costSaved = (hoursSaved * 80).toLocaleString('es-AR'); // ~$80 USD/hora de producción

  const metricTime = document.getElementById('dashMetricTime');
  const metricTimeSub = document.getElementById('dashMetricTimeSub');
  if (metricTime) metricTime.textContent = hoursSaved > 0 ? `${hoursSaved} h` : '0 h';
  if (metricTimeSub) metricTimeSub.textContent = hoursSaved > 0 ? `Equivale a ~$${costSaved} en producción` : 'Generá tu primer anuncio';
}

function goToApp(){
  // Check session before going to app
  supa.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      const l=document.getElementById('landing'),a=document.getElementById('app');
      const isPreApp = document.documentElement.classList.contains('pre-app');

      // Limpiar AMBOS guards (pre-app y pre-landing) ahora que estamos seguros de
      // que hay sesión válida. Sin esto, html.pre-landing bloquea la app vía CSS
      // si el usuario hace login normal desde la landing (no era refresh).
      document.documentElement.classList.remove('pre-app', 'pre-landing');

      if (isPreApp) {
        // Caso refresh: el pre-render ya mostró la app. Saltarse la animación.
        l.style.display = 'none';
        a.style.display = 'flex';
        a.style.opacity = '1';
      } else {
        // Caso login normal desde la landing: animación suave
        l.style.opacity='0';
        setTimeout(()=>{
          l.style.display='none';
          a.style.display='flex';
          requestAnimationFrame(()=>{a.style.opacity='1';});
        },300);
      }
      // Cargar el perfil del usuario logueado (con retry por si falla la primera vez)
      loadProfile().catch(err => {
        console.error('[goToApp] loadProfile falló, reintentando en 1s:', err);
        setTimeout(() => loadProfile(), 1000);
      });

      // Restaurar última pantalla visitada (si existe y es válida)
      const validScreens = ['dashboard','nuevo','nueva-imagen','historial','perfil','campanas'];
      let lastScreen = 'dashboard';
      try {
        const saved = localStorage.getItem('futuriads_lastScreen');
        if (saved && validScreens.includes(saved)) lastScreen = saved;
      } catch(e) {}
      if (lastScreen !== 'dashboard') {
        // Si es pre-app (refresh), instantáneo. Si no, esperar la animación.
        if (isPreApp) {
          showScreen(lastScreen, true);
        } else {
          setTimeout(() => showScreen(lastScreen), 320);
        }
      } else if (isPreApp) {
        // Si es dashboard (default) en pre-app, también marcamos el nav y screen activos
        document.querySelectorAll('.a-nav-item').forEach(n => n.classList.remove('active'));
        const navEl = document.getElementById('nav-dashboard');
        if (navEl) navEl.classList.add('active');
        const sc = document.getElementById('screen-dashboard');
        if (sc) { sc.classList.add('active'); sc.style.display = 'block'; sc.style.opacity = '1'; }
      }
    } else {
      // No hay sesión real: revertir el pre-app si lo había y mostrar landing
      document.documentElement.classList.remove('pre-app');
      document.documentElement.classList.add('pre-landing');
      const l = document.getElementById('landing');
      const a = document.getElementById('app');
      if (a) { a.style.display = 'none'; }
      if (l) { l.style.display = 'block'; l.style.opacity = '1'; }
      openAuthModal('login');
    }
  });
}

// Auto-bootstrap: completar la inicialización (cargar perfil, marcar nav,
// remover los CSS overrides cuando todo esté listo)
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: { session } } = await supa.auth.getSession();
    const isPreApp = document.documentElement.classList.contains('pre-app');

    if (!session) {
      // No hay sesión real → revertir el guard si existía y mostrar la landing
      if (isPreApp) {
        document.documentElement.classList.remove('pre-app');
        document.documentElement.classList.add('pre-landing');
        const a = document.getElementById('app');
        const l = document.getElementById('landing');
        if (a) a.style.display = 'none';
        if (l) { l.style.display = 'block'; l.style.opacity = '1'; }
      }
      return;
    }

    // Hay sesión real → entrar a la app (goToApp se encarga de cargar perfil
    // y restaurar la última pantalla).
    goToApp();
  } catch(e) {
    console.log('Bootstrap error:', e);
    // Fallback seguro: si algo falla, mostrar landing
    document.documentElement.classList.remove('pre-app');
    document.documentElement.classList.add('pre-landing');
  }
});
function goToLanding(){
  // Quitar el guard pre-app si estaba activo (caso post-logout)
  document.documentElement.classList.remove('pre-app');
  document.documentElement.classList.add('pre-landing');

  const l=document.getElementById('landing'),a=document.getElementById('app');
  a.style.opacity='0';
  setTimeout(()=>{
    a.style.display='none';
    l.style.display='block';
    requestAnimationFrame(()=>{l.style.opacity='1';});
    resetGenerator();
    // Reset auth forms so user must log in again
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) { loginForm.reset(); }
    if (signupForm) { signupForm.reset(); }
    // Show login modal if it exists
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.remove('open');
  },300);
}

/* ---- Cargar perfil dinámico desde Supabase ---- */
function getInitials(name) {
  if (!name) return '--';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getFirstName(name) {
  if (!name) return '';
  return name.trim().split(/\s+/)[0];
}

function getPlanInfo(plan) {
  // Espejo de la config del backend en server.js > PLANS
  const plans = {
    'none':    { label: 'Sin plan', price: '$0',  credits: 0,      topup_price: 0, topup_credits: 0    },
    'starter': { label: 'Starter',  price: '$19', credits: 15000,  topup_price: 9, topup_credits: 8000 },
    'growth':  { label: 'Growth',   price: '$49', credits: 50000,  topup_price: 7, topup_credits: 8000 },
    'scale':   { label: 'Scale',    price: '$129',credits: 150000, topup_price: 5, topup_credits: 8000 }
  };
  return plans[plan] || plans.none;
}

// Guardamos los datos del usuario actual acá para poder leerlos desde
// otras funciones (cálculo de costo, modal de upgrade, etc.) sin volver
// a pegarle al backend cada vez.
let _currentUser = null;

async function loadProfile() {
  try {
    // 1. Obtener la sesión actual
    const { data: { session } } = await supa.auth.getSession();
    if (!session) {
      console.warn('No hay sesión activa, no se puede cargar el perfil.');
      return;
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // PASO INTERMEDIO: actualizar el UI con datos mínimos (email + iniciales del email)
    // para que el usuario nunca vea "Cargando..." infinito si la query tarda o falla.
    updateProfileUI({
      full_name: userEmail.split('@')[0],
      country: '—',
      plan: 'none',
      subscription_credits: 0,
      topup_credits: 0
    }, userEmail);

    // 2. Llamar a /api/me en el backend, que aplica el reset de créditos lazy
    //    y devuelve los datos completos (perfil + créditos + plan).
    let me = null;
    try {
      const resp = await fetch(BACKEND_URL + '/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (resp.ok) {
        me = await resp.json();
      } else {
        console.error('Error en /api/me:', resp.status);
      }
    } catch (apiErr) {
      console.error('Excepción llamando /api/me:', apiErr);
    }

    // 3. Si /api/me falló, hacemos fallback a leer profiles directo (UI mínimo)
    if (!me) {
      try {
        const { data, error } = await supa.from('profiles').select('*').eq('id', userId).single();
        if (!error && data) {
          me = {
            full_name: data.full_name,
            country: data.country,
            plan: data.plan || 'none',
            subscription_credits: data.subscription_credits || 0,
            topup_credits: data.topup_credits || 0,
            period_end: data.period_end
          };
        }
      } catch (queryErr) {
        console.error('Excepción cargando perfil de fallback:', queryErr);
      }
    }

    if (me) {
      _currentUser = { ...me, userId, email: userEmail };
      updateProfileUI(me, userEmail);
    }
    // Cargar historial (para borradores recientes y métricas) y tips de IA
    loadHistory();
    loadDashTips();
  } catch (e) {
    console.error('Error en loadProfile:', e);
  }
}

/**
 * Refresca solo los créditos del usuario actual (después de generar algo).
 * No recarga todo el perfil porque sería overkill.
 */
async function refreshCredits() {
  if (!_currentUser || !_currentUser.userId) return;
  try {
    const resp = await fetch(BACKEND_URL + '/api/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: _currentUser.userId })
    });
    if (!resp.ok) return;
    const me = await resp.json();
    _currentUser = { ..._currentUser, ...me };
    updateCreditsUI(me);
  } catch (e) {
    console.error('Error refrescando créditos:', e);
  }
}

/**
 * Actualiza el widget de créditos del sidebar y el card de plan en el perfil.
 * Se llama desde updateProfileUI y desde refreshCredits.
 */
function updateCreditsUI(me) {
  const sub = me.subscription_credits || 0;
  const top = me.topup_credits || 0;
  const total = sub + top;
  const plan = me.plan || 'none';
  const planInfo = getPlanInfo(plan);

  // Widget del sidebar
  const widgetAmount = document.getElementById('creditsWidgetAmount');
  const widgetSub = document.getElementById('creditsWidgetSub');
  if (widgetAmount) {
    widgetAmount.textContent = total.toLocaleString('es-AR');
    widgetAmount.classList.remove('low', 'empty');
    if (total === 0) widgetAmount.classList.add('empty');
    else if (planInfo.credits > 0 && total < planInfo.credits * 0.15) widgetAmount.classList.add('low');
  }
  if (widgetSub) {
    if (plan === 'none') {
      widgetSub.textContent = 'Suscribite para empezar';
    } else if (top > 0 && sub > 0) {
      widgetSub.textContent = `${sub.toLocaleString('es-AR')} suscripción · ${top.toLocaleString('es-AR')} recarga`;
    } else if (top > 0) {
      widgetSub.textContent = `${top.toLocaleString('es-AR')} de recarga (no caducan)`;
    } else if (me.period_end) {
      const days = Math.max(0, Math.ceil((new Date(me.period_end) - new Date()) / (1000 * 60 * 60 * 24)));
      widgetSub.textContent = `Renueva en ${days} día${days === 1 ? '' : 's'}`;
    } else {
      widgetSub.textContent = planInfo.label;
    }
  }

  // Card del perfil ("Mi plan")
  const profilePlan = document.getElementById('profilePlan');
  const profilePlanPrice = document.getElementById('profilePlanPrice');
  if (profilePlan) profilePlan.textContent = planInfo.label;
  if (profilePlanPrice) profilePlanPrice.innerHTML = planInfo.price + '<span style="font-size:14px;font-weight:400;color:var(--text2)">/mes</span>';

  const planVideosText = document.querySelector('.a-plan-videos-text');
  const planBarFill = document.querySelector('.a-plan-bar-fill');
  const planRenewalText = document.querySelector('.a-plan-card-renewal');

  if (planVideosText) {
    if (plan === 'none') {
      planVideosText.textContent = 'No tenés plan activo';
    } else {
      const used = Math.max(0, planInfo.credits - sub);
      planVideosText.textContent = `Suscripción: ${used.toLocaleString('es-AR')} de ${planInfo.credits.toLocaleString('es-AR')} créditos usados`;
    }
  }
  if (planBarFill) {
    let pct = 0;
    if (plan !== 'none' && planInfo.credits > 0) {
      const used = Math.max(0, planInfo.credits - sub);
      pct = Math.min(100, Math.round(used / planInfo.credits * 100));
    }
    planBarFill.style.width = pct + '%';
  }
  if (planRenewalText) {
    if (plan === 'none') {
      planRenewalText.textContent = 'Suscribite para acceder a todos los modelos';
    } else if (me.period_end) {
      const d = new Date(me.period_end);
      const days = Math.max(0, Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)));
      planRenewalText.textContent = `${sub.toLocaleString('es-AR')} créditos restantes · Renueva en ${days} día${days === 1 ? '' : 's'}` + (top > 0 ? ` · ${top.toLocaleString('es-AR')} de recarga` : '');
    }
  }
}

function updateProfileUI(profile, email) {
  const fullName = profile.full_name || 'Usuario';
  const country = profile.country || '—';
  const plan = profile.plan || 'none';
  const initials = getInitials(fullName);
  const firstName = getFirstName(fullName);
  const planInfo = getPlanInfo(plan);

  // Sidebar
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserPlan = document.getElementById('sidebarUserPlan');
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  if (sidebarUserName) sidebarUserName.textContent = firstName;
  if (sidebarUserPlan) sidebarUserPlan.textContent = planInfo.label;

  // Dashboard greeting
  const dashGreeting = document.getElementById('dashGreeting');
  const dashSub = document.getElementById('dashSub');
  const hour = new Date().getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  if (dashGreeting) dashGreeting.innerHTML = `${saludo}, <em>${firstName}</em>`;
  if (dashSub) {
    // El subtexto dinámico se actualiza en updateDashMetrics cuando carga el historial
    dashSub.textContent = '¿Qué estás creando hoy?';
  }

  // Profile page (datos personales)
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileFieldName = document.getElementById('profileFieldName');
  const profileFieldEmail = document.getElementById('profileFieldEmail');
  const profileFieldCountry = document.getElementById('profileFieldCountry');

  if (profileAvatar) profileAvatar.textContent = initials;
  if (profileName) profileName.textContent = fullName;
  if (profileEmail) profileEmail.textContent = email;
  if (profileFieldName) profileFieldName.textContent = fullName;
  if (profileFieldEmail) profileFieldEmail.textContent = email;
  if (profileFieldCountry) profileFieldCountry.textContent = country;

  // Créditos y card de plan (delegamos a updateCreditsUI)
  updateCreditsUI(profile);
}

function openSignOutModal() {
  document.getElementById('signOutModal').classList.add('open');
}

function closeSignOutModal(e) {
  if (!e || e.target === document.getElementById('signOutModal')) {
    document.getElementById('signOutModal').classList.remove('open');
  }
}

async function confirmSignOut() {
  document.getElementById('signOutModal').classList.remove('open');
  try {
    await supa.auth.signOut();
    // Limpiar la pantalla guardada para que un nuevo login arranque limpio
    try { localStorage.removeItem('futuriads_lastScreen'); } catch(e) {}
  } catch(e) {
    console.error('Error cerrando sesión:', e);
  }
  goToLanding();
}

// =============================================
// CAMPAÑAS — Estado global
// =============================================
const _camp = {
  step: 1, title: '', script: '', scriptMode: 'manual',
  photoBase64: null, photoUrl: null, photoUploading: false,
  productPhotoBase64: null, productPhotoUrl: null, productPhotoUploading: false,
  clipDuration: 8, resolution: '480p', videoMode: 'talking',
  aspectRatio: '9:16', genMode: 'review', accent: 'argentine', voice: 'female',
  chunks: [], hooks: [], bodyChunks: [], corrections: [],
  // V2: audio + visual prompts
  audioUrl: null, audioDuration: 0, audioClips: [],
  visualPrompts: [],
  campaignId: null, variantsMap: {}, currentClipIndex: 0,
  pollingInterval: null,
  clipsLaunched: false,
  clipEnqueued: {}
};

function campStartNew() {
  Object.assign(_camp, {
    step: 1, title: '', script: '', scriptMode: 'manual',
    photoBase64: null, photoUrl: null, photoUploading: false,
    productPhotoBase64: null, productPhotoUrl: null, productPhotoUploading: false,
    clipDuration: 8, resolution: '480p',
    aspectRatio: '9:16', genMode: 'review', accent: 'argentine', voice: 'female',
    chunks: [], hooks: [], bodyChunks: [], corrections: [],
    audioUrl: null, audioDuration: 0, audioClips: [], visualPrompts: [],
    campaignId: null, variantsMap: {}, currentClipIndex: 0,
    clipsLaunched: false, clipEnqueued: {}
  });
  const ti = document.getElementById('campTitleInput'); if(ti) ti.value = '';
  const si = document.getElementById('campScriptInput'); if(si) si.value = '';
  const pi = document.getElementById('campProductInput'); if(pi) pi.value = '';
  const sr = document.getElementById('campScriptAIResult'); if(sr){ sr.value=''; sr.style.display='none'; }
  const pz = document.getElementById('campUploadZone'); if(pz) pz.classList.remove('has-file');
  const pp = document.getElementById('campPhotoPreview'); if(pp){ pp.src=''; }
  const pzp = document.getElementById('campUploadZoneProduct'); if(pzp) pzp.classList.remove('has-file');
  const ppp = document.getElementById('campProductPreview'); if(ppp){ ppp.src=''; }
  campGoStep(1);
  document.getElementById('campView-list').style.display = 'none';
  document.getElementById('campView-wizard').style.display = 'block';
  document.getElementById('campView-generating').style.display = 'none';
}

// ── Subtítulos: estado y helpers ──
let _subPanelOpen = true;

function campToggleSubPanel() {
  _subPanelOpen = !_subPanelOpen;
  document.getElementById('campSubBody').style.display = _subPanelOpen ? 'block' : 'none';
  document.getElementById('campSubChevron').style.transform = _subPanelOpen ? '' : 'rotate(-90deg)';
}

const _subtitleState = { bold: true, italic: false, position: 'bottom', mode: 'block' };

const SUBTITLE_PRESETS = {
  tiktok:    { font: 'Arial Black', size: 28, color: '#ffffff', outline: '#000000', outlineW: 3, bold: true,  italic: false },
  netflix:   { font: 'Helvetica',   size: 24, color: '#ffffff', outline: '#000000', outlineW: 4, bold: true,  italic: false },
  bold:      { font: 'Impact',      size: 36, color: '#FFD700', outline: '#000000', outlineW: 4, bold: false, italic: false },
  minimal:   { font: 'Helvetica',   size: 20, color: '#ffffff', outline: '#000000', outlineW: 1, bold: false, italic: false },
  highlight: { font: 'Arial Black', size: 28, color: '#ffffff', outline: '#000000', outlineW: 3, bold: true,  italic: false }
};

function campToggleSubtitles() {
  _subtitleState.enabled = !(_subtitleState.enabled !== false);
  const on = _subtitleState.enabled !== false;
  const badge = document.getElementById('campSubStatusBadge');
  if (badge) { badge.textContent = on ? 'ON' : 'OFF'; badge.style.background = on ? '#fff' : '#444'; badge.style.color = on ? '#000' : '#aaa'; }
  document.getElementById('campSubToggle').style.background = on ? '#fff' : '#444';
  document.getElementById('campSubThumb').style.left = on ? '20px' : '3px';
  document.getElementById('campSubOptions').style.opacity = on ? '1' : '0.35';
  document.getElementById('campSubOptions').style.pointerEvents = on ? '' : 'none';
}

function campSyncColorFromHex(colorId, hexId) {
  const hex = document.getElementById(hexId).value;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    document.getElementById(colorId).value = hex;
    campSubtitlePreview();
  }
}

function campApplyPreset(name) {
  const p = SUBTITLE_PRESETS[name];
  if (!p) return;
  document.getElementById('campSubFont').value = p.font;
  document.getElementById('campSubSize').value = p.size;
  document.getElementById('campSubSizeVal').textContent = p.size;
  document.getElementById('campSubColor').value = p.color;
  document.getElementById('campSubColorHex').value = p.color;
  document.getElementById('campSubOutlineColor').value = p.outline;
  document.getElementById('campSubOutlineHex').value = p.outline;
  document.getElementById('campSubOutlineWidth').value = p.outlineW;
  document.getElementById('campSubBorderVal').textContent = p.outlineW;
  _subtitleState.bold = p.bold;
  _subtitleState.italic = p.italic;
  const boldBtn = document.getElementById('campSubBoldBtn');
  const italicBtn = document.getElementById('campSubItalicBtn');
  boldBtn.style.border = p.bold ? '1px solid #fff' : '1px solid var(--border)';
  boldBtn.style.background = p.bold ? 'var(--hover)' : 'var(--card2)';
  boldBtn.style.color = p.bold ? '#fff' : 'var(--text2)';
  italicBtn.style.border = p.italic ? '1px solid #fff' : '1px solid var(--border)';
  italicBtn.style.background = p.italic ? 'var(--hover)' : 'var(--card2)';
  italicBtn.style.color = p.italic ? '#fff' : 'var(--text2)';
  campSubtitlePreview();
}

function campToggleBold() {
  _subtitleState.bold = !_subtitleState.bold;
  const btn = document.getElementById('campSubBoldBtn');
  btn.style.border = _subtitleState.bold ? '1px solid #fff' : '1px solid var(--border)';
  btn.style.background = _subtitleState.bold ? 'var(--hover)' : 'var(--card2)';
  btn.style.color = _subtitleState.bold ? '#fff' : 'var(--text2)';
  campSubtitlePreview();
}

function campToggleItalic() {
  _subtitleState.italic = !_subtitleState.italic;
  const btn = document.getElementById('campSubItalicBtn');
  btn.style.border = _subtitleState.italic ? '1px solid #fff' : '1px solid var(--border)';
  btn.style.background = _subtitleState.italic ? 'var(--hover)' : 'var(--card2)';
  btn.style.color = _subtitleState.italic ? '#fff' : 'var(--text2)';
  campSubtitlePreview();
}

function campSetPosition(pos) {
  _subtitleState.position = pos;
  ['top','center','bottom'].forEach(p => {
    const btn = document.getElementById('campSubPos' + p.charAt(0).toUpperCase() + p.slice(1));
    if (!btn) return;
    btn.style.border = p === pos ? '1px solid #fff' : '1px solid var(--border)';
    btn.style.background = p === pos ? 'var(--hover)' : 'var(--card2)';
    btn.style.color = p === pos ? '#fff' : 'var(--text2)';
  });
  const preview = document.getElementById('campSubPreviewText');
  if (preview) {
    preview.parentElement.style.alignItems = pos === 'top' ? 'flex-start' : pos === 'center' ? 'center' : 'flex-end';
  }
}

function campSetSubMode(mode) {
  _subtitleState.mode = mode;
  ['block','word'].forEach(m => {
    const btn = document.getElementById('campSubMode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (!btn) return;
    btn.style.border = m === mode ? '1px solid #fff' : '1px solid var(--border)';
    btn.style.background = m === mode ? 'var(--hover)' : 'var(--card2)';
    btn.style.color = m === mode ? '#fff' : 'var(--text2)';
  });
  const highlightRow = document.getElementById('campSubHighlightRow');
  if (highlightRow) highlightRow.style.display = mode === 'word' ? 'block' : 'none';
}

function campSubtitlePreview() {
  const el = document.getElementById('campSubPreviewText');
  const box = document.getElementById('campSubPreviewBox');
  if (!el) return;
  const font = document.getElementById('campSubFont')?.value || 'Arial Black';
  const size = parseInt(document.getElementById('campSubSize')?.value || 26);
  const color = document.getElementById('campSubColor')?.value || '#ffffff';
  const outlineColor = document.getElementById('campSubOutlineColor')?.value || '#000000';
  const outlineW = parseInt(document.getElementById('campSubOutlineWidth')?.value || 3);
  const pos = _subtitleState.position || 'bottom';

  // preview is 120px wide ≈ 1080px video → scale factor ~0.111
  const previewSize = Math.max(7, Math.round(size * 0.42));
  el.style.fontFamily = font;
  el.style.fontSize = previewSize + 'px';
  el.style.color = color;
  el.style.fontWeight = _subtitleState.bold ? '900' : '400';
  el.style.fontStyle = _subtitleState.italic ? 'italic' : 'normal';

  // Position in preview
  if (box) {
    box.style.top = pos === 'top' ? '8%' : pos === 'center' ? '44%' : 'auto';
    box.style.bottom = pos === 'bottom' ? '8%' : 'auto';
    box.style.transform = pos === 'center' ? 'translateY(-50%)' : 'none';
  }

  const o = Math.max(1, Math.round(outlineW * 0.5));
  const oc = outlineColor;
  el.style.textShadow = outlineW === 0 ? 'none'
    : `-${o}px -${o}px 0 ${oc},${o}px -${o}px 0 ${oc},-${o}px ${o}px 0 ${oc},${o}px ${o}px 0 ${oc}`;
}

function campGetSubtitleStyle() {
  if (_subtitleState.enabled === false) return null;
  const enabled = !(document.getElementById('campSubToggle')?.style.background === 'rgb(51, 51, 51)');
  if (!enabled) return null;

  const hexToASS = hex => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `&H00${b.toString(16).padStart(2,'0').toUpperCase()}${g.toString(16).padStart(2,'0').toUpperCase()}${r.toString(16).padStart(2,'0').toUpperCase()}`;
  };

  const color = document.getElementById('campSubColor')?.value || '#ffffff';
  const outlineColor = document.getElementById('campSubOutlineColor')?.value || '#000000';

  return {
    fontFamily: document.getElementById('campSubFont')?.value || 'Arial Black',
    fontSize: parseInt(document.getElementById('campSubSize')?.value || 26),
    fontColor: hexToASS(color),
    outlineColor: hexToASS(outlineColor),
    outlineWidth: parseInt(document.getElementById('campSubOutlineWidth')?.value || 3),
    position: _subtitleState.position || 'bottom',
    bold: _subtitleState.bold,
    italic: _subtitleState.italic,
    mode: _subtitleState.mode || 'block',
    wordsPerBlock: _subtitleState.mode === 'word' ? 1 : 4
  };
}

async function campAssemble() {
  if (!_camp.campaignId) { showToast('Error: no hay campaña activa'); return; }
  
  const btn = document.getElementById('campAssembleBtn');
  btn.disabled = true; btn.textContent = 'Ensamblando...';
  document.getElementById('campAssembleStatus').style.display = 'block';
  const subtitleStyle = campGetSubtitleStyle();
  document.getElementById('campAssembleMsg').textContent = subtitleStyle
    ? 'Ensamblando audio + video + subtítulos... Esto puede tardar un minuto.'
    : 'Ensamblando audio + video... Esto puede tardar un minuto.';
  document.getElementById('campFinalVideo').style.display = 'none';

  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/assemble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: _camp.campaignId,
        userId: _currentUser.userId,
        subtitleStyle
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error ensamblando');

    console.log('Video final:', data.finalVideoUrl);
    
    document.getElementById('campAssembleStatus').style.display = 'none';
    document.getElementById('campFinalVideo').style.display = 'block';
    document.getElementById('campFinalPlayer').src = data.finalVideoUrl;
    document.getElementById('campFinalDownload').href = data.finalVideoUrl;
    
    btn.textContent = 'Video ensamblado';
    showToast('Video final listo');

  } catch (e) {
    console.error('Error ensamblando:', e);
    showToast('Error: ' + e.message);
    document.getElementById('campAssembleMsg').textContent = 'Error: ' + e.message;
    btn.disabled = false;
    btn.textContent = 'Ensamblar video final';
  }
}

function campBackToList() {
  if (_camp.pollingInterval){ clearInterval(_camp.pollingInterval); _camp.pollingInterval = null; }
  document.getElementById('campView-list').style.display = 'block';
  document.getElementById('campView-wizard').style.display = 'none';
  document.getElementById('campView-generating').style.display = 'none';
  campLoadList();
}

function campGoStep(n) {
  document.querySelectorAll('.camp-wizard-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('campStep-' + n);
  if(el) el.classList.add('active');
  _camp.step = n;
  
  // Adaptar paso 2 según modo
  if (n === 2) {
    const prodSection = document.getElementById('campProductUploadSection');
    if (prodSection) prodSection.style.display = 'block';
    const title = document.getElementById('campStep2Title');
    const sub = document.getElementById('campStep2Sub');
    if (_camp.videoMode === 'talking') {
      if (title) title.textContent = 'Fotos del avatar y el producto';
      if (sub) sub.textContent = 'Subí la foto de la persona que va a hablar en el video. La foto del producto es opcional.';
    } else {
      if (title) title.textContent = 'Fotos del avatar y el producto';
      if (sub) sub.textContent = 'Subí la foto de la persona que va a protagonizar el video y una foto del producto.';
    }
  }
}

function campSetScriptMode(mode) {
  _camp.scriptMode = mode;
  document.getElementById('campScriptModeManual').classList.toggle('selected', mode === 'manual');
  document.getElementById('campScriptModeAI').classList.toggle('selected', mode === 'ai');
  document.getElementById('campScriptManualArea').style.display = mode === 'manual' ? 'block' : 'none';
  document.getElementById('campScriptAIArea').style.display = mode === 'ai' ? 'block' : 'none';
}

async function campGenerateScript() {
  const product = document.getElementById('campProductInput').value.trim();
  if(!product){ showToast('Describí el producto primero'); return; }
  const btn = document.getElementById('campGenScriptBtn');
  btn.textContent = 'Generando...'; btn.disabled = true;
  try {
    const resp = await fetch(BACKEND_URL + '/api/generate-script', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, tone: 'Entusiasta y cercano', duration: '60', language: 'español rioplatense' })
    });
    const data = await resp.json();
    if(data.script){
      const el = document.getElementById('campScriptAIResult');
      el.value = data.script; el.style.display = 'block';
      showToast('Guión generado. Revisalo y editalo si querés.');
    }
  } catch(e){ showToast('Error generando el guión'); }
  btn.textContent = 'Generar guión con IA'; btn.disabled = false;
}

function campSelectVideoMode(mode) {
  _camp.videoMode = mode;
  document.getElementById('campVideoModeTalking').classList.toggle('selected', mode === 'talking');
  document.getElementById('campVideoModeVoiceover').classList.toggle('selected', mode === 'voiceover');
}

function campStep1Next() {
  const title = document.getElementById('campTitleInput').value.trim();
  if(!title){ showToast('Ponele un nombre a la campaña'); return; }
  let script = '';
  if(_camp.scriptMode === 'manual'){
    script = document.getElementById('campScriptInput').value.trim();
  } else {
    script = document.getElementById('campScriptAIResult').value.trim();
  }
  if(!script || script.length < 50){ showToast('El guión es muy corto. Necesitás al menos 50 caracteres.'); return; }
  _camp.title = title;
  _camp.script = script;
  campGoStep(2);
}

function campPhotoSelected(e) {
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){ showToast('La foto es muy grande (máx. 5MB)'); return; }

  // Resetear el input para permitir re-selección del mismo archivo
  e.target.value = '';

  // Mostrar preview local inmediatamente
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('campPhotoPreview');
    if(preview) preview.src = ev.target.result;
    const zone = document.getElementById('campUploadZone');
    if(zone) zone.classList.add('has-file');
  };
  reader.readAsDataURL(file);

  _camp.photoUrl = null;
  _camp.photoUploading = true;
  showToast('Subiendo foto del avatar...');
  campUploadPhoto(file);
}

async function campUploadPhoto(file) {
  try {
    const { data: { session } } = await supa.auth.getSession();
    if(!session) { showToast('Error: no hay sesión activa'); return; }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = 'avatars/' + session.user.id + '/' + Date.now() + '.' + ext;

    // Upload directo a Supabase Storage via REST API
    const uploadResp = await fetch(
      SUPA_URL + '/storage/v1/object/campaign-photos/' + fileName,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + session.access_token,
          'Content-Type': file.type || 'image/jpeg',
          'x-upsert': 'true'
        },
        body: file
      }
    );

    if(!uploadResp.ok) {
      const err = await uploadResp.text();
      console.error('Error subiendo foto:', err);
      showToast('Error subiendo la foto. Intentá de nuevo.');
      _camp.photoUploading = false;
      return;
    }

    // Construir URL pública
    _camp.photoUrl = SUPA_URL + '/storage/v1/object/public/campaign-photos/' + fileName;
    _camp.photoUploading = false;
    console.log('Foto subida OK:', _camp.photoUrl);
    showToast('Foto del avatar subida');
  } catch(err) {
    console.error('Error en upload:', err);
    showToast('Error subiendo la foto.');
    _camp.photoUploading = false;
  }
}

function campStep2Next() {
  if(!_camp.photoUrl && !_camp.photoUploading){
    showToast('Subí una foto del avatar primero');
    return;
  }
  if(_camp.photoUploading){
    showToast('Esperá, la foto del avatar se está subiendo...');
    return;
  }
  // Producto solo requerido en modo voiceover
  if (_camp.videoMode === 'voiceover') {
    if(!_camp.productPhotoUrl && !_camp.productPhotoUploading){
      showToast('Subí una foto del producto primero');
      return;
    }
    if(_camp.productPhotoUploading){
      showToast('Esperá, la foto del producto se está subiendo...');
      return;
    }
  }
  // Actualizar UI del paso 3 según modo
  document.getElementById('campVoiceSection').style.display = _camp.videoMode === 'voiceover' ? 'block' : 'none';
  document.getElementById('campAccentSection').style.display = _camp.videoMode === 'talking' ? 'block' : 'none';
  document.getElementById('campGenderSection').style.display = _camp.videoMode === 'talking' ? 'block' : 'none';
  campGoStep(3);
}

function campProductPhotoSelected(e) {
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){ showToast('La foto es muy grande (máx. 5MB)'); return; }
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('campProductPreview');
    if(preview) preview.src = ev.target.result;
    const zone = document.getElementById('campUploadZoneProduct');
    if(zone) zone.classList.add('has-file');
  };
  reader.readAsDataURL(file);
  _camp.productPhotoUrl = null;
  _camp.productPhotoUploading = true;
  showToast('Subiendo foto del producto...');
  campUploadProductPhoto(file);
}

async function campUploadProductPhoto(file) {
  try {
    const { data: { session } } = await supa.auth.getSession();
    if(!session) { showToast('Error: no hay sesión activa'); _camp.productPhotoUploading = false; return; }
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = 'products/' + session.user.id + '/' + Date.now() + '.' + ext;
    const uploadResp = await fetch(
      SUPA_URL + '/storage/v1/object/campaign-photos/' + fileName,
      { method: 'POST', headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': file.type || 'image/jpeg', 'x-upsert': 'true' }, body: file }
    );
    if(!uploadResp.ok) {
      const err = await uploadResp.text();
      console.error('Error subiendo foto producto:', err);
      showToast('Error subiendo la foto del producto. Intentá de nuevo.');
      _camp.productPhotoUploading = false;
      return;
    }
    _camp.productPhotoUrl = SUPA_URL + '/storage/v1/object/public/campaign-photos/' + fileName;
    _camp.productPhotoUploading = false;
    console.log('Foto producto subida:', _camp.productPhotoUrl);
    showToast('Foto del producto subida');
  } catch(err) {
    console.error('Error upload producto:', err);
    showToast('Error subiendo la foto del producto.');
    _camp.productPhotoUploading = false;
  }
}

function campSelectVoice(voice, btn) {
  _camp.voice = voice;
  document.querySelectorAll('#campVoiceOptions .camp-option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function campSelectAccent(accent, btn) {
  _camp.accent = accent;
  document.querySelectorAll('#campAccentOptions .camp-option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function campSelectRes(res, btn) {
  _camp.resolution = res;
  document.querySelectorAll('#campResOptions .camp-option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function campSelectAspect(aspect, btn) {
  _camp.aspectRatio = aspect;
  document.querySelectorAll('#campAspectOptions .camp-option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function campStep3Next() {
  campGoStep(4);
  if (_camp.videoMode === 'talking') {
    campLoadChunksTalking();
  } else {
    campLoadAudioAndClips();
  }
}

// Modo "talking": chunking programático como antes (hooks + body)
async function campLoadChunksTalking() {
  document.getElementById('campAudioLoading').style.display = 'block';
  document.getElementById('campClipsReady').style.display = 'none';
  document.getElementById('campAudioLoadingMsg').textContent = 'Dividiendo el guión en clips...';

  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/chunk-script', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: _camp.script })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error del servidor');

    _camp.hooks = data.hooks || [];
    _camp.bodyChunks = data.bodyChunks || [];
    _camp.corrections = data.corrections || [];
    _camp.chunks = [..._camp.hooks, ..._camp.bodyChunks].map((c, i) => ({
      ...c, index: i, variantIndex: Math.floor(i / 4)
    }));

    // Convertir a formato audioClips para reutilizar el render
    _camp.audioClips = _camp.chunks.map((c, i) => ({
      index: i,
      start: 0, end: c.estimatedSeconds || 10,
      duration: c.estimatedSeconds || 10,
      text: c.text,
      phrases: [{ text: c.text, start: 0, end: c.estimatedSeconds || 10 }]
    }));

    // No hay prompts visuales en modo talking — el prompt es el master prompt + chunk
    _camp.visualPrompts = _camp.chunks.map((c, i) => ({
      clipIndex: i,
      prompt: campBuildMasterPrompt().replace('[CHUNK]', c.text)
    }));

    campRenderTalkingClips();
  } catch (e) {
    showToast('Error: ' + e.message);
    document.getElementById('campAudioLoading').style.display = 'none';
  }
}

function campRenderTalkingClips() {
  document.getElementById('campAudioLoading').style.display = 'none';
  document.getElementById('campClipsReady').style.display = 'block';

  // Ocultar audio player en modo talking
  const audioSection = document.getElementById('campAudioPlayer');
  if (audioSection) audioSection.parentElement.style.display = 'none';

  document.getElementById('campAudioClipCount') && (document.getElementById('campAudioClipCount').textContent = _camp.chunks.length);

  const list = document.getElementById('campClipsList');
  list.innerHTML = '';

  function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(80, ta.scrollHeight) + 'px';
  }

  _camp.chunks.forEach((chunk, i) => {
    const label = 'Clip ' + (i + 1);
    const vp = _camp.visualPrompts.find(p => p.clipIndex === i);

    const item = document.createElement('div');
    item.className = 'camp-chunk-item';
    item.innerHTML = '<div class="camp-chunk-num">' + (i + 1) + '</div>' +
      '<div style="flex:1;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<span style="font-size:12px;font-weight:600;color:var(--text1);">' + label + '</span>' +
          '<span class="camp-chunk-dur-badge" style="font-size:11px;color:var(--text3);background:var(--card2);padding:2px 8px;border-radius:12px;">~' + (chunk.estimatedSeconds || 10) + 's · ' + chunk.text.length + ' chars</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text2);margin-bottom:8px;padding:8px 10px;background:var(--card2);border-radius:6px;line-height:1.5;">' + chunk.text + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
          '<span style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;">Prompt</span>' +
        '</div>' +
        '<textarea class="camp-chunk-text" data-index="' + i + '" id="campPromptTA-' + i + '">' + (vp ? vp.prompt : '') + '</textarea>' +
      '</div>';

    const ta = item.querySelector('textarea');
    setTimeout(() => autoResize(ta), 0);
    ta.addEventListener('input', (e) => {
      const vpIdx = _camp.visualPrompts.findIndex(p => p.clipIndex === i);
      if (vpIdx >= 0) _camp.visualPrompts[vpIdx].prompt = e.target.value;
      autoResize(e.target);
    });
    list.appendChild(item);
  });

  // Costo
  const rateMap = { '480p': 93.5, '720p': 207, '1080p': 521 };
  const rate = rateMap[_camp.resolution] || 93.5;
  const clipsCost = _camp.chunks.reduce((acc, c) => acc + Math.round((c.estimatedSeconds || 10) * rate), 0);
  const totalVariants = Math.floor((_camp.chunks.length - 1) / 4) + 1;
  const variantCost = 48 * totalVariants;
  const totalCost = Math.round(clipsCost + variantCost);
  document.getElementById('campTotalCost').textContent = totalCost.toLocaleString('es-AR');
  document.getElementById('campTotalClips').textContent = _camp.chunks.length;
}

async function campLoadAudioAndClips() {
  document.getElementById('campAudioLoading').style.display = 'block';
  document.getElementById('campClipsReady').style.display = 'none';
  document.getElementById('campAudioLoadingMsg').textContent = 'Generando audio con IA de voz...';

  try {
    // Paso 1: Crear campaña primero (necesitamos el ID)
    if (!_camp.campaignId) {
      const createResp = await fetch(BACKEND_URL + '/api/campaign/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: _currentUser.userId, title: _camp.title, script: _camp.script,
          clipDuration: 15, resolution: _camp.resolution, aspectRatio: _camp.aspectRatio
        })
      });
      const createData = await createResp.json();
      if (!createResp.ok) throw new Error(createData.error || 'Error creando campaña');
      _camp.campaignId = createData.campaign.id;
    }

    // Paso 2: Generar audio con timestamps
    document.getElementById('campAudioLoadingMsg').textContent = 'Generando audio con IA de voz...';
    const audioResp = await fetch(BACKEND_URL + '/api/campaign/generate-audio-with-timestamps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: _camp.campaignId, script: _camp.script,
        voice: _camp.voice, userId: _currentUser.userId
      })
    });
    const audioData = await audioResp.json();
    if (!audioResp.ok) {
      if (audioResp.status === 402) { showToast('No tenés créditos suficientes para el audio.'); return; }
      throw new Error(audioData.error || 'Error generando audio');
    }

    _camp.audioUrl = audioData.audioUrl;
    _camp.audioDuration = audioData.totalDuration;
    _camp.audioClips = audioData.clips;

    await refreshCredits();

    // Paso 3: Generar prompts visuales con Claude
    document.getElementById('campAudioLoadingMsg').textContent = 'Creando escenas visuales sincronizadas...';
    const promptResp = await fetch(BACKEND_URL + '/api/campaign/generate-visual-prompts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clips: _camp.audioClips,
        avatarImageUrl: _camp.photoUrl,
        productImageUrl: _camp.productPhotoUrl,
        aspectRatio: _camp.aspectRatio
      })
    });
    const promptData = await promptResp.json();
    if (!promptResp.ok) throw new Error(promptData.error || 'Error generando prompts');

    _camp.visualPrompts = promptData.visualPrompts;

    // Mostrar resultado
    campRenderAudioClips();

  } catch (e) {
    showToast('Error: ' + e.message);
    document.getElementById('campAudioLoading').style.display = 'none';
  }
}

function campRenderAudioClips() {
  document.getElementById('campAudioLoading').style.display = 'none';
  document.getElementById('campClipsReady').style.display = 'block';

  // Audio player
  const player = document.getElementById('campAudioPlayer');
  if (player && _camp.audioUrl) player.src = _camp.audioUrl;
  document.getElementById('campAudioDuration').textContent = _camp.audioDuration.toFixed(1);
  document.getElementById('campAudioClipCount').textContent = _camp.audioClips.length;

  // Renderizar clips
  const list = document.getElementById('campClipsList');
  list.innerHTML = '';

  function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(80, ta.scrollHeight) + 'px';
  }

  _camp.audioClips.forEach((clip, i) => {
    const vp = _camp.visualPrompts.find(p => p.clipIndex === i);
    const item = document.createElement('div');
    item.className = 'camp-chunk-item';

    item.innerHTML = '<div class="camp-chunk-num">' + (i + 1) + '</div>' +
      '<div style="flex:1;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<span style="font-size:12px;font-weight:600;color:var(--text1);">Clip ' + (i + 1) + '</span>' +
          '<span class="camp-chunk-dur-badge" style="font-size:11px;color:var(--text3);background:var(--card2);padding:2px 8px;border-radius:12px;">' + clip.start.toFixed(1) + 's - ' + clip.end.toFixed(1) + 's · ' + clip.duration.toFixed(1) + 's</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text2);margin-bottom:8px;padding:8px 10px;background:var(--card2);border-radius:6px;line-height:1.5;">' + clip.text + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
          '<span style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;">Prompt visual</span>' +
          '<button class="btn-ghost-sm" onclick="campRegenPrompt(' + i + ')" style="font-size:11px;padding:3px 10px;" id="campRegenBtn-' + i + '">Regenerar</button>' +
        '</div>' +
        '<textarea class="camp-chunk-text" data-index="' + i + '" id="campPromptTA-' + i + '">' + (vp ? vp.prompt : '') + '</textarea>' +
      '</div>';

    const ta = item.querySelector('textarea');
    setTimeout(() => autoResize(ta), 0);
    ta.addEventListener('input', (e) => {
      const vpIdx = _camp.visualPrompts.findIndex(p => p.clipIndex === i);
      if (vpIdx >= 0) _camp.visualPrompts[vpIdx].prompt = e.target.value;
      autoResize(e.target);
    });

    list.appendChild(item);
  });

  campUpdateCostSummaryV2();
}

async function campRegenPrompt(clipIndex) {
  const btn = document.getElementById('campRegenBtn-' + clipIndex);
  const ta = document.getElementById('campPromptTA-' + clipIndex);
  if (!btn || !ta) return;

  const clip = _camp.audioClips[clipIndex];
  const currentPrompt = ta.value;
  btn.textContent = 'Generando...'; btn.disabled = true;

  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/regenerate-prompt', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clip,
        avatarImageUrl: _camp.photoUrl,
        productImageUrl: _camp.productPhotoUrl,
        aspectRatio: _camp.aspectRatio,
        currentPrompt
      })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error');

    ta.value = data.prompt;
    ta.style.height = 'auto';
    ta.style.height = Math.max(80, ta.scrollHeight) + 'px';

    const vpIdx = _camp.visualPrompts.findIndex(p => p.clipIndex === clipIndex);
    if (vpIdx >= 0) _camp.visualPrompts[vpIdx].prompt = data.prompt;
    else _camp.visualPrompts.push({ clipIndex, prompt: data.prompt });

    showToast('Prompt regenerado');
  } catch (e) {
    showToast('Error: ' + e.message);
  }
  btn.textContent = 'Regenerar'; btn.disabled = false;
}

function campUpdateCostSummaryV2() {
  const rateMap = { '480p': 93.5, '720p': 207, '1080p': 521 };
  const rate = rateMap[_camp.resolution] || 93.5;
  const clipsCost = _camp.audioClips.reduce((acc, c) => acc + Math.round(Math.min(15, Math.ceil(c.duration)) * rate), 0);
  const audioCost = Math.round(_camp.script.length * 0.2);
  const totalCost = Math.round(clipsCost + audioCost);

  document.getElementById('campTotalCost').textContent = totalCost.toLocaleString('es-AR');
  document.getElementById('campTotalClips').textContent = _camp.audioClips.length;
}

function campSelectMode(mode) {
  _camp.genMode = mode;
  document.getElementById('campModeReview').classList.toggle('selected', mode === 'review');
  document.getElementById('campModeAuto').classList.toggle('selected', mode === 'auto');
}

async function campLaunchV2() {
  if (_camp.videoMode === 'talking') {
    await campLaunchTalking();
  } else {
    await campLaunchVoiceover();
  }
}

// Modo "talking": variantes + clips UGC (avatar habla)
async function campLaunchTalking() {
  if (!_camp.chunks.length) { showToast('Esperá a que se carguen los clips'); return; }
  const btn = document.getElementById('campLaunchBtn');
  btn.textContent = 'Creando campaña...'; btn.disabled = true;

  try {
    // Crear campaña si no existe
    if (!_camp.campaignId) {
      const createResp = await fetch(BACKEND_URL + '/api/campaign/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: _currentUser.userId, title: _camp.title, script: _camp.script,
          clipDuration: 15, resolution: _camp.resolution, aspectRatio: _camp.aspectRatio
        })
      });
      const createData = await createResp.json();
      if (!createResp.ok) throw new Error(createData.error || 'Error creando campaña');
      _camp.campaignId = createData.campaign.id;
    }

    document.getElementById('campView-wizard').style.display = 'none';
    document.getElementById('campView-generating').style.display = 'block';
    document.getElementById('campGenCampaignTitle').textContent = _camp.title;
    document.getElementById('campGenStatusTitle').textContent = 'Generando variantes del avatar...';
    document.getElementById('campGenStatusSub').textContent = 'Esto puede tardar 1-2 minutos.';
    document.getElementById('campReviewControls').style.display = 'none';
    document.getElementById('campAllDoneControls').style.display = 'none';
    document.getElementById('campGenProgressBar').style.width = '0%';
    campRenderClipsGrid();

    // Generar variantes del avatar
    const totalVariants = Math.floor((_camp.chunks.length - 1) / 4) + 1;
    const varResp = await fetch(BACKEND_URL + '/api/campaign/generate-variants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: _camp.campaignId, photoUrl: _camp.photoUrl,
        totalVariants, userId: _currentUser.userId
      })
    });
    const varData = await varResp.json();
    if (!varResp.ok) throw new Error(varData.message || varData.error || 'Error generando variantes');
    showToast('Variantes encoladas. Esperando resultados...');
    campStartPolling();
  } catch (e) {
    showToast('Error: ' + e.message);
    btn.textContent = 'Empezar generación'; btn.disabled = false;
  }
}

// Modo "voiceover": clips mudos con multi_reference
async function campLaunchVoiceover() {
  if (!_camp.audioClips.length) { showToast('Esperá a que se genere el audio'); return; }
  if (!_camp.visualPrompts.length) { showToast('Esperá a que se generen los prompts'); return; }

  const btn = document.getElementById('campLaunchBtn');
  btn.textContent = 'Generando clips...'; btn.disabled = true;

  try {
    document.getElementById('campView-wizard').style.display = 'none';
    document.getElementById('campView-generating').style.display = 'block';
    document.getElementById('campGenCampaignTitle').textContent = _camp.title;
    document.getElementById('campGenStatusTitle').textContent = 'Generando clips de video...';
    document.getElementById('campGenStatusSub').textContent = 'Los clips se generan sin audio. Después se ensambla todo.';
    document.getElementById('campReviewControls').style.display = 'none';
    document.getElementById('campAllDoneControls').style.display = 'none';
    document.getElementById('campGenProgressBar').style.width = '0%';

    // Renderizar grid con cantidad de clips de audio
    _camp.chunks = _camp.audioClips.map((c, i) => ({
      index: i, text: c.text,
      estimatedSeconds: Math.min(15, Math.ceil(c.duration)),
      variantIndex: 0
    }));
    campRenderClipsGrid();

    // Iniciar polling para detectar cuando los clips terminan
    campStartPolling();

    // Generar clips directamente (sin variantes, usamos las fotos originales)
    _camp.clipsLaunched = false;
    await campStartClipGenerationV2();

  } catch (e) {
    showToast('Error: ' + e.message);
    btn.textContent = 'Empezar generación'; btn.disabled = false;
  }
}

async function campStartClipGenerationV2() {
  if (_camp.clipsLaunched) return;
  _camp.clipsLaunched = true;

  if (_camp.genMode === 'auto') {
    document.getElementById('campGenStatusTitle').textContent = 'Generando clips secuencialmente...';
    for (let i = 0; i < _camp.audioClips.length; i++) {
      await campGenerateOneClipV2(i);
      if (i < _camp.audioClips.length - 1) await new Promise(r => setTimeout(r, 2000));
    }
  } else {
    _camp.currentClipIndex = 0;
    document.getElementById('campGenStatusTitle').textContent = 'Generando clip 1...';
    await campGenerateOneClipV2(0);
  }
}

async function campGenerateOneClipV2(index) {
  if (_camp.clipEnqueued[index]) return;

  const clip = _camp.audioClips[index];
  const vp = _camp.visualPrompts.find(p => p.clipIndex === index);
  if (!clip || !vp) return;

  _camp.clipEnqueued[index] = true;
  campUpdateClipCard(index, 'generating', null);

  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/generate-clip-v2', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: _camp.campaignId,
        clipIndex: index,
        visualPrompt: vp.prompt,
        avatarImageUrl: _camp.photoUrl,
        productImageUrl: _camp.productPhotoUrl,
        clipDuration: Math.min(15, Math.ceil(clip.duration)),
        resolution: _camp.resolution,
        aspectRatio: _camp.aspectRatio,
        userId: _currentUser.userId
      })
    });

    if (resp.status === 409) return;
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('Error generando clip v2', index, err);
      _camp.clipEnqueued[index] = false;
      campUpdateClipCard(index, 'failed', null);
      if (resp.status === 402) showToast('No tenés créditos suficientes.');
    }
  } catch (e) {
    console.error('Error clip v2', index, e);
    _camp.clipEnqueued[index] = false;
    campUpdateClipCard(index, 'failed', null);
  }
}

// Mantener campLaunch original para compatibilidad con campañas viejas
async function campLaunch() {
  // Redirigir al flujo v2
  await campLaunchV2();
}

function campRenderClipsGrid() {
  const grid = document.getElementById('campClipsGrid');
  grid.innerHTML = '';
  _camp.chunks.forEach((chunk, i) => {
    const card = document.createElement('div');
    card.className = 'camp-clip-card pending';
    card.id = 'campClip-' + i;
    card.innerHTML = '<div class="camp-clip-overlay"><div style="font-size:11px;color:rgba(255,255,255,0.4);">Esperando...</div></div><div class="camp-clip-idx">' + (i+1) + '</div>';
    grid.appendChild(card);
  });
}

function campStartPolling() {
  if(_camp.pollingInterval) clearInterval(_camp.pollingInterval);
  _camp.pollingInterval = setInterval(campPollStatus, 5000);
  campPollStatus();
}

async function campPollStatus() {
  if(!_camp.campaignId || !_currentUser) return;
  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: _camp.campaignId, userId: _currentUser.userId })
    });
    if(!resp.ok) return;
    const data = await resp.json();
    campUpdateGeneratingView(data);
  } catch(e){ console.error('Error polling:', e); }
}

async function campUpdateGeneratingView(data) {
  const { variants, clips } = data;
  const variantsDone = variants.filter(v => v.status === 'completed').length;
  const variantsTotal = variants.length;
  const clipsDone = clips.filter(c => c.status === 'completed').length;
  const clipsTotal = _camp.chunks.length || _camp.audioClips.length || clips.length;

  variants.forEach(v => {
    if(v.status === 'completed' && v.image_url) _camp.variantsMap[v.variant_index] = v.image_url;
  });

  // Si hay variantes pendientes, mostrar progreso de variantes
  if(variantsTotal > 0 && variantsDone < variantsTotal) {
    document.getElementById('campGenStatusTitle').textContent = 'Generando variantes del avatar... (' + variantsDone + '/' + variantsTotal + ')';
    document.getElementById('campGenProgressBar').style.width = Math.round((variantsDone / variantsTotal) * 30) + '%';
    return;
  }

  // Si hay variantes listas y no hay clips todavía, iniciar generación de clips
  if(variantsDone === variantsTotal && variantsTotal > 0 && clips.length === 0) {
    document.getElementById('campGenStatusTitle').textContent = 'Variantes listas. Iniciando generación de clips...';
    if (_camp.videoMode === 'talking') {
      await campStartClipGeneration();
    } else {
      await campStartClipGenerationV2();
    }
    return;
  }

  // Actualizar cards de clips
  clips.forEach(clip => campUpdateClipCard(clip.clip_index, clip.status, clip.video_url));

  const totalSteps = Math.max(variantsTotal, 1) + clipsTotal;
  const doneSoFar = (variantsTotal > 0 ? variantsDone : 1) + clipsDone;
  const pct = totalSteps > 0 ? Math.round((doneSoFar / totalSteps) * 100) : 0;
  document.getElementById('campGenProgressBar').style.width = pct + '%';

  if(_camp.genMode === 'review' && clips.length > 0) {
    const currentClip = clips.find(c => c.clip_index === _camp.currentClipIndex);
    if(currentClip && currentClip.status === 'completed') {
      campShowReviewControls(_camp.currentClipIndex);
    } else if(currentClip && currentClip.status === 'generating') {
      document.getElementById('campGenStatusTitle').textContent = 'Generando clip ' + (_camp.currentClipIndex+1) + ' de ' + clipsTotal + '...';
      document.getElementById('campReviewControls').style.display = 'none';
    }
  }
  if(_camp.genMode === 'auto') {
    document.getElementById('campGenStatusTitle').textContent = 'Generando clips... (' + clipsDone + '/' + clipsTotal + ')';
  }

  if(clipsTotal > 0 && clipsDone === clipsTotal) {
    clearInterval(_camp.pollingInterval); _camp.pollingInterval = null;
    document.getElementById('campGenProgressBar').style.width = '100%';
    document.getElementById('campGenStatusTitle').textContent = 'Todos los clips están listos';
    document.getElementById('campGenStatusSub').textContent = '';
    document.getElementById('campReviewControls').style.display = 'none';
    document.getElementById('campAllDoneControls').style.display = 'block';
    refreshCredits();
  }
}

function campUpdateClipCard(index, status, videoUrl) {
  const card = document.getElementById('campClip-' + index);
  if(!card) return;
  card.className = 'camp-clip-card ' + status;
  if(status === 'generating') {
    card.innerHTML = '<div class="camp-clip-overlay"><div class="camp-clip-spinner"></div></div><div class="camp-clip-idx">' + (index+1) + '</div>';
  } else if(status === 'completed' && videoUrl) {
    card.innerHTML = '<video src="' + videoUrl + '" controls playsinline style="width:100%;height:100%;object-fit:cover;"></video><div class="camp-clip-idx">' + (index+1) + '</div><a href="' + videoUrl + '" download="clip-' + (index+1) + '.mp4" class="camp-clip-regen" style="text-decoration:none;">↓ Descargar</a><button class="camp-clip-regen" style="bottom:30px;" onclick="campRegenClip(' + index + ')">↻ Regen</button>';
  } else if(status === 'failed') {
    card.innerHTML = '<div class="camp-clip-overlay"><div style="font-size:20px;">✕</div><div style="font-size:11px;color:#f87171;">Falló</div></div><div class="camp-clip-idx">' + (index+1) + '</div><button class="camp-clip-regen" onclick="campRegenClip(' + index + ')">↻ Reintentar</button>';
  } else if(status === 'pending') {
    card.innerHTML = '<div class="camp-clip-overlay"><div style="font-size:11px;color:rgba(255,255,255,0.3);">En cola</div></div><div class="camp-clip-idx">' + (index+1) + '</div>';
  }
}

async function campStartClipGeneration() {
  if(_camp.clipsLaunched) {
    console.log('ANTI-LOOP: campStartClipGeneration ya fue llamada. Ignorando.');
    return;
  }
  _camp.clipsLaunched = true;

  if(_camp.genMode === 'auto') {
    document.getElementById('campGenStatusTitle').textContent = 'Generando clips secuencialmente...';
    document.getElementById('campGenStatusSub').textContent = 'Esto puede tardar 1-2 minutos.';
    for(let i = 0; i < _camp.chunks.length; i++) {
      await campGenerateOneClip(i);
      if(i < _camp.chunks.length - 1) await new Promise(r => setTimeout(r, 2000));
    }
  } else {
    document.getElementById('campGenStatusTitle').textContent = 'Generando clip 1...';
    document.getElementById('campGenStatusSub').textContent = 'Esto puede tardar 1-2 minutos.';
    _camp.currentClipIndex = 0;
    await campGenerateOneClip(0);
  }
}

async function campGenerateOneClip(index) {
  if(_camp.clipEnqueued[index]) {
    console.log('ANTI-LOOP: Clip ' + index + ' ya fue encolado. Ignorando.');
    return;
  }

  const chunk = _camp.chunks[index];
  if(!chunk) return;
  const variantImageUrl = _camp.variantsMap[chunk.variantIndex];
  if(!variantImageUrl){ console.error('No hay imagen para variante', chunk.variantIndex); return; }
  
  _camp.clipEnqueued[index] = true;
  campUpdateClipCard(index, 'generating', null);
  
  const masterPrompt = campBuildMasterPrompt();
  
  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/generate-clip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: _camp.campaignId, clipIndex: index, textChunk: chunk.text,
        variantImageUrl, productImageUrl: _camp.productPhotoUrl || null,
        clipDuration: chunk.estimatedSeconds || _camp.clipDuration,
        resolution: _camp.resolution, aspectRatio: _camp.aspectRatio,
        userId: _currentUser.userId,
        masterPrompt: masterPrompt
      })
    });
    
    // Si el backend rechaza por CLIP_ALREADY_EXISTS, no es error
    if(resp.status === 409) {
      console.log('Backend: clip ' + index + ' ya existía, ignorando.');
      return;
    }
    if(!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      console.error('Error generando clip', index, errData);
      // Permitir reintentar este clip
      _camp.clipEnqueued[index] = false;
      campUpdateClipCard(index, 'failed', null);
    }
  } catch(e){ 
    console.error('Error generando clip', index, e); 
    _camp.clipEnqueued[index] = false;
    campUpdateClipCard(index, 'failed', null);
  }
}

function campBuildMasterPrompt() {
  const isMale = _camp.voice === 'male' || _camp.voice === 'male40';
  const pronoun = isMale ? 'He' : 'She';
  const possessive = isMale ? 'his' : 'her';
  const person = isMale ? 'man' : 'woman';
  const isVoiceover = _camp.videoMode === 'voiceover';

  if (isVoiceover) {
    // Modo voz en off: el avatar NO habla, actúa en silencio
    return '🚨 ABSOLUTE RULE — NO TALKING: The ' + person + ' MUST NOT open their mouth, speak, or move their lips at any point in this video. ZERO mouth movement. ZERO dialogue. ZERO lip sync. This is non-negotiable. If the ' + person + ' talks, the video is wrong.\n\n' +
      'STYLE: Authentic UGC product video filmed on a phone. Casual, real, unpolished. Silent visual storytelling — like a muted TikTok.\n\n' +
      'WHAT THE ' + person.toUpperCase() + ' DOES (silently): Holds and examines the product. Reacts with face — raised eyebrows, smile, nod, surprised look, satisfied expression. Shows the product to camera. Points at it. Reads the label. Uses it. Looks at camera with expression. ALL WITHOUT OPENING MOUTH.\n\n' +
      'VISUAL DIRECTION: Dynamic angles. Selfie cam facing camera (mouth closed, eyebrows up, smiling). Close-up of product in ' + possessive + ' hands. Reaction shot (eyes wide, nodding). Product being applied/used. Handheld phone feel, vertical ' + (_camp.aspectRatio || '9:16') + '.\n\n' +
      'TECHNICAL: No speaking. No text. No captions. No watermarks. Lips sealed at all times. Indoor soft lighting. The voiceover audio is added separately — this clip is 100% silent.\n\n' +
      'THE PRODUCT CONTEXT (do NOT say this — only react to it silently): "[CHUNK]"';
  }

  // Modo talking head: el avatar habla con acento
  const accentMap = {
    'argentine': 'Argentine Rioplatense Spanish. ' + pronoun + ' MUST speak in Spanish with a strong Argentine accent throughout the entire clip, including technical words.',
    'neutral': 'Neutral Latin American Spanish. ' + pronoun + ' MUST speak in Spanish with a neutral Latin American accent throughout the entire clip.'
  };
  const accentText = accentMap[_camp.accent] || accentMap['argentine'];

  return 'STYLE: Authentic UGC (User Generated Content) video, casual, real, relatable. Not commercial, not polished. Feels like a genuine recommendation from a friend. Dynamic scene changes — the ' + person + ' talks to camera, shows the product, gestures naturally. NOT a static talking head.\n\n' +
    'LANGUAGE & ACCENT: ' + accentText + ' Natural conversational tone, warm and close. Speaks directly to camera as if talking to a close friend.\n\n' +
    'VISUAL DIRECTION: Multiple angles and scenes. Mix of: selfie angle talking to camera, close-up of product in ' + possessive + ' hand, reaction expressions, ' + person + ' holding/showing the product. Natural transitions. Handheld phone camera feel.\n\n' +
    'TECHNICAL: No text overlays, no watermarks, no subtitles. Only ' + possessive + ' voice and ambient room sound. Vertical format ' + (_camp.aspectRatio || '9:16') + '. Indoor natural soft lighting.\n\n' +
    'PERFORMANCE: Relaxed, natural facial expressions. Occasional natural pauses. Genuine delivery. ' + pronoun + ' interacts with the product naturally.\n\n' +
    pronoun + ' SAYS EXACTLY IN SPANISH: "[CHUNK]"';
}

// Permite al usuario en modo talking elegir género para el prompt
function campDetectGender() {
  // Si hay selector de voz activo, usar eso
  if (_camp.voice === 'male' || _camp.voice === 'male40') return 'male';
  return 'female';
}

function campShowReviewControls(index) {
  document.getElementById('campReviewControls').style.display = 'block';
  document.getElementById('campReviewMsg').textContent = 'Clip ' + (index+1) + ' listo. ¿Está bien?';
  document.getElementById('campGenStatusTitle').textContent = 'Clip ' + (index+1) + ' de ' + _camp.chunks.length + ' listo para revisión';
}

async function campApproveClip() {
  _camp.currentClipIndex++;
  if(_camp.currentClipIndex >= _camp.audioClips.length){
    document.getElementById('campReviewControls').style.display = 'none';
    document.getElementById('campAllDoneControls').style.display = 'block';
    clearInterval(_camp.pollingInterval); _camp.pollingInterval = null;
    return;
  }
  document.getElementById('campReviewControls').style.display = 'none';
  document.getElementById('campGenStatusTitle').textContent = 'Generando clip ' + (_camp.currentClipIndex + 1) + '...';
  await campGenerateOneClipV2(_camp.currentClipIndex);
}

async function campRegenCurrentClip() {
  _camp.clipEnqueued[_camp.currentClipIndex] = false;
  await campGenerateOneClipV2(_camp.currentClipIndex);
  document.getElementById('campReviewControls').style.display = 'none';
}

async function campRegenClip(index) {
  _camp.clipEnqueued[index] = false;
  _camp.currentClipIndex = index;
  await campGenerateOneClipV2(index);
}

async function campLoadList() {
  // Esperar hasta que _currentUser esté disponible (máx 5 segundos)
  if(!_currentUser) {
    for(let i = 0; i < 25 && !_currentUser; i++) await new Promise(r => setTimeout(r, 200));
  }
  if(!_currentUser) return;
  const container = document.getElementById('campListContainer');
  if(!container) return;
  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: _currentUser.userId })
    });
    const data = await resp.json();
    const campaigns = data.campaigns || [];
    if(!campaigns.length){
      container.innerHTML = '<div class="camp-empty"><div class="camp-empty-title">Todavía no tenés campañas</div><div class="camp-empty-sub">Creá tu primer creativo completo en minutos. Solo necesitás tu guión y una foto.</div><button class="btn-w" onclick="campStartNew()" style="font-size:13px;padding:10px 22px;">Crear mi primera campaña</button></div>';
      return;
    }
    const statusLabels = { draft:'Borrador', generating_variants:'Generando avatars', variants_ready:'Avatars listos', generating_clips:'Generando clips', clips_ready:'Clips listos', completed:'Completada', failed:'Error' };
    container.innerHTML = '<div class="camp-list">' + campaigns.map(c => '<div class="camp-card" onclick="campOpenDetail(\'' + c.id + '\',\'' + c.title.replace(/'/g, "\\'") + '\')"><div class="camp-card-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="3" width="16" height="12" rx="2"/><path d="M7 7l5 2-5 2V7z" fill="currentColor" stroke="none"/></svg></div><div class="camp-card-info"><div class="camp-card-title">' + c.title + '</div><div class="camp-card-meta">' + new Date(c.created_at).toLocaleDateString('es-AR') + ' · ' + c.resolution + '</div></div><div class="camp-card-status ' + c.status + '">' + (statusLabels[c.status] || c.status) + '</div></div>').join('') + '</div>';
  } catch(e){ console.error('Error cargando campañas:', e); }
}

async function campOpenDetail(campaignId, title) {
  _camp.campaignId = campaignId;
  document.getElementById('campView-list').style.display = 'none';
  document.getElementById('campView-wizard').style.display = 'none';
  document.getElementById('campView-generating').style.display = 'block';
  document.getElementById('campGenCampaignTitle').textContent = title;
  document.getElementById('campGenStatusTitle').textContent = 'Cargando clips...';
  document.getElementById('campGenStatusSub').textContent = '';
  document.getElementById('campReviewControls').style.display = 'none';
  document.getElementById('campAllDoneControls').style.display = 'none';
  document.getElementById('campGenProgressBar').style.width = '0%';
  document.getElementById('campClipsGrid').innerHTML = '';

  try {
    const resp = await fetch(BACKEND_URL + '/api/campaign/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, userId: _currentUser.userId })
    });
    if(!resp.ok) throw new Error('Error cargando campaña');
    const data = await resp.json();
    const { clips, variants } = data;

    // Renderizar grid de clips
    const grid = document.getElementById('campClipsGrid');
    grid.innerHTML = '';
    
    if(clips.length === 0) {
      document.getElementById('campGenStatusTitle').textContent = 'Sin clips generados';
      document.getElementById('campGenStatusSub').textContent = 'Esta campaña no tiene clips todavía.';
      return;
    }

    clips.forEach((clip) => {
      const card = document.createElement('div');
      card.className = 'camp-clip-card ' + clip.status;
      card.id = 'campClip-' + clip.clip_index;
      
      if(clip.status === 'completed' && clip.video_url) {
        card.innerHTML = '<video src="' + clip.video_url + '" controls playsinline style="width:100%;height:100%;object-fit:cover;"></video><div class="camp-clip-idx">' + (clip.clip_index+1) + '</div><a href="' + clip.video_url + '" download="clip-' + (clip.clip_index+1) + '.mp4" class="camp-clip-regen" style="text-decoration:none;">↓ Descargar</a>';
      } else if(clip.status === 'failed') {
        card.innerHTML = '<div class="camp-clip-overlay"><div style="font-size:20px;">✕</div><div style="font-size:11px;color:#f87171;">Falló</div></div><div class="camp-clip-idx">' + (clip.clip_index+1) + '</div>';
      } else {
        card.innerHTML = '<div class="camp-clip-overlay"><div style="font-size:11px;color:rgba(255,255,255,0.3);">' + clip.status + '</div></div><div class="camp-clip-idx">' + (clip.clip_index+1) + '</div>';
      }
      grid.appendChild(card);
    });

    const clipsDone = clips.filter(c => c.status === 'completed').length;
    const clipsFailed = clips.filter(c => c.status === 'failed').length;
    document.getElementById('campGenProgressBar').style.width = '100%';
    document.getElementById('campGenStatusTitle').textContent = title;
    document.getElementById('campGenStatusSub').textContent = clipsDone + ' clips completados' + (clipsFailed > 0 ? ' · ' + clipsFailed + ' fallidos' : '');
    document.getElementById('campAllDoneControls').style.display = 'block';

  } catch(e) {
    console.error('Error abriendo campaña:', e);
    document.getElementById('campGenStatusTitle').textContent = 'Error cargando la campaña';
  }
}

/* ---- Screen nav ---- */
function showScreen(name, instant){
  // Persistir la pantalla actual para recuperarla al refresh
  try { localStorage.setItem('futuriads_lastScreen', name); } catch(e) {}

  if (instant) {
    // Modo instantáneo (para el boot tras refresh): sin animación
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
      s.style.opacity = '0';
    });
    document.querySelectorAll('.a-nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById('nav-' + name);
    if (navEl) navEl.classList.add('active');
    const sc = document.getElementById('screen-' + name);
    if (sc) {
      sc.style.display = 'block';
      sc.classList.add('active');
      sc.style.opacity = '1';
    }
  } else {
    document.querySelectorAll('.screen').forEach(s=>{
      s.style.opacity='0';
      setTimeout(()=>{s.classList.remove('active');s.style.display='none';},200);
    });
    document.querySelectorAll('.a-nav-item').forEach(n=>n.classList.remove('active'));
    document.getElementById('nav-'+name).classList.add('active');
    setTimeout(()=>{
      const sc=document.getElementById('screen-'+name);
      sc.style.display='block';
      requestAnimationFrame(()=>{sc.classList.add('active');sc.style.opacity='1';});
    },210);
  }

  if(name==='historial') { loadHistory(); loadFolders(); toggleFoldersBar(true); }
  else { toggleFoldersBar(false); }
  if(name==='campanas'){ campLoadList(); document.getElementById('campView-list').style.display='block'; document.getElementById('campView-wizard').style.display='none'; document.getElementById('campView-generating').style.display='none'; }
  if(name==='nueva-imagen') {
    rebuildRatioDropdown();
    rebuildResDropdown();
  }
}

/* ---- Toast ---- */
function showToast(msg){
  const w=document.getElementById('toastWrap');
  const t=document.createElement('div');
  t.className='toast';
  t.innerHTML='<div class="toast-dot"></div>'+msg;
  w.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity 0.3s';setTimeout(()=>t.remove(),300);},3000);
}

/* ---- Credits modal (recarga / topup) ---- */
function openModal(){ openCreditsModal(); }

/* ================================================================
   SISTEMA DE SELECCIÓN, CARPETAS Y DROPDOWN — PREMIUM
   ================================================================ */

let selectedIds   = new Set();
let lastClickIdx  = null;
let isDragging    = false;
let selModeActive = false;
let currentFolder = null; // null = raíz, number = índice de carpeta
let histSortVal   = 'recent';

/* ---- Modo selección ---- */
function toggleSelectionMode() {
  selModeActive = !selModeActive;
  const floatBtn = document.getElementById('histSelFloat');
  const floatLabel = document.getElementById('histSelFloatLabel');
  const content = document.getElementById('histContent');
  floatBtn?.classList.toggle('active', selModeActive);
  if (floatLabel) floatLabel.textContent = selModeActive ? 'Cancelar' : 'Seleccionar';
  content?.classList.toggle('sel-mode-active', selModeActive);
  if (!selModeActive) clearSelection();
}

/* ---- Click en card ---- */
function histCardClick(e, card, idx, done, openFn, url, title) {
  const id = card.dataset.id;
  done = !!done; // normalizar 0/1 → false/true
  if (selModeActive) {
    // Nunca abrir modal en modo selección
    e.stopPropagation();
    if (e.shiftKey && lastClickIdx !== null) {
      selectRange(Math.min(idx, lastClickIdx), Math.max(idx, lastClickIdx));
    } else {
      toggleSelect(id, card, idx);
      lastClickIdx = idx;
    }
    return;
  }

  // --- MODO NORMAL ---
  // Ctrl/Cmd → activa modo selección directamente
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    toggleSelectionMode();
    toggleSelect(id, card, idx);
    lastClickIdx = idx;
    return;
  }

  // Click normal → abrir modal según tipo
  if (done) {
    window[openFn](url, title);
  }
}

function toggleSelect(id, card, idx) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
    card.classList.remove('selected');
  } else {
    selectedIds.add(id);
    card.classList.add('selected');
    if (idx !== undefined) lastClickIdx = idx;
  }
  updateSelectionBar();
}

function selectRange(fromIdx, toIdx) {
  const cards = document.querySelectorAll('.hist-card');
  cards.forEach((card, i) => {
    if (i >= fromIdx && i <= toIdx) {
      selectedIds.add(card.dataset.id);
      card.classList.add('selected');
    }
  });
  updateSelectionBar();
}

function clearSelection() {
  selectedIds.clear();
  document.querySelectorAll('.hist-card.selected').forEach(c => c.classList.remove('selected'));
  lastClickIdx = null;
  updateSelectionBar();
}

function updateSelectionBar() {
  const bar   = document.getElementById('histSelectionBar');
  const count = document.getElementById('histSelCount');
  if (!bar) return;
  const n = selectedIds.size;
  count.textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`;
  bar.classList.toggle('visible', n > 0);
}

/* ---- Keyboard shortcuts ---- */
document.addEventListener('keydown', function(e) {
  const onHistorial = document.getElementById('screen-historial')?.classList.contains('active');
  if (!onHistorial) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    if (!selModeActive) toggleSelectionMode();
    document.querySelectorAll('.hist-card').forEach(card => {
      selectedIds.add(card.dataset.id);
      card.classList.add('selected');
    });
    updateSelectionBar();
  }
  if (e.key === 'Escape') {
    clearSelection();
    if (selModeActive) toggleSelectionMode();
  }
  if (e.key === 'Delete' && selectedIds.size > 0) selDelete();
});

/* ---- Drag & Drop ---- */
function histDragStart(e, card) {
  if (!selModeActive) return; // drag solo en modo selección
  if (!selectedIds.has(card.dataset.id)) {
    clearSelection();
    selectedIds.add(card.dataset.id);
    card.classList.add('selected');
    updateSelectionBar();
  }
  isDragging = true;
  const n = selectedIds.size;
  const ghost = document.getElementById('histDragGhost');
  if (ghost) { ghost.textContent = `${n} archivo${n !== 1 ? 's' : ''}`; ghost.classList.add('visible'); }
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setDragImage(new Image(), 0, 0);
  document.addEventListener('dragover', moveDragGhost);
}

function histDragEnd() {
  isDragging = false;
  const ghost = document.getElementById('histDragGhost');
  if (ghost) ghost.classList.remove('visible');
  document.removeEventListener('dragover', moveDragGhost);
  document.querySelectorAll('.hfb-folder-item.drag-over').forEach(f => f.classList.remove('drag-over'));
}

function moveDragGhost(e) {
  const ghost = document.getElementById('histDragGhost');
  if (ghost) { ghost.style.left = (e.clientX + 14) + 'px'; ghost.style.top = (e.clientY - 10) + 'px'; }
}

function hfbFolderDragOver(e, el) { if (!isDragging) return; e.preventDefault(); el.classList.add('drag-over'); }
function hfbFolderDragLeave(el) { el.classList.remove('drag-over'); }
function hfbFolderDrop(e, idx) {
  e.preventDefault();
  document.querySelectorAll('.hfb-folder-item.drag-over').forEach(f => f.classList.remove('drag-over'));
  moveSelectedToFolder(idx);
}

/* ---- Carpetas navegables ---- */
function openFolder(idx) {
  const folders = JSON.parse(localStorage.getItem('hist_folders') || '[]');
  const folder = folders[idx];
  if (!folder) return;
  currentFolder = idx;

  // Breadcrumb
  const bc = document.getElementById('histBreadcrumb');
  const sub = document.getElementById('histSubLabel');
  if (bc) bc.innerHTML = `<span class="hist-bc-root" onclick="histGoRoot()">Mis creaciones</span><span class="hist-bc-sep"> / </span><span class="hist-bc-folder">${folder.name}</span>`;
  if (sub) sub.textContent = `${folder.items} elemento${folder.items !== 1 ? 's' : ''} en esta carpeta`;

  // Obtener IDs guardados en la carpeta
  const folderItems = JSON.parse(localStorage.getItem(`hist_folder_items_${idx}`) || '[]');
  const c = document.getElementById('histContent');
  if (!c) return;

  if (!folderItems.length) {
    c.innerHTML = `<div class="hist-folder-empty">
      <div class="hist-folder-empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 7A2 2 0 014 5h5l2 2h9a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/></svg></div>
      <div class="hist-folder-empty-title">Carpeta vacía</div>
      <div class="hist-folder-empty-sub">Seleccioná creaciones y movelas a esta carpeta usando el botón "Mover a carpeta".</div>
    </div>`;
    return;
  }

  // Mostrar los items de la carpeta
  const items = historyData.filter(v => folderItems.includes(v.id));
  renderHistGrid(items, c);
}

function histGoRoot() {
  currentFolder = null;
  const bc = document.getElementById('histBreadcrumb');
  const sub = document.getElementById('histSubLabel');
  if (bc) bc.innerHTML = `<span class="hist-bc-root" onclick="histGoRoot()">Mis creaciones</span>`;
  if (sub) sub.textContent = 'Todo lo que has generado hasta ahora.';
  renderHistory();
}

/* ---- Dropdown sort custom ---- */
function toggleHistSort(e) {
  e.stopPropagation();
  document.getElementById('histSortCustom').classList.toggle('open');
}
function setHistSortOpt(el, label, val) {
  histSortVal = val;
  document.getElementById('histSortLabel').textContent = label;
  document.querySelectorAll('.hist-sort-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('histSortCustom').classList.remove('open');
  renderHistory();
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('#histSortCustom')) {
    document.getElementById('histSortCustom')?.classList.remove('open');
  }
});

/* ---- Acciones toolbar ---- */
function selMoveToFolder() {
  const folders = JSON.parse(localStorage.getItem('hist_folders') || '[]');
  if (!folders.length) { createFolder(); return; }
  const list = document.getElementById('moveFolderList');
  const svg = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 3.5A1.5 1.5 0 012.5 2h3l1.5 1.5H12A1.5 1.5 0 0113.5 5v5A1.5 1.5 0 0112 11.5H2.5A1.5 1.5 0 011 10V3.5z"/></svg>`;
  list.innerHTML = folders.map((f, i) => `
    <div class="move-folder-item" onclick="moveSelectedToFolder(${i})">${svg}
      <span class="move-folder-item-name">${f.name}</span>
      <span class="move-folder-item-count">${f.items} el.</span>
    </div>`).join('');
  document.getElementById('moveToFolderModal').classList.add('open');
}

function closeMoveToFolderModal(e) {
  if (e && e.target !== document.getElementById('moveToFolderModal')) return;
  document.getElementById('moveToFolderModal').classList.remove('open');
}

function moveSelectedToFolder(folderIdx) {
  const folders = JSON.parse(localStorage.getItem('hist_folders') || '[]');
  if (!folders[folderIdx]) return;
  const ids = [...selectedIds];
  // Guardar IDs en la carpeta
  const existing = JSON.parse(localStorage.getItem(`hist_folder_items_${folderIdx}`) || '[]');
  const merged = [...new Set([...existing, ...ids])];
  localStorage.setItem(`hist_folder_items_${folderIdx}`, JSON.stringify(merged));
  folders[folderIdx].items = merged.length;
  localStorage.setItem('hist_folders', JSON.stringify(folders));
  document.getElementById('moveToFolderModal').classList.remove('open');
  showToast(`${ids.length} archivo${ids.length !== 1 ? 's' : ''} movido${ids.length !== 1 ? 's' : ''} a "${folders[folderIdx].name}"`);
  clearSelection();
  if (selModeActive) toggleSelectionMode();
  loadFolders();
}

async function selDelete() {
  if (!selectedIds.size) return;
  const n = selectedIds.size;
  if (!confirm(`¿Eliminar ${n} creación${n !== 1 ? 'es' : ''}?`)) return;
  try {
    await supa.from('videos').delete().in('id', [...selectedIds]);
    historyData = historyData.filter(v => !selectedIds.has(v.id));
    clearSelection();
    if (selModeActive) toggleSelectionMode();
    renderHistory(); updateDashMetrics();
    showToast(`${n} creación${n !== 1 ? 'es eliminadas' : ' eliminada'}`);
  } catch(err) { showToast('Error al eliminar'); }
}

function selDownload() {
  const items = historyData.filter(v => selectedIds.has(v.id) && v.video_url);
  items.forEach(v => {
    const a = document.createElement('a');
    a.href = v.video_url; a.download = `futuriads-${v.id}.${v.type==='image'?'jpg':'mp4'}`;
    a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });
  showToast(`Descargando ${items.length} archivo${items.length !== 1 ? 's' : ''}...`);
}
function loadFolders() {
  const right = document.getElementById('histFoldersRight');
  if (!right) return;
  const folders = JSON.parse(localStorage.getItem('hist_folders') || '[]');
  const folderSVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 3.5A1.5 1.5 0 012.5 2h3l1.5 1.5H12A1.5 1.5 0 0113.5 5v5A1.5 1.5 0 0112 11.5H2.5A1.5 1.5 0 011 10V3.5z"/></svg>`;
  if (!folders.length) {
    right.innerHTML = '<span class="hfb-empty">Todavía no creaste ninguna carpeta.</span>';
    return;
  }
  right.innerHTML = folders.map((f, i) => `
    <div class="hfb-folder-item" onclick="openFolder(${i})"
      ondragover="event.preventDefault();hfbFolderDragOver(event,this)"
      ondragleave="hfbFolderDragLeave(this)"
      ondrop="hfbFolderDrop(event,${i})">
      <div class="hfb-folder-item-icon">${folderSVG}</div>
      <div>
        <div class="hfb-folder-item-name">${f.name}</div>
        <div class="hfb-folder-item-count">${f.items} elemento${f.items !== 1 ? 's' : ''}</div>
      </div>
    </div>`).join('');
}

function createFolder() {
  const modal = document.getElementById('folderModal');
  const input = document.getElementById('folderModalInput');
  if (!modal) return;
  input.value = '';
  modal.classList.add('open');
  setTimeout(() => input.focus(), 80);
}

function closeFolderModal(e) {
  if (e && e.target !== document.getElementById('folderModal')) return;
  document.getElementById('folderModal').classList.remove('open');
}

function confirmCreateFolder() {
  const input = document.getElementById('folderModalInput');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  const folders = JSON.parse(localStorage.getItem('hist_folders') || '[]');
  folders.push({ name, items: 0, created: Date.now() });
  localStorage.setItem('hist_folders', JSON.stringify(folders));
  document.getElementById('folderModal').classList.remove('open');
  loadFolders();
}

function openFolder(idx) {
  const folders = JSON.parse(localStorage.getItem('hist_folders') || '[]');
  const folder = folders[idx];
  if (!folder) return;
  showToast(`Carpeta "${folder.name}" — próximamente podés agregar creaciones acá`);
}

function toggleFoldersBar(show) {
  const bar = document.getElementById('histFoldersBar');
  const floatBtn = document.getElementById('histSelFloat');
  if (bar) bar.classList.toggle('visible', show);
  if (floatBtn) floatBtn.classList.toggle('visible', show);
  // Al salir del historial, limpiar selección
  if (!show) { clearSelection(); if (selModeActive) { selModeActive = false; document.getElementById('histContent')?.classList.remove('sel-mode-active'); } }
}

function hfbHandleDrop(e) {
  e.preventDefault();
  document.getElementById('hfbDropZone')?.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) showToast(`${files.length} archivo${files.length > 1 ? 's' : ''} listo${files.length > 1 ? 's' : ''} para reutilizar`);
}

function hfbHandleFiles(files) {
  if (files.length) showToast(`${files.length} archivo${files.length > 1 ? 's' : ''} cargado${files.length > 1 ? 's' : ''}`);
}

async function loadDashTips() {
  const el = document.getElementById('dashTipsList');
  if (!el) return;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: 'Sos un experto en marketing de performance y UGC (User Generated Content) para ecommerce en Latinoamérica. Respondé SOLO con JSON válido, sin texto extra, sin markdown, sin backticks.',
        messages: [{
          role: 'user',
          content: 'Dame exactamente 3 consejos cortos y concretos para crear mejores anuncios de video UGC en Instagram y TikTok. Respondé SOLO con este JSON: [{"title":"...","sub":"..."},{"title":"...","sub":"..."},{"title":"...","sub":"..."}]. Cada title máximo 5 palabras, cada sub máximo 10 palabras.'
        }]
      })
    });
    const data = await res.json();
    const raw = data.content?.find(b => b.type === 'text')?.text || '[]';
    const tips = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const icons = [
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 2v12M2 8h12" stroke-linecap="round"/></svg>',
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M8 5v4l2 2" stroke-linecap="round"/></svg>',
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="10" rx="2"/><path d="M6 7h4M6 10h2" stroke-linecap="round"/></svg>'
    ];
    el.innerHTML = tips.map((t, i) => `
      <div class="dash-tip-item">
        <div class="dash-tip-icon">${icons[i] || icons[0]}</div>
        <div class="dash-tip-text">
          <div class="dash-tip-title">${t.title}</div>
          <div class="dash-tip-sub">${t.sub}</div>
        </div>
      </div>`).join('');
  } catch (e) {
    // Fallback hardcodeado si falla la API
    el.innerHTML = `
      <div class="dash-tip-item"><div class="dash-tip-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 2v12M2 8h12" stroke-linecap="round"/></svg></div><div class="dash-tip-text"><div class="dash-tip-title">Sé claro y directo</div><div class="dash-tip-sub">Los mensajes simples tienen 23% más de retención.</div></div></div>
      <div class="dash-tip-item"><div class="dash-tip-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M8 5v4l2 2" stroke-linecap="round"/></svg></div><div class="dash-tip-text"><div class="dash-tip-title">Usá un gancho en los primeros 3 segundos</div><div class="dash-tip-sub">Los videos con gancho inicial tienen 2x más conversiones.</div></div></div>
      <div class="dash-tip-item"><div class="dash-tip-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="10" rx="2"/><path d="M6 7h4M6 10h2" stroke-linecap="round"/></svg></div><div class="dash-tip-text"><div class="dash-tip-title">Mostrá el producto en uso</div><div class="dash-tip-sub">Aumenta la confianza y reduce objeciones.</div></div></div>`;
  }
}

function loadDashRecent() {
  const el = document.getElementById('dashRecentList');
  if (!el) return;
  const recent = (historyData || []).slice(0, 3);
  if (!recent.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text2);padding:20px 0;text-align:center;">Todavía no generaste ningún anuncio.</div>';
    return;
  }
  el.innerHTML = recent.map((v, idx) => {
    const isImage = v.type === 'image';
    // Thumbnail
    const thumb = v.video_url
      ? (isImage
          ? `<img src="${v.video_url}" alt="" onerror="this.style.display='none'">`
          : `<video src="${v.video_url}" muted playsinline preload="metadata"></video>`)
      : '';
    // Nombre: actor si es video, modelo si es imagen
    const name = v.actor || (v.model ? v.model.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : 'Creación');
    // Specs: duración (solo video) · ratio · modelo
    const modelLabel = v.model ? v.model.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '';
    const specs = [
      !isImage && v.duration ? v.duration + 's' : null,
      v.aspect_ratio || null,
      modelLabel || null
    ].filter(Boolean).join(' · ');
    // Badge estado
    const status = v.status || 'COMPLETED';
    const badgeClass = status === 'COMPLETED' ? '' : status === 'FAILED' ? 'failed' : 'pending';
    const badgeLabel = status === 'COMPLETED' ? 'Listo' : status === 'FAILED' ? 'Falló' : 'Procesando';
    // Tiempo
    const ago = 'Editado ' + timeAgo(v.created_at);
    // URL para ver
    const viewUrl = v.video_url || '#';

    return `
      <div class="dash-recent-item" id="dashRecent-${idx}">
        <div class="dash-recent-thumb">${thumb}</div>
        <div class="dash-recent-info">
          <div class="dash-recent-name">${name}</div>
          <div class="dash-recent-meta">${specs}</div>
        </div>
        <div class="dash-recent-right">
          <span class="dash-recent-badge ${badgeClass}">${badgeLabel}</span>
          <span class="dash-recent-ago">${ago}</span>
        </div>
        <button class="dash-recent-menu-btn" onclick="toggleRecentMenu(event,${idx})">···</button>
        <div class="dash-recent-dropdown" id="dashRecentDD-${idx}">
          <div class="dash-recent-dd-item" onclick="viewRecentItem('${viewUrl}','${isImage}')">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6.5" cy="6.5" r="3"/><path d="M1 6.5C2.5 3.5 9.5 3.5 12 6.5C9.5 9.5 2.5 9.5 1 6.5Z"/></svg>
            Ver
          </div>
          <div class="dash-recent-dd-item danger" onclick="deleteRecentItem('${v.id}',${idx})">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5h9M5 3.5V2.5h3v1M4.5 3.5l.5 7h3l.5-7" stroke-linecap="round"/></svg>
            Eliminar
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleRecentMenu(e, idx) {
  e.stopPropagation();
  // Cerrar todos los demás
  document.querySelectorAll('.dash-recent-dropdown').forEach((d, i) => {
    if (i !== idx) d.classList.remove('open');
  });
  document.getElementById('dashRecentDD-' + idx)?.classList.toggle('open');
}

function viewRecentItem(url, isImage) {
  closeAllRecentMenus();
  if (!url || url === '#') return;
  if (isImage === 'true') openImageModal(url, '');
  else openVideoModal(url, '');
}

async function deleteRecentItem(id, idx) {
  closeAllRecentMenus();
  if (!id || !confirm('¿Eliminar esta creación?')) return;
  try {
    await supa.from('videos').delete().eq('id', id);
    historyData = historyData.filter(v => v.id !== id);
    loadDashRecent();
    updateDashMetrics();
  } catch (e) {
    showToast('Error al eliminar');
  }
}

function closeAllRecentMenus() {
  document.querySelectorAll('.dash-recent-dropdown').forEach(d => d.classList.remove('open'));
}

// Cerrar dropdowns de recientes al hacer click fuera
document.addEventListener('click', function() { closeAllRecentMenus(); });

function openInspoModal() {
  document.getElementById('inspoModal').style.display = 'flex';
}
function closeInspoModal() {
  document.getElementById('inspoModal').style.display = 'none';
}

/* ---- Modal de video tutorial ---- */
function openTutorialModal() {
  document.getElementById('tutorialModal').classList.add('open');
}
function closeTutorialModal(e) {
  if (e && e.target !== document.getElementById('tutorialModal')) return;
  const modal = document.getElementById('tutorialModal');
  modal.classList.remove('open');
  const vid = document.getElementById('tutorialVideo');
  if (vid) { vid.pause(); tutorialUpdatePlayPause(true); }
}
function tutorialTogglePlay() {
  const vid = document.getElementById('tutorialVideo');
  if (!vid) return;
  if (vid.paused) {
    vid.play();
    tutorialUpdatePlayPause(false);
    document.getElementById('tutorialPlayOverlay').classList.add('hidden');
  } else {
    vid.pause();
    tutorialUpdatePlayPause(true);
    document.getElementById('tutorialPlayOverlay').classList.remove('hidden');
  }
}
function tutorialUpdatePlayPause(isPaused) {
  document.getElementById('tutorialPlayIcon').style.display  = isPaused ? '' : 'none';
  document.getElementById('tutorialPauseIcon').style.display = isPaused ? 'none' : '';
}
function tutorialSeek(e) {
  const vid = document.getElementById('tutorialVideo');
  const wrap = document.getElementById('tutorialProgressWrap');
  if (!vid || !wrap) return;
  const rect = wrap.getBoundingClientRect();
  const pct  = (e.clientX - rect.left) / rect.width;
  vid.currentTime = pct * vid.duration;
}
function tutorialToggleMute() {
  const vid = document.getElementById('tutorialVideo');
  if (!vid) return;
  vid.muted = !vid.muted;
  document.getElementById('tutorialVolSlider').value = vid.muted ? 0 : vid.volume;
}
function tutorialSetVol(v) {
  const vid = document.getElementById('tutorialVideo');
  if (!vid) return;
  vid.volume = v; vid.muted = v == 0;
}
function tutorialFullscreen() {
  const wrap = document.getElementById('tutorialVideoWrap');
  if (wrap.requestFullscreen) wrap.requestFullscreen();
}
// Actualizar progreso
document.addEventListener('DOMContentLoaded', function() {
  const vid = document.getElementById('tutorialVideo');
  if (!vid) return;
  vid.addEventListener('timeupdate', function() {
    if (!vid.duration) return;
    const pct = (vid.currentTime / vid.duration) * 100;
    const fill = document.getElementById('tutorialProgressFill');
    if (fill) fill.style.width = pct + '%';
    const fmt = t => Math.floor(t/60)+':'+(Math.floor(t%60)+'').padStart(2,'0');
    const time = document.getElementById('tutorialTime');
    if (time) time.textContent = fmt(vid.currentTime) + ' / ' + fmt(vid.duration);
  });
  vid.addEventListener('ended', function() {
    tutorialUpdatePlayPause(true);
    document.getElementById('tutorialPlayOverlay').classList.remove('hidden');
  });
});
function toggleCreditsPopover(e) {
  e.stopPropagation();
  const popover = document.getElementById('creditsPopover');
  const isOpen  = popover.classList.contains('open');
  if (isOpen) { popover.classList.remove('open'); return; }

  // Construir contenido de planes
  const currentPlan = (_currentUser && _currentUser.plan) || 'none';
  const allPlans = [
    { key: 'starter', label: 'Starter',  price: '$19/mes',  credits: '15.000 créditos' },
    { key: 'growth',  label: 'Growth',   price: '$49/mes',  credits: '50.000 créditos' },
    { key: 'scale',   label: 'Scale',    price: '$129/mes', credits: '150.000 créditos' }
  ];
  const plansContainer = document.getElementById('creditsPopoverPlans');
  plansContainer.innerHTML = allPlans.map(p => {
    const isCurrent = p.key === currentPlan;
    return `<div class="credits-plan-row${isCurrent ? ' current-plan' : ''}">
      <div>
        <div class="credits-plan-name">${p.label}${isCurrent ? '<span class="credits-plan-badge">Tu plan</span>' : ''}</div>
        <div class="credits-plan-detail">${p.credits}</div>
      </div>
      <div class="credits-plan-price">${p.price}</div>
    </div>`;
  }).join('');

  // Botón de recarga
  const topupBtn = document.getElementById('creditsPopoverTopupBtn');
  if (currentPlan === 'none') {
    topupBtn.textContent = 'Elegir un plan';
  } else {
    const planInfo = getPlanInfo(currentPlan);
    topupBtn.textContent = `Recargar ${planInfo.topup_credits.toLocaleString('es-AR')} créditos — $${planInfo.topup_price}`;
  }

  popover.classList.add('open');
}

function closeCreditsPopoverOnBackdrop(e) {
  // Cerrar solo si click en el backdrop, no en el inner
  if (e.target === document.getElementById('creditsPopover')) {
    document.getElementById('creditsPopover').classList.remove('open');
  }
}

function creditsPopoverTopup(e) {
  e.stopPropagation();
  document.getElementById('creditsPopover').classList.remove('open');
  const plan = (_currentUser && _currentUser.plan) || 'none';
  if (plan === 'none') {
    showScreen('perfil');
  } else {
    openCreditsModal();
  }
}

// Cerrar el popover al hacer click fuera
document.addEventListener('click', function() {
  const popover = document.getElementById('creditsPopover');
  if (popover) popover.classList.remove('open');
});

function openCreditsModal() {
  // Llenamos el modal con los datos reales del plan del usuario
  const plan = (_currentUser && _currentUser.plan) || 'none';
  const planInfo = getPlanInfo(plan);
  const titleEl = document.getElementById('creditsModalTitle');
  const subEl = document.getElementById('creditsModalSub');
  const creditsEl = document.getElementById('topupCreditsLabel');
  const priceEl = document.getElementById('topupPriceLabel');
  const continueBtn = document.getElementById('topupContinueBtn');

  if (plan === 'none') {
    if (titleEl) titleEl.textContent = 'Necesitás un plan activo';
    if (subEl) subEl.textContent = 'Para recargar créditos primero tenés que tener un plan. Las recargas se compran al precio del plan que tengas.';
    if (creditsEl) creditsEl.textContent = '—';
    if (priceEl) priceEl.textContent = '—';
    if (continueBtn) continueBtn.textContent = 'Ver planes';
  } else {
    if (titleEl) titleEl.textContent = 'Recargar créditos';
    if (subEl) subEl.textContent = `Plan ${planInfo.label}: ${planInfo.topup_credits.toLocaleString('es-AR')} créditos extra por $${planInfo.topup_price}. No caducan.`;
    if (creditsEl) creditsEl.textContent = planInfo.topup_credits.toLocaleString('es-AR') + ' créditos';
    if (priceEl) priceEl.textContent = '$' + planInfo.topup_price;
    if (continueBtn) continueBtn.textContent = 'Continuar';
  }
  document.getElementById('creditsModal').classList.add('open');
}

function closeModal(){ document.getElementById('creditsModal').classList.remove('open'); }

function handleTopupCheckout() {
  closeModal();
  // TODO: cuando se integre Paddle, acá disparamos el checkout de la recarga.
  // Por ahora, solo informamos al usuario.
  if (!_currentUser || _currentUser.plan === 'none') {
    showToast('El sistema de pagos se habilita pronto');
  } else {
    showToast('Sistema de pagos en integración. Próximamente.');
  }
}

document.getElementById('creditsModal').addEventListener('click',function(e){
  if(e.target===this) closeModal();
});

/* ---- Insufficient credits modal ---- */
function showNoCreditsModal({ cost, available, plan }) {
  const sub = document.getElementById('noCreditsModalSub');
  const upgradeBtn = document.getElementById('noCreditsUpgradeBtn');
  if (sub) {
    if (plan === 'none') {
      sub.textContent = 'Todavía no tenés un plan activo. Suscribite para empezar a generar.';
      if (upgradeBtn) upgradeBtn.style.display = '';
    } else {
      sub.textContent = `Esta generación cuesta ${cost.toLocaleString('es-AR')} créditos y vos tenés ${available.toLocaleString('es-AR')}. Recargá créditos o esperá al próximo ciclo.`;
      if (upgradeBtn) upgradeBtn.style.display = '';
    }
  }
  document.getElementById('noCreditsModal').classList.add('open');
}
function closeNoCreditsModal() {
  document.getElementById('noCreditsModal').classList.remove('open');
}
document.getElementById('noCreditsModal').addEventListener('click', function(e){
  if (e.target === this) closeNoCreditsModal();
});

/* ---- Gen tab ---- */
// Estado de referencia del gen box dashboard
let _dashRefAvatarB64  = null;
let _dashRefProductB64 = null;

function switchGenTab(tab){
  const inner = document.getElementById('genBoxInner');
  if (!inner) { _doSwitchGenTab(tab); return; }
  // Fade out → swap → fade in
  inner.style.transition = 'opacity 0.18s ease';
  inner.style.opacity = '0';
  setTimeout(() => {
    _doSwitchGenTab(tab);
    inner.style.opacity = '1';
  }, 180);
}

function _doSwitchGenTab(tab){
  document.getElementById('tabVideo').classList.toggle('active', tab==='video');
  document.getElementById('tabImage').classList.toggle('active', tab==='image');
  document.getElementById('videoOpts').classList.toggle('active', tab==='video');
  document.getElementById('imageOpts').classList.toggle('active', tab==='image');
  const refBtn = document.getElementById('refAddBtn');
  if (refBtn) refBtn.style.visibility = tab==='video' ? 'visible' : 'hidden';
  const refPop = document.getElementById('refPopover');
  if (refPop) refPop.classList.remove('open');
  document.getElementById('genTextarea').placeholder =
    tab==='video'
      ? 'Empezá a escribir lo que querés que diga el actor en el video...'
      : 'Describí la imagen que querés generar...';
}

function toggleRefPopover(e) {
  e.stopPropagation();
  const p = document.getElementById('refPopover');
  p.classList.toggle('open');
}

/* ---- Imagen de referencia para "Crear imagen" ---- */
let _dashImgRefB64 = null;

function toggleImgRefPopover(e) {
  e.stopPropagation();
  // Cerrar el de video si estuviera abierto
  const vp = document.getElementById('refPopover');
  if (vp) vp.classList.remove('open');
  const p = document.getElementById('imgRefPopover');
  p.classList.toggle('open');
}

function handleDashImgRefUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _dashImgRefB64 = ev.target.result;
    const slot = document.getElementById('imgRefSlot');
    slot.classList.add('filled');
    const empty = slot.querySelector('.a-ref-slot-empty');
    if (empty) empty.style.display = 'none';
    let img = slot.querySelector('.a-ref-slot-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'a-ref-slot-img';
      slot.appendChild(img);
    }
    img.src = _dashImgRefB64;
    if (!slot.querySelector('.a-ref-slot-clear')) {
      const btn = document.createElement('button');
      btn.className = 'a-ref-slot-clear';
      btn.textContent = '✕';
      btn.onclick = ev2 => { ev2.stopPropagation(); clearImgRef(); };
      slot.appendChild(btn);
    }
    // Actualizar botón y hint
    const addBtn = document.getElementById('imgRefAddBtn');
    if (addBtn) {
      addBtn.classList.add('has-ref');
      if (!addBtn.querySelector('.ref-count')) {
        const badge = document.createElement('span');
        badge.className = 'ref-count';
        badge.textContent = '1';
        addBtn.appendChild(badge);
      }
    }
    const hint = document.getElementById('imgRefPopoverHint');
    if (hint) hint.textContent = 'Referencia cargada. El modelo la usará como base.';
  };
  reader.readAsDataURL(file);
}

function clearImgRef() {
  _dashImgRefB64 = null;
  const slot = document.getElementById('imgRefSlot');
  slot.classList.remove('filled');
  const img = slot.querySelector('.a-ref-slot-img');
  if (img) img.remove();
  const btn = slot.querySelector('.a-ref-slot-clear');
  if (btn) btn.remove();
  const empty = slot.querySelector('.a-ref-slot-empty');
  if (empty) empty.style.display = '';
  const fileInput = document.getElementById('imgRefFile');
  if (fileInput) fileInput.value = '';
  const addBtn = document.getElementById('imgRefAddBtn');
  if (addBtn) {
    addBtn.classList.remove('has-ref');
    const badge = addBtn.querySelector('.ref-count');
    if (badge) badge.remove();
  }
  const hint = document.getElementById('imgRefPopoverHint');
  if (hint) hint.textContent = 'El modelo usará esta imagen como base o referencia visual.';
}

function handleRefUpload(type, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const b64 = ev.target.result;
    if (type === 'avatar')   _dashRefAvatarB64  = b64;
    else                     _dashRefProductB64 = b64;

    // Mostrar preview en el slot
    const slot = document.getElementById(type === 'avatar' ? 'refSlotAvatar' : 'refSlotProduct');
    slot.classList.add('filled');
    // Ocultar empty, mostrar imagen
    const empty = slot.querySelector('.a-ref-slot-empty');
    if (empty) empty.style.display = 'none';
    let img = slot.querySelector('.a-ref-slot-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'a-ref-slot-img';
      slot.appendChild(img);
    }
    img.src = b64;
    // Botón quitar
    if (!slot.querySelector('.a-ref-slot-clear')) {
      const btn = document.createElement('button');
      btn.className = 'a-ref-slot-clear';
      btn.textContent = '✕';
      btn.onclick = ev2 => { ev2.stopPropagation(); clearRefSlot(type); };
      slot.appendChild(btn);
    }
    updateRefBtn();
    updateRefHint();
  };
  reader.readAsDataURL(file);
}

function clearRefSlot(type) {
  if (type === 'avatar') _dashRefAvatarB64 = null;
  else                   _dashRefProductB64 = null;
  const slot = document.getElementById(type === 'avatar' ? 'refSlotAvatar' : 'refSlotProduct');
  slot.classList.remove('filled');
  const img = slot.querySelector('.a-ref-slot-img');
  if (img) img.remove();
  const btn = slot.querySelector('.a-ref-slot-clear');
  if (btn) btn.remove();
  const empty = slot.querySelector('.a-ref-slot-empty');
  if (empty) empty.style.display = '';
  // Reset file input
  const fileInput = document.getElementById(type === 'avatar' ? 'refFileAvatar' : 'refFileProduct');
  if (fileInput) fileInput.value = '';
  updateRefBtn();
  updateRefHint();
}

function updateRefBtn() {
  const btn = document.getElementById('refAddBtn');
  if (!btn) return;
  const count = (_dashRefAvatarB64 ? 1 : 0) + (_dashRefProductB64 ? 1 : 0);
  btn.classList.toggle('has-ref', count > 0);
  // Badge de conteo
  let badge = btn.querySelector('.ref-count');
  if (count > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'ref-count'; btn.appendChild(badge); }
    badge.textContent = count;
  } else {
    if (badge) badge.remove();
  }
}

function updateRefHint() {
  const hint = document.getElementById('refPopoverHint');
  if (!hint) return;
  const hasAvatar  = !!_dashRefAvatarB64;
  const hasProduct = !!_dashRefProductB64;
  if (hasAvatar && hasProduct) {
    hint.textContent = 'Modo: Avatar + producto (Multi Reference)';
  } else if (hasAvatar) {
    hint.textContent = 'Modo: Solo avatar — image-to-video con tu persona.';
  } else if (hasProduct) {
    hint.textContent = 'Modo: Solo producto — el modelo enfocará el producto.';
  } else {
    hint.textContent = 'Subí una o ambas imágenes.';
  }
}

// Cerrar el popover de referencia al hacer click fuera
document.addEventListener('click', function(e) {
  const popover = document.getElementById('refPopover');
  const btn     = document.getElementById('refAddBtn');
  if (popover && !popover.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    popover.classList.remove('open');
  }
  const imgPopover = document.getElementById('imgRefPopover');
  const imgBtn     = document.getElementById('imgRefAddBtn');
  if (imgPopover && !imgPopover.contains(e.target) && e.target !== imgBtn && !imgBtn?.contains(e.target)) {
    imgPopover.classList.remove('open');
  }
});

/* ---- Dashboard → flujo de generación ---- */
function startFromDashboard(){
  // Detectar si el usuario está en tab "video" o "imagen"
  const isVideo = document.getElementById('tabVideo').classList.contains('active');

  // Tomar el prompt que escribió en el dashboard
  const dashPrompt = document.getElementById('genTextarea')?.value?.trim() || '';

  // Si está en "Crear imagen", redirigir a la pantalla de Nueva imagen
  if (!isVideo) {
    showScreen('nueva-imagen');
    resetImageGenerator();
    if (dashPrompt) {
      const promptEl = document.getElementById('imgPromptInput');
      if (promptEl) promptEl.value = dashPrompt;
    }
    // Sincronizar modelo, aspect ratio y calidad elegidos en el dashboard
    const dashImgModel = document.querySelector('#cs-img-model .custom-select-option.selected')?.dataset.value;
    const dashImgAspect = document.querySelector('#cs-img-aspect .custom-select-option.selected')?.dataset.value;
    const dashImgQuality = document.querySelector('#cs-img-quality .custom-select-option.selected')?.dataset.value;

    if (dashImgModel && (dashImgModel === 'gpt-image-2' || dashImgModel === 'nano-banana-2')) {
      imgSelectedModel = dashImgModel;
      // Reflejar visualmente en las cards
      document.querySelectorAll('.img-model-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.model === dashImgModel);
      });
    }
    if (dashImgAspect) imgSelectedRatio = dashImgAspect;
    if (dashImgQuality) imgSelectedRes = dashImgQuality;
    rebuildRatioDropdown();
    rebuildResDropdown();

    // Pasar imagen de referencia al generador de imágenes
    window._pendingImgRefB64 = _dashImgRefB64 || null;

    if (dashPrompt) document.getElementById('genTextarea').value = '';
    return;
  }

  // Sincronizar las preferencias del dashboard (duración, aspect, resolución)
  // con los custom-selects del Step 2 antes de mostrar el flujo
  const dashDur = document.querySelector('#cs-dur .custom-select-option.selected')?.textContent?.trim();
  const dashAspect = document.querySelector('#cs-aspect .custom-select-option.selected')?.textContent?.trim();
  const dashRes = document.querySelector('#cs-res .custom-select-option.selected')?.textContent?.trim();

  const setStep2Selection = (selectId, dataValue) => {
    if (!dataValue) return;
    const el = document.getElementById(selectId);
    if (!el) return;
    const opt = el.querySelector(`.custom-select-option[data-value="${dataValue}"]`);
    if (!opt) return;
    el.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    const span = el.querySelector('.custom-select-trigger span');
    if (span) span.textContent = opt.textContent;
  };

  // Mapear "5s" -> "5", "10s" -> "10", "15s" -> "15"
  if (dashDur) {
    const num = dashDur.replace(/[^0-9]/g,'');
    if (num) setStep2Selection('cs-step2-dur', num);
  }
  if (dashAspect) setStep2Selection('cs-step2-ratio', dashAspect);
  if (dashRes) setStep2Selection('cs-step2-res', dashRes);

  // Pre-cargar el prompt en el textarea del Step 2 (si lo escribió en el dashboard)
  const scriptInput = document.getElementById('scriptInput');
  if (scriptInput && dashPrompt) scriptInput.value = dashPrompt;

  // Navegar a "Nuevo video" en el Step 1 (selección de actor)
  showScreen('nuevo');
  resetSelectedActor();
  goGenStep(1);

  // Pasar imágenes de referencia al flujo de video
  window._pendingAvatarB64  = _dashRefAvatarB64  || null;
  window._pendingProductB64 = _dashRefProductB64 || null;
  // Derivar modo automáticamente según lo que subió el usuario
  if (_dashRefAvatarB64 && _dashRefProductB64) window._pendingRefMode = 'multi';
  else if (_dashRefAvatarB64)                  window._pendingRefMode = 'avatar';
  else if (_dashRefProductB64)                 window._pendingRefMode = 'product';
  else                                         window._pendingRefMode = 'none';

  // Limpiar el textarea del dashboard para la próxima visita
  if (dashPrompt) document.getElementById('genTextarea').value = '';
}

// Helper: limpiar selección de actor sin tocar el prompt ya cargado
function resetSelectedActor(){
  selectedActor = null;
  document.querySelectorAll('.a-actor-card').forEach(c => c.classList.remove('selected'));
  const btn = document.getElementById('step1Next');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.35'; btn.style.cursor = 'not-allowed'; }
}

/* ---- Model drawer ---- */
function openDrawer(name,type,dur,ratio,res){
  document.getElementById('drawerTitle').textContent=name;
  document.getElementById('drawerMeta').innerHTML=`
    <div class="drawer-meta-row"><span class="drawer-meta-label">Tipo</span><span class="drawer-meta-val">${type}</span></div>
    <div class="drawer-meta-row"><span class="drawer-meta-label">Duración</span><span class="drawer-meta-val">${dur}</span></div>
    <div class="drawer-meta-row"><span class="drawer-meta-label">Aspect ratio</span><span class="drawer-meta-val">${ratio}</span></div>
    <div class="drawer-meta-row"><span class="drawer-meta-label">Resolución</span><span class="drawer-meta-val">${res}</span></div>
  `;
  document.getElementById('modelDrawer').classList.add('open');
}
function closeDrawer(){ document.getElementById('modelDrawer').classList.remove('open'); }

/* ---- Generator ---- */
let selectedActor=null;
function resetGenerator(){
  selectedActor=null;
  document.querySelectorAll('.a-actor-card').forEach(c=>c.classList.remove('selected'));
  const btn=document.getElementById('step1Next');
  btn.disabled=true; btn.style.opacity='0.35'; btn.style.cursor='not-allowed';
  if(document.getElementById('scriptInput')) document.getElementById('scriptInput').value='';
  updateStepUI(1);
  for(let i=1;i<=4;i++){const el=document.getElementById('gen-step-'+i);if(el)el.style.display=i===1?'block':'none';}
}
function selectActor(el){
  document.querySelectorAll('.a-actor-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  selectedActor=el.dataset.actor;
  const btn=document.getElementById('step1Next');
  btn.disabled=false; btn.style.opacity='1'; btn.style.cursor='pointer';
}
function updateStepUI(step){
  const labels=['Elegí tu actor','Tu script','Generando...','Preview'];
  for(let i=0;i<4;i++){
    const d=document.getElementById('sd'+i);
    if(i<step-1){d.classList.add('done');d.classList.remove('active');}
    else if(i===step-1){d.classList.remove('done');d.classList.add('active');}
    else{d.classList.remove('done','active');}
    if(i<3){const l=document.getElementById('sc'+i);if(i<step-1)l.classList.add('done');else l.classList.remove('done');}
  }
  document.getElementById('stepLabel').textContent=labels[step-1];
}
function goGenStep(step){
  for(let i=1;i<=4;i++){const el=document.getElementById('gen-step-'+i);if(el)el.style.display='none';}
  const nx=document.getElementById('gen-step-'+step);
  if(nx)nx.style.display='block';
  updateStepUI(step);
  if(step===3) runGeneration();
  if(step===4) setupPreview();
}
let _generatedVideoUrl = null;
let _generatedRequestId = null;

async function runGeneration(){
  const msgEl = document.getElementById('loadingMsg');
  const bar = document.getElementById('genProgressBar');
  const pbox = document.getElementById('promptResultBox');
  const nxt = document.getElementById('step3Next');
  pbox.style.display='none'; nxt.style.display='none'; bar.style.width='0%';
  _generatedVideoUrl = null;
  _generatedRequestId = null;

  const actor = selectedActor || 'Sofi';
  const script = document.getElementById('scriptInput')?.value?.trim() || '';
  if (!script) { showToast('Escribí un prompt antes de generar'); return; }
  const durVal = document.querySelector('#cs-step2-dur .custom-select-option.selected')?.dataset.value || '10';
  const resVal = document.querySelector('#cs-step2-res .custom-select-option.selected')?.dataset.value || '720p';
  const ratioVal = document.querySelector('#cs-step2-ratio .custom-select-option.selected')?.dataset.value || '9:16';

  // Animación de progreso suave
  let currentProg = 0;
  function setBar(target, duration){
    return new Promise(res=>{
      const start = currentProg;
      const t0 = Date.now();
      function anim(){
        const t = Math.min((Date.now()-t0)/duration, 1);
        currentProg = start + (target-start)*t;
        bar.style.width = currentProg + '%';
        if(t<1) requestAnimationFrame(anim);
        else res();
      }
      anim();
    });
  }

  try {
    // --- Paso 1: Mostrar prompt del usuario tal cual ---
    msgEl.textContent = ' Preparando tu video...';
    await setBar(30, 800);

    // El prompt va tal cual, sin modificar
    const generatedPrompt = script;
    pbox.style.display = 'block';
    document.getElementById('promptResultText').textContent = generatedPrompt;

    // --- Paso 2: Enviar a generar video ---
    msgEl.textContent = ' Enviando a Seedance 2.0...';
    await setBar(50, 600);

    const genRes = await fetch(BACKEND_URL + '/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: generatedPrompt,
        avatar: actor,
        duration: durVal,
        aspectRatio: ratioVal,
        resolution: resVal,
        userId: (await supa.auth.getSession()).data?.session?.user?.id || null
      })
    });
    // Caso especial: créditos insuficientes
    if (genRes.status === 402) {
      const errData = await genRes.json().catch(() => ({}));
      bar.style.width = '0%';
      msgEl.textContent = ' Sin créditos suficientes';
      msgEl.style.color = '#f59e0b';
      showNoCreditsModal({
        cost: errData.cost || 0,
        available: errData.available || 0,
        plan: errData.plan || 'none'
      });
      // Botón para volver al paso 2
      nxt.textContent = 'Volver';
      nxt.onclick = () => { goGenStep(2); };
      nxt.style.display = 'inline-flex';
      return;
    }
    if (!genRes.ok) throw new Error('Error al iniciar la generación (' + genRes.status + ')');
    const genData = await genRes.json();
    _generatedRequestId = genData.requestId || genData.request_id || genData.id;
    if (!_generatedRequestId) throw new Error('No se recibió requestId del backend');

    // Refrescar contador de créditos en el sidebar después de descontar
    refreshCredits();

    // --- Paso 3: Video encolado, avisar al usuario y redirigir al historial ---
    msgEl.textContent = ' Video encolado correctamente';
    await setBar(100, 600);

    // Mostrar mensaje y redirigir a historial en 3 segundos
    msgEl.textContent = ' Tu video se está generando (5-10 min). Podés cerrar esta pestaña.';
    msgEl.style.color = '#22c55e';
    pbox.style.display = 'block';
    document.getElementById('promptResultText').textContent = generatedPrompt;

    setTimeout(()=>{
      msgEl.style.color = '';
      showScreen('historial');
      goGenStep(1); // reset generator para la próxima vez
    }, 3500);

  } catch(err) {
    console.error('runGeneration error:', err);
    bar.style.width = '0%';
    msgEl.textContent = ' ' + (err.message || 'Ocurrió un error. Intentá de nuevo.');
    msgEl.style.color = '#ff4d4d';
    setTimeout(()=>{ msgEl.style.color = ''; }, 6000);
    // Mostrar botón de reintentar
    nxt.textContent = 'Reintentar';
    nxt.onclick = () => { goGenStep(2); };
    nxt.style.display = 'inline-flex';
  }
}

function setupPreview(){
  const a = selectedActor || 'Sofi';
  const dur = document.querySelector('#cs-step2-dur .custom-select-option.selected')?.dataset.value || '10';
  document.getElementById('previewActorLabel').textContent = a;
  document.getElementById('previewDur').textContent = dur + 's';
  document.getElementById('previewDate').textContent = new Date().toLocaleDateString('es-AR');

  // Mostrar video real si tenemos URL
  const mockEl = document.getElementById('previewVideoMock');
  const realEl = document.getElementById('previewVideoReal');
  if (_generatedVideoUrl && realEl && mockEl) {
    realEl.src = _generatedVideoUrl;
    mockEl.style.display = 'none';
    realEl.style.display = 'block';
    // Botón de descarga funcional
    const dlBtn = document.getElementById('previewDownloadBtn');
    if (dlBtn) {
      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = _generatedVideoUrl;
        a.download = 'futuriads-video.mp4';
        a.target = '_blank';
        a.click();
      };
    }
  }
}

/* ---- History ---- */
let histView='grid';
let histFilter='all';
let historyData=[];

function setHistView(v){
  histView=v;
  document.getElementById('btnGrid').classList.toggle('active',v==='grid');
  document.getElementById('btnList').classList.toggle('active',v==='list');
  renderHistory();
}

function setHistFilter(f){
  histFilter = f;
  document.querySelectorAll('.hist-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === f);
  });
  renderHistory();
}

function timeAgo(dateStr){
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff/60000);
  const hrs = Math.floor(diff/3600000);
  const days = Math.floor(diff/86400000);
  if(min < 1) return 'ahora';
  if(min < 60) return `hace ${min} min`;
  if(hrs < 24) return `hace ${hrs}h`;
  return `hace ${days} día${days>1?'s':''}`;
}

function statusBadge(status){
  const map = {
    COMPLETED: ['','#22c55e'],
    FAILED:    ['','#ef4444'],
    IN_PROGRESS:['','#f59e0b'],
    IN_QUEUE:  ['','#f59e0b'],
    PENDING:   ['','#f59e0b'],
  };
  const [icon, color] = map[status] || ['','#888'];
  return `<span style="font-size:11px;color:${color};font-weight:600;">${icon} ${status}</span>`;
}

function renderHistory(){
  const c = document.getElementById('histContent');
  const searchVal = (document.getElementById('histSearch')?.value || '').toLowerCase();

  // Filtro por tipo
  let data = historyData;
  if (histFilter === 'video') data = data.filter(v => (v.type || 'video') === 'video');
  else if (histFilter === 'image') data = data.filter(v => v.type === 'image');

  // Filtro por búsqueda
  if (searchVal) {
    data = data.filter(v =>
      (v.actor || '').toLowerCase().includes(searchVal) ||
      (v.script || '').toLowerCase().includes(searchVal) ||
      (v.model || '').toLowerCase().includes(searchVal) ||
      (v.type || '').toLowerCase().includes(searchVal)
    );
  }

  // Ordenar
  if (histSortVal === 'oldest') data = [...data].reverse();

  // Stats bar
  renderHistStats();

  if (!data.length) {
    const msg = histFilter === 'image' ? 'Todavía no generaste ninguna imagen.'
      : histFilter === 'video' ? 'Todavía no generaste ningún video.'
      : searchVal ? 'Sin resultados para tu búsqueda.'
      : 'Todavía no generaste ninguna creación.';
    c.innerHTML = `<div style="color:var(--text2);padding:80px;text-align:center;font-size:14px;">${msg}</div>`;
    return;
  }

  const esc  = s => String(s||'').replace(/"/g,'&quot;').replace(/'/g,"\\'");
  const escH = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const statusClass = s => s==='COMPLETED'?'completed':(s==='FAILED'?'failed':'pending');
  const statusLabel = s => s==='COMPLETED'?'Listo':(s==='FAILED'?'Falló':(s==='IN_PROGRESS'?'Generando':'Pendiente'));
  const modelLabel  = m => ({'seedance-2':'Seedance 2.0','gpt-image-2':'GPT Image 2','nano-banana-2':'Nano Banana 2'})[m] || m || '';

  if (histView === 'grid') {
    const gridDiv = document.createElement('div');
    gridDiv.className = 'hist-grid' + (selModeActive ? ' sel-mode-active' : '');
    gridDiv.innerHTML = data.map(v => {
      const isImage  = v.type === 'image';
      const done     = v.status === 'COMPLETED' && v.video_url;
      const title    = isImage ? (modelLabel(v.model) || 'Imagen') : escH(v.actor || 'Actor');
      const safeUrl  = esc(v.video_url);
      const safeTitle= esc(title);
      const openFn   = isImage ? 'openImageModal' : 'openVideoModal';
      const dlFn     = isImage ? 'downloadImageFile' : 'downloadVideo';
      const dlLabel  = isImage ? 'Descargar imagen' : 'Descargar MP4';
      const specs    = [
        !isImage && v.duration ? v.duration+'s' : null,
        v.aspect_ratio || null,
        v.resolution || (isImage ? '2K' : '720p'),
        modelLabel(v.model) || null
      ].filter(Boolean);

      // Calcular aspect-ratio CSS según tipo y ratio guardado
      const ratioMap = {
        '9:16': '9/16', '16:9': '16/9', '1:1': '1/1',
        '4:5': '4/5',   '3:4': '3/4',   '2:3': '2/3',
        '3:2': '3/2',   'auto': '1/1'
      };
      const raw = v.aspect_ratio || (isImage ? '1:1' : '9:16');
      const thumbRatio = ratioMap[raw] || (isImage ? '1/1' : '9/16');

      let thumb = '';
      if (done) {
        if (isImage) {
          // Imágenes: overlay sin play, click en cualquier parte abre modal
          thumb = `<img src="${v.video_url}" alt="">
            <div class="hist-card-overlay" style="cursor:zoom-in;"></div>`;
        } else {
          // Videos: overlay con play button glassmorphism centrado
          thumb = `<video src="${v.video_url}" muted playsinline preload="metadata"></video>
            <div class="hist-card-overlay">
              <button class="hist-card-play" onclick="event.stopPropagation();openVideoModal('${safeUrl}','${safeTitle}')">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="3,1 13,7 3,13"/></svg>
              </button>
            </div>`;
        }
      } else {
        thumb = `<div class="hist-pending-thumb"><svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="9"/><path d="M11 6v5l3 2" stroke-linecap="round"/></svg><span>${statusLabel(v.status)}</span></div>`;
      }

      return `<div class="hist-card${isImage?' is-image':''}" 
        data-id="${v.id}" data-idx="${data.indexOf(v)}"
        data-url="${safeUrl}" data-title="${safeTitle}"
        data-is-image="${isImage}" data-dl-fn="${dlFn}"
        onclick="histCardClick(event,this,${data.indexOf(v)},${done?1:0},'${openFn}','${safeUrl}','${safeTitle}')"
        draggable="true"
        ondragstart="histDragStart(event,this)"
        ondragend="histDragEnd(event)">
        <div class="hist-card-thumb" style="aspect-ratio:${thumbRatio};">
          <!-- Checkbox minimalista — solo visible en modo selección -->
          <div class="hist-card-checkbox">
            <svg class="hist-card-checkbox-check" width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,4.5 3.5,6.5 7.5,2"/></svg>
          </div>
          ${thumb}
        </div>
        <div class="hist-card-info">
          <div class="hist-card-header">
            <div class="hist-card-name">${title}</div>
            <span class="hist-card-status ${statusClass(v.status)}">${statusLabel(v.status)}</span>
          </div>
          <div class="hist-card-prompt">${escH(v.script || '')}</div>
          <div class="hist-card-footer">
            <div class="hist-card-specs">${specs.map(s=>`<span class="hist-card-spec">${s}</span>`).join('')}</div>
            <span class="hist-card-time">${timeAgo(v.created_at)}</span>
          </div>
          ${done ? `<button class="hist-card-dl" onclick="event.stopPropagation();${dlFn}('${safeUrl}','${safeTitle}')">${dlLabel}</button>` : ''}
        </div>
      </div>`;
    }).join('');
    c.innerHTML = '';
    c.appendChild(gridDiv);

  } else {
    // List view
    c.innerHTML = '<div class="hist-list">' + data.map(v => {
      const isImage  = v.type === 'image';
      const done     = v.status === 'COMPLETED' && v.video_url;
      const title    = isImage ? (modelLabel(v.model) || 'Imagen') : (v.actor || 'Actor');
      const safeUrl  = esc(v.video_url);
      const safeTitle= esc(title);
      const openFn   = isImage ? 'openImageModal' : 'openVideoModal';
      const dlFn     = isImage ? 'downloadImageFile' : 'downloadVideo';
      const specs    = [timeAgo(v.created_at), v.aspect_ratio, v.resolution || (isImage?'2K':'720p'), modelLabel(v.model)].filter(Boolean).join(' · ');
      let thumb = done
        ? (isImage ? `<img src="${v.video_url}" alt="">` : `<video src="${v.video_url}" muted playsinline preload="metadata"></video>`)
        : `<div class="hist-pending-thumb"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v4l2 1.5" stroke-linecap="round"/></svg></div>`;

      return `<div class="hist-list-row" onclick="${done?`${openFn}('${safeUrl}','${safeTitle}')`:''}" >
        <div class="hist-list-thumb${isImage?' is-image':''}">${thumb}</div>
        <div class="hist-list-info">
          <div class="hist-list-name">${escH(title)}</div>
          <div class="hist-list-meta">${specs}</div>
        </div>
        <div class="hist-list-right">
          <span class="hist-card-status ${statusClass(v.status)}">${statusLabel(v.status)}</span>
          ${done ? `<button class="btn-ghost-sm" onclick="event.stopPropagation();${dlFn}('${safeUrl}','${safeTitle}')">Descargar</button>` : ''}
        </div>
      </div>`;
    }).join('') + '</div>';
  }
}

function renderHistStats() {
  const el = document.getElementById('histStatsBar');
  if (!el || !historyData.length) { if(el) el.style.display='none'; return; }
  el.style.display = 'flex';

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = historyData.filter(v => new Date(v.created_at) >= startOfMonth).length;

  // Tiempo ahorrado (4h por creación)
  const hours = historyData.length * 4;

  // Modelo más usado
  const modelCount = {};
  historyData.forEach(v => { if(v.model) modelCount[v.model] = (modelCount[v.model]||0)+1; });
  const topModel = Object.entries(modelCount).sort((a,b)=>b[1]-a[1])[0];
  const modelLabel = m => ({'seedance-2':'Seedance 2.0','gpt-image-2':'GPT Image 2','nano-banana-2':'Nano Banana 2'})[m] || m || '';
  const topModelName = topModel ? modelLabel(topModel[0]) : '—';

  // Día más activo
  const dayCount = {};
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  historyData.forEach(v => { const d = days[new Date(v.created_at).getDay()]; dayCount[d]=(dayCount[d]||0)+1; });
  const topDay = Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0];
  const topDayName = topDay ? topDay[0] : '—';
  const topDayCount = topDay ? topDay[1] : 0;

  el.innerHTML = `
    <div class="hist-stat">
      <div class="hist-stat-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M5 8l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div><div class="hist-stat-val">${thisMonth}</div><div class="hist-stat-label">Este mes</div></div>
    </div>
    <div class="hist-stat">
      <div class="hist-stat-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v4l2.5 1.5" stroke-linecap="round"/></svg></div>
      <div><div class="hist-stat-val">${hours}h</div><div class="hist-stat-label">Tiempo ahorrado</div></div>
    </div>
    <div class="hist-stat">
      <div class="hist-stat-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 12l4-4 3 3 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div><div class="hist-stat-val">${topModelName}</div><div class="hist-stat-label">Lo más usado</div></div>
    </div>
    <div class="hist-stat">
      <div class="hist-stat-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v4M11 1v4M2 7h12" stroke-linecap="round"/></svg></div>
      <div><div class="hist-stat-val">${topDayName}</div><div class="hist-stat-label">Día más activo · ${topDayCount} creaciones</div></div>
    </div>`;
}

function downloadImageFile(url, name){
  const a = document.createElement('a');
  a.href = url;
  a.download = `futuriads-${(name||'imagen').replace(/[^a-z0-9]/gi,'_')}-${Date.now()}.png`;
  a.target = '_blank';
  a.click();
}

function openImageModal(url, title){
  let modal = document.getElementById('imageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:none;align-items:center;justify-content:center;z-index:9999;padding:40px;cursor:pointer;';
    modal.onclick = () => { modal.style.display = 'none'; };
    modal.innerHTML = `
      <div style="position:relative;max-width:90vw;max-height:90vh;cursor:default;" onclick="event.stopPropagation()">
        <img id="imageModalImg" src="" alt="" style="max-width:100%;max-height:90vh;border-radius:8px;display:block;" />
        <button onclick="document.getElementById('imageModal').style.display='none'" style="position:absolute;top:-44px;right:0;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;">×</button>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('imageModalImg').src = url;
  modal.style.display = 'flex';
}

function downloadVideo(url, name){
  const a = document.createElement('a');
  a.href = url;
  a.download = `futuriads-${name}-${Date.now()}.mp4`;
  a.target = '_blank';
  a.click();
}

/* =====================================================
   NUEVA IMAGEN — selector de modelo, uploader, generación
   ===================================================== */
let imgSelectedModel = 'gpt-image-2';
let imgSelectedRatio = '1:1';
let imgSelectedRes = '2K';
let imgRefUrls = []; // URLs públicas de Supabase Storage
let _generatedImageUrl = null;
let _generatedImageRequestId = null;
let _imageRefreshInterval = null;

// Aspect ratios disponibles por modelo (según docs oficiales)
const IMG_RATIOS = {
  'gpt-image-2':   ['auto','1:1','3:2','2:3','4:3','3:4','4:5','5:4','16:9','9:16','2:1','1:2','21:9','9:21'],
  'nano-banana-2': ['auto','1:1','3:2','2:3','4:3','3:4','4:5','5:4','16:9','9:16','21:9','1:4','4:1','1:8','8:1']
};

// Resoluciones disponibles. GPT Image 2 tiene restricción: 4K solo en algunos ratios.
const IMG_RESOLUTIONS = ['1K','2K','4K'];
const GPT_4K_ALLOWED_RATIOS = ['16:9','9:16','2:1','1:2','9:21','21:9'];

// Genera el HTML del mini-rectángulo visual para un ratio dado
function arBoxHTML(ratio) {
  if (ratio === 'auto') return '<span class="ar-box ar-auto"></span>';
  const cls = 'ar-' + ratio.replace(':', '-');
  return `<span class="ar-box ${cls}"></span>`;
}

// Etiqueta humana de un ratio (sólo el código numérico)
function arLabel(ratio) {
  return ratio === 'auto' ? 'Auto' : ratio;
}

// Construye el dropdown de aspect ratio en función del modelo y la resolución actual
function rebuildRatioDropdown(){
  const dd = document.getElementById('cs-img-step-ratio-dd');
  if (!dd) return;
  let ratios = IMG_RATIOS[imgSelectedModel] || IMG_RATIOS['gpt-image-2'];

  // Si la res es 4K en GPT Image 2, filtrar a los ratios permitidos
  if (imgSelectedModel === 'gpt-image-2' && imgSelectedRes === '4K') {
    ratios = ratios.filter(r => GPT_4K_ALLOWED_RATIOS.includes(r));
  }

  // Si el ratio actual no está en la lista nueva, fallback al primero
  if (!ratios.includes(imgSelectedRatio)) {
    imgSelectedRatio = ratios[0] || '1:1';
  }

  dd.innerHTML = ratios.map(r => `
    <div class="custom-select-option ${r === imgSelectedRatio ? 'selected' : ''}" data-value="${r}" onclick="onPickImgRatio(this)">
      <span class="ar-visual">${arBoxHTML(r)}<span>${arLabel(r)}</span></span>
    </div>
  `).join('');

  // Actualizar el trigger
  const trigger = document.querySelector('#cs-img-step-ratio .custom-select-trigger span');
  if (trigger) trigger.innerHTML = `<span class="ar-visual">${arBoxHTML(imgSelectedRatio)}<span>${arLabel(imgSelectedRatio)}</span></span>`;
}

function rebuildResDropdown(){
  const dd = document.getElementById('cs-img-step-res-dd');
  if (!dd) return;
  dd.innerHTML = IMG_RESOLUTIONS.map(r => {
    // En GPT Image 2, deshabilitar 4K si el ratio actual no es uno de los permitidos
    const disabled = (imgSelectedModel === 'gpt-image-2' && r === '4K' && !GPT_4K_ALLOWED_RATIOS.includes(imgSelectedRatio));
    if (disabled) {
      return `<div class="custom-select-option" style="opacity:0.4;cursor:not-allowed;" data-value="${r}" title="No disponible para este aspect ratio">${r}</div>`;
    }
    return `<div class="custom-select-option ${r === imgSelectedRes ? 'selected' : ''}" data-value="${r}" onclick="onPickImgRes(this)">${r}</div>`;
  }).join('');
  const trigger = document.querySelector('#cs-img-step-res .custom-select-trigger span');
  if (trigger) trigger.textContent = imgSelectedRes;
}

function onPickImgRatio(el){
  imgSelectedRatio = el.dataset.value;
  // Cerrar dropdown
  document.getElementById('cs-img-step-ratio').classList.remove('open');
  rebuildRatioDropdown();
  rebuildResDropdown(); // por si la res 4K queda no disponible
}

function onPickImgRes(el){
  imgSelectedRes = el.dataset.value;
  document.getElementById('cs-img-step-res').classList.remove('open');
  rebuildResDropdown();
  rebuildRatioDropdown(); // si bajamos de 4K, los ratios bloqueados vuelven a estar disponibles
}

function selectImgModel(el){
  document.querySelectorAll('.img-model-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  imgSelectedModel = el.dataset.model;
  rebuildRatioDropdown();
  rebuildResDropdown();
}

function updateImgStepUI(step){
  const labels = ['Tu prompt', 'Generando...', 'Resultado'];
  for (let i = 0; i < 3; i++) {
    const d = document.getElementById('img-sd' + i);
    if (!d) continue;
    if (i < step - 1) { d.classList.add('done'); d.classList.remove('active'); }
    else if (i === step - 1) { d.classList.remove('done'); d.classList.add('active'); }
    else { d.classList.remove('done', 'active'); }
    if (i < 2) {
      const c = document.getElementById('img-sc' + i);
      if (c) { if (i < step - 1) c.classList.add('done'); else c.classList.remove('done'); }
    }
  }
  const lbl = document.getElementById('imgStepLabel');
  if (lbl) lbl.textContent = labels[step - 1];
}

function goImgStep(step){
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('img-step-' + i);
    if (el) el.style.display = 'none';
  }
  const nx = document.getElementById('img-step-' + step);
  if (nx) nx.style.display = 'block';
  updateImgStepUI(step);
}

function resetImageGenerator(){
  imgRefUrls = [];
  imgSelectedRatio = '1:1';
  imgSelectedRes = '2K';
  _generatedImageUrl = null;
  _generatedImageRequestId = null;
  if (_imageRefreshInterval) { clearInterval(_imageRefreshInterval); _imageRefreshInterval = null; }
  const promptEl = document.getElementById('imgPromptInput');
  if (promptEl) promptEl.value = '';
  const list = document.getElementById('imgRefList');
  if (list) list.innerHTML = '';
  const bar = document.getElementById('imgProgressBar');
  if (bar) bar.style.width = '0%';
  // Reconstruir los dropdowns con valores por defecto
  rebuildRatioDropdown();
  rebuildResDropdown();
  goImgStep(1);
}

/* ----- Upload a Supabase Storage ----- */
async function handleImgRefUpload(event){
  const files = Array.from(event.target.files || []);
  event.target.value = ''; // reset para poder subir el mismo archivo de nuevo
  if (!files.length) return;

  // Verificar sesión
  const { data: sess } = await supa.auth.getSession();
  if (!sess?.session) {
    showToast('Tenés que iniciar sesión para subir imágenes');
    return;
  }
  const userId = sess.session.user.id;
  const accessToken = sess.session.access_token;

  if (imgRefUrls.length + files.length > 14) {
    showToast('Máximo 14 imágenes de referencia');
    return;
  }

  const list = document.getElementById('imgRefList');

  for (const file of files) {
    if (file.size > 30 * 1024 * 1024) {
      showToast(`"${file.name}" supera los 30MB`);
      continue;
    }

    // Crear thumb con shimmer mientras sube
    const thumbEl = document.createElement('div');
    thumbEl.className = 'img-ref-thumb uploading';
    const previewUrl = URL.createObjectURL(file);
    thumbEl.innerHTML = `<img src="${previewUrl}" alt="">`;
    list.appendChild(thumbEl);

    try {
      // Generar nombre único: userId/timestamp_random.ext
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;

      // Upload directo a Supabase Storage vía REST
      const uploadRes = await fetch(`${SUPA_URL}/storage/v1/object/user-uploads/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: file
      });

      if (!uploadRes.ok) {
        const errTxt = await uploadRes.text();
        console.error('Upload error:', errTxt);
        throw new Error('Falló el upload');
      }

      // Construir la URL pública del archivo
      const publicUrl = `${SUPA_URL}/storage/v1/object/public/user-uploads/${path}`;

      // Guardar URL y actualizar el thumb
      imgRefUrls.push(publicUrl);
      thumbEl.classList.remove('uploading');

      // Agregar botón de remover
      const idx = imgRefUrls.length - 1;
      const removeBtn = document.createElement('div');
      removeBtn.className = 'img-ref-remove';
      removeBtn.textContent = '×';
      removeBtn.onclick = () => removeImgRef(publicUrl, thumbEl);
      thumbEl.appendChild(removeBtn);

    } catch (err) {
      console.error('Error subiendo imagen:', err);
      thumbEl.remove();
      showToast('No se pudo subir "' + file.name + '"');
    }
  }
}

function removeImgRef(url, thumbEl){
  imgRefUrls = imgRefUrls.filter(u => u !== url);
  thumbEl.remove();
}

/* ----- Generar imagen ----- */
async function generateImage(){
  const prompt = document.getElementById('imgPromptInput')?.value?.trim() || '';
  if (!prompt) { showToast('Escribí un prompt antes de generar'); return; }

  const ratio = imgSelectedRatio || '1:1';
  const res = imgSelectedRes || '2K';

  // Obtener userId
  let userId = null;
  try {
    const { data: sess } = await supa.auth.getSession();
    userId = sess?.session?.user?.id || null;
  } catch (e) { /* anónimo */ }

  goImgStep(2);

  const msgEl = document.getElementById('imgLoadingMsg');
  const bar = document.getElementById('imgProgressBar');

  // Animación de progreso indeterminada (porque no sabemos cuánto tarda)
  let prog = 0;
  const progInterval = setInterval(() => {
    prog = Math.min(prog + Math.random() * 8, 92);
    if (bar) bar.style.width = prog + '%';
  }, 800);

  try {
    msgEl.textContent = 'Preparando tu imagen...';

    const response = await fetch(BACKEND_URL + '/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: imgSelectedModel,
        prompt: prompt,
        inputImages: imgRefUrls.length > 0 ? imgRefUrls : undefined,
        aspectRatio: ratio,
        resolution: res,
        userId: userId
      })
    });

    if (response.status === 402) {
      clearInterval(progInterval);
      const errData = await response.json().catch(() => ({}));
      if (bar) bar.style.width = '0%';
      msgEl.textContent = ' Sin créditos suficientes';
      msgEl.style.color = '#f59e0b';
      showNoCreditsModal({
        cost: errData.cost || 0,
        available: errData.available || 0,
        plan: errData.plan || 'none'
      });
      // Volver al step 1 después de un toque
      setTimeout(() => {
        msgEl.style.color = '';
        goImgStep(1);
      }, 2000);
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      // Caso especial: el backend pudo encolar en Enhancor pero falló el insert en DB
      if (errData.requestId) {
        throw new Error(
          'La imagen se encoló pero no se pudo guardar en tu historial. ' +
          (errData.details || errData.error || '')
        );
      }
      throw new Error(errData.error || `Error ${response.status}`);
    }

    const data = await response.json();
    _generatedImageRequestId = data.requestId;
    console.log('[generateImage] requestId recibido:', _generatedImageRequestId);

    // Refrescar contador de créditos en el sidebar después de descontar
    refreshCredits();

    msgEl.textContent = ' Generando tu imagen, esto puede tardar entre 15 segundos y unos minutos...';

    // Función auxiliar de polling — chequea Supabase por la fila con el request_id.
    // IMPORTANTE: la implementación custom de supa NO soporta .limit(); por eso
    // anteriormente la query devolvía undefined y el polling no detectaba nada.
    const checkOnce = async () => {
      try {
        const { data: rows, error } = await supa
          .from('videos')
          .select('*')
          .eq('request_id', _generatedImageRequestId);

        if (error) {
          console.warn('[poll] Error en query:', error);
          return false;
        }
        if (!rows || rows.length === 0) {
          console.log('[poll] Sin filas todavía para requestId', _generatedImageRequestId);
          return false;
        }

        const row = rows[0];
        console.log('[poll] Estado actual:', row.status, '| URL:', row.video_url ? 'sí' : 'no');

        if (row.status === 'COMPLETED' && row.video_url) {
          clearInterval(progInterval);
          if (_imageRefreshInterval) {
            clearInterval(_imageRefreshInterval);
            _imageRefreshInterval = null;
          }
          if (bar) bar.style.width = '100%';
          _generatedImageUrl = row.video_url;
          setTimeout(() => {
            document.getElementById('imgPreviewReal').src = row.video_url;
            goImgStep(3);
          }, 400);
          return true;
        } else if (row.status === 'FAILED') {
          clearInterval(progInterval);
          if (_imageRefreshInterval) {
            clearInterval(_imageRefreshInterval);
            _imageRefreshInterval = null;
          }
          msgEl.textContent = 'La imagen falló. Intentá de nuevo.';
          if (bar) bar.style.width = '0%';
          return true;
        }
        return false;
      } catch (e) {
        console.warn('[poll] Excepción:', e);
        return false;
      }
    };

    // Primer check rápido a los 3 segundos (a veces los modelos responden muy rápido)
    setTimeout(checkOnce, 3000);

    // Polling cada 5 segundos
    let pollCount = 0;
    const MAX_POLLS = 120; // 120 * 5s = 10 minutos máximo
    _imageRefreshInterval = setInterval(async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) {
        clearInterval(progInterval);
        clearInterval(_imageRefreshInterval);
        _imageRefreshInterval = null;
        msgEl.innerHTML = '✓ Tu imagen sigue generándose en segundo plano. <br>La encontrarás en el <a href="#" onclick="event.preventDefault();showScreen(\'historial\');" style="color:#fff;text-decoration:underline;">Historial</a> cuando esté lista.';
        return;
      }
      checkOnce();
    }, 5000);

  } catch (err) {
    clearInterval(progInterval);
    if (bar) bar.style.width = '0%';
    msgEl.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

function downloadGeneratedImage(){
  if (!_generatedImageUrl) return;
  const a = document.createElement('a');
  a.href = _generatedImageUrl;
  a.download = `futuriads-imagen-${Date.now()}.png`;
  a.target = '_blank';
  a.click();
}

function openVideoModal(url, actor){
  // Crear modal de video si no existe
  let modal = document.getElementById('videoModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'videoModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;';
    modal.onclick = (e)=>{ if(e.target===modal) closeVideoModal(); };
    modal.innerHTML = `
      <video id="videoModalPlayer" controls autoplay style="max-height:80vh;max-width:90vw;border-radius:12px;"></video>
      <div style="display:flex;gap:12px;">
        <button class="btn-w" id="videoModalDl" style="font-size:14px;">Descargar MP4</button>
        <button class="btn-outline" onclick="closeVideoModal()" style="border-radius:8px;font-size:14px;">✕ Cerrar</button>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('videoModalPlayer').src = url;
  document.getElementById('videoModalDl').onclick = ()=>downloadVideo(url, actor);
  modal.style.display = 'flex';
}

function closeVideoModal(){
  const modal = document.getElementById('videoModal');
  if(modal){
    document.getElementById('videoModalPlayer').pause();
    modal.style.display = 'none';
  }
}

/* ---- Init ---- */
resetGenerator();
renderHistory();

/* ---- Auth Modal ---- */
function openAuthModal(tab) {
  document.getElementById('authModal').classList.add('open');
  switchAuthTab(tab || 'login');
  ['authEmail','authPass','authEmailSignup','authPassSignup'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  ['authError','authErrorSignup'].forEach(id => {
    const el = document.getElementById(id); if(el) el.style.display = 'none';
  });
}

function closeAuthModal(e) {
  if (!e || e.target === document.getElementById('authModal')) {
    document.getElementById('authModal').classList.remove('open');
  }
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('authLoginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('authSignupForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tabLogin').style.background = isLogin ? '#fff' : 'transparent';
  document.getElementById('tabLogin').style.color = isLogin ? '#080808' : '#888';
  document.getElementById('tabSignup').style.background = isLogin ? 'transparent' : '#fff';
  document.getElementById('tabSignup').style.color = isLogin ? '#888' : '#080808';
}

async function submitLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value;
  const errEl = document.getElementById('authError');
  errEl.style.display = 'none';
  if (!email || !pass) { errEl.textContent = 'Completá todos los campos.'; errEl.style.display = 'block'; return; }
  try {
    const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) { errEl.textContent = 'Email o contraseña incorrectos.'; errEl.style.display = 'block'; return; }
    document.getElementById('authModal').classList.remove('open');
    goToApp();
  } catch(e) {
    console.error('Login error:', e);
    errEl.textContent = 'Error de conexión. Intentá de nuevo.'; errEl.style.display = 'block';
  }
}

async function submitSignup() {
  const fullName = document.getElementById('authNameSignup').value.trim();
  const country = document.getElementById('authCountrySignup').value;
  const email = document.getElementById('authEmailSignup').value.trim();
  const pass = document.getElementById('authPassSignup').value;
  const errEl = document.getElementById('authErrorSignup');
  errEl.style.display = 'none';
  if (!fullName || !country || !email || !pass) { errEl.textContent = 'Completá todos los campos.'; errEl.style.display = 'block'; return; }
  if (pass.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errEl.style.display = 'block'; return; }
  try {
    // 1. Crear usuario en auth.users
    const { data, error } = await supa.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          country: country
        }
      }
    });
    if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }

    // 2. Si se creó con sesión inmediata, actualizar el perfil con nombre y país
    if (data.session && data.session.access_token && data.user) {
      try {
        const { error: updateError } = await supa.from('profiles').update({
          full_name: fullName,
          country: country
        }).eq('id', data.user.id);
        if (updateError) {
          console.error('Error actualizando perfil:', updateError);
        }
      } catch(updErr) {
        console.error('Error en update de perfil:', updErr);
      }
      document.getElementById('authModal').classList.remove('open');
      goToApp();
    } else {
      // Email confirmation required
      document.getElementById('authModal').classList.remove('open');
      alert('Cuenta creada. Revisá tu email para confirmar tu cuenta antes de iniciar sesión.');
    }
  } catch(e) {
    console.error('Signup error:', e);
    errEl.textContent = 'Error de conexión. Intentá de nuevo.'; errEl.style.display = 'block';
  }
}

// Forzar autoplay en videos del hero (algunos browsers lo bloquean)
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.actor-card video').forEach(function(v) {
    v.muted = true;
    v.play().catch(function() {});
  });
});
// Sidebar estático — limpiar cualquier ancho guardado de versiones anteriores
localStorage.removeItem('sidebarWidth');

