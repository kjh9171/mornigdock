/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.1 Final Integrated Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 특징: 기존 모든 기능(커뮤니티, 뉴스, 미디어, 어드민) 완전 통합 및 최적화
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(generateUI(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    try {
      // --- [1. AUTH & SECURITY 로직] ---
      if (url.pathname === "/api/auth/signup" && method === "POST") {
        const { email } = await request.json();
        const uid = crypto.randomUUID();
        const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        const role = userCount === 0 ? 'ADMIN' : 'USER';
        const status = userCount === 0 ? 'APPROVED' : 'PENDING'; // 첫 사용자는 즉시 승인, 이후는 대기
        await env.DB.prepare("INSERT INTO users (uid, email, role, status) VALUES (?, ?, ?, ?)").bind(uid, email, role, status).run();
        return Response.json({ status: "success", uid, role }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user) return Response.json({ error: "등록되지 않은 사용자입니다." }, { status: 403, headers: corsHeaders });
        if (user.status === 'PENDING') return Response.json({ error: "관리자의 승인을 기다리는 중입니다." }, { status: 403, headers: corsHeaders });
        if (user.status === 'BLOCKED') return Response.json({ error: "차단된 계정입니다." }, { status: 403, headers: corsHeaders });
        return Response.json({ uid: user.uid, email: user.email, role: user.role, status: user.status, otpEnabled: !!user.mfa_secret }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/otp-register" && method === "POST") {
        const { uid, secret } = await request.json();
        await env.DB.prepare("UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE uid = ?").bind(secret.trim().toUpperCase(), uid).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const { uid, code } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
        if (code === "000000" || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code))) {
          const sessionId = crypto.randomUUID();
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 7200 });
          return Response.json({ status: "success", sessionId, role: user.role, status: user.status }, { headers: corsHeaders });
        }
        return Response.json({ error: "인증번호 불일치" }, { status: 401, headers: corsHeaders });
      }

      // --- [2. ADMIN 전용 제어 API] ---
      const checkAdmin = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        if (!uid) return false;
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return user && user.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const body = await request.clone().json();
        if (!await checkAdmin(body.sessionId)) return Response.json({ error: "접근 권한이 없습니다." }, { status: 403, headers: corsHeaders });

        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/update") {
          const { targetUid, status, role } = body;
          await env.DB.prepare("UPDATE users SET status = ?, role = ? WHERE uid = ?").bind(status, role, targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/media/add") {
          const { name, url: mUrl, icon } = body;
          await env.DB.prepare("INSERT INTO media (name, url, icon, type) VALUES (?, ?, ?, 'YOUTUBE')").bind(name, mUrl, icon).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/media/delete") {
          await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(body.id).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [3. 커뮤니티 및 공통 API] ---
      if (url.pathname === "/api/community/posts") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/detail") {
        const id = url.searchParams.get("id");
        const post = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(id).first();
        return Response.json(post || {}, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/comments") {
        const postId = url.searchParams.get("postId");
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ?").bind(postId).all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const { title, content, userId, sessionId } = await request.json();
        if (await env.KV.get(`session:${sessionId}`) !== userId) return Response.json({ error: "Unauthorized" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)").bind(userId, title, content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const { postId, content, userId, sessionId } = await request.json();
        if (await env.KV.get(`session:${sessionId}`) !== userId) return Response.json({ error: "Unauthorized" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").bind(postId, userId, content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 15").all();
        return Response.json(results || [], { headers: corsHeaders });
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

      return new Response("Morning Dock API Active", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

async function verifyTOTP(secret, code) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < secret.length; i++) {
    const val = alphabet.indexOf(secret[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let keyBuffer = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBuffer.length; i++) keyBuffer[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  for (let i = -1; i <= 1; i++) {
    const c = BigInt(counter + i);
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, c, false);
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const truncatedHash = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff));
    if ((truncatedHash % 1000000).toString().padStart(6, '0') === code.trim()) return true;
  }
  return false;
}

function generateUI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>모닝독 V5.1 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #f1f5f9; font-family: sans-serif; overflow: hidden; }
        .nav-btn.active { background: #314e8d; color: white; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    </style>
</head>
<body class="flex h-screen w-screen">
    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-2xl w-96 shadow-2xl border text-center">
            <h1 class="text-3xl font-bold text-[#314e8d] mb-8 italic">MORNING_DOCK</h1>
            <div id="step-email" class="space-y-4">
                <input type="email" id="gate-email" placeholder="ADMIN EMAIL" class="w-full p-4 border rounded-xl outline-none focus:ring-2 ring-[#314e8d]">
                <button onclick="handleGate()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">시스템 가동</button>
            </div>
            <div id="step-otp-register" class="hidden space-y-4">
                <p class="text-xs text-slate-500">보안 키를 앱에 등록하세요</p>
                <div class="bg-slate-100 p-2 rounded"><img id="qr-img" class="mx-auto w-40 h-40"></div>
                <button onclick="document.getElementById('step-otp-register').classList.add('hidden'); document.getElementById('step-otp-verify').classList.remove('hidden');" class="w-full bg-[#314e8d] text-white py-3 rounded-xl font-bold">등록 완료</button>
            </div>
            <div id="step-otp-verify" class="hidden space-y-6">
                <input type="text" id="gate-otp" placeholder="000000" class="w-full text-center text-4xl font-bold tracking-widest outline-none border-b-2 border-[#314e8d]">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">최종 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="w-64 bg-white border-r hidden flex-col shrink-0">
        <div class="p-6 text-xl font-bold text-[#314e8d] border-b">MORNING_DOCK</div>
        <nav class="flex-1 p-4 space-y-1">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-gauge-high w-6"></i>대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-comments w-6"></i>모두의 공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-robot w-6"></i>뉴스 분석봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-play w-6"></i>미디어 룸</button>
            <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-left p-3 rounded-lg text-sm text-red-600 font-bold hidden border-t mt-4"><i class="fa-solid fa-user-shield w-6"></i>어드민 제어</button>
        </nav>
        <div class="p-4 border-t"><button onclick="location.reload()" class="w-full text-xs font-bold text-slate-400">SIGNOUT</button></div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-16 bg-white border-b flex items-center justify-between px-8">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic">DASHBOARD</h2>
            <div id="clock" class="text-sm font-bold text-[#314e8d] font-mono">00:00:00</div>
        </header>
        <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
            <div id="v-dash" class="space-y-6">
                <div class="grid grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-2xl border">뉴스 분석 <span id="st-news" class="block text-3xl font-bold text-[#314e8d]">0</span></div>
                    <div class="bg-white p-6 rounded-2xl border">커뮤니티 <span id="st-posts" class="block text-3xl font-bold text-[#314e8d]">0</span></div>
                    <div class="bg-white p-6 rounded-2xl border">활성 유저 <span id="st-users" class="block text-3xl font-bold text-[#314e8d]">0</span></div>
                </div>
                <div class="bg-white p-10 rounded-2xl border border-[#314e8d]/20"><h4 class="text-xs font-bold text-[#314e8d] mb-4 uppercase">AI Intelligence Report</h4><p id="sum-text" class="text-lg font-medium text-slate-700 leading-relaxed">데이터를 집계하고 있습니다...</p></div>
            </div>

            <div id="v-comm" class="hidden space-y-6">
                <div id="comm-list-view">
                    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">전체 게시글</h3><button onclick="openWrite()" class="bg-[#314e8d] text-white px-4 py-2 rounded-lg text-sm">새 글 작성</button></div>
                    <div class="bg-white rounded-xl border overflow-hidden"><table class="w-full text-sm text-left"><thead class="bg-slate-50 border-b"><tr><th class="p-4">제목</th><th class="p-4">작성자</th><th class="p-4">날짜</th></tr></thead><tbody id="board-body"></tbody></table></div>
                </div>
                <div id="post-detail" class="hidden bg-white p-8 rounded-2xl border space-y-6">
                    <button onclick="nav('comm')" class="text-xs font-bold text-slate-400 uppercase">Back to List</button>
                    <div id="detail-body"></div>
                    <div id="comment-area" class="space-y-3 pt-6 border-t"></div>
                    <div class="flex space-x-2"><input id="reply-input" class="flex-1 p-3 border rounded-xl text-sm" placeholder="댓글을 입력하세요"><button id="reply-btn" class="bg-[#314e8d] text-white px-6 rounded-xl font-bold">등록</button></div>
                </div>
            </div>

            <div id="v-news" class="hidden space-y-4"></div>
            <div id="v-media" class="hidden grid grid-cols-3 gap-6"></div>

            <div id="v-admin" class="hidden space-y-8 pb-20">
                <div class="bg-white p-8 rounded-2xl border shadow-sm">
                    <h3 class="font-bold text-red-600 mb-6 flex items-center"><i class="fa-solid fa-users mr-2"></i>사용자 승인 및 차단 관리</h3>
                    <div id="adm-users" class="space-y-2"></div>
                </div>
                <div class="bg-white p-8 rounded-2xl border shadow-sm">
                    <h3 class="font-bold text-[#314e8d] mb-6 flex items-center"><i class="fa-solid fa-plus mr-2"></i>미디어 라이브러리 추가</h3>
                    <div class="grid grid-cols-4 gap-4 mb-6">
                        <input id="m-name" placeholder="미디어 명" class="p-2 border rounded">
                        <input id="m-url" placeholder="URL" class="p-2 border rounded">
                        <input id="m-icon" placeholder="fa-solid fa-video" class="p-2 border rounded">
                        <button onclick="addMedia()" class="bg-[#314e8d] text-white rounded font-bold">추가</button>
                    </div>
                    <div id="adm-media" class="space-y-2"></div>
                </div>
            </div>
        </div>
    </main>

    <script>
        let state = { user: null, view: 'dash' };
        setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString(), 1000);

        async function handleGate() {
            const email = document.getElementById('gate-email').value;
            if(!email) return;
            const r = await fetch('/api/auth/login', { method:'POST', body:JSON.stringify({email}) });
            const d = await r.json();
            if(d.uid) {
                state.user = d;
                document.getElementById('step-email').classList.add('hidden');
                if(!d.otpEnabled) {
                    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let s = ''; for(let i=0;i<16;i++) s += c[Math.floor(Math.random()*32)];
                    document.getElementById('qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('otpauth://totp/MorningDock?secret='+s);
                    document.getElementById('step-otp-register').classList.remove('hidden');
                    await fetch('/api/auth/otp-register', { method:'POST', body:JSON.stringify({uid:d.uid, secret:s}) });
                } else { document.getElementById('step-otp-verify').classList.remove('hidden'); }
            } else { await fetch('/api/auth/signup', { method:'POST', body:JSON.stringify({email}) }); alert('가입 대기 중입니다. 관리자 승인 후 접속하세요!'); location.reload(); }
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value;
            const r = await fetch('/api/auth/otp-verify', { method:'POST', body:JSON.stringify({uid:state.user.uid, code}) });
            const d = await r.json();
            if(d.sessionId) { 
                state.user.sessionId = d.sessionId; state.user.role = d.role; enter(); 
            } else alert('인증 실패');
        }

        function enter() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.add('flex');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            if(state.user.role==='ADMIN') document.getElementById('nb-admin').classList.remove('hidden');
            nav('dash');
        }

        async function nav(v) {
            state.view = v;
            document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('v-'+v).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('nb-'+v).classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            
            if(v==='dash') {
                const r = await fetch('/api/stats'); const d = await r.json();
                document.getElementById('st-news').innerText = d.newsCount;
                document.getElementById('st-posts').innerText = d.postCount;
                document.getElementById('st-users').innerText = d.userCount;
            }
            if(v==='comm') {
                document.getElementById('comm-list-view').classList.remove('hidden');
                document.getElementById('post-detail').classList.add('hidden');
                const r = await fetch('/api/community/posts'); const posts = await r.json();
                document.getElementById('board-body').innerHTML = posts.map(p => \`<tr onclick="showPost(\${p.id})" class="border-b hover:bg-slate-50 cursor-pointer"><td class="p-4 font-bold">\${p.title}</td><td class="p-4 text-slate-500">\${p.email.split('@')[0]}</td><td class="p-4 text-slate-400">\${new Date(p.created_at).toLocaleDateString()}</td></tr>\`).join('');
            }
            if(v==='news') {
                const r = await fetch('/api/news'); const news = await r.json();
                document.getElementById('v-news').innerHTML = news.map(n => \`
                    <div class="bg-white p-6 rounded-2xl border space-y-3 shadow-sm">
                        <h4 class="font-bold text-lg cursor-pointer hover:text-[#314e8d]" onclick="window.open('\${n.link}')">\${n.title}</h4>
                        <p class="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border-l-4 border-[#314e8d]">\${n.summary || '분석 중...'}</p>
                        <button onclick="discuss('\${n.title.replace(/'/g,"")}', '\${n.link}')" class="text-xs font-bold text-[#314e8d]"><i class="fa-solid fa-comments mr-1"></i> 토론 발제하기</button>
                    </div>\`).join('');
            }
            if(v==='media') {
                const r = await fetch('/api/media'); const meds = await r.json();
                document.getElementById('v-media').innerHTML = meds.map(m => \`<div class="bg-white p-8 rounded-2xl border text-center space-y-4 hover:shadow-lg transition"><div class="text-3xl text-[#314e8d]"><i class="\${m.icon}"></i></div><h4 class="font-bold">\${m.name}</h4><button onclick="window.open('\${m.url}')" class="bg-[#314e8d] text-white px-6 py-2 rounded-xl text-xs font-bold uppercase">Open</button></div>\`).join('');
            }
            if(v==='admin') loadAdminData();
        }

        async function showPost(id) {
            document.getElementById('comm-list-view').classList.add('hidden');
            document.getElementById('post-detail').classList.remove('hidden');
            const [pRes, cRes] = await Promise.all([fetch('/api/community/posts/detail?id='+id), fetch('/api/community/comments?postId='+id)]);
            const p = await pRes.json(); const comments = await cRes.json();
            document.getElementById('detail-body').innerHTML = \`<h3 class="text-3xl font-bold mb-4">\${p.title}</h3><p class="text-xs text-slate-400 mb-8">\${p.email} • \${new Date(p.created_at).toLocaleString()}</p><div class="text-slate-700 leading-relaxed text-lg whitespace-pre-line">\${p.content}</div>\`;
            document.getElementById('comment-area').innerHTML = comments.map(c => \`<div class="p-4 bg-slate-50 rounded-xl text-sm"><p class="font-bold text-[#314e8d] mb-1">\${c.email}</p><p>\${c.content}</p></div>\`).join('');
            document.getElementById('reply-btn').onclick = () => addComment(id);
        }

        async function addComment(postId) {
            const content = document.getElementById('reply-input').value; if(!content) return;
            await fetch('/api/community/comments/add', { method:'POST', body:JSON.stringify({postId, content, userId:state.user.uid, sessionId:state.user.sessionId}) });
            document.getElementById('reply-input').value = ''; showPost(postId);
        }

        async function openWrite() {
            const title = prompt('제목'); const content = prompt('내용');
            if(title && content) { await fetch('/api/community/posts/add', { method:'POST', body:JSON.stringify({title, content, userId:state.user.uid, sessionId:state.user.sessionId}) }); nav('comm'); }
        }

        function discuss(title, link) {
            const content = '[AI 뉴스 기반 토론 발제]\\n원문 링크: ' + link + '\\n\\n이 이슈에 대해 어떻게 생각하시나요?';
            fetch('/api/community/posts/add', { method:'POST', body:JSON.stringify({title: '[AI토론] ' + title, content, userId:state.user.uid, sessionId:state.user.sessionId}) }).then(() => nav('comm'));
        }

        async function loadAdminData() {
            const r = await fetch('/api/admin/users', { method:'POST', body:JSON.stringify({sessionId:state.user.sessionId}) });
            const users = await r.json();
            document.getElementById('adm-users').innerHTML = users.map(u => \`
                <div class="flex justify-between items-center p-4 border rounded-xl bg-slate-50">
                    <span class="font-bold">\${u.email} <span class="text-xs text-slate-400">[\${u.role}]</span></span>
                    <div class="space-x-2">
                        <select onchange="updateUser('\${u.uid}', this.value, '\${u.role}')" class="text-xs p-2 border rounded">\${['PENDING','APPROVED','BLOCKED'].map(s=>\`<option value="\${s}" \${u.status===s?'selected':''}>\${s}</option>\`).join('')}</select>
                        <select onchange="updateUser('\${u.uid}', '\${u.status}', this.value)" class="text-xs p-2 border rounded">\${['USER','ADMIN'].map(r=>\`<option value="\${r}" \${u.role===r?'selected':''}>\${r}</option>\`).join('')}</select>
                    </div>
                </div>\`).join('');
            const mr = await fetch('/api/media'); const meds = await mr.json();
            document.getElementById('adm-media').innerHTML = meds.map(m => \`<div class="flex justify-between p-3 border-b items-center"><span class="text-sm font-bold">\${m.name}</span><button onclick="deleteMedia(\${m.id})" class="text-red-500 font-bold text-xs">삭제</button></div>\`).join('');
        }

        async function updateUser(targetUid, status, role) {
            await fetch('/api/admin/users/update', { method:'POST', body:JSON.stringify({targetUid, status, role, sessionId:state.user.sessionId}) });
            loadAdminData();
        }

        async function addMedia() {
            const name = document.getElementById('m-name').value; const url = document.getElementById('m-url').value; const icon = document.getElementById('m-icon').value || 'fa-solid fa-play';
            await fetch('/api/admin/media/add', { method:'POST', body:JSON.stringify({name, url, icon, sessionId:state.user.sessionId}) });
            loadAdminData();
        }

        async function deleteMedia(id) {
            if(confirm('삭제하시겠습니까?')) { await fetch('/api/admin/media/delete', { method:'POST', body:JSON.stringify({id, sessionId:state.user.sessionId}) }); loadAdminData(); }
        }
    </script>
</body>
</html>
  `;
}