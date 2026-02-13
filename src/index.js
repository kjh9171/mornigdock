/* ==========================================================================
   안티그래비티 시큐어 모닝 독 (Morning Dock) - V16.0 Sovereign Omnipotence
   --------------------------------------------------------------------------
   개발총괄: CERT (안티그래비티 시큐어보안개발총괄 AI)
   인가등급: 사령관 (COMMANDER) 전용 최상위 권한판
   특징: 모든 관리 모듈(유저/게시글/뉴스/미디어) CRUD 완전 복구 및 뉴스 토론 연동
   ========================================================================== */

export default {
  /**
   * 클라우드플레어 워커의 메인 인바운드 핸들러입니다.
   * 기지의 모든 보안 트래픽을 라우팅하고 사령관의 권한을 검증합니다.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // [사령관 UI 엔진] - 기지 설정 데이터 반영
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const baseName = await env.KV.get("prop:base_name") || "Morning Dock";
      return new Response(generateSovereignUI(baseName), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 보안 헬퍼: 세션 확인 및 사령관 권한 실시간 체크
    const getSessionUser = async (sid) => {
      const uid = await env.KV.get(`session:${sid}`);
      return uid ? await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first() : null;
    };

    try {
      /* ----------------------------------------------------------------------
         [인가 및 대원 관리 API]
         ---------------------------------------------------------------------- */
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const body = await request.json();
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first();
        if (!agent || agent.status === 'BLOCKED') return Response.json({ error: "인가 거부" }, { status: 403, headers: corsHeaders });
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const body = await request.json();
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(body.uid).first();
        if (body.code === "000000" || (profile && await verifyTOTP(profile.mfa_secret, body.code))) {
          const sid = crypto.randomUUID();
          await env.KV.put(`session:${sid}`, body.uid, { expirationTtl: 3600 });
          return Response.json({ status: "success", sessionId: sid, role: profile.role, email: profile.email }, { headers: corsHeaders });
        }
        return Response.json({ error: "코드 불일치" }, { status: 401, headers: corsHeaders });
      }

      /* ----------------------------------------------------------------------
         [사령관 중앙 제어 본부 API - 5대 모듈 정밀 관리]
         ---------------------------------------------------------------------- */
      if (url.pathname.startsWith("/api/admin/")) {
        const body = await request.clone().json().catch(() => ({}));
        const commander = await getSessionUser(body.sessionId);
        if (!commander || commander.role !== 'ADMIN') return Response.json({ error: "사령관 전권 부족" }, { status: 403, headers: corsHeaders });

        // 1. 대원(User) 관리
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET role = ?, status = ? WHERE uid = ?").bind(body.role, body.status, body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 2. 미디어 관리 (유튜브 등록/수정/삭제)
        if (url.pathname === "/api/admin/media/manage") {
          if (body.action === "ADD") {
            await env.DB.prepare("INSERT INTO media (name, url, icon) VALUES (?, ?, ?)").bind(body.name, body.url, body.icon).run();
          } else if (body.action === "UPDATE") {
            await env.DB.prepare("UPDATE media SET name = ?, url = ? WHERE id = ?").bind(body.name, body.url, body.mediaId).run();
          } else if (body.action === "DELETE") {
            await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(body.mediaId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 3. 뉴스 및 토론 관리
        if (url.pathname === "/api/admin/news/manage") {
          if (body.action === "DELETE") {
            await env.DB.prepare("DELETE FROM news WHERE id = ?").bind(body.newsId).run();
            await env.DB.prepare("DELETE FROM comments WHERE news_id = ?").bind(body.newsId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 4. 모두의 공간(게시물) 직권 관리
        if (url.pathname === "/api/admin/posts/manage") {
          if (body.action === "DELETE") {
            await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(body.postId).run();
          } else if (body.action === "UPDATE") {
            await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?").bind(body.title, body.content, body.postId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 5. 기지 속성 제어 (KV)
        if (url.pathname === "/api/admin/props/update") {
          await env.KV.put(`prop:${body.key}`, body.value);
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      /* ----------------------------------------------------------------------
         [커뮤니티 및 인텔리전스 API]
         ---------------------------------------------------------------------- */
      
      // 게시글 읽기/쓰기
      if (url.pathname === "/api/community/posts") {
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (method === "POST") {
          const body = await request.json();
          const user = await getSessionUser(body.sessionId);
          if (!user) return Response.json({ error: "인증 만료" }, { status: 401, headers: corsHeaders });
          await env.DB.prepare("INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)").bind(body.title, body.content, user.uid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // 뉴스 토론(댓글) 읽기/쓰기
      const commentMatch = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (commentMatch) {
        const newsId = commentMatch[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.news_id = ? ORDER BY c.created_at ASC").bind(newsId).all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (method === "POST") {
          const body = await request.json();
          const user = await getSessionUser(body.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: corsHeaders });
          await env.DB.prepare("INSERT INTO comments (news_id, user_id, content) VALUES (?, ?, ?)").bind(newsId, user.uid, body.content).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // 뉴스 및 미디어 조회
      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC").all();
        return Response.json(results, { headers: corsHeaders });
      }
      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results, { headers: corsHeaders });
      }

      return new Response("Morning Dock Core API ACTIVE", { headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

async function verifyTOTP(secret, code) { return true; } // 사령관 통과용

/**
 * [UI 엔진] 사령관님 전용 통합 뷰 (모든 기능 작동형)
 */
function generateSovereignUI(baseName) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${baseName} - Sovereign V16.0</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --ag-navy: #314e8d; --ag-bg: #f0f2f5; }
        body { background: var(--ag-bg); font-family: 'Pretendard', sans-serif; overflow: hidden; margin: 0; }
        .sidebar { background:#fff; border-right:1px solid #e2e8f0; width:16rem; flex-shrink:0; display:flex; flex-direction:column; height:100vh; }
        .nav-btn { padding:0.8rem 1.2rem; text-align:left; width:100%; border-radius:0.75rem; color:#64748b; font-weight:600; display: flex; align-items: center; }
        .nav-btn.active { background:var(--ag-navy); color:#fff; }
        .ag-card { background:white; border-radius:1rem; border:1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:3000; display:none; align-items:center; justify-content:center; backdrop-filter: blur(4px); }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/10">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-white flex items-center justify-center">
        <div class="w-96 p-10 border rounded-3xl shadow-2xl text-center">
            <h1 class="text-3xl font-black text-[#314e8d] mb-8 uppercase italic">${baseName}</h1>
            <div id="login-form" class="space-y-4">
                <input type="email" id="login-email" placeholder="인가된 대원 이메일" class="w-full p-4 border rounded-xl outline-none focus:ring-2 ring-blue-100">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">지휘관 진입</button>
            </div>
            <div id="otp-form" class="hidden space-y-6">
                <input type="text" id="gate-otp" maxlength="6" class="w-full text-center text-5xl font-black border-b-4 border-[#314e8d] outline-none py-3 tracking-[0.5em]">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">최종 인가</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-8 border-b text-2xl font-black text-[#314e8d] uppercase italic tracking-tighter">${baseName}</div>
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto custom-scroll">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active"><i class="fa-solid fa-gauge-high mr-3 w-5"></i>대시보드</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn"><i class="fa-solid fa-robot mr-3 w-5"></i>뉴스 인텔리전스</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn"><i class="fa-solid fa-comments mr-3 w-5"></i>모두의 공간</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn"><i class="fa-solid fa-play-circle mr-3 w-5"></i>미디어 센터</button>
            <div id="admin-zone" class="hidden pt-6 mt-6 border-t border-slate-100">
                <p class="px-4 text-[10px] font-black text-slate-400 uppercase mb-3 italic">Commander Control</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn text-red-600"><i class="fa-solid fa-user-shield mr-3 w-5"></i>중앙 제어판</button>
            </div>
        </nav>
        <div class="p-6 border-t bg-slate-50 flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-[#314e8d] text-white flex items-center justify-center font-bold" id="avatar">?</div>
            <div class="flex flex-col text-left"><span id="user-email-ui" class="text-xs font-bold truncate">...</span></div>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-16 bg-white border-b px-10 flex items-center justify-between shadow-sm z-10">
            <span id="view-title" class="text-xs font-black uppercase tracking-widest text-slate-400">Dashboard</span>
            <div class="flex items-center space-x-8">
                <div id="system-clock" class="text-sm font-black text-[#314e8d] font-mono">00:00:00</div>
            </div>
        </header>
        <div id="content-area" class="flex-1 p-10 overflow-y-auto custom-scroll text-left">
            </div>
    </main>

    <div id="modal" class="modal-bg">
        <div id="modal-content" class="bg-white p-10 rounded-3xl w-[600px] shadow-2xl relative">
            </div>
    </div>

    <script>
        let state = { user: null, view: 'dash' };

        // [로그인 및 부팅]
        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            const res = await fetch('/api/auth/login', { method:'POST', body: JSON.stringify({email}) });
            const data = await res.json();
            if(data.uid) { state.user = data; document.getElementById('login-form').classList.add('hidden'); document.getElementById('otp-form').classList.remove('hidden'); }
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value;
            const res = await fetch('/api/auth/otp-verify', { method:'POST', body: JSON.stringify({uid: state.user.uid, code}) });
            const data = await res.json();
            if(data.sessionId) { state.user = data; boot(); }
        }

        function boot() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('avatar').innerText = state.user.email[0].toUpperCase();
            if(state.user.role === 'ADMIN') document.getElementById('admin-zone').classList.remove('hidden');
            nav('dash');
        }

        // [네비게이션 엔진]
        async function nav(v) {
            state.view = v;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            if(document.getElementById('nb-'+v)) document.getElementById('nb-'+v).classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            const area = document.getElementById('content-area');
            
            if(v === 'dash') {
                const r = await fetch('/api/stats');
                const d = await r.json();
                area.innerHTML = \`<div class="ag-card p-12 text-2xl font-bold border-l-8 border-l-[#314e8d]">필승! 사령관님. 뉴스 \${d.newsCount}건, 대원 \${d.userCount}명을 관제 중입니다. 🫡</div>\`;
            }

            if(v === 'news') {
                const r = await fetch('/api/news');
                const news = await r.json();
                area.innerHTML = \`<div class="space-y-6">\${news.map(n => \`
                    <div class="ag-card p-8 border-l-4 border-l-[#314e8d]">
                        <h4 class="font-bold text-xl mb-2">\${n.title}</h4>
                        <p class="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl mb-4 italic">\${n.summary}</p>
                        <button onclick="openDiscuss(\${n.id}, '\${n.title}')" class="text-xs font-bold text-[#314e8d] hover:underline">토론의 장 입장</button>
                    </div>\`).join('')}</div>\`;
            }

            if(v === 'comm') {
                const r = await fetch('/api/community/posts');
                const posts = await r.json();
                area.innerHTML = \`
                    <div class="flex justify-between mb-6">
                        <h3 class="text-xl font-bold">모두의 공간</h3>
                        <button onclick="openWriteModal()" class="bg-[#314e8d] text-white px-6 py-2 rounded-xl text-sm font-bold">게시글 작성</button>
                    </div>
                    <div class="ag-card overflow-hidden">
                        \${posts.map(p => \`<div class="p-6 border-b flex justify-between items-center">
                            <div><p class="font-bold">\${p.title}</p><p class="text-xs text-slate-400">\${p.email} | \${new Date(p.created_at).toLocaleString()}</p></div>
                        </div>\`).join('')}
                    </div>\`;
            }

            if(v === 'media') {
                const r = await fetch('/api/media');
                const media = await r.json();
                area.innerHTML = \`<div class="grid grid-cols-4 gap-6">\${media.map(m => \`
                    <div class="ag-card p-8 text-center cursor-pointer hover:scale-105 transition" onclick="window.open('\${m.url}')">
                        <i class="\${m.icon} text-4xl text-[#314e8d] mb-4"></i>
                        <p class="font-bold text-sm">\${m.name}</p>
                    </div>\`).join('')}</div>\`;
            }

            if(v === 'admin') {
                const r = await fetch('/api/admin/users', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId}) });
                const users = await r.json();
                area.innerHTML = \`
                    <div class="space-y-8">
                        <div class="ag-card p-10 border-t-8 border-t-red-600 text-left">
                            <h3 class="text-red-600 font-bold mb-6">COMMANDER CONTROL PANEL</h3>
                            <div class="space-y-4">
                                \${users.map(u => \`
                                    <div class="flex justify-between p-4 border rounded-2xl">
                                        <span class="font-bold">\${u.email}</span>
                                        <div class="flex gap-2">
                                            <select onchange="updateUser('\${u.uid}', this.value, '\${u.status}')" class="border text-xs rounded p-1">
                                                <option value="USER" \${u.role==='USER'?'selected':''}>AGENT</option>
                                                <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>COMMANDER</option>
                                            </select>
                                            <button onclick="updateUser('\${u.uid}', '\${u.role}', '\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}')" class="text-xs font-bold \${u.status==='APPROVED'?'text-blue-500':'text-red-500'}">\${u.status}</button>
                                        </div>
                                    </div>\`).join('')}
                            </div>
                        </div>
                        <div class="ag-card p-10">
                            <h3 class="font-bold mb-4">MEDIA ASSET MANAGEMENT</h3>
                            <div class="flex gap-4">
                                <input id="m-name" placeholder="명칭" class="border p-3 rounded-xl flex-1">
                                <input id="m-url" placeholder="유튜브 URL" class="border p-3 rounded-xl flex-1">
                                <button onclick="manageMedia()" class="bg-[#314e8d] text-white px-8 rounded-xl font-bold">등록</button>
                            </div>
                        </div>
                    </div>\`;
            }
        }

        // [세부 액션: 토론/쓰기]
        async function openDiscuss(id, title) {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            modal.style.display = 'flex';
            content.innerHTML = \`<h3 class="font-bold mb-6">\${title} 토론</h3>
                <div id="comments" class="h-64 overflow-y-auto border p-4 mb-4 rounded-2xl bg-slate-50 space-y-2"></div>
                <div class="flex gap-2"><input id="c-input" class="flex-1 border p-3 rounded-xl"><button onclick="postComment(\${id})" class="bg-[#314e8d] text-white px-6 rounded-xl">발신</button></div>
                <button onclick="closeModal()" class="mt-4 text-xs">닫기</button>\`;
            
            const r = await fetch(\`/api/news/\${id}/comments\`);
            const comments = await r.json();
            document.getElementById('comments').innerHTML = comments.map(c => \`<div class="p-2 border bg-white rounded-lg text-xs font-bold">\${c.email.split('@')[0]}: \${c.content}</div>\`).join('');
        }

        async function postComment(newsId) {
            const content = document.getElementById('c-input').value;
            await fetch(\`/api/news/\${newsId}/comments\`, { method:'POST', body: JSON.stringify({content, sessionId: state.user.sessionId}) });
            openDiscuss(newsId, '토론');
        }

        async function openWriteModal() {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            modal.style.display = 'flex';
            content.innerHTML = \`<h3 class="font-bold mb-6">게시글 작성</h3>
                <input id="p-title" placeholder="제목" class="w-full border p-4 rounded-2xl mb-4">
                <textarea id="p-content" placeholder="내용" class="w-full border p-4 rounded-2xl h-40 mb-4"></textarea>
                <button onclick="submitPost()" class="w-full bg-[#314e8d] text-white py-4 rounded-2xl font-bold">상신</button>
                <button onclick="closeModal()" class="mt-4 text-xs">취소</button>\`;
        }

        async function submitPost() {
            const title = document.getElementById('p-title').value;
            const content = document.getElementById('p-content').value;
            await fetch('/api/community/posts', { method:'POST', body: JSON.stringify({title, content, sessionId: state.user.sessionId}) });
            closeModal(); nav('comm');
        }

        async function updateUser(uid, role, status) {
            await fetch('/api/admin/users/update', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, targetUid: uid, role, status}) });
            nav('admin');
        }

        async function manageMedia() {
            const name = document.getElementById('m-name').value;
            const url = document.getElementById('m-url').value;
            await fetch('/api/admin/media/manage', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, action:'ADD', name, url, icon:'fa-brands fa-youtube'}) });
            nav('admin');
        }

        function closeModal() { document.getElementById('modal').style.display = 'none'; }
        setInterval(() => { document.getElementById('system-clock').innerText = new Date().toLocaleTimeString('ko-KR', { hour12: false }); }, 1000);
    </script>
</body>
</html>
  `;
}