const http = require('http');
const fs = require('fs');
const path = require('path');
const OcrService = require('./src/services/ocrService');
const NotificationService = require('./src/services/notificationService');
const InventoryService = require('./src/services/inventoryService');
const ImageUtils = require('./src/utils/imageUtils');
const SecurityService = require('./src/services/securityService');

const PORT = 3000;
const inventoryService = new InventoryService();
const securityService = new SecurityService();

// 임시 데이터베이스 (메모리 저장소)
const pendingContracts = []; // 임차인이 등록하고 임대인 승인을 기다리는 계약들

const htmlTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>모두의 방 - 통합 임대 및 주거 공간 관리 플랫폼</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary-deep-navy: #1a365d;
            --primary-light-blue: #2b6cb0;
            --point-orange: #ed8936;
            --background-gray: #f7fafc;
            --card-shadow: 0 10px 25px rgba(26, 54, 93, 0.05), 0 2px 8px rgba(0, 0, 0, 0.02);
            --transition-smooth: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', 'Noto Sans KR', sans-serif;
            background-color: var(--background-gray);
            color: #2d3748;
            line-height: 1.6;
        }

        .hidden {
            display: none !important;
        }

        /* 인증 레이아웃 */
        .auth-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        }

        .auth-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: var(--card-shadow);
            width: 100%;
            max-width: 460px;
            border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .auth-logo {
            text-align: center;
            margin-bottom: 20px;
            font-size: 26px;
            font-weight: 700;
            color: var(--primary-deep-navy);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .auth-logo i {
            color: var(--primary-light-blue);
        }

        /* 권한 선택 탭 */
        .role-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 25px;
            background-color: #edf2f7;
            padding: 6px;
            border-radius: 10px;
        }

        .role-btn {
            flex: 1;
            padding: 10px;
            border: none;
            background: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            color: #718096;
            transition: var(--transition-smooth);
        }

        .role-btn.active {
            background-color: white;
            color: var(--primary-deep-navy);
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 8px;
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 14px;
            outline: none;
            transition: var(--transition-smooth);
        }

        .form-control:focus {
            border-color: var(--primary-light-blue);
            box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.15);
        }

        .btn-auth {
            width: 100%;
            background-color: var(--primary-deep-navy);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 15px;
            margin-top: 10px;
            transition: var(--transition-smooth);
        }

        .btn-auth:hover {
            background-color: #2c5282;
        }

        .auth-switch {
            text-align: center;
            margin-top: 20px;
            font-size: 13px;
            color: #718096;
        }

        .auth-switch a {
            color: var(--primary-light-blue);
            text-decoration: none;
            font-weight: 600;
        }

        /* GNB */
        .navbar {
            background-color: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            padding: 15px 5%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }

        .navbar-brand {
            font-size: 20px;
            font-weight: 700;
            color: var(--primary-deep-navy);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .navbar-brand i {
            color: var(--primary-light-blue);
        }

        .user-profile {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .btn-logout {
            background: none;
            border: 1px solid #cbd5e0;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            color: #718096;
            transition: var(--transition-smooth);
        }

        .btn-logout:hover {
            background-color: #edf2f7;
            color: #2d3748;
        }

        .avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: var(--primary-deep-navy);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        /* 메인 레이아웃 */
        .main-container {
            max-width: 1200px;
            margin: 30px auto;
            padding: 0 20px;
        }

        .dashboard-layout {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 30px;
        }

        @media (max-width: 992px) {
            .dashboard-layout {
                grid-template-columns: 1fr;
            }
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 25px;
            box-shadow: var(--card-shadow);
            margin-bottom: 30px;
            transition: var(--transition-smooth);
        }

        .card-header-flex {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .card-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--primary-deep-navy);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn {
            background-color: var(--primary-light-blue);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: var(--transition-smooth);
        }

        .btn:hover { opacity: 0.95; }
        .btn-orange { background-color: var(--point-orange); }

        .inventory-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .inventory-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            background-color: #f8fafc;
            border-radius: 8px;
            border: 1px solid #edf2f7;
        }

        .badge {
            font-size: 11px;
            padding: 5px 10px;
            border-radius: 20px;
            font-weight: bold;
            color: white;
        }
        .badge-orange { background-color: var(--point-orange); }
        .badge-blue { background-color: var(--primary-light-blue); }

        .pending-invite-card {
            background-color: #fffaf0;
            border: 1px dashed var(--point-orange);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    </style>
</head>
<body>

    <!-- 1. 로그인 뷰 -->
    <div class="auth-wrapper" id="login-view">
        <div class="auth-card">
            <div class="auth-logo">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방</span>
            </div>
            
            <div class="role-selector">
                <button class="role-btn active" id="btn-login-owner" onclick="setLoginRole('owner')">임대인 모드</button>
                <button class="role-btn" id="btn-login-tenant" onclick="setLoginRole('tenant')">임차인(세입자) 모드</button>
            </div>

            <h3 style="text-align: center; margin-bottom: 25px; color: var(--primary-deep-navy);" id="login-title">임대인 파트너 로그인</h3>
            
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>이메일 주소</label>
                    <input type="email" id="login-email" class="form-control" required value="owner@moduroom.com">
                </div>
                <div class="form-group">
                    <label>비밀번호</label>
                    <input type="password" id="login-password" class="form-control" required value="password123">
                </div>
                <button type="submit" class="btn-auth" id="btn-login-submit">임대인으로 로그인</button>
            </form>
            <div class="auth-switch">
                아직 파트너가 아니신가요? <a href="#" onclick="showView('signup')">회원가입하기</a>
            </div>
        </div>
    </div>

    <!-- 2. 회원가입 뷰 -->
    <div class="auth-wrapper hidden" id="signup-view">
        <div class="auth-card">
            <div class="auth-logo">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방</span>
            </div>
            
            <div class="role-selector">
                <button class="role-btn active" id="btn-signup-owner" onclick="setSignupRole('owner')">임대인 가입</button>
                <button class="role-btn" id="btn-signup-tenant" onclick="setSignupRole('tenant')">임차인 가입</button>
            </div>

            <h3 style="text-align: center; margin-bottom: 25px; color: var(--primary-deep-navy);" id="signup-title">임대인 파트너 회원가입</h3>
            
            <form onsubmit="handleSignup(event)">
                <div class="form-group">
                    <label>이름 (성함)</label>
                    <input type="text" id="signup-name" class="form-control" required placeholder="홍길동">
                </div>
                <div class="form-group">
                    <label>이메일 주소</label>
                    <input type="email" id="signup-email" class="form-control" required placeholder="name@domain.com">
                </div>
                <div class="form-group">
                    <label>비밀번호</label>
                    <input type="password" id="signup-password" class="form-control" required placeholder="최소 8자리 이상">
                </div>
                <button type="submit" class="btn-auth" id="btn-signup-submit">임대인 회원가입 완료</button>
            </form>
            <div class="auth-switch">
                이미 가입하셨나요? <a href="#" onclick="showView('login')">로그인하기</a>
            </div>
        </div>
    </div>

    <!-- 3. 임대인 메인 대시보드 -->
    <div id="owner-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[임대인 파트너]</span></span>
            </div>
            <div class="user-profile">
                <span id="owner-display-name" style="font-weight: 500;">김임대 파트너</span>
                <button class="btn-logout" onclick="handleLogout()">로그아웃</button>
            </div>
        </nav>

        <div class="main-container">
            <!-- 임차인 역초대 승인 섹션 -->
            <div id="pending-invites-section"></div>

            <div class="dashboard-layout">
                <div>
                    <div class="card">
                        <div class="card-title"><i class="fa-solid fa-file-invoice-dollar"></i> 계약서 OCR 등록</div>
                        <button class="btn" onclick="runOcr()" style="margin-top:15px;">계약서 사진 업로드</button>
                        <div id="ocr-result" style="margin-top: 15px;"></div>
                    </div>
                    <div class="card">
                        <div class="card-title"><i class="fa-solid fa-boxes-stacked"></i> 자재 및 소모품 현황</div>
                        <div class="inventory-list" id="inventory-list"></div>
                    </div>
                </div>
                <div>
                    <div class="card">
                        <div class="card-title"><i class="fa-solid fa-wrench"></i> 실시간 하자보수 스텝퍼</div>
                        <p style="font-size:13px; margin-top:10px; color:#718096;">[수리중] 302호 세면대 배수 트랩 교체 진행 중</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 4. 임차인 메인 대시보드 -->
    <div id="tenant-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--point-orange);">[안전 주거 케어]</span></span>
            </div>
            <div class="user-profile">
                <span id="tenant-display-name" style="font-weight: 500;">이세입 입주민</span>
                <button class="btn-logout" onclick="handleLogout()">로그아웃</button>
            </div>
        </nav>

        <div class="main-container">
            <div class="dashboard-layout">
                <div>
                    <div class="card">
                        <div class="card-title"><i class="fa-solid fa-bell"></i> 임대인 상향식 초대 (Bottom-Up)</div>
                        <p style="font-size:13px; color:#718096; margin-bottom:15px;">
                            임대인의 이름과 연락처를 입력해 하자 보수 소통방 개설을 요청하고 알림톡을 발송합니다.
                        </p>
                        <form onsubmit="handleSendInviteToOwner(event)">
                            <div class="form-group">
                                <label>임대인(집주인) 성함</label>
                                <input type="text" id="invite-owner-name" class="form-control" placeholder="김임대" required>
                            </div>
                            <div class="form-group">
                                <label>임대인 연락처</label>
                                <input type="text" id="invite-owner-phone" class="form-control" placeholder="010-9876-5432" required>
                            </div>
                            <div class="form-group">
                                <label>우리 집 호실</label>
                                <input type="text" id="invite-room" class="form-control" placeholder="302호" required>
                            </div>
                            <button type="submit" class="btn btn-orange">임대인 초대 및 수리방 신청</button>
                        </form>
                    </div>
                </div>
                <div>
                    <div class="card">
                        <div class="card-title"><i class="fa-solid fa-wrench"></i> 나의 민원 신청하기</div>
                        <p style="font-size:13px; color:#718096;">임대인 승인 완료 시 사진 한 장 비대면 즉시 접수 채널이 개통됩니다.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentRole = 'owner';

        function setLoginRole(role) {
            currentRole = role;
            document.getElementById('btn-login-owner').classList.toggle('active', role === 'owner');
            document.getElementById('btn-login-tenant').classList.toggle('active', role === 'tenant');
            
            if (role === 'owner') {
                document.getElementById('login-title').innerText = '임대인 파트너 로그인';
                document.getElementById('login-email').value = 'owner@moduroom.com';
                document.getElementById('btn-login-submit').innerText = '임대인으로 로그인';
            } else {
                document.getElementById('login-title').innerText = '임차인 입주민 로그인';
                document.getElementById('login-email').value = 'tenant@moduroom.com';
                document.getElementById('btn-login-submit').innerText = '임차인으로 로그인';
            }
        }

        function setSignupRole(role) {
            currentRole = role;
            document.getElementById('btn-signup-owner').classList.toggle('active', role === 'owner');
            document.getElementById('btn-signup-tenant').classList.toggle('active', role === 'tenant');
            
            if (role === 'owner') {
                document.getElementById('signup-title').innerText = '임대인 파트너 회원가입';
                document.getElementById('btn-signup-submit').innerText = '임대인 회원가입 완료';
            } else {
                document.getElementById('signup-title').innerText = '임차인 입주민 회원가입';
                document.getElementById('btn-signup-submit').innerText = '임차인 회원가입 완료';
            }
        }

        function showView(viewName) {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('owner-app').classList.add('hidden');
            document.getElementById('tenant-app').classList.add('hidden');

            if (viewName === 'login') {
                document.getElementById('login-view').classList.remove('hidden');
            } else if (viewName === 'signup') {
                document.getElementById('signup-view').classList.remove('hidden');
            } else if (viewName === 'owner-app') {
                document.getElementById('owner-app').classList.remove('hidden');
                loadInventory();
                checkPendingInvites();
            } else if (viewName === 'tenant-app') {
                document.getElementById('tenant-app').classList.remove('hidden');
            }
        }

        function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const namePrefix = email.split('@')[0].toUpperCase();

            if (currentRole === 'owner') {
                document.getElementById('owner-display-name').innerText = namePrefix + ' 파트너';
                showView('owner-app');
            } else {
                document.getElementById('tenant-display-name').innerText = namePrefix + ' 입주민';
                showView('tenant-app');
            }
        }

        function handleSignup(e) {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            alert(name + '님, 가입이 완료되었습니다. 설정하신 역할로 로그인해주세요.');
            showView('login');
        }

        function handleLogout() {
            showView('login');
        }

        // 임차인이 임대인 초대 신청
        function handleSendInviteToOwner(e) {
            e.preventDefault();
            const ownerName = document.getElementById('invite-owner-name').value;
            const ownerPhone = document.getElementById('invite-owner-phone').value;
            const room = document.getElementById('invite-room').value;
            const tenantName = document.getElementById('tenant-display-name').innerText;

            fetch('/api/invite-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerName, ownerPhone, room, tenantName })
            })
            .then(res => res.json())
            .then(res => {
                alert('임대인 ' + ownerName + '님에게 매칭 및 가입 유도 알림톡 초대가 성공적으로 발송되었습니다!');
                document.getElementById('invite-owner-name').value = '';
                document.getElementById('invite-owner-phone').value = '';
                document.getElementById('invite-room').value = '';
            });
        }

        // 임대인의 보류 중인 임차인 매칭 요청 목록 로드
        function checkPendingInvites() {
            fetch('/api/pending-invites')
                .then(res => res.json())
                .then(data => {
                    const section = document.getElementById('pending-invites-section');
                    section.innerHTML = data.map((inv, idx) => \`
                        <div class="pending-invite-card">
                            <div>
                                <h4 style="color: var(--point-orange); font-weight:700;"><i class="fa-solid fa-envelope-open-text"></i> 임차인 연계 요청이 있습니다.</h4>
                                <p style="font-size:13px; margin-top:4px;"><b>세입자:</b> \${inv.tenantName} | <b>요청 호실:</b> \${inv.room}</p>
                            </div>
                            <button class="btn btn-orange" onclick="acceptInvite(\${idx})">매칭 승인</button>
                        </div>
                    \`).join('');
                });
        }

        function acceptInvite(idx) {
            fetch('/api/accept-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: idx })
            })
            .then(res => res.json())
            .then(() => {
                alert('임차인 매칭 승인이 완료되어 계약 공간이 동기화되었습니다!');
                checkPendingInvites();
            });
        }

        function runOcr() {
            const container = document.getElementById('ocr-result');
            container.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary-light-blue); margin-bottom:10px;"></i><br>OCR 분석 중...</div>';
            fetch('/api/ocr')
                .then(res => res.json())
                .then(res => {
                    container.innerHTML = \`
                        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary-light-blue); font-size:13px;">
                            <b>소재지:</b> \${res.data.property.address} \${res.data.property.room_number}<br>
                            <b>임차인:</b> \${res.data.tenant.name}님
                        </div>
                    \`;
                });
        }

        function loadInventory() {
            fetch('/api/inventory')
                .then(res => res.json())
                .then(data => {
                    const list = document.getElementById('inventory-list');
                    list.innerHTML = data.map(item => \`
                        <div class="inventory-item">
                            <div>
                                <h4>\${item.name}</h4>
                                <span style="font-size:12px; color:#718096;">재고: \${item.stock}개</span>
                            </div>
                            <span class="badge \${item.is_low_stock ? 'badge-orange' : 'badge-blue'}">\${item.badge_text}</span>
                        </div>
                    \`).join('');
                });
        }
    </script>
</body>
</html>
`;

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  
  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlTemplate);
  } else if (req.method === 'GET' && parsedUrl.pathname === '/api/inventory') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(inventoryService.getItemsStatus()));
  } else if (req.method === 'GET' && parsedUrl.pathname === '/api/ocr') {
    const ocrResult = await OcrService.parseContractImage('uploaded_file.jpg');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(ocrResult));
  } else if (req.method === 'GET' && parsedUrl.pathname === '/api/pending-invites') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(pendingContracts));
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/invite-owner') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const data = JSON.parse(body);
      pendingContracts.push(data); // 대기 매칭 리스트 추가
      console.log(`[임차인 역제안 초대 발송 완료] 임대인명: ${data.ownerName}, 호실: ${data.room}`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
    });
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/accept-invite') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { index } = JSON.parse(body);
      if (index > -1 && index < pendingContracts.length) {
        pendingContracts.splice(index, 1); // 대기열에서 제거 (승인 완료)
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[ModuRoom] 로컬 개발 서버가 작동 중입니다: http://localhost:${PORT}`);
});
