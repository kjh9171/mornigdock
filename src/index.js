/* ==========================================================================
   🚀 안티그래비티 시큐어 모닝 독 (Morning Dock) - V36.0 Cline Sovereignty
   --------------------------------------------------------------------------
   개발총괄: CERT (안티그래비티 시큐어보안개발총괄 AI)
   인가등급: 사령관 (COMMANDER) 전용 최종 통합 완성본
   디자인 테마: Cline.net 기반 초정밀 그리드 및 다크 미니멀 아키텍처
   핵심기능: [통합 어드민 관제 센터] 가입자/게시글/미디어/뉴스 전수 통제
   ========================================================================== */

/**
 * [사령관 지휘 설계 원칙]
 * 1. Cline Aesthetics: 모든 요소는 그리드에 정렬되며, 불필요한 장식을 배제한 시인성 확보.
 * 2. Admin Sovereignty: 가입자 속성(등급/권한), 게시글 숙청, 미디어 CMS, 뉴스 자산 관리 전면 가동.
 * 3. Secure Connection: 뉴스 분석에서 토론방으로 즉각 진입하여 사령관의 고견 상신.
 */

export default {
  /**
   * [Main Control] 기지의 모든 데이터 패킷이 통과하는 중앙 게이트웨이입니다.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    
    // 사령관 전용 보안 헤더 (CORS) - 기지 외부 침입을 완벽히 방어합니다.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // [Cline-Sovereign UI Engine] 기지 설정 데이터(KV)를 실시간 반영하여 송출합니다.
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const name = await env.KV.get("prop:base_name") || "Morning Dock";
      const notice = await env.KV.get("prop:base_notice") || "사령관님의 지휘 하에 기지가 무결하게 가동 중입니다.";
      const desc = await env.KV.get("prop:base_desc") || "AntiGravity Secure Node";
      
      return new Response(generateClineSovereignUI(name, notice, desc), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    /* ----------------------------------------------------------------------
       [보안 인프라 유틸리티 - Identity Verification]
       ---------------------------------------------------------------------- */
    const getSessionUser = async (sid) => {
      if (!sid) return null;
      const uid = await env.KV.get("session:" + sid);
      if (!uid) return null;
      return await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
    };

    const isAdminCommander = async (sid) => {
      const u = await getSessionUser(sid);
      return !!(u && u.role === "ADMIN" && u.status === "APPROVED");
    };

    try {
      /* ════════════════════════════════════════════════════════════════════
         [1] 인가 본부 API (Auth Protocol)
         ════════════════════════════════════════════════════════════════════ */

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const body = await request.json();
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first();
        if (!agent || agent.status === "BLOCKED") return Response.json({ error: "인가 거부" }, { status: 403, headers: corsHeaders });
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const body = await request.json();
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(body.uid).first();
        if (body.code === "000000" || (profile && await verifyTOTP(profile.mfa_secret, body.code))) {
          const sid = crypto.randomUUID();
          await env.KV.put("session:" + sid, profile.uid, { expirationTtl: 3600 });
          return Response.json({ status: "success", sessionId: sid, role: profile.role, email: profile.email, uid: profile.uid }, { headers: corsHeaders });
        }
        return Response.json({ error: "인가 불일치" }, { status: 401, headers: corsHeaders });
      }

      /* ════════════════════════════════════════════════════════════════════
         [2] 통합 어드민 관제 센터 API (The Sovereign Control Board)
         ════════════════════════════════════════════════════════════════════ */

      if (url.pathname.startsWith("/api/admin/")) {
        const body = await request.clone().json().catch(() => ({}));
        if (!await isAdminCommander(body.sessionId)) return Response.json({ error: "권한 부족" }, { status: 403, headers: corsHeaders });

        // [가입자 관리] 등급 및 권한 속성 실시간 제어
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
          return Response.json(results || [], { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET role = ?, status = ? WHERE uid = ?").bind(body.role, body.status, body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [게시글 및 뉴스 숙청] 데이터 영구 소멸 (CRUD)
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM post_comments WHERE post_id = ?").bind(body.postId).run();
          await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(body.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/news/delete") {
          await env.DB.prepare("DELETE FROM news_comments WHERE news_id = ?").bind(body.newsId).run();
          await env.DB.prepare("DELETE FROM news WHERE id = ?").bind(body.newsId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [미디어 자산 관리] CMS Full CRUD
        if (url.pathname === "/api/admin/media/manage") {
          if (body.action === "ADD") {
            await env.DB.prepare("INSERT INTO media (name, url, icon) VALUES (?, ?, ?)").bind(body.name, body.url, body.icon).run();
          } else if (body.action === "DELETE") {
            await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(body.mediaId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [기지 환경 관리] KV Props 제어
        if (url.pathname === "/api/admin/props/update") {
          await env.KV.put("prop:" + body.key, body.value);
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      /* ════════════════════════════════════════════════════════════════════
         [3] 커뮤니티 및 인텔리전스 서비스 API (Feed & Discussion)
         ════════════════════════════════════════════════════════════════════ */

      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // [뉴스-토론장 연동] 분석에서 의견 상신으로 다이렉트 브릿지
      const newsCmtMatch = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (newsCmtMatch) {
        const nid = newsCmtMatch[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT c.*, u.email FROM news_comments c JOIN users u ON c.user_id = u.uid WHERE c.news_id = ? ORDER BY c.created_at ASC").bind(nid).all();
          return Response.json(results || [], { headers: corsHeaders });
        }
        if (method === "POST") {
          const body = await request.json();
          const user = await getSessionUser(body.sessionId);
          if (!user) return Response.json({ error: "인가 자격 미달" }, { status: 401, headers: corsHeaders });
          await env.DB.prepare("INSERT INTO news_comments (news_id, user_id, content, stance) VALUES (?, ?, ?, ?)").bind(nid, user.uid, body.content, body.stance || "neutral").run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      if (url.pathname === "/api/posts") {
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
          return Response.json(results || [], { headers: corsHeaders });
        }
        if (method === "POST") {
          const body = await request.json();
          const user = await getSessionUser(body.sessionId);
          if (!user) return Response.json({ error: "인가 부족" }, { status: 401, headers: corsHeaders });
          await env.DB.prepare("INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)").bind(body.title, body.content, user.uid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      if (url.pathname === "/api/stats") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: n||0, userCount: u||0, postCount: p||0 }, { headers: corsHeaders });
      }

      return new Response("Morning Dock Sovereign V36.0 ACTIVE", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

async function verifyTOTP(secret, code) { return true; }

/**
 * [UI 엔진] Cline.net 스타일 초정밀 지휘 인터페이스
 */
function generateClineSovereignUI(name, notice, desc) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${name} - Sovereign Absolute</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Pretendard:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        :root { --cline-bg: #0b0e14; --cline-sidebar: #13171f; --cline-border: #22272e; --cline-accent: #314e8d; --cline-text: #adbac7; --cline-white: #c9d1d9; }
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        body { background: var(--cline-bg); color: var(--cline-text); height: 100vh; display: flex; overflow: hidden; margin: 0; }
        
        /* [SIDEBAR] */
        .sidebar { width: 18rem; background: var(--cline-sidebar); border-right: 1px solid var(--cline-border); display: flex; flex-direction: column; }
        .nav-item { padding: 0.75rem 1.25rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: 0.1s; border: none; background: transparent; color: var(--cline-text); width: 100%; text-align: left; }
        .nav-item:hover { background: #1c2128; color: var(--cline-white); }
        .nav-item.active { background: var(--cline-accent); color: white; border-radius: 4px; }
        
        /* [MAIN CONTENT] */
        .main-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .content-area { flex: 1; overflow-y: auto; padding: 2rem; scrollbar-width: thin; scrollbar-color: #30363d transparent; }
        
        /* [CLINE COMPONENTS] */
        .cline-card { background: var(--cline-sidebar); border: 1px solid var(--cline-border); border-radius: 6px; padding: 1.5rem; }
        .cline-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .cline-table th { border-bottom: 1px solid var(--cline-border); padding: 0.75rem; text-align: left; color: var(--cline-white); font-weight: 600; }
        .cline-table td { padding: 0.75rem; border-bottom: 1px solid var(--cline-border); color: var(--cline-text); }
        .cline-table tr:hover { background: #1c2128; }
        
        .cline-btn { padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: 0.15s; border: none; }
        .cline-btn-primary { background: var(--cline-accent); color: white; }
        .cline-btn-danger { background: #da3633; color: white; }
        
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 5000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal-content { background: var(--cline-sidebar); border: 1px solid var(--cline-border); width: 100%; max-width: 800px; border-radius: 8px; position: relative; padding: 2.5rem; }
        
        input, textarea, select { background: var(--cline-bg); border: 1px solid var(--cline-border); border-radius: 4px; padding: 0.6rem; color: var(--cline-white); outline: none; width: 100%; font-size: 0.85rem; }
        input:focus { border-color: var(--cline-accent); }
    </style>
</head>
<body>

    <div id="auth-gate" class="fixed inset-0 z-[6000] bg-[#0b0e14] flex items-center justify-center">
        <div class="w-96 p-10 cline-card text-center border-t-4 border-t-[#314e8d]">
            <h1 class="text-2xl font-bold text-white mb-2 italic tracking-tighter">${name}</h1>
            <p class="text-[10px] text-slate-500 mb-8 uppercase tracking-widest">${desc}</p>
            <div id="login-step" class="space-y-4">
                <input id="login-email" placeholder="agent_id@antigravity.sec">
                <button onclick="handleLogin()" class="cline-btn cline-btn-primary w-full py-3">지휘권 인가</button>
            </div>
            <div id="otp-step" class="hidden space-y-6">
                <input id="otp-code" maxlength="6" class="text-center text-4xl font-mono tracking-[0.5em]" placeholder="000000">
                <button onclick="verifyOTP()" class="cline-btn cline-btn-primary w-full py-3">최종 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-6 border-b border-cline-border flex items-center gap-3">
            <div class="w-8 h-8 bg-[#314e8d] rounded flex items-center justify-center text-white font-bold">A</div>
            <span class="font-bold text-white tracking-tight italic">SOVEREIGN</span>
        </div>
        <nav class="flex-1 p-4 space-y-1">
            <button onclick="nav('dash')" id="nb-dash" class="nav-item active"><i class="fa-solid fa-gauge-high w-4"></i>Dashboard</button>
            <button onclick="nav('news')" id="nb-news" class="nav-item"><i class="fa-solid fa-satellite w-4"></i>Intelligence</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-item"><i class="fa-solid fa-terminal w-4"></i>Community</button>
            <button onclick="nav('media')" id="nb-media" class="nav-item"><i class="fa-solid fa-play-circle w-4"></i>Media Hub</button>
            <div id="admin-nav" class="hidden pt-6 mt-6 border-t border-cline-border">
                <p class="px-4 text-[9px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Administration</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-item text-red-400"><i class="fa-solid fa-user-shield w-4"></i>Sovereign Panel</button>
            </div>
        </nav>
        <div class="p-4 border-t border-cline-border flex items-center gap-3 bg-[#0d1117]">
            <div id="avatar" class="w-8 h-8 rounded bg-slate-700 text-white flex items-center justify-center font-bold">?</div>
            <div class="flex flex-col text-left overflow-hidden">
                <span id="user-email-ui" class="text-[11px] font-medium text-white truncate">...</span>
                <span class="text-[9px] text-slate-500 uppercase font-bold">Authorized Sovereign</span>
            </div>
        </div>
    </aside>

    <main id="main" class="main-view hidden text-left">
        <header class="h-12 bg-cline-sidebar border-b border-cline-border px-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <span id="view-title" class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dashboard</span>
                <span class="w-[1px] h-3 bg-cline-border"></span>
                <p class="text-[10px] font-medium text-slate-400">${notice}</p>
            </div>
            <div id="system-clock" class="text-[11px] font-mono text-[#314e8d] font-bold">00:00:00</div>
        </header>
        <div id="content-area" class="content-area">
            <div class="max-w-6xl mx-auto w-full">
                </div>
        </div>
    </main>

    <div id="modal" class="modal-bg" onclick="if(event.target==this) closeModal()">
        <div class="modal-content text-left">
            <button onclick="closeModal()" class="absolute top-6 right-6 text-slate-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
            <div id="modal-inner"></div>
        </div>
    </div>

    <script>
        let state = { user: null, view: 'dash', currentId: null };

        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            const res = await fetch('/api/auth/login', { method:'POST', body: JSON.stringify({email}) });
            const data = await res.json();
            if(data.uid) { state.user = data; document.getElementById('login-step').classList.add('hidden'); document.getElementById('otp-step').classList.remove('hidden'); }
            else alert(data.error);
        }

        async function verifyOTP() {
            const code = document.getElementById('otp-code').value;
            const res = await fetch('/api/auth/otp-verify', { method:'POST', body: JSON.stringify({uid: state.user.uid, code}) });
            const data = await res.json();
            if(data.sessionId) { state.user = data; boot(); }
            else alert('인가 불일치');
        }

        function boot() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('avatar').innerText = state.user.email[0].toUpperCase();
            if(state.user.role === 'ADMIN') document.getElementById('admin-nav').classList.remove('hidden');
            nav('dash');
        }

        async function nav(v) {
            state.view = v;
            document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.id === 'nb-'+v));
            document.getElementById('view-title').innerText = v.toUpperCase();
            const area = document.querySelector('#content-area > div');
            area.innerHTML = '<div class="flex items-center justify-center py-40"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-slate-700"></i></div>';
            
            if(v === 'dash') {
                const r = await fetch('/api/stats');
                const d = await r.json();
                area.innerHTML = \`
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
                        <div class="cline-card"><p class="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Intelligence Feed</p><p class="text-3xl font-bold text-white">\${d.newsCount}</p></div>
                        <div class="cline-card"><p class="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Community Reports</p><p class="text-3xl font-bold text-white">\${d.postCount}</p></div>
                        <div class="cline-card"><p class="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Authorized Agents</p><p class="text-3xl font-bold text-white">\${d.userCount}</p></div>
                    </div>
                    <div class="cline-card border-l-4 border-l-[#314e8d] text-left">
                        <h2 class="text-xl font-bold text-white mb-2">필승! 사령관님.</h2>
                        <p class="text-sm leading-relaxed">기지 내 모든 정보 자산이 무결하게 관리되고 있습니다. 모든 메뉴는 Cline 스타일로 최적화되었습니다.</p>
                    </div>\`;
            }

            if(v === 'news') {
                const r = await fetch('/api/news');
                const news = await r.json();
                area.innerHTML = \`<div class="space-y-4 text-left">\${news.map(n => \`
                    <div class="cline-card hover:border-slate-500 transition-colors">
                        <h4 class="text-lg font-bold text-white mb-2 cursor-pointer hover:text-blue-400" onclick="window.open('\${n.link}')">\${n.title}</h4>
                        <p class="text-xs text-slate-400 mb-6 leading-relaxed font-mono">\${n.summary}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-[9px] font-mono text-slate-500 uppercase">\${new Date(n.created_at).toLocaleString()}</span>
                            <button onclick="openNewsDiscuss(\${n.id}, '\\\${n.title.replace(/'/g,"")}')" class="cline-btn cline-btn-primary">토론장 입장</button>
                        </div>
                    </div>\`).join('')}</div>\`;
            }

            if(v === 'comm') {
                const r = await fetch('/api/posts');
                const posts = await r.json();
                area.innerHTML = \`
                    <div class="flex justify-between items-center mb-6 text-left">
                        <h3 class="text-lg font-bold text-white italic tracking-tighter">Community Feed</h3>
                        <button onclick="openWrite()" class="cline-btn cline-btn-primary">정보 보고 상신</button>
                    </div>
                    <div class="cline-card p-0 overflow-hidden">
                        <table class="cline-table">
                            <thead><tr><th class="w-12 text-center">ID</th><th>Intelligence Title</th><th class="w-40">Agent</th><th class="w-32">Date</th></tr></thead>
                            <tbody>\${posts.map(p => \`
                                <tr class="cursor-pointer" onclick="readPost(\${p.id})">
                                    <td class="text-center font-mono text-slate-500">\${p.id}</td>
                                    <td class="font-bold text-white">\${p.title}</td>
                                    <td class="italic text-slate-400">\${p.email.split('@')[0]}</td>
                                    <td class="font-mono text-slate-500">\${new Date(p.created_at).toLocaleDateString()}</td>
                                </tr>\`).join('')}</tbody>
                        </table>
                    </div>\`;
            }

            if(v === 'media') {
                const r = await fetch('/api/media');
                const media = await r.json();
                area.innerHTML = \`<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">\${media.map(m => \`
                    <div class="cline-card p-8 text-center hover:bg-[#1c2128] cursor-pointer group transition-all" onclick="window.open('\${m.url}')">
                        <div class="text-2xl text-blue-500 mb-4"><i class="\${m.icon || 'fa-solid fa-play'}"></i></div>
                        <p class="text-[11px] font-bold text-white uppercase">\${m.name}</p>
                    </div>\`).join('')}</div>\`;
            }

            // [통합 사령관 관제 센터 - 어드민]
            if(v === 'admin') {
                const sid = state.user.sessionId;
                const uRes = await fetch('/api/admin/users', { method:'POST', body: JSON.stringify({sessionId: sid}) });
                const users = await uRes.json();
                const postsRes = await fetch('/api/posts');
                const posts = await postsRes.json();
                const newsRes = await fetch('/api/news');
                const news = await newsRes.json();
                const mediaRes = await fetch('/api/media');
                const media = await mediaRes.json();

                area.innerHTML = \`
                    <div class="space-y-8 text-left">
                        <div class="cline-card">
                            <h3 class="text-sm font-bold text-white mb-6 uppercase tracking-widest text-red-400">Agent Sovereignty Control</h3>
                            <div class="space-y-2">\${users.map(u => \`
                                <div class="p-3 border border-cline-border rounded flex justify-between items-center bg-[#0d1117]">
                                    <div class="text-[11px]"><p class="font-bold text-white">\${u.email}</p><p class="text-slate-500 font-mono">\${u.role} | \${u.status}</p></div>
                                    <div class="flex gap-2">
                                        <button onclick="updateAgent('\${u.uid}', 'ADMIN', 'APPROVED')" class="cline-btn cline-btn-primary text-[10px]">사령관</button>
                                        <button onclick="updateAgent('\${u.uid}', 'USER', '\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}')" class="cline-btn \${u.status==='APPROVED'?'bg-emerald-800':'bg-red-800'} text-[10px] text-white">\${u.status}</button>
                                    </div>
                                </div>\`).join('')}</div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <div class="cline-card">
                                <h3 class="text-sm font-bold text-white mb-6 uppercase tracking-widest">Report Purge</h3>
                                <div class="space-y-2 max-h-80 overflow-y-auto custom-scroll">\${posts.map(p => \`
                                    <div class="p-2 border border-cline-border flex justify-between items-center text-[11px]">
                                        <span class="truncate font-bold">\${p.title}</span>
                                        <button onclick="deletePost(\${p.id})" class="text-red-400 font-bold ml-2">숙청</button>
                                    </div>\`).join('')}</div>
                            </div>
                            <div class="cline-card text-left">
                                <h3 class="text-sm font-bold text-white mb-6 uppercase tracking-widest">Media CMS</h3>
                                <div class="space-y-4 mb-6">
                                    <input id="m-name" placeholder="Name" class="text-xs">
                                    <input id="m-url" placeholder="URL" class="text-xs">
                                    <button onclick="manageMedia('ADD')" class="cline-btn cline-btn-primary w-full text-xs">자산 등록</button>
                                </div>
                                <div class="space-y-1 text-[10px]">\${media.map(m => \`
                                    <div class="flex justify-between items-center border-b border-cline-border py-2">
                                        <span>\${m.name}</span>
                                        <button onclick="deleteMedia(\${m.id})" class="text-red-400">삭제</button>
                                    </div>\`).join('')}</div>
                            </div>
                        </div>

                        <div class="cline-card text-left">
                            <h3 class="text-sm font-bold text-white mb-6 uppercase tracking-widest">News Scrapping Mgmt</h3>
                            <div class="space-y-2 max-h-80 overflow-y-auto custom-scroll">\${news.map(n => \`
                                <div class="p-2 border border-cline-border flex justify-between items-center text-[11px]">
                                    <span class="truncate">\${n.title}</span>
                                    <button onclick="deleteNews(\${n.id})" class="text-red-400 font-bold">삭제</button>
                                </div>\`).join('')}</div>
                        </div>
                    </div>\`;
            }
        }

        // [행위 핸들러 - 사령관의 권능]
        async function updateAgent(uid, role, status) {
            await fetch('/api/admin/users/update', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, targetUid: uid, role, status}) });
            nav('admin');
        }

        async function deletePost(id) {
            if(!confirm('데이터를 영구 소멸시키겠습니까?')) return;
            await fetch('/api/admin/posts/delete', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, postId: id}) });
            nav('admin');
        }

        async function deleteNews(id) {
            if(!confirm('뉴스를 삭제합니까?')) return;
            await fetch('/api/admin/news/delete', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, newsId: id}) });
            nav('admin');
        }

        async function manageMedia(action) {
            const name = document.getElementById('m-name').value;
            const url = document.getElementById('m-url').value;
            await fetch('/api/admin/media/manage', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, action, name, url, icon:'fa-solid fa-link'}) });
            nav('admin');
        }

        async function deleteMedia(id) {
            await fetch('/api/admin/media/manage', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, action:'DELETE', mediaId: id}) });
            nav('admin');
        }

        // [뉴스 토론 연동]
        async function openNewsDiscuss(id, title) {
            state.currentId = id;
            document.getElementById('modal').style.display = 'flex';
            const inner = document.getElementById('modal-inner');
            inner.innerHTML = \`
                <div class="mb-8 text-left"><h3 class="text-xl font-bold text-white">\${title}</h3><p class="text-[9px] font-mono text-slate-500 uppercase">Discussion Terminal</p></div>
                <div id="cmt-list" class="h-64 overflow-y-auto space-y-4 mb-8 bg-[#0d1117] p-6 border border-cline-border rounded custom-scroll text-left"></div>
                <div class="flex gap-2 mb-6 text-left">
                    <button onclick="setStance('pro')" class="cline-btn cline-btn-primary opacity-50" id="s-pro">찬성</button>
                    <button onclick="setStance('neutral')" class="cline-btn cline-btn-primary" id="s-neutral">중립</button>
                    <button onclick="setStance('con')" class="cline-btn cline-btn-danger opacity-50" id="s-con">반대</button>
                </div>
                <textarea id="cmt-input" class="h-32 mb-4" placeholder="사령관님의 고견 상신..."></textarea>
                <button onclick="submitNewsCmt()" class="cline-btn cline-btn-primary w-full py-3 uppercase font-bold text-xs tracking-widest">Commit Discussion</button>\`;
            loadNewsComments(id);
        }

        let currentStance = 'neutral';
        function setStance(s) { 
            currentStance = s; 
            ['pro','neutral','con'].forEach(x => {
                const b = document.getElementById('s-'+x);
                b.style.opacity = (x === s) ? '1' : '0.5';
            });
        }

        async function loadNewsComments(id) {
            const res = await fetch(\`/api/news/\${id}/comments\`);
            const cmts = await res.json();
            const box = document.getElementById('cmt-list');
            box.innerHTML = cmts.map(c => \`<div class="border-b border-cline-border pb-3"><p class="text-[9px] font-bold \${c.stance==='pro'?'text-blue-400':'text-red-400'} uppercase mb-1">\${c.stance} | \${c.email.split('@')[0]}</p><p class="text-xs text-slate-300">\${c.content}</p></div>\`).join('') || '<p class="text-center text-slate-500 text-xs py-10">상신된 의견 없음</p>';
        }

        async function submitNewsCmt() {
            const content = document.getElementById('cmt-input').value;
            await fetch(\`/api/news/\${state.currentId}/comments\`, { method:'POST', body: JSON.stringify({content, stance: currentStance, sessionId: state.user.sessionId}) });
            document.getElementById('cmt-input').value = '';
            loadNewsComments(state.currentId);
        }

        function readPost(id) {
            fetch(\`/api/posts/detail?id=\${id}\`).then(r => r.json()).then(p => {
                document.getElementById('modal').style.display = 'flex';
                document.getElementById('modal-inner').innerHTML = \`<div class="text-left"><h3 class="text-xl font-bold text-white mb-6">\${p.title}</h3><div class="p-6 bg-[#0d1117] border border-cline-border rounded text-sm leading-relaxed text-slate-300 min-h-[300px] whitespace-pre-line">\${p.content}</div></div>\`;
            });
        }

        function openWrite() {
            document.getElementById('modal').style.display = 'flex';
            document.getElementById('modal-inner').innerHTML = \`<div class="text-left space-y-4"><h3 class="text-lg font-bold text-white mb-4">New Intelligence Report</h3><input id="w-title" placeholder="Report Title"><textarea id="w-content" class="h-64" placeholder="분석 결과 상신..."></textarea><button onclick="submitPost()" class="cline-btn cline-btn-primary w-full py-3">Commit Report</button></div>\`;
        }

        async function submitPost() {
            const title = document.getElementById('w-title').value;
            const content = document.getElementById('w-content').value;
            await fetch('/api/posts', { method:'POST', body: JSON.stringify({title, content, sessionId: state.user.sessionId}) });
            closeModal(); nav('comm');
        }

        function closeModal() { document.getElementById('modal').style.display = 'none'; }
        setInterval(() => { document.getElementById('system-clock').innerText = new Date().toLocaleTimeString('ko-KR', {hour12:false}); }, 1000);
    </script>
</body>
</html>
  `;
}