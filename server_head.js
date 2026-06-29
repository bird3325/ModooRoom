const http = require('http');
const https = require('https');
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
const matchedContracts = []; // 임대인이 승인하여 매칭이 완료된 계약들
const registeredBuildings = []; // 임대인이 등록한 건물 목록
let supabaseConfig = { url: '', key: '' }; // Supabase 연동 설정
let publicDataApiKey = ''; // 공공데이터포털 API Key

try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                value = value.trim(); // Add trim just in case
                if (key === 'SUPABASE_URL') supabaseConfig.url = value;
                if (key === 'SUPABASE_ANON_KEY') supabaseConfig.key = value;
                if (key === 'ServiceKey' || key === 'PUBLIC_DATA_API_KEY') publicDataApiKey = value;
            }
        });
    }
    console.log('Loaded supabaseConfig:', supabaseConfig);
} catch (e) {
    console.error('.env 파일을 읽는 중 오류 발생:', e);
}

const htmlTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>모두의 방 - 통합 임대 및 주거 공간 관리 플랫폼</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
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

        /* 드롭다운 메뉴 스타일 */
        .dropdown-item {
            display: block;
            padding: 10px 15px;
            color: #4a5568;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            transition: var(--transition-smooth);
        }
        .dropdown-item:hover {
            background-color: #edf2f7;
            color: var(--primary-deep-navy);
        }

        .story-card {
            scroll-margin-top: 80px;
        }
    </style>
</head>
<body>

    <!-- 0. 스플래시(로딩) 뷰 -->
    <div id="loading-view" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
        <div style="background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 320px; width: 90%;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 50px; color: var(--point-orange); margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-deep-navy); font-size: 16px; margin: 0; font-weight: 600; line-height: 1.5;">로그인 정보를 확인 중입니다...</h3>
            <p style="font-size: 13px; color: #718096; margin-top: 10px; margin-bottom: 0;">잠시만 기다려 주세요.</p>
        </div>
    </div>

    <!-- 1. 로그인 뷰 -->
    <div class="auth-wrapper hidden" id="login-view">
        <div class="auth-card">
            <div class="auth-logo">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방</span>
            </div>

            <h3 style="text-align: center; margin-bottom: 25px; color: var(--primary-deep-navy);" id="login-title">로그인</h3>
            
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>이메일 주소</label>
                    <input type="email" id="login-email" class="form-control" required placeholder="이메일 주소" autocomplete="username">
                </div>
                <div class="form-group">
                    <label>비밀번호</label>
                    <input type="password" id="login-password" class="form-control" required placeholder="비밀번호" autocomplete="current-password">
                </div>
                <button type="submit" class="btn-auth" id="btn-login-submit">로그인</button>
            </form>
            <div class="auth-switch">
                아직 회원이 아니신가요? <a href="#" onclick="showView('signup')">회원가입하기</a>
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

            <h3 style="text-align: center; margin-bottom: 25px; color: var(--primary-deep-navy);" id="signup-title">회원가입</h3>
            
            <form onsubmit="handleSignup(event)">
                <div class="form-group">
                    <div style="display: flex; gap: 15px;">
                        <label style="flex: 1; border: 2px solid #edf2f7; border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.2s;" onclick="document.querySelectorAll('.role-box').forEach(el=>el.style.borderColor='#edf2f7'); this.style.borderColor='var(--primary-light-blue)';" class="role-box">
                            <input type="radio" name="signup-role" value="owner" required style="position: absolute; opacity: 0; pointer-events: none;"> 
                            <i class="fa-solid fa-building" style="font-size: 24px; color: var(--primary-light-blue); margin-bottom: 8px;"></i>
                            <span style="font-size: 14px; font-weight: 500; color: var(--primary-deep-navy);">임대인</span>
                        </label>
                        <label style="flex: 1; border: 2px solid #edf2f7; border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.2s;" onclick="document.querySelectorAll('.role-box').forEach(el=>el.style.borderColor='#edf2f7'); this.style.borderColor='var(--point-orange)';" class="role-box">
                            <input type="radio" name="signup-role" value="tenant" required style="position: absolute; opacity: 0; pointer-events: none;"> 
                            <i class="fa-solid fa-user-check" style="font-size: 24px; color: var(--point-orange); margin-bottom: 8px;"></i>
                            <span style="font-size: 14px; font-weight: 500; color: var(--primary-deep-navy);">임차인</span>
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label>아이디 (이메일)</label>
                    <input type="email" id="signup-email" class="form-control" required placeholder="name@domain.com" autocomplete="username">
                </div>
                <div class="form-group">
                    <label>이름 (성함)</label>
                    <input type="text" id="signup-name" class="form-control" required placeholder="홍길동" autocomplete="name">
                </div>
                <div class="form-group">
                    <label>비밀번호</label>
                    <input type="password" id="signup-password" class="form-control" required placeholder="최소 8자리 이상" autocomplete="new-password">
                </div>
                <button type="submit" class="btn-auth" id="btn-signup-submit">회원가입 완료</button>
            </form>
            <div class="auth-switch">
                이미 가입하셨나요? <a href="#" onclick="showView('login')">로그인하기</a>
            </div>
        </div>
    </div>

    <!-- 메인 대시보드 (로그인 직후/2차인증 전 화면) -->
    <div id="main-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('main-app')">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:#718096;">[환영합니다]</span></span>
            </div>
            <div class="user-profile" style="position: relative; display: flex; align-items: center; gap: 15px;">
                <button class="btn btn-orange" style="padding: 6px 12px; font-size: 12px; border-radius: 6px;" onclick="goToDashboard()">대시보드</button>
                <button id="main-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="toggleUserMenu(event)">
                    사용자님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div id="user-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                    <a href="#" class="dropdown-item" onclick="showView('auth-page'); document.getElementById('user-dropdown').classList.add('hidden');">마이페이지</a>
                    <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <a href="#" class="dropdown-item" onclick="handleLogout()" style="color: #e53e3e;">로그아웃</a>
                </div>
            </div>
        </nav>

        <div class="main-container">
            <div class="dashboard-layout">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div class="card-title"><i class="fa-solid fa-book-open"></i> 실시간 룸스토리</div>
                        <button class="btn btn-orange" style="padding: 8px 16px; font-size: 12px;" onclick="handleWriteStory()"><i class="fa-solid fa-pen"></i> 자랑하기 (등록)</button>
                    </div>
                    
                    <div class="story-feed" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <!-- 피드 카드 1 -->
                        <div class="card story-card" style="padding: 0; overflow: hidden; position: relative; border-radius: 12px; cursor: pointer;" onclick="openStoryDetail('story-1')">
                            <div style="width: 100%; height: 220px; background: url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80') center/cover;"></div>
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px 15px 15px 15px; color: white;">
                                <p style="font-size: 12px; font-weight: 500; color: var(--point-orange); margin-bottom: 4px;">#원룸인테리어 #우드톤</p>
                                <p style="font-size: 14px; font-weight: bold;">지현님의 아늑한 원룸</p>
                            </div>
                        </div>

                        <!-- 피드 카드 2 -->
                        <div class="card story-card" style="padding: 0; overflow: hidden; position: relative; border-radius: 12px; cursor: pointer;" onclick="openStoryDetail('story-2')">
                            <div style="width: 100%; height: 220px; background: url('https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80') center/cover;"></div>
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px 15px 15px 15px; color: white;">
                                <p style="font-size: 12px; font-weight: 500; color: var(--point-orange); margin-bottom: 4px;">#미니멀라이프 #모던</p>
                                <p style="font-size: 14px; font-weight: bold;">가성비 갑 미니멀 투룸</p>
                            </div>
                        </div>
                        
                        <!-- 피드 카드 3 -->
                        <div class="card story-card" style="padding: 0; overflow: hidden; position: relative; border-radius: 12px; cursor: pointer;" onclick="openStoryDetail('story-3')">
                            <div style="width: 100%; height: 220px; background: url('https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80') center/cover;"></div>
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px 15px 15px 15px; color: white;">
                                <p style="font-size: 12px; font-weight: 500; color: var(--point-orange); margin-bottom: 4px;">#채광맛집 #화이트톤</p>
                                <p style="font-size: 14px; font-weight: bold;">햇살 가득 화이트 인테리어</p>
                            </div>
                        </div>
                        
                        <!-- 피드 카드 4 -->
                        <div class="card story-card" style="padding: 0; overflow: hidden; position: relative; border-radius: 12px; cursor: pointer;" onclick="openStoryDetail('story-4')">
                            <div style="width: 100%; height: 220px; background: url('https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80') center/cover;"></div>
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px 15px 15px 15px; color: white;">
                                <p style="font-size: 12px; font-weight: 500; color: var(--point-orange); margin-bottom: 4px;">#플랜테리어 #식물집사</p>
                                <p style="font-size: 14px; font-weight: bold;">초록초록 싱그러운 내 방</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="card" style="cursor: pointer; border: 2px solid transparent;" onmouseover="this.style.borderColor='var(--primary-light-blue)'" onmouseout="this.style.borderColor='transparent'" onclick="showView('map-app')">
                        <div class="card-title"><i class="fa-solid fa-map-location-dot"></i> 주변 공실 지도 보기</div>
                        <p style="font-size:13px; color:#718096; margin-top:10px;">여기를 클릭하여 내 주변의 실시간 공실 매물을 지도에서 한눈에 확인하세요.</p>
                        <button class="btn" style="margin-top: 15px; width: 100%; justify-content: center;"><i class="fa-solid fa-map"></i> 지도로 이동하기</button>
                    </div>
                    <div class="card">
                        <div class="card-title"><i class="fa-solid fa-landmark"></i> 최신 부동산 정책</div>
                        <p style="font-size:13px; color:#718096; margin-top:10px;">알아두면 유용한 최신 부동산 관련 법령 및 정책 뉴스입니다.</p>
                        <ul style="font-size:13px; color:#4a5568; margin-top:15px; padding-left: 20px;">
                            <li style="margin-bottom: 5px;">2024년 청년 전월세 지원 정책 업데이트</li>
                            <li>임대차 3법 개정안 주요 내용 요약</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 공실 지도 뷰 -->

    <div id="admin-users-app" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('admin-app')">
                <i class="fa-solid fa-user-shield"></i>
                <span>모두의 방 <span style="font-size:12px; color:#a0aec0;">[관리자 전용 - 회원 관리]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                  <button id="admin-users-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggleAdminUsersMenu(event)">
                      관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                  </button>
                  <div id="admin-users-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                  </div>
              </div>
        </nav>
        <div class="main-container">
            <div class="card">
                

                <div class="card-title"><i class="fa-solid fa-users-gear"></i> 전체 회원 관리</div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px;">
                        <label style="font-size: 12px; color: #718096; display: block; margin-bottom: 4px;">가입일 (시작)</label>
                        <input type="text" id="admin-filter-start" class="form-control" placeholder="시작일 선택" readonly onclick="openCalendarModal(this.id)" style="cursor: pointer; background-color: #fff; font-family: inherit; font-size: 14px;">
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <label style="font-size: 12px; color: #718096; display: block; margin-bottom: 4px;">가입일 (종료)</label>
                        <input type="text" id="admin-filter-end" class="form-control" placeholder="종료일 선택" readonly onclick="openCalendarModal(this.id)" style="cursor: pointer; background-color: #fff; font-family: inherit; font-size: 14px;">
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <label style="font-size: 12px; color: #718096; display: block; margin-bottom: 4px;">회원 구분</label>
                        <select id="admin-filter-role" class="form-control" onchange="filterAdminUsers()">
                            <option value="">전체</option>
                            <option value="owner">임대인</option>
                            <option value="tenant">임차인</option>
                            <option value="admin">관리자</option>
                        </select>
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                        <button class="btn btn-orange" onclick="loadAdminUsers()"><i class="fa-solid fa-rotate-right"></i> 새로고침</button>
                    </div>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 12px 8px; text-align: left; color: #4a5568;">이름</th>
                                <th style="padding: 12px 8px; text-align: left; color: #4a5568;">이메일</th>
                                <th style="padding: 12px 8px; text-align: left; color: #4a5568;">연락처</th>
                                <th style="padding: 12px 8px; text-align: left; color: #4a5568;">구분</th>
                                <th style="padding: 12px 8px; text-align: center; color: #4a5568;">가입일</th>
                                <th style="padding: 12px 8px; text-align: center; color: #4a5568;">인증/관리</th>
                            </tr>
                        </thead>
                        <tbody id="admin-users-list">
                            <!-- JS로 렌더링 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div id="map-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('main-app')">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[공실 지도]</span></span>
            </div>
            <div class="user-profile">
                <button class="btn-logout" onclick="showView('main-app')"><i class="fa-solid fa-arrow-left"></i> 메인으로 돌아가기</button>
            </div>
        </nav>
        
        <div style="width: 100%; height: calc(100vh - 65px); background: #e2e8f0; position: relative; overflow: hidden;">
            <!-- 가상 지도 플레이스홀더 (이미지) -->
            <div style="width: 100%; height: 100%; background: url('https://upload.wikimedia.org/wikipedia/commons/b/b0/OpenStreetMap_default_map_of_Seoul.png') center/cover no-repeat; opacity: 0.9;"></div>
            
            <div style="position: absolute; top: 20px; left: 20px; background: white; padding: 15px; border-radius: 12px; box-shadow: var(--card-shadow); width: 300px; z-index: 10;">
                <h3 style="font-size: 16px; margin-bottom: 10px; color: var(--primary-deep-navy);"><i class="fa-solid fa-map-location-dot"></i> 주변 공실 정보</h3>
                <div style="padding: 10px; border-bottom: 1px solid #edf2f7; cursor: pointer;">
                    <h4 style="font-size: 14px; margin-bottom: 5px; color: var(--point-orange);">관악구 신림동 원룸</h4>
                    <p style="font-size: 12px; color: #718096;">보증금 1000 / 월 50<br>즉시 입주 가능 (풀옵션)</p>
                </div>
                <div style="padding: 10px; cursor: pointer;">
                    <h4 style="font-size: 14px; margin-bottom: 5px; color: var(--point-orange);">마포구 서교동 투룸</h4>
                    <p style="font-size: 12px; color: #718096;">보증금 2000 / 월 80<br>리모델링 완료, 채광 우수</p>
                </div>
            </div>
            
            <!-- 지도 핀들 -->
            <div style="position: absolute; top: 40%; left: 45%; color: #e53e3e; font-size: 40px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); cursor: pointer;"><i class="fa-solid fa-location-dot"></i></div>
            <div style="position: absolute; top: 55%; left: 60%; color: #e53e3e; font-size: 40px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); cursor: pointer;"><i class="fa-solid fa-location-dot"></i></div>
        </div>
    </div>

    <!-- 룸스토리 상세 피드 뷰 -->
    <div id="story-detail-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('main-app')">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[룸스토리 피드]</span></span>
            </div>
            <div class="user-profile">
                <button class="btn-logout" onclick="showView('main-app')"><i class="fa-solid fa-arrow-left"></i> 뒤로가기</button>
            </div>
        </nav>
        
        <div class="main-container" style="max-width: 800px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: var(--primary-deep-navy);">실시간 방 구경하기</h2>
                <button class="btn btn-orange" onclick="handleWriteStory()"><i class="fa-solid fa-pen"></i> 내 방 자랑하기 (등록)</button>
            </div>

            <div class="story-feed">
                <!-- 피드 카드 1 -->
                <div id="story-1" class="card story-card" style="padding: 0; overflow: hidden; margin-bottom: 35px;">
                    <div style="padding: 15px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #edf2f7;">
                        <div class="avatar" style="width: 32px; height: 32px; font-size: 14px; background: var(--point-orange);">지현</div>
                        <span style="font-weight: 600; font-size: 14px;">지현님의 아늑한 원룸</span>
                    </div>
                    <div style="width: 100%; height: 400px; background: url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80') center/cover;"></div>
                    <div style="padding: 20px;">
                        <p style="font-size: 14px; margin-bottom: 10px; line-height: 1.6;">이번에 새로 이사 온 관악구 원룸이에요! 우드톤으로 꾸며봤는데 어떤가요? 😊 혼자 살기 딱 좋은 크기에 빛도 잘 들어서 너무 마음에 듭니다.</p>
                        <p style="font-size: 13px; color: var(--primary-light-blue); margin-bottom: 20px;">#원룸인테리어 #우드톤 #자취방꾸미기</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                            <h4 style="font-size: 13px; margin-bottom: 10px; color: var(--primary-deep-navy);">댓글</h4>
                            <div style="margin-bottom: 15px; font-size: 13px; color: #4a5568;">
                                <div style="margin-bottom: 8px;"><span style="font-weight: 600; color: #2d3748;">영수</span> 와 방이 너무 예뻐요! 책상은 어디 제품인가요?</div>
                                <div style="margin-bottom: 8px;"><span style="font-weight: 600; color: #2d3748;">미희</span> 저도 우드톤 좋아하는데 참고해야겠어요.</div>
                            </div>
                            <div style="display: flex; gap: 10px; align-items: stretch;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="flex: 1; min-width: 0; padding: 8px 12px; font-size: 13px; margin: 0;">
                                <button class="btn btn-orange" style="flex: 0 0 70px; min-width: 70px; display: flex; justify-content: center; align-items: center; padding: 0; margin: 0; white-space: nowrap; word-break: keep-all;" onclick="handleCommentSubmit()">등록</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 피드 카드 2 -->
                <div id="story-2" class="card story-card" style="padding: 0; overflow: hidden; margin-bottom: 35px;">
                    <div style="padding: 15px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #edf2f7;">
                        <div class="avatar" style="width: 32px; height: 32px; font-size: 14px; background: var(--primary-light-blue);">철수</div>
                        <span style="font-weight: 600; font-size: 14px;">가성비 갑 미니멀 투룸</span>
                    </div>
                    <div style="width: 100%; height: 400px; background: url('https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80') center/cover;"></div>
                    <div style="padding: 20px;">
                        <p style="font-size: 14px; margin-bottom: 10px; line-height: 1.6;">최대한 물건을 줄이고 미니멀하게 살아보고 있어요. 청소하기 너무 편하고 공간도 훨씬 넓어보입니다. 화이트와 그레이 톤으로 맞췄어요.</p>
                        <p style="font-size: 13px; color: var(--primary-light-blue); margin-bottom: 20px;">#미니멀라이프 #모던</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                            <h4 style="font-size: 13px; margin-bottom: 10px; color: var(--primary-deep-navy);">댓글</h4>
                            <div style="display: flex; gap: 10px; align-items: stretch;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="flex: 1; min-width: 0; padding: 8px 12px; font-size: 13px; margin: 0;">
                                <button class="btn btn-orange" style="flex: 0 0 70px; min-width: 70px; display: flex; justify-content: center; align-items: center; padding: 0; margin: 0; white-space: nowrap; word-break: keep-all;" onclick="handleCommentSubmit()">등록</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 피드 카드 3 -->
                <div id="story-3" class="card story-card" style="padding: 0; overflow: hidden; margin-bottom: 35px;">
                    <div style="padding: 15px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #edf2f7;">
                        <div class="avatar" style="width: 32px; height: 32px; font-size: 14px; background: var(--primary-deep-navy);">유진</div>
                        <span style="font-weight: 600; font-size: 14px;">햇살 가득 화이트 인테리어</span>
                    </div>
                    <div style="width: 100%; height: 400px; background: url('https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80') center/cover;"></div>
                    <div style="padding: 20px;">
                        <p style="font-size: 14px; margin-bottom: 10px; line-height: 1.6;">남향이라 아침부터 햇살이 쏟아지는 제 방입니다! 화이트 가구들로 배치해서 더 화사하게 꾸며보았어요.</p>
                        <p style="font-size: 13px; color: var(--primary-light-blue); margin-bottom: 20px;">#채광맛집 #화이트톤</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                            <h4 style="font-size: 13px; margin-bottom: 10px; color: var(--primary-deep-navy);">댓글</h4>
                            <div style="display: flex; gap: 10px; align-items: stretch;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="flex: 1; min-width: 0; padding: 8px 12px; font-size: 13px; margin: 0;">
                                <button class="btn btn-orange" style="flex: 0 0 70px; min-width: 70px; display: flex; justify-content: center; align-items: center; padding: 0; margin: 0; white-space: nowrap; word-break: keep-all;" onclick="handleCommentSubmit()">등록</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 피드 카드 4 -->
                <div id="story-4" class="card story-card" style="padding: 0; overflow: hidden; margin-bottom: 35px;">
                    <div style="padding: 15px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #edf2f7;">
                        <div class="avatar" style="width: 32px; height: 32px; font-size: 14px; background: var(--point-orange);">민재</div>
                        <span style="font-weight: 600; font-size: 14px;">초록초록 싱그러운 내 방</span>
                    </div>
                    <div style="width: 100%; height: 400px; background: url('https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80') center/cover;"></div>
                    <div style="padding: 20px;">
                        <p style="font-size: 14px; margin-bottom: 10px; line-height: 1.6;">식물 키우는 재미에 푹 빠진 식물집사입니다. 방 곳곳에 화분을 배치하니 공기도 맑아지는 기분이에요.</p>
                        <p style="font-size: 13px; color: var(--primary-light-blue); margin-bottom: 20px;">#플랜테리어 #식물집사</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                            <h4 style="font-size: 13px; margin-bottom: 10px; color: var(--primary-deep-navy);">댓글</h4>
                            <div style="display: flex; gap: 10px; align-items: stretch;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="flex: 1; min-width: 0; padding: 8px 12px; font-size: 13px; margin: 0;">
                                <button class="btn btn-orange" style="flex: 0 0 70px; min-width: 70px; display: flex; justify-content: center; align-items: center; padding: 0; margin: 0; white-space: nowrap; word-break: keep-all;" onclick="handleCommentSubmit()">등록</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 3. 임대인 메인 대시보드 -->
    <div id="owner-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('main-app')">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[임대인 파트너]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                <button id="owner-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="toggleOwnerMenu(event)">
                    김임대 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div id="owner-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                    <a href="#" class="dropdown-item" onclick="showView('main-app'); document.getElementById('owner-dropdown').classList.add('hidden');">메인 페이지</a>
                    <a href="#" class="dropdown-item" onclick="showView('auth-page'); document.getElementById('owner-dropdown').classList.add('hidden');">마이페이지</a>
                    <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <a href="#" class="dropdown-item" onclick="handleLogout()" style="color: #e53e3e;">로그아웃</a>
                </div>
            </div>
        </nav>

        <div class="main-container">
            <!-- 임차인 역초대 승인 섹션 -->
            <div id="pending-invites-section"></div>

            <!-- 현재 관리 중인 임차인 섹션 -->
            <div id="active-tenants-section" style="margin-bottom: 20px;"></div>

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
                    <div class="card" style="margin-top: 30px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <div class="card-title" style="margin-bottom: 0;"><i class="fa-solid fa-building-user"></i> 내 건물 관리</div>
                            <button class="btn btn-orange" style="padding: 6px 12px; font-size: 12px;" onclick="showView('add-building-view')"><i class="fa-solid fa-plus"></i> 건물 추가</button>
                        </div>
                        <div id="owner-buildings-list">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 계약서 OCR 추출 뷰 -->
    <div id="ocr-extraction-view" class="hidden">
        <nav class="navbar">
            <div class="nav-title">
                <i class="fa-solid fa-arrow-left" onclick="showView('owner-app')" style="cursor:pointer; margin-right: 15px;"></i>
                새 건물 계약 등록 (AI 자동 추출)
            </div>
        </nav>
        <div class="content-area" style="padding: 20px; max-width: 1200px; margin: 0 auto;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px; display: flex; gap: 20px; flex-wrap: wrap;">
                
                <!-- 왼쪽: 계약서 이미지 미리보기 -->
                <div style="flex: 1; min-width: 300px; border-right: 1px solid #edf2f7; padding-right: 20px;">
                    <h4 style="margin-top: 0; color: #2d3748; font-size: 15px; margin-bottom: 15px;">계약서 원본 이미지</h4>
                    <div style="background: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 8px; padding: 10px; text-align: center; overflow: hidden; position: relative;">
                        <img id="ocr-preview-img" src="" alt="계약서 미리보기" style="max-width: 100%; max-height: 80vh; object-fit: contain; cursor: crosshair;">
                    </div>
                    <p style="font-size: 12px; color: #718096; margin-top: 10px; line-height: 1.5;">
                        <i class="fa-solid fa-info-circle" style="color: #00acc1;"></i> 좌측 계약서 이미지를 확인하고, <strong>[✨ AI 15개 항목 자동 추출]</strong> 버튼을 누르면 인공지능이 15개 항목을 알아서 채워줍니다. (민감정보 보호를 위해 브라우저에서 자동 마스킹 처리됨). 추출된 결과는 직접 수정 가능합니다.
                    </p>
                    <input type="file" id="ocr-manual-file" accept="image/*" style="margin-top: 10px; font-size: 13px;" onchange="loadOcrImage(event)">
                </div>

                <!-- 오른쪽: 추출 데이터 폼 -->
                <div style="flex: 1; min-width: 300px;">
                    <form onsubmit="submitExtractedContract(event)" style="display: flex; flex-direction: column; height: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #edf2f7; padding-bottom: 10px; margin-bottom: 15px;">
                            <h4 style="margin: 0; color: #2d3748; font-size: 15px;">계약 정보 15개 항목</h4>
                            <button type="button" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; font-size: 13px; border-radius: 6px; box-shadow: 0 2px 4px rgba(118, 75, 162, 0.3);" onclick="executeGeminiExtraction()">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI 15개 항목 자동 추출
                            </button>
                        </div>
                        
                        <div id="ocr-fields-container" style="flex: 1; overflow-y: auto; padding-right: 10px; max-height: 60vh;">
                            <!-- JS will populate fields here -->
                        </div>

                        <div style="margin-top: 20px; border-top: 1px solid #edf2f7; padding-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" class="btn" style="background: #e2e8f0; color: #4a5568;" onclick="showView('owner-app')">취소</button>
                            <button type="submit" class="btn btn-orange">최종 등록</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- 4. 임차인 메인 대시보드 -->
    <div id="tenant-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('main-app')">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--point-orange);">[안전 주거 케어]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                <button id="tenant-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="toggleTenantMenu(event)">
                    이세입 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div id="tenant-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                    <a href="#" class="dropdown-item" onclick="showView('main-app'); document.getElementById('tenant-dropdown').classList.add('hidden');">메인 페이지</a>
                    <a href="#" class="dropdown-item" onclick="showView('auth-page'); document.getElementById('tenant-dropdown').classList.add('hidden');">마이페이지</a>
                    <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <a href="#" class="dropdown-item" onclick="handleLogout()" style="color: #e53e3e;">로그아웃</a>
                </div>
            </div>
        </nav>

        <div class="main-container">
            <!-- 미매칭 상태 뷰 -->
            <div id="tenant-unmatched-view" class="dashboard-layout">
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
                    <div class="card" style="opacity: 0.6; pointer-events: none;">
                        <div class="card-title"><i class="fa-solid fa-wrench"></i> 나의 민원 신청하기</div>
                        <p style="font-size:13px; color:#718096;">임대인 승인 완료 시 사진 한 장 비대면 즉시 접수 채널이 개통됩니다.</p>
                    </div>
                </div>
            </div>

            <!-- 매칭 상태 뷰 -->
            <div id="tenant-matched-view" class="dashboard-layout hidden">
                <div>
                    <div class="card" style="border-top: 4px solid var(--primary-light-blue);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                            <div class="card-title" style="margin-bottom: 0;"><i class="fa-solid fa-file-signature"></i> 나의 계약 정보</div>
                            <span style="background: #e6fffa; color: #319795; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #b2f5ea;">
                                채널 개통 완료
                            </span>
                        </div>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px;">
                            <p style="margin-bottom: 8px;"><b>임대인 성함:</b> <span id="matched-owner-name"></span></p>
                            <p style="margin-bottom: 8px;"><b>임대인 연락처:</b> <span id="matched-owner-phone"></span></p>
                            <p style="margin-bottom: 0;"><b>내 방 호실:</b> <span id="matched-room" style="color: var(--primary-deep-navy); font-weight: bold;"></span></p>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="card">
                        <div class="card-title"><i class="fa-solid fa-wrench"></i> 나의 민원 신청하기</div>
                        <p style="font-size:13px; color:#718096; margin-bottom: 15px;">사진과 함께 내용을 입력하여 즉시 비대면 접수하세요.</p>
                        <form onsubmit="handleComplaintSubmit(event)">
                            <div class="form-group">
                                <label>제목</label>
                                <input type="text" id="complaint-title" class="form-control" placeholder="예: 화장실 문 손잡이 고장" required>
                            </div>
                            <div class="form-group">
                                <label>상세 내용</label>
                                <textarea id="complaint-desc" class="form-control" rows="3" placeholder="문제 상황을 상세히 적어주세요." required style="resize: none;"></textarea>
                            </div>
                            <div class="form-group">
                                <label>사진 첨부</label>
                                <input type="file" class="form-control" style="padding: 6px;">
                            </div>
                            <button type="submit" class="btn btn-orange">민원 접수하기</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 2차 인증 페이지 -->
    <div id="auth-page" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('main-app')">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[마이페이지]</span></span>
            </div>
            <div class="user-profile" style="position: relative; display: flex; align-items: center; gap: 15px;">
                <button class="btn btn-orange" style="padding: 6px 12px; font-size: 12px; border-radius: 6px;" onclick="goToDashboard()">대시보드</button>
                <button id="auth-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="toggleAuthMenu(event)">
                    사용자님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div id="auth-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                    <a href="#" class="dropdown-item" onclick="showView('main-app'); document.getElementById('auth-dropdown').classList.add('hidden');">메인 페이지</a>
                    <a href="#" class="dropdown-item" onclick="showView('auth-page'); document.getElementById('auth-dropdown').classList.add('hidden');">마이페이지</a>
                    <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <a href="#" class="dropdown-item" onclick="handleLogout()" style="color: #e53e3e;">로그아웃</a>
                </div>
            </div>
        </nav>
        
        <!-- 인증 선택 뷰 -->
        <div class="main-container" id="auth-choice-container" style="max-width: 800px;">
            <h2 style="text-align: center; color: var(--primary-deep-navy); margin-bottom: 30px; font-size: 22px;">마이페이지</h2>
            
            <!-- 공통 개인정보 수정란 (최신 스타일 적용) -->
            <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
                <h4 style="font-size: 16px; font-weight: 600; color: var(--primary-deep-navy); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-user-pen" style="color: var(--point-orange);"></i> 내 기본 정보 및 비밀번호 관리
                </h4>
                <div class="dashboard-layout" style="grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-weight: 500; color: #4a5568;">가입자 성함</label>
                        <input type="text" class="form-control" id="common-edit-name" required style="background-color: #f8fafc;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-weight: 500; color: #4a5568;">휴대전화 번호</label>
                        <input type="text" class="form-control" id="common-edit-phone" required style="background-color: #f8fafc;">
                    </div>
                </div>
                <div class="dashboard-layout" style="grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-weight: 500; color: #4a5568;">새 비밀번호</label>
                        <input type="password" class="form-control" id="common-edit-password" placeholder="변경할 비밀번호 (선택)" style="background-color: #f8fafc;" autocomplete="new-password">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-weight: 500; color: #4a5568;">새 비밀번호 확인</label>
                        <input type="password" class="form-control" id="common-edit-password-confirm" placeholder="비밀번호 재입력" style="background-color: #f8fafc;" autocomplete="new-password">
                    </div>
                </div>
                <div style="text-align: right; margin-top: 25px; border-top: 1px solid #edf2f7; padding-top: 15px;">
                    <button class="btn btn-orange" style="padding: 10px 20px; font-size: 14px; border-radius: 8px; font-weight: 600; box-shadow: 0 2px 4px rgba(237, 137, 54, 0.3);" onclick="saveMyInfo()">정보 저장하기</button>
                </div>
            </div>

            <!-- 임대인 폼 -->
            <div id="auth-owner-form" class="card hidden" style="border-top: 4px solid var(--primary-light-blue);">
                <div class="card-title" style="margin-bottom: 25px;"><i class="fa-solid fa-building"></i> 임대인 (집주인) 2차 인증</div>
                
                <div id="auth-owner-form-content">
                    <p style="font-size: 13.5px; color: #4a5568; margin-bottom: 20px; line-height: 1.5;">
                        2차 인증을 완료하시면 더 안전하고 편리하게 '모두의 방'을 이용하실 수 있습니다.<br>
                        <strong>임대인</strong>은 내 건물을 등록하고 안전하게 관리해 보세요!
                    </p>
                    <form onsubmit="authenticateOwnerDetailed(event)">
                        <p style="font-size: 13px; color: #718096; margin-bottom: 15px;">회원님의 이름(마이페이지 수정란 기준)과 임대차 계약서 상의 임대인 명의자를 대조하여 인증합니다.</p>
                        <div class="form-group">
                            <label>건물 주소</label>
                            <input type="text" class="form-control" id="owner-building-address" required placeholder="클릭하여 주소를 검색하세요" readonly onclick="execDaumPostcode()" style="cursor: pointer; background-color: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label>건물명</label>
                            <input type="text" class="form-control" id="owner-building-name" required placeholder="예) 모두빌라 1동">
                        </div>
                        <div class="form-group">
                            <label style="margin-bottom: 8px; display: block;">임대차 계약서 이미지 첨부</label>
                            <div id="drag-drop-zone" style="border: 2px dashed #cbd5e0; border-radius: 12px; padding: 30px 20px; text-align: center; background-color: #f8fafc; cursor: pointer; transition: all 0.3s ease; position: relative;">
                                <input type="file" id="owner-contract-file" accept="image/*" required style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                                <i id="drag-drop-icon" class="fa-solid fa-cloud-arrow-up" style="font-size: 36px; color: #a0aec0; margin-bottom: 15px; transition: color 0.3s ease;"></i>
                                <p id="drag-drop-text" style="font-size: 14px; font-weight: 600; color: #4a5568; margin-bottom: 5px;">클릭하거나 이미지를 드래그하여 업로드하세요</p>
                                <p id="drag-drop-file-name" style="font-size: 12px; color: #718096; margin-bottom: 0;">지원 형식: JPG, PNG, GIF 등</p>
                            </div>
                            <p style="font-size: 11.5px; color: #a0aec0; margin-top: 8px;"><i class="fa-solid fa-circle-exclamation"></i> 임대인의 이름이 명확히 보이도록 찍어주세요.</p>
                        </div>

                        <button type="submit" class="btn" style="width: 100%; justify-content: center; margin-top: 15px; padding: 14px;">계약서 인증(2차 인증)</button>
                    </form>
                </div>

                <div id="auth-owner-completed" class="hidden" style="text-align: center; padding: 20px 0;">
                    <div style="width: 60px; height: 60px; background-color: #e6fffa; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                        <i class="fa-solid fa-check" style="font-size: 30px; color: #38b2ac;"></i>
                    </div>
                    <h3 style="font-size: 18px; color: var(--primary-deep-navy); margin-bottom: 10px; font-weight: 600;">2차 인증 완료</h3>
                    <p style="font-size: 14px; color: #718096; margin-bottom: 20px; line-height: 1.5;">
                        임대인 인증이 안전하게 완료되었습니다.<br>등록된 건물 정보를 바탕으로 서비스를 이용해 보세요.
                    </p>
                    <div id="auth-completed-buildings-list" style="margin-bottom: 20px;">
                        <!-- 동적으로 건물 목록이 들어옵니다 -->
                    </div>
                    <button type="button" class="btn" onclick="showView('owner-app')" style="width: 100%; justify-content: center;">내 건물 관리 바로가기</button>
                </div>
            </div>

            <!-- 임차인 폼 -->
            <div id="auth-tenant-form" class="card hidden" style="border-top: 4px solid var(--point-orange);">
                <div class="card-title" style="margin-bottom: 25px;"><i class="fa-solid fa-user-check"></i> 임차인 (세입자) 2차 인증</div>
                <p style="font-size: 13.5px; color: #4a5568; margin-bottom: 20px; line-height: 1.5;">
                    2차 인증을 완료하시면 더 안전하고 편리하게 '모두의 방'을 이용하실 수 있습니다.<br>
                    <strong>임차인</strong>은 등록된 거주자로서 집주인과 원활하게 소통해 보세요!
                </p>
                <div id="tenant-search-section">
                    <p style="font-size: 13px; color: #718096; margin-bottom: 15px;">거주 중인 건물 주소를 검색하여 등록된 임대인이 있는지 확인합니다.</p>
                    <div class="form-group">
                        <label>건물 주소</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" class="form-control" id="tenant-search-address" required placeholder="클릭하여 주소를 검색하세요" readonly onclick="execDaumPostcodeForTenant()" style="cursor: pointer; background-color: #f8fafc; flex: 1;">
                            <button type="button" class="btn" style="padding: 0 20px; font-weight: 500;" onclick="searchBuildingForTenant()">조회</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>상세 호실 (예: 201호)</label>
                        <input type="text" class="form-control" id="tenant-search-room" placeholder="호실 입력">
                    </div>
                </div>

                <div id="tenant-registered-section" class="hidden" style="margin-top: 20px; padding: 15px; background: #ebf8fa; border-radius: 8px; border: 1px solid #b2ebf2;">
                    <p style="font-size: 14px; font-weight: 600; color: #00838f; margin-bottom: 10px;"><i class="fa-solid fa-circle-check"></i> 가입된 임대인이 확인되었습니다.</p>
                    <p style="font-size: 13px; color: #006064; margin-bottom: 15px;">임대인 <strong id="tenant-found-owner-name"></strong> 파트너에게 지금 바로 거주 인증을 요청하세요.</p>
                    <button type="button" class="btn" style="width: 100%; justify-content: center; background: #00acc1; border: none; color: white;" onclick="requestAuthToOwner()">거주 인증 요청 발송하기</button>
                </div>

                <div id="tenant-unregistered-section" class="hidden" style="margin-top: 20px; padding: 15px; background: #fff5f5; border-radius: 8px; border: 1px solid #fed7d7;">
                    <p style="font-size: 14px; font-weight: 600; color: #c53030; margin-bottom: 10px;"><i class="fa-solid fa-circle-exclamation"></i> 아직 가입하지 않은 임대인입니다.</p>
                    <p style="font-size: 13px; color: #9b2c2c; margin-bottom: 15px;">해당 건물에 등록된 임대인이 없습니다. 임대인의 전화번호를 입력하여 '모두의 방' 가입 초대장을 보내보세요!</p>
                    <div class="form-group">
                        <input type="tel" class="form-control" id="tenant-invite-phone" placeholder="임대인 전화번호 (010-XXXX-XXXX)">
                    </div>
                    <button type="button" class="btn btn-orange" style="width: 100%; justify-content: center;" onclick="sendInviteToOwner()">초대 문자 발송하기</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 새 건물 추가 인증 페이지 -->
    <div id="add-building-view" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('owner-app')">
                <i class="fa-solid fa-arrow-left"></i>
                <span style="margin-left: 5px;">대시보드로 돌아가기</span>
            </div>
        </nav>
        
        <div class="main-container" style="max-width: 800px;">
            <div class="card" style="border-top: 4px solid var(--primary-light-blue);">
                <div class="card-title" style="margin-bottom: 25px;"><i class="fa-solid fa-house-medical"></i> 새 건물 등록 및 소유권 인증</div>
                
                <p style="font-size: 13.5px; color: #4a5568; margin-bottom: 20px; line-height: 1.5;">
                    신뢰할 수 있는 플랫폼을 위해 건물 추가 시에도 <strong>소유권 인증(계약서/등기부등본 OCR)</strong>을 필수로 진행합니다.
                </p>
                <form onsubmit="submitAddBuilding(event)">
                    <div class="form-group">
                        <label>건물 주소</label>
                        <input type="text" class="form-control" id="add-building-address" required placeholder="클릭하여 주소를 검색하세요" readonly onclick="execDaumPostcodeAddBuilding()" style="cursor: pointer; background-color: #f8fafc;">
                    </div>
                    <div class="form-group">
                        <label>건물명</label>
                        <input type="text" class="form-control" id="add-building-name" required placeholder="예) 모두빌라 1동">
                    </div>
                    <div class="form-group">
                        <label style="margin-bottom: 8px; display: block;">소유권 증빙 서류 이미지 첨부</label>
                        <div id="drag-drop-zone-add" style="border: 2px dashed #cbd5e0; border-radius: 12px; padding: 30px 20px; text-align: center; background-color: #f8fafc; cursor: pointer; position: relative;">
                            <input type="file" id="add-building-file" accept="image/*" required style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;" onchange="handleAddBuildingFileChange(event)">
                            <i id="drag-drop-icon-add" class="fa-solid fa-cloud-arrow-up" style="font-size: 36px; color: #a0aec0; margin-bottom: 15px;"></i>
                            <p id="drag-drop-text-add" style="font-size: 14px; font-weight: 600; color: #4a5568; margin-bottom: 5px;">클릭하거나 이미지를 드래그하여 업로드하세요</p>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-orange" style="width: 100%; justify-content: center; margin-top: 15px; padding: 14px;">계약서 OCR 대조 및 건물 추가</button>
                </form>
            </div>
        </div>
    </div>

    <!-- 내 건물 관리 페이지 -->
    <div id="building-management-page" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('main-app')">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[내 건물 관리]</span></span>
            </div>
            <div class="user-profile">
                <button class="btn-logout" onclick="showView('owner-app')"><i class="fa-solid fa-arrow-left"></i> 뒤로가기</button>
            </div>
        </nav>
        <div class="main-container" style="max-width: 800px;" id="building-management-content">
            <!-- 동적으로 렌더링될 영역 -->
        </div>
    </div>


    <!-- 시스템 설정 페이지 -->
    <div id="admin-settings-app" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('admin-app')">
                <i class="fa-solid fa-user-shield"></i>
                <span>모두의 방 <span style="font-size:12px; color:#a0aec0;">[관리자 전용 - 시스템 설정]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                  <button id="admin-settings-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggleAdminSettingsMenu(event)">
                      관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                  </button>
                  <div id="admin-settings-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                  </div>
              </div>
        </nav>
        <div class="main-container">
                <div class="card" style="margin-bottom: 20px; border-top: 4px solid #667eea;">
                    <div class="card-title"><i class="fa-solid fa-gear"></i> 시스템 설정 (API Key)</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 5px;">Gemini API Key</label>
                            <input type="password" id="admin-gemini-key" class="form-control" placeholder="AIzaSy..." style="width: 100%; max-width: 400px; display: inline-block;">
                            <button class="btn btn-orange" onclick="saveGeminiKey()">저장</button>
                        </div>
                        <p style="font-size: 12px; color: #718096; margin: 0;">이 키는 system_settings 테이블에 안전하게 저장되며, AI OCR 자동 추출 시 우선적으로 사용됩니다.</p>
                    </div>
                </div>
        </div>
    </div>
\n    <!-- 어드민 페이지 -->
    <div id="admin-app" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('admin-app')">
                <i class="fa-solid fa-user-shield"></i>
                <span>모두의 방 <span style="font-size:12px; color:#a0aec0;">[관리자 전용]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                  <button id="admin-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggleAdminMenu(event)">
                      관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                  </button>
                  <div id="admin-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                  </div>
              </div>
          </nav>
        <div class="main-container">
            <div class="card">
                <div class="card-title"><i class="fa-solid fa-chart-pie"></i> 관리자 대시보드</div>
                <!-- 통계 대시보드 위젯 -->
                <div id="admin-dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 15px; text-align: left;">
                    
                    <!-- 카드 1: 총 회원 수 -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: var(--card-shadow); border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid var(--primary-deep-navy);">
                        <div>
                            <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #718096; margin-bottom: 5px;">총 회원 수</h4>
                            <div id="stat-total-users" style="font-size: 26px; font-weight: 700; color: var(--primary-deep-navy);">0<span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span></div>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #ebf8ff; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-users" style="font-size: 20px; color: var(--primary-light-blue);"></i>
                        </div>
                    </div>
                    
                    <!-- 카드 2: 임대인 -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: var(--card-shadow); border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid var(--primary-light-blue);">
                        <div>
                            <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #718096; margin-bottom: 5px;">임대인 (건물주)</h4>
                            <div id="stat-owner-users" style="font-size: 26px; font-weight: 700; color: var(--primary-deep-navy);">0<span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span></div>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #e6fffa; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-user-tie" style="font-size: 20px; color: #319795;"></i>
                        </div>
                    </div>
                    
                    <!-- 카드 3: 임차인 -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: var(--card-shadow); border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid #48bb78;">
                        <div>
                            <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #718096; margin-bottom: 5px;">임차인 (세입자)</h4>
                            <div id="stat-tenant-users" style="font-size: 26px; font-weight: 700; color: var(--primary-deep-navy);">0<span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span></div>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f0fff4; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-house-user" style="font-size: 20px; color: #48bb78;"></i>
                        </div>
                    </div>
                    
                    <!-- 카드 4: 등록 건물 -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: var(--card-shadow); border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid var(--point-orange);">
                        <div>
                            <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #718096; margin-bottom: 5px;">총 등록 건물</h4>
                            <div id="stat-total-buildings" style="font-size: 26px; font-weight: 700; color: var(--primary-deep-navy);">0<span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">개</span></div>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #fffaf0; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-building" style="font-size: 20px; color: var(--point-orange);"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 상세 통계 영역 (가입 일자별 & 지역별) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <!-- 가입 일자별 회원 통계 -->
                <div class="card" style="margin: 0; border-top: 4px solid var(--primary-deep-navy);">
                    <div class="card-title"><i class="fa-solid fa-calendar-days"></i> 가입 일자별 회원 현황</div>
                    <div style="overflow-x: auto; max-height: 300px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
                                <tr style="border-bottom: 2px solid #e2e8f0;">
                                    <th style="padding: 10px 8px; text-align: left; color: #4a5568;">가입 일자</th>
                                    <th style="padding: 10px 8px; text-align: center; color: #4a5568;">가입자 수</th>
                                </tr>
                            </thead>
                            <tbody id="stat-signup-date-list">
                                <tr><td colspan="2" style="text-align: center; padding: 20px; color: #a0aec0;">데이터를 불러오는 중입니다...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 지역별 건물 및 임대인 통계 -->
                <div class="card" style="margin: 0; border-top: 4px solid var(--primary-light-blue);">
                    <div class="card-title"><i class="fa-solid fa-map-location-dot"></i> 지역별 통계 (시/군/구)</div>
                    <div style="overflow-x: auto; max-height: 300px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
                                <tr style="border-bottom: 2px solid #e2e8f0;">
                                    <th style="padding: 10px 8px; text-align: left; color: #4a5568;">지역</th>
                                    <th style="padding: 10px 8px; text-align: center; color: #4a5568;">등록 건물 수</th>
                                    <th style="padding: 10px 8px; text-align: center; color: #4a5568;">소유 임대인 수</th>
                                </tr>
                            </thead>
                            <tbody id="stat-region-list">
                                <tr><td colspan="3" style="text-align: center; padding: 20px; color: #a0aec0;">데이터를 불러오는 중입니다...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 대시보드 내 건물 관리 리스트 영역 (제거됨) -->
        </div>
    </div>

    <!-- 회원/건물 통합 수정 페이지 -->
    <div id="admin-user-edit-app" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('admin-users-app')">
                <i class="fa-solid fa-user-shield"></i>
                <span>모두의 방 <span style="font-size:12px; color:#a0aec0;">[관리자 전용 - 회원 통합 수정]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                <button id="admin-user-edit-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggleAdminUserEditMenu(event)">
                    관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div id="admin-user-edit-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                    <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-user-edit-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                    <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-user-edit-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
                    <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-user-edit-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                    <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-user-edit-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                </div>
            </div>
        </nav>
        <div class="main-container">
            <input type="hidden" id="admin-edit-page-id">
            
            <div class="card" style="border-top: 4px solid var(--primary-deep-navy); margin-bottom: 20px;">
                <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fa-solid fa-user-pen"></i> 회원 정보</span>
                    <button class="btn" style="padding: 4px 10px; font-size: 13px; background: white; border: 1px solid #cbd5e0; color: #4a5568; cursor: pointer; display: flex; align-items: center; gap: 5px; border-radius: 6px;" onclick="showView('admin-users-app')">
                        <i class="fa-solid fa-xmark"></i> 닫기
                    </button>
                </div>
                <div class="form-group">
                    <label>이름</label>
                    <input type="text" id="admin-edit-page-name" class="form-control">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label>연락처</label>
                    <input type="text" id="admin-edit-page-phone" class="form-control">
                </div>
            </div>

            <div id="admin-edit-page-buildings-container" class="hidden">
                <h3 style="font-size: 15px; color: var(--primary-deep-navy); margin: 25px 0 10px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;"><i class="fa-solid fa-building"></i> 소유 건물 관리</h3>
                <div id="admin-edit-page-buildings-list">
                    <!-- 건물 폼들이 동적으로 추가됨 -->
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button class="btn btn-orange" onclick="saveAdminUserEditData()" style="flex: 1; padding: 15px; font-size: 16px;"><i class="fa-solid fa-floppy-disk"></i> 변경사항 저장</button>
                <button class="btn" onclick="showView('admin-users-app')" style="flex: 1; background: #e2e8f0; color: #4a5568; padding: 15px; font-size: 16px;">취소 및 돌아가기</button>
            </div>
        </div>
    </div>

    <!-- 커스텀 알럿 모달 -->
    <div id="custom-alert-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; padding: 25px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center;">
            <i class="fa-solid fa-circle-info" style="font-size: 40px; color: var(--point-orange); margin-bottom: 15px;"></i>
            <p id="custom-alert-message" style="font-size: 15px; color: var(--primary-deep-navy); margin-bottom: 25px; line-height: 1.5;"></p>
            <button class="btn btn-orange" style="width: 100%; justify-content: center;" onclick="closeCustomAlert()">확인</button>
        </div>
    </div>

    <!-- 커스텀 컨펌 모달 -->
    <div id="custom-confirm-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; padding: 25px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 40px; color: #e53e3e; margin-bottom: 15px;"></i>
            <p id="custom-confirm-message" style="font-size: 15px; color: var(--primary-deep-navy); margin-bottom: 25px; line-height: 1.5;"></p>
            <div style="display: flex; gap: 10px;">
                <button class="btn" style="flex: 1; justify-content: center; background: #e2e8f0; color: #4a5568;" onclick="closeCustomConfirm(false)">취소</button>
                <button class="btn" style="flex: 1; justify-content: center; background: #e53e3e; color: white; border: none;" onclick="closeCustomConfirm(true)">확인</button>
            </div>
        </div>
    </div>

    <!-- 달력 모달 -->
    <div id="calendar-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;" onclick="if(event.target === this) closeCalendarModal()">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <button class="btn" style="padding: 4px 8px; font-size: 14px;" onclick="changeCalendarRange(-1)">&lt;</button>
                <div id="calendar-month-year" style="display: flex; gap: 4px; align-items: center;"></div>
                <button class="btn" style="padding: 4px 8px; font-size: 14px;" onclick="changeCalendarRange(1)">&gt;</button>
            </div>
            <div id="calendar-days-header" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; font-size: 13px; margin-bottom: 5px; font-weight: bold; color: #718096;">
                <div style="color: #e53e3e;">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div style="color: #3182ce;">토</div>
            </div>
            <div id="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; font-size: 13px;">
            </div>
            <div id="calendar-today-display" style="text-align: center; margin-top: 10px; font-size: 12px; color: #718096;"></div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button class="btn" style="flex: 1; background: #e2e8f0; color: #4a5568;" onclick="clearCalendarDate()">취소</button>
                <button class="btn" style="flex: 1; background: var(--primary-light-blue); color: white; border: none;" onclick="resetCalendarToToday()">오늘</button>
            </div>
        </div>
    </div>

    <!-- 계약서 확인 모달 -->
    <div id="contract-confirm-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; overflow-y: auto;">
        <div style="position: relative; margin: 40px auto; background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <h3 style="margin-bottom: 15px; color: var(--primary-deep-navy); border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">계약 정보 확인</h3>
            <p style="font-size: 13px; color: #718096; margin-bottom: 15px;">OCR로 추출된 데이터입니다. 틀린 부분이 있다면 직접 수정해 주세요.</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>임차인 성명</label>
                    <input type="text" id="confirm-tenant-name" class="form-control" />
                </div>
                <div class="form-group">
                    <label>상세주소(호실)</label>
                    <input type="text" id="confirm-room" class="form-control" />
                </div>
                <div class="form-group">
                    <label>보증금</label>
                    <input type="text" id="confirm-deposit" class="form-control" />
                </div>
                <div class="form-group">
                    <label>차임(월세)</label>
                    <input type="text" id="confirm-rent" class="form-control" />
                </div>
                <div class="form-group">
                    <label>임대기간</label>
                    <input type="text" id="confirm-lease-period" class="form-control" />
                </div>
                <div class="form-group">
                    <label>공인중개사 명칭</label>
                    <input type="text" id="confirm-realtor-name" class="form-control" />
                </div>
                <div class="form-group">
                    <label>공인중개사 대표자명</label>
                    <input type="text" id="confirm-realtor-rep" class="form-control" />
                </div>
                <div class="form-group">
                    <label>공인중개사 소재지</label>
                    <input type="text" id="confirm-realtor-addr" class="form-control" />
                </div>
                <div class="form-group">
                    <label>공인중개사 전화번호</label>
                    <input type="text" id="confirm-realtor-phone" class="form-control" />
                </div>
                <div class="form-group">
                    <label>공인중개사 등록번호</label>
                    <input type="text" id="confirm-realtor-reg" class="form-control" />
                </div>
            </div>

            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="btn" style="flex: 1; background: #e2e8f0; color: #4a5568;" onclick="closeContractConfirmModal()">취소</button>
                <button class="btn" style="flex: 1; background: var(--primary-deep-navy); color: white; border: none;" onclick="confirmContractSave()">확인 및 저장</button>
            </div>
        </div>
    </div>

    <script>
        // Supabase 동적 초기화
        let supabaseClient = null;

        function markUserVerified() {
            isAuthenticated = true;
        }

        document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const initDateStr = today.getFullYear() + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + String(today.getDate()).padStart(2, '0');
            
            const prevMonth = new Date(today);
            prevMonth.setMonth(prevMonth.getMonth() - 1);
            const prevMonthStr = prevMonth.getFullYear() + '.' + String(prevMonth.getMonth() + 1).padStart(2, '0') + '.' + String(prevMonth.getDate()).padStart(2, '0');
            
            const startInput = document.getElementById('admin-filter-start');
            const endInput = document.getElementById('admin-filter-end');
            if (startInput) startInput.value = prevMonthStr;
            if (endInput) endInput.value = initDateStr;

            const todayDisplay = document.getElementById('calendar-today-display');
            if (todayDisplay) {
                todayDisplay.innerText = '오늘: ' + initDateStr;
            }

            fetch('/api/config/supabase')
                .then(res => res.json())
                .then(async config => {
                    if (config.url && config.key && config.url !== 'YOUR_SUPABASE_URL') {
                        supabaseClient = window.supabase.createClient(config.url, config.key);
                        console.log('Supabase 클라이언트가 초기화되었습니다. (.env 사용)');

                        if (window.IS_ADMIN_ROUTE) {
                            const loginTitle = document.getElementById('login-title');
                            if (loginTitle) loginTitle.innerText = '관리자 로그인';
                        }
                        
                        // 세션(자동 로그인) 복구
                        const { data: { session } } = await supabaseClient.auth.getSession();
                        if (session && session.user) {
                            const { data: profile, error: profileError } = await supabaseClient
                                .from('profiles')
                                .select('*')
                                .eq('id', session.user.id)
                                .single();

                            if (!profileError && profile) {
                                globalUserRole = profile.role;
                                const namePrefix = profile.name;
                                document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                if (document.getElementById('auth-display-name')) {
                                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                
                                isAuthenticated = false; // 기본값

                                // 임대인일 경우 등록된 건물 가져오기
                                if (profile.role === 'owner') {
                                    const { data: bData, error: bError } = await supabaseClient
                                        .from('buildings')
                                        .select('*')
                                        .eq('owner_id', session.user.id);
                                    
                                    if (!bError && bData && bData.length > 0) {
                                        ownerBuildings = bData;
                                        markUserVerified(); // 건물이 있으면 2차 인증 완료로 처리
                                    }
                                }

                                // is_verified 처리 (관리자가 수동 승인한 경우)
                                if (profile.is_verified) {
                                    isAuthenticated = true;
                                }

                                document.getElementById('loading-view').classList.add('hidden');
                                if (window.IS_ADMIN_ROUTE) {
                                    if (profile.role === 'admin') {
                                        showView('admin-app');
                                        loadAdminUsers();
                                        loadAdminBuildings();
                                    } else {
                                        showModalAlert('관리자 권한이 없습니다.');
                                        showView('main-app');
                                    }
                                } else if (profile.role === 'admin') {
                                    showView('admin-app');
                                    loadAdminUsers();
                                    loadAdminBuildings();
                                } else if (isAuthenticated) {
                                    showView(globalUserRole === 'owner' ? 'owner-app' : 'tenant-app');
                                } else {
                                    showView('main-app');
                                }
                                return;
                            }
                        }
                    }
                    // 세션이 없거나 정보가 다를 경우 로그인 창으로
                    document.getElementById('loading-view').classList.add('hidden');
                    showView('login');
                })
                .catch(err => {
                    console.error('설정을 불러오는 데 실패했습니다.', err);
                    document.getElementById('loading-view').classList.add('hidden');
                    showView('login');
                });
        });

        // 글로벌 상태 변상태를 관리
        let isAuthenticated = false; // 2차 인증 여부
        let currentRole = 'owner';   // 'owner' or 'tenant'
        let activeTenantsData = [];  // 임대인: 현재 매칭된 임차인 목록 데이터

        async function saveMyInfo() {
            const name = document.getElementById('common-edit-name').value;
            const phone = document.getElementById('common-edit-phone').value;
            const pwd = document.getElementById('common-edit-password').value;
            const pwdConfirm = document.getElementById('common-edit-password-confirm').value;
            
            if (pwd || pwdConfirm) {
                if (pwd !== pwdConfirm) {
                    showModalAlert('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
                    return;
                }
            }

            if (!supabaseClient) {
                showModalAlert('개인정보 및 비밀번호가 성공적으로 수정되었습니다. (모의 로직)');
                return;
            }

            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !session) {
                showModalAlert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                return;
            }

            // 1. 프로필 업데이트 (이름, 전화번호)
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .update({ name: name, phone: phone })
                .eq('id', session.user.id);

            if (profileError) {
                showModalAlert('정보 수정 실패: ' + profileError.message);
                return;
            }

            // 2. 비밀번호 변경 (입력했을 경우에만)
            if (pwd) {
                const { error: pwdError } = await supabaseClient.auth.updateUser({ password: pwd });
                if (pwdError) {
                    showModalAlert('비밀번호 변경 실패: ' + pwdError.message);
                    return;
                }
            }

            // UI 헤더 이름 즉시 반영
            document.getElementById('main-display-name').innerHTML = name + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            document.getElementById('owner-display-name').innerHTML = name + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            document.getElementById('tenant-display-name').innerHTML = name + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';

            document.getElementById('common-edit-password').value = '';
            document.getElementById('common-edit-password-confirm').value = '';

            showModalAlert('개인정보 및 비밀번호가 성공적으로 수정되었습니다.');
        }

        function showModalAlert(message) {
            document.getElementById('custom-alert-message').innerText = message;
            document.getElementById('custom-alert-modal').classList.remove('hidden');
        }

        function closeCustomAlert() {
            document.getElementById('custom-alert-modal').classList.add('hidden');
        }

        let currentConfirmCallback = null;
        function showModalConfirm(message, callback) {
            document.getElementById('custom-confirm-message').innerText = message;
            document.getElementById('custom-confirm-modal').classList.remove('hidden');
            currentConfirmCallback = callback;
        }

        function closeCustomConfirm(result) {
            document.getElementById('custom-confirm-modal').classList.add('hidden');
            if (currentConfirmCallback) {
                currentConfirmCallback(result);
                currentConfirmCallback = null;
            }
        }

        // 드롭다운 외부 클릭 시 닫기
        window.addEventListener('click', function(e) {
            const dropdown = document.getElementById('user-dropdown');
            const toggleBtn = document.getElementById('main-display-name');
            if (dropdown && toggleBtn && !toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }

            const ownerDropdown = document.getElementById('owner-dropdown');
            const ownerToggleBtn = document.getElementById('owner-display-name');
            if (ownerDropdown && ownerToggleBtn && !ownerToggleBtn.contains(e.target) && !ownerDropdown.contains(e.target)) {
                ownerDropdown.classList.add('hidden');
            }

            const tenantDropdown = document.getElementById('tenant-dropdown');
            const tenantToggleBtn = document.getElementById('tenant-display-name');
            if (tenantDropdown && tenantToggleBtn && !tenantToggleBtn.contains(e.target) && !tenantDropdown.contains(e.target)) {
                tenantDropdown.classList.add('hidden');
            }



            const adminUsersDropdown = document.getElementById('admin-users-dropdown');
            const adminUsersToggleBtn = document.getElementById('admin-users-display-name');
            if (adminUsersDropdown && adminUsersToggleBtn && !adminUsersToggleBtn.contains(e.target) && !adminUsersDropdown.contains(e.target)) {
                adminUsersDropdown.classList.add('hidden');
            }

            const adminSettingsDropdown = document.getElementById('admin-settings-dropdown');
            const adminSettingsToggleBtn = document.getElementById('admin-settings-display-name');
            if (adminSettingsDropdown && adminSettingsToggleBtn && !adminSettingsToggleBtn.contains(e.target) && !adminSettingsDropdown.contains(e.target)) {
                adminSettingsDropdown.classList.add('hidden');
            }

            const adminDropdown = document.getElementById('admin-dropdown');
            const adminToggleBtn = document.getElementById('admin-display-name');
            if (adminDropdown && adminToggleBtn && !adminToggleBtn.contains(e.target) && !adminDropdown.contains(e.target)) {
                adminDropdown.classList.add('hidden');
            }

            const adminUserEditDropdown = document.getElementById('admin-user-edit-dropdown');
            const adminUserEditToggleBtn = document.getElementById('admin-user-edit-display-name');
            if (adminUserEditDropdown && adminUserEditToggleBtn && !adminUserEditToggleBtn.contains(e.target) && !adminUserEditDropdown.contains(e.target)) {
                adminUserEditDropdown.classList.add('hidden');
            }

            const authDropdown = document.getElementById('auth-dropdown');
            const authToggleBtn = document.getElementById('auth-display-name');
            if (authDropdown && authToggleBtn && !authToggleBtn.contains(e.target) && !authDropdown.contains(e.target)) {
                authDropdown.classList.add('hidden');
            }
            
            // 모든 빌딩 메뉴 닫기
            if (typeof ownerBuildings !== 'undefined') {
                ownerBuildings.forEach(function(b, idx) {
                    const bMenu = document.getElementById('building-menu-' + idx);
                    if (bMenu) {
                        const btn = bMenu.previousElementSibling;
                        if (btn && !btn.contains(e.target) && !bMenu.contains(e.target)) {
                            bMenu.classList.add('hidden');
                        }
                    }
                });
            }
        });

        function toggleUserMenu(e) {
            e.stopPropagation();
            document.getElementById('user-dropdown').classList.toggle('hidden');
            const subMenu = document.getElementById('auth-sub-menu');
            if(subMenu) subMenu.classList.add('hidden');
        }

        function toggleAdminUsersMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-users-dropdown').classList.toggle('hidden');
        }

        function toggleAdminSettingsMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-settings-dropdown').classList.toggle('hidden');
        }

        function toggleAdminMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-dropdown').classList.toggle('hidden');
        }

        function toggleAdminUserEditMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-user-edit-dropdown').classList.toggle('hidden');
        }

        function toggleOwnerMenu(e) {
            e.stopPropagation();
            document.getElementById('owner-dropdown').classList.toggle('hidden');
        }

        function toggleTenantMenu(e) {
            e.stopPropagation();
            document.getElementById('tenant-dropdown').classList.toggle('hidden');
        }

        function toggleAuthMenu(e) {
            e.stopPropagation();
            document.getElementById('auth-dropdown').classList.toggle('hidden');
        }

        function showView(viewName) {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('owner-app').classList.add('hidden');
            document.getElementById('tenant-app').classList.add('hidden');
            if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');
            if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');
            if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');
            if(document.getElementById('map-app')) document.getElementById('map-app').classList.add('hidden');
            if(document.getElementById('story-detail-app')) document.getElementById('story-detail-app').classList.add('hidden');
            if(document.getElementById('auth-page')) document.getElementById('auth-page').classList.add('hidden');
            if(document.getElementById('add-building-view')) document.getElementById('add-building-view').classList.add('hidden');
            if(document.getElementById('building-management-page')) document.getElementById('building-management-page').classList.add('hidden');
            if(document.getElementById('ocr-extraction-view')) document.getElementById('ocr-extraction-view').classList.add('hidden');
            if(document.getElementById('admin-user-edit-app')) document.getElementById('admin-user-edit-app').classList.add('hidden');

            if (viewName === 'login') {
                document.getElementById('login-view').classList.remove('hidden');
            } else if (viewName === 'signup') {
                document.getElementById('signup-view').classList.remove('hidden');
            } else if (viewName === 'main-app') {
                document.getElementById('main-app').classList.remove('hidden');
            } else if (viewName === 'admin-users-app') {
                document.getElementById('admin-users-app').classList.remove('hidden');
            } else if (viewName === 'admin-user-edit-app') {
                document.getElementById('admin-user-edit-app').classList.remove('hidden');
            } else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');
            } else if (viewName === 'admin-app') {
                if(document.getElementById('admin-app')) {
                    document.getElementById('admin-app').classList.remove('hidden');
                    if (typeof loadAdminDashboardStats === 'function') {
                        loadAdminDashboardStats();
                    }
                }
            } else if (viewName === 'map-app') {
                document.getElementById('map-app').classList.remove('hidden');
            } else if (viewName === 'story-detail-app') {
                document.getElementById('story-detail-app').classList.remove('hidden');
            } else if (viewName === 'auth-page') {
                document.getElementById('auth-page').classList.remove('hidden');
                // 마이페이지 진입 시 DB 연동하여 최신 상태 확인
                if (supabaseClient) {
                    supabaseClient.auth.getSession().then(({ data: { session } }) => {
                        if (session) {
                            supabaseClient.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
                                if (profile) {
                                    globalUserRole = profile.role;
                                    supabaseClient.from('buildings').select('*').eq('owner_id', session.user.id).eq('is_verified', true).then(({ data: bData }) => {
                                        const isReallyAuth = profile.is_verified || (bData && bData.length > 0);
                                        isAuthenticated = isReallyAuth; // 전역 상태 업데이트
                                        renderAuthPage(profile, isReallyAuth, bData);
                                    });
                                }
                            });
                        }
                    });
                } else {
                    renderAuthPage({ name: document.getElementById('main-display-name').textContent.replace(' 님', '').trim() || '홍길동', phone: '010-1234-5678', role: globalUserRole }, isAuthenticated, ownerBuildings);
                }
                
                function renderAuthPage(profile, isAuth, buildings) {
                    if(document.getElementById('auth-choice-container')) {
                        document.getElementById('auth-choice-container').classList.remove('hidden');
                        
                        const nameInput = document.getElementById('common-edit-name');
                        nameInput.value = profile.name || '';
                        
                        if (isAuth) {
                            nameInput.readOnly = true;
                            nameInput.style.backgroundColor = '#edf2f7';
                            nameInput.style.cursor = 'not-allowed';
                            nameInput.title = '2차 인증이 완료되어 이름을 변경할 수 없습니다.';
                            
                            const label = nameInput.previousElementSibling;
                            if (label && !label.innerHTML.includes('fa-circle-check')) {
                                label.innerHTML += ' <span style="font-size: 11px; color: var(--point-orange); margin-left: 5px;"><i class="fa-solid fa-circle-check"></i> 인증됨</span>';
                            }
                        } else {
                            nameInput.readOnly = false;
                            nameInput.style.backgroundColor = '#f8fafc';
                            nameInput.style.cursor = 'text';
                            nameInput.title = '';
                        }
                        
                        document.getElementById('common-edit-phone').value = profile.phone || '010-1234-5678';

                        document.getElementById('auth-owner-form').classList.add('hidden');
                        document.getElementById('auth-tenant-form').classList.add('hidden');
                        
                        if (globalUserRole === 'owner') {
                            document.getElementById('auth-owner-form').classList.remove('hidden');
                            
                            if (isAuth) {
                                document.getElementById('auth-owner-form-content').classList.add('hidden');
                                document.getElementById('auth-owner-completed').classList.remove('hidden');
                                if (buildings && buildings.length > 0) {
                                    const bList = document.getElementById('auth-completed-buildings-list');
                                    bList.innerHTML = buildings.map((b) => {
                                        const verifiedBadge = (b.is_verified !== false) ? '<span style="font-size: 11px; background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; margin-left: 5px;"><i class="fa-solid fa-check"></i> 2차 인증 완료</span>' : '';
                                        return \`
                                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #edf2f7; text-align: left; margin-bottom: 10px;">
                                            <p style="font-size: 13px; color: #4a5568; margin: 0 0 5px 0;"><strong>등록 건물명:</strong> \${b.name || '-'} \${verifiedBadge}</p>
                                            <p style="font-size: 13px; color: #4a5568; margin: 0;"><strong>등록 주소:</strong> \${b.address || '-'}</p>
                                        </div>
                                        \`;
                                    }).join('');
                                }
                            } else {
                                document.getElementById('auth-owner-form-content').classList.remove('hidden');
                                document.getElementById('auth-owner-completed').classList.add('hidden');
                            }
                        } else {
                            document.getElementById('auth-tenant-form').classList.remove('hidden');
                        }
                    }
                }
            } else if (viewName === 'owner-app') {
                document.getElementById('owner-app').classList.remove('hidden');
                if (typeof isAuthenticated !== 'undefined' && isAuthenticated) {
                    renderOwnerBuildings();
                }
                loadInventory();
                checkPendingInvites();
                renderOwnerBuildings();
            } else if (viewName === 'add-building-view') {
                document.getElementById('add-building-view').classList.remove('hidden');
            } else if (viewName === 'tenant-app') {
                document.getElementById('tenant-app').classList.remove('hidden');
                checkTenantMatchStatus();
            } else if (viewName === 'building-management-page') {
                document.getElementById('building-management-page').classList.remove('hidden');
            } else if (viewName === 'ocr-extraction-view') {
                document.getElementById('ocr-extraction-view').classList.remove('hidden');
            }
        }

        function openStoryDetail(storyId) {
            showView('story-detail-app');
            setTimeout(() => {
                if (storyId) {
                    const el = document.getElementById(storyId);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    window.scrollTo(0, 0);
                }
            }, 100);
        }

        let globalUserRole = 'owner';

        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';

            if (!supabaseClient) {
                // 기존 모의 로직 (Supabase 연동 전 작동)
                const namePrefix = email.split('@')[0].toUpperCase();
                if (email.toLowerCase().includes('tenant')) {
                    globalUserRole = 'tenant';
                } else if (email.toLowerCase().includes('owner')) {
                    globalUserRole = 'owner';
                } else {
                    globalUserRole = 'owner'; 
                }
                document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                if (document.getElementById('auth-display-name')) {
                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                isAuthenticated = false;
                showView('main-app');
                return;
            }

            // Supabase 로그인 처리
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                showModalAlert('로그인 실패: ' + error.message);
                return;
            }

            if (data.user) {
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError || !profile) {
                    console.error('Profile fetch error:', profileError);
                    showModalAlert('프로필 조회 실패: ' + (profileError ? profileError.message : '데이터 없음'));
                    return;
                }

                globalUserRole = profile.role;
                const namePrefix = profile.name;
                
                document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                if (document.getElementById('auth-display-name')) {
                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                
                isAuthenticated = false; // 기본값
                
                // is_verified 처리 (관리자가 수동 승인한 경우)
                if (profile.is_verified) {
                    isAuthenticated = true;
                }

                // 임대인일 경우 등록된 건물 가져오기
                if (profile.role === 'owner') {
                    const { data: bData, error: bError } = await supabaseClient
                        .from('buildings')
                        .select('*')
                        .eq('owner_id', data.user.id);
                    
                    if (!bError && bData && bData.length > 0) {
                        ownerBuildings = bData;
                        markUserVerified(); // 건물이 있으면 2차 인증 완료로 처리
                    }
                }

                if (window.IS_ADMIN_ROUTE) {
                    if (profile.role === 'admin') {
                        showView('admin-app');
                        loadAdminUsers();
                        loadAdminBuildings();
                    } else {
                        showModalAlert('관리자 권한이 없습니다.');
                        showView('main-app');
                    }
                } else if (profile.role === 'admin') {
                    showView('admin-app');
                    loadAdminUsers();
                    loadAdminBuildings();
                } else if (isAuthenticated) {
                    showView(globalUserRole === 'owner' ? 'owner-app' : 'tenant-app');
                } else {
                    showView('main-app');
                }
            }
        }

        async function handleSignup(e) {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const name = document.getElementById('signup-name').value;
            const roleEl = document.querySelector('input[name="signup-role"]:checked');
            const role = roleEl ? roleEl.value : 'owner';

            if (!supabaseClient) {
                // 기존 모의 로직 (Supabase 연동 전 작동)
                globalUserRole = role;
                showModalAlert(name + '님, 가입이 완료되었습니다. 로그인해주세요.');
                showView('login');
                return;
            }

            // Supabase 회원가입 처리
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                showModalAlert('회원가입 실패: ' + error.message);
                return;
            }

            if (data.user) {
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .insert([{
                        id: data.user.id,
                        email: email,
                        name: name,
                        role: role
                    }]);

                if (profileError) {
                    showModalAlert('프로필 저장 실패: ' + profileError.message);
                    return;
                }
            }

            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
            showModalAlert(name + '님, 가입이 완료되었습니다. 로그인해주세요.');
            showView('login');
        }

        function handleLogout() {
            isAuthenticated = false;
            showView('login');
        }

        function authenticateRole(role) {
            markUserVerified(); // 인증 완료 상태로 전환
            if (role === 'owner') {
                showModalAlert('임대인 인증이 완료되었습니다.');
                showView('owner-app');
            } else if (role === 'tenant') {
                showModalAlert('임차인 인증이 완료되었습니다.');
                showView('tenant-app');
            }
        }

        function goToDashboard() {
            if (isAuthenticated) {
                showView(globalUserRole === 'owner' ? 'owner-app' : 'tenant-app');
            } else {
                showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
            }
        }

        let ownerBuildings = [];
        let ownerContractFile = null;

        function handleContractUpload(event) {
            const file = event.target.files[0];
            if (file) {
                ownerContractFile = file;
                const icon = document.getElementById('contract-upload-icon');
                const text = document.getElementById('contract-upload-text');
                const box = document.getElementById('contract-upload-box');
                
                icon.className = 'fa-solid fa-file-circle-check';
                icon.style.color = 'var(--point-orange)';
                text.innerHTML = '<strong style="color: var(--point-orange);">' + file.name + '</strong><br>파일이 첨부되었습니다.';
                box.style.borderColor = 'var(--point-orange)';
                box.style.backgroundColor = '#fffaf0';
            }
        }

        async function authenticateOwnerDetailed(event) {
            event.preventDefault();
            const sessionData = await supabaseClient.auth.getSession();
            const session = sessionData.data.session;
            if (!session) {
                showModalAlert('로그인이 필요합니다.');
                return;
            }

            const bName = document.getElementById('owner-building-name').value;
            const bAddr = document.getElementById('owner-building-address').value;
            const fileInput = document.getElementById('owner-contract-file');
            
            if (!bAddr) {
                showModalAlert('주소를 검색하여 입력해 주세요.');
                return;
            }
            if (!fileInput.files || fileInput.files.length === 0) {
                showModalAlert('임대차 계약서 이미지를 첨부해주세요.');
                return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async function(e) {
                const base64Data = e.target.result;
                const myName = document.getElementById('common-edit-name').value || document.getElementById('main-display-name').textContent.replace(' 님', '').trim() || '김임대';
                
                document.getElementById('loading-view').querySelector('h3').innerText = '계약서 정보를 분석 중입니다...';
                document.getElementById('loading-view').classList.remove('hidden');

                // Canvas를 활용한 이미지 전처리 (흑백 및 대비 극대화)
                const img = new Image();
                img.onload = async function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const MAX_WIDTH = 1500;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    
                    const threshold = 140; // 흑백화 임계값
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const v = (0.299 * r + 0.587 * g + 0.114 * b);
                        const color = v >= threshold ? 255 : 0;
                        data[i] = color;
                        data[i + 1] = color;
                        data[i + 2] = color;
                    }
                    
                    ctx.putImageData(imageData, 0, 0);

                    // 민감정보(주민등록번호) 마스킹 처리
                    if (window.Tesseract) {
                        try {
                            document.getElementById('loading-view').querySelector('h3').innerText = '개인정보 보호를 위해 마스킹 처리 중입니다...';
                            const worker = await Tesseract.createWorker('kor', 1, { logger: m => console.log(m) });
                            const ret = await worker.recognize(canvas.toDataURL('image/png'));
                            const juminRegex = /\d{6}\s*-\s*\d{1,7}/;
                            ret.data.words.forEach(word => {
                                if (juminRegex.test(word.text) || (word.text.includes('-') && /\d{6}/.test(word.text))) {
                                    const bbox = word.bbox;
                                    ctx.fillStyle = 'black';
                                    ctx.fillRect(bbox.x0 - 5, bbox.y0 - 5, (bbox.x1 - bbox.x0) + 10, (bbox.y1 - bbox.y0) + 10);
                                }
                            });
                            await worker.terminate();
                            document.getElementById('loading-view').querySelector('h3').innerText = '마스킹 완료! 계약서 정보를 분석 중입니다...';
                        } catch (e) {
                            console.error("마스킹 프로세스 오류:", e);
                        }
                    }

                    const preprocessedBase64 = canvas.toDataURL('image/png');

                    try {
                        const response = await fetch('/api/verify-contract-ocr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                imageBase64: preprocessedBase64,
                                ownerName: myName,
                                bAddr: bAddr
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (!response.ok || !result.success) {
                            document.getElementById('loading-view').classList.add('hidden');
                            document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                            showModalAlert(result.error || result.message || '인증 실패: 계약서 분석을 완료할 수 없습니다.');
                            return;
                        }

                        if (result.matched) {
                            let insertedData = [];
                            let targetBuildingId = null;
                            let tenantAddMsg = '';
                            const { data: existingBuildings } = await supabaseClient.from('buildings').select('*').eq('address', bAddr);
                            const existingBuilding = existingBuildings && existingBuildings.length > 0 ? existingBuildings[0] : null;
                            if (existingBuilding) {
                                const { data: updatedData, error: updateError } = await supabaseClient.from('buildings').update({is_verified: true}).eq('id', existingBuilding.id).select();
                                if (updateError) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                    showModalAlert('건물 인증 업데이트 실패: ' + updateError.message);
                                    return;
                                }
                                    insertedData = updatedData;
                                    targetBuildingId = existingBuilding.id;
                                    
                                    if (ownerBuildings) {
                                        const idx = ownerBuildings.findIndex(b => b.id === existingBuilding.id);
                                        if (idx !== -1) ownerBuildings[idx] = updatedData[0];
                                    }
                            } else {
                                const { data: newInserted, error: insertError } = await supabaseClient
                                    .from('buildings')
                                    .insert([{ owner_id: session.user.id, address: bAddr, name: bName, is_primary: true, floors: 1, is_verified: true }])
                                    .select();
                                    
                                if (insertError) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                    showModalAlert('건물 등록 실패: ' + insertError.message);
                                    return;
                                }
                                insertedData = newInserted;
                                targetBuildingId = newInserted[0].id;
                                if (!ownerBuildings) ownerBuildings = [];
                                ownerBuildings.push(...insertedData);
                            }
                            
                            // 기존의 자동 DB 등록을 제거하고, 15개 항목 추출 모달을 띄워 사용자가 검증하도록 변경합니다.
                            window.ocrTargetBuildingId = targetBuildingId;
                            
                            // 원본 이미지를 모달 이미지 뷰어에 등록 (이후 executeGeminiExtraction에서 사용)
                            const previewImage = document.getElementById('ocr-preview-img');
                            if (previewImage) {
                                previewImage.src = preprocessedBase64;
                            }
                            
                            document.getElementById('loading-view').classList.add('hidden');
                            showModalAlert('계약서 명의 및 주소 인증이 성공적으로 완료되었습니다.\\n[등록/인증건물: ' + bName + ']\\n\\n15개 항목 AI 자동 추출을 시작합니다.');
                            
                            // 15개 항목 확인 UI 모달(뷰) 열기
                            showView('ocr-extraction-view');
                            
                            // 자동 추출 실행
                            if (typeof executeGeminiExtraction === 'function') {
                                setTimeout(executeGeminiExtraction, 500); // UI 안정화 후 자동 실행
                            } else {
                                console.error('executeGeminiExtraction 함수를 찾을 수 없습니다.');
                            }
                            document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';

                            markUserVerified();
                            showModalAlert('계약서 인증이 성공적으로 완료되었습니다.\\n[등록/인증건물: ' + bName + ']' + tenantAddMsg);
                            showView('owner-app');
                        } else {
                            document.getElementById('loading-view').classList.add('hidden');
                            document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                            showModalAlert('인증 실패: 계약서에서 회원님의 이름(' + myName + ') 또는 건물 주소를 명확히 찾을 수 없습니다.');
                        }
                    } catch (error) {
                        console.error(error);
                        document.getElementById('loading-view').classList.add('hidden');
                        document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                        showModalAlert('OCR 분석 중 오류가 발생했습니다: ' + error.message);
                    }
                };
                img.src = base64Data;
            };
            reader.readAsDataURL(file);
        }

        function initDragAndDrop() {
            const dropZone = document.getElementById('drag-drop-zone');
            const fileInput = document.getElementById('owner-contract-file');
            const fileNameDisplay = document.getElementById('drag-drop-file-name');
            const dropIcon = document.getElementById('drag-drop-icon');
            const dropText = document.getElementById('drag-drop-text');

            if (!dropZone || !fileInput) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.style.borderColor = 'var(--point-orange)';
                    dropZone.style.backgroundColor = '#fffaf0';
                    dropIcon.style.color = 'var(--point-orange)';
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.style.borderColor = '#cbd5e0';
                    dropZone.style.backgroundColor = '#f8fafc';
                    dropIcon.style.color = '#a0aec0';
                }, false);
            });

            dropZone.addEventListener('drop', (e) => {
                let dt = e.dataTransfer;
                let files = dt.files;
                if (files && files.length > 0) {
                    fileInput.files = files;
                    updateFileDisplay(files[0]);
                }
            }, false);

            fileInput.addEventListener('change', function() {
                if (this.files && this.files.length > 0) {
                    updateFileDisplay(this.files[0]);
                }
            });

            function updateFileDisplay(file) {
                dropIcon.className = 'fa-solid fa-file-circle-check';
                dropIcon.style.color = 'var(--point-orange)';
                dropText.innerHTML = '<strong style="color: var(--point-orange);">' + file.name + '</strong>';
                fileNameDisplay.innerText = '파일이 정상적으로 첨부되었습니다.';
                dropZone.style.borderColor = 'var(--point-orange)';
                dropZone.style.backgroundColor = '#fffaf0';
            }
        }
        
        // 스크립트가 실행될 때 초기화 (문서 파싱 후)
        document.addEventListener('DOMContentLoaded', initDragAndDrop);
        // 만약 이미 로드되었다면 즉시 실행
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            initDragAndDrop();
        }


        function renderOwnerBuildings() {
            const list = document.getElementById('owner-buildings-list');
            if (!list) return;
            
            if (ownerBuildings.length === 0) {
                list.innerHTML = '<p style="font-size: 13px; color: #718096; text-align: center; padding: 20px;">등록된 건물이 없습니다.</p>';
                return;
            }
            
            list.innerHTML = ownerBuildings.map(function(b, idx) {
                var badge = (b.isPrimary || b.is_primary) ? '<span style="font-size: 11px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #4a5568; margin-left: 5px;">대표 건물</span>' : '';
                var verifiedBadge = b.is_verified ? '<span style="font-size: 11px; background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; margin-left: 5px;"><i class="fa-solid fa-check"></i> 2차 인증 완료</span>' : '<span style="font-size: 11px; background: #fff5f5; color: #e53e3e; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">미인증</span>';
                
                // 매칭된 임차인 가져오기 (이 건물의 주소와 일치하는 임차인)
                const matchedTenantsForBuilding = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).filter(function(m) { return m.address === b.address; });
                
                let allRoomsMap = {};
                if (b.rooms && b.rooms.length > 0) {
                    b.rooms.forEach(function(r) {
                        allRoomsMap[r.roomNumber] = r.type;
                    });
                }
                matchedTenantsForBuilding.forEach(function(m) {
                    if (!allRoomsMap[m.room]) {
                        allRoomsMap[m.room] = '미지정';
                    }
                });
                
                const allRoomKeys = Object.keys(allRoomsMap);
                var roomsHtml = '';
                if (allRoomKeys.length > 0) {
                    roomsHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #edf2f7; font-size: 12px; color: #4a5568;">' +
                                '<strong>호실 및 임차인 현황:</strong><br>' +
                                allRoomKeys.map(function(roomNum) {
                                    const matched = matchedTenantsForBuilding.find(function(m) { return m.room === roomNum; });
                                    const badge = matched ? '<span style="color:#319795; font-weight:bold; margin-left:4px;">[' + matched.tenantName + ' 입주중]</span>' : '';
                                    const typeStr = allRoomsMap[roomNum] === '미지정' ? '' : ' (' + allRoomsMap[roomNum] + ')';
                                    return '<span style="display: inline-block; background: #f7fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; margin-right: 5px; margin-top: 5px;">' +
                                           '<i class="fa-solid fa-door-closed" style="color:#a0aec0; margin-right:3px;"></i>' + roomNum + typeStr + badge +
                                           '</span>';
                                }).join('') +
                                '</div>';
                } else {
                    roomsHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #edf2f7; font-size: 12px; color: #a0aec0;">' +
                                '등록된 호실 및 매칭된 임차인이 없습니다.' +
                                '</div>';
                }

                return '<div style="padding: 15px; border: 1px solid #edf2f7; border-radius: 8px; margin-bottom: 10px; background: white; position: relative;">' +
                       '<div style="display: flex; justify-content: space-between; align-items: start;">' +
                       '<div>' +
                       '<h4 style="font-size: 14px; color: var(--primary-deep-navy); margin-bottom: 5px;">' +
                       b.name + ' ' + badge + ' ' + verifiedBadge + 
                       '</h4>' +
                       '<p style="font-size: 12px; color: #718096;">' + b.address + '</p>' +
                       '</div>' +
                       '<div style="position: relative;">' +
                       '<button onclick="toggleBuildingMenu(' + idx + ', event)" style="background: none; border: none; color: #a0aec0; cursor: pointer; padding: 5px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>' +
                       '<div id="building-menu-' + idx + '" class="hidden" style="position: absolute; right: 0; top: 25px; background: white; border: 1px solid #edf2f7; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 80px; z-index: 10; overflow: hidden;">' +
                       '<button onclick="openBuildingManagementPage(' + idx + '); document.getElementById(\\\'building-menu-' + idx + '\\\').classList.add(\\\'hidden\\\');" style="display: block; width: 100%; text-align: left; padding: 10px; border: none; background: none; font-size: 13px; color: #4a5568; cursor: pointer; border-bottom: 1px solid #edf2f7;">수정</button>' +
                       '<button onclick="deleteBuildingFromPage(' + idx + '); document.getElementById(\\\'building-menu-' + idx + '\\\').classList.add(\\\'hidden\\\');" style="display: block; width: 100%; text-align: left; padding: 10px; border: none; background: none; font-size: 13px; color: #e53e3e; cursor: pointer;">삭제</button>' +
                       '</div>' +
                       '</div>' +
                       '</div>' +
                       roomsHtml +
                       '</div>';
            }).join('');
        }

        function toggleBuildingMenu(idx, event) {
            event.stopPropagation();
            const menu = document.getElementById('building-menu-' + idx);
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('[id^="building-menu-"]').forEach(el => el.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        }
        
        document.addEventListener('click', function(e) {
            if (!e.target.closest('[id^="building-menu-"]') && !e.target.closest('button[onclick^="toggleBuildingMenu"]')) {
                document.querySelectorAll('[id^="building-menu-"]').forEach(el => el.classList.add('hidden'));
            }
        });

        function openBuildingManagementPage(idx) {
            const b = ownerBuildings[idx];
            showView('building-management-page');
            const content = document.getElementById('building-management-content');
            
            content.innerHTML = '<div class="card" style="border-top: 4px solid var(--primary-light-blue);">' +
                '<div class="card-title" style="margin-bottom: 25px;"><i class="fa-solid fa-building"></i> 건물 상세 관리</div>' +
                '<div class="form-group">' +
                    '<label>건물명</label>' +
                    '<input type="text" id="bm-name" class="form-control" value="' + b.name + '">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>건물 주소</label>' +
                    '<input type="text" id="bm-addr" class="form-control" value="' + b.address + '" readonly style="background: #e2e8f0;">' +
                    '<p style="font-size: 11px; color: #718096; margin-top: 4px;">주소는 인증된 정보로 직접 수정할 수 없습니다.</p>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>총 층수</label>' +
                    '<input type="number" id="bm-floors" class="form-control" value="' + (b.floors || 1) + '" min="1">' +
                '</div>' +
                '<div style="display: flex; gap: 10px; margin-top: 20px;">' +
                    '<button class="btn btn-orange" style="flex: 1; justify-content: center;" onclick="saveBuildingManagement(' + idx + ')">변경사항 저장</button>' +
                    '<button class="btn" style="flex: 1; justify-content: center; background: #e2e8f0; color: #4a5568;" onclick="setPrimaryBuildingFromPage(' + idx + ')">대표 건물로 지정</button>' +
                '</div>' +
                '<div style="margin-top: 20px; text-align: right;">' +
                    '<button class="btn" style="background: #e53e3e; color: white; border: none; font-size: 13px; padding: 8px 16px;" onclick="deleteBuildingFromPage(' + idx + ')">건물 삭제</button>' +
                '</div>' +
            '</div>' +
            '<div class="card" style="margin-top: 20px;">' +
                '<div class="card-title"><i class="fa-solid fa-door-open"></i> 호실 관리</div>' +
                '<div style="display: flex; gap: 10px; margin-bottom: 20px;">' +
                    '<input type="text" id="bm-add-room-num" class="form-control" placeholder="호실 번호 (예: 101호)" style="margin: 0; flex: 2;">' +
                    '<select id="bm-add-room-type" class="form-control" style="margin: 0; flex: 1;">' +
                        '<option value="원룸">원룸</option>' +
                        '<option value="투룸">투룸</option>' +
                    '</select>' +
                    '<button onclick="addRoomFromPage(' + idx + ')" class="btn btn-orange" style="white-space: nowrap;">호실 추가</button>' +
                '</div>' +
                '<div id="bm-room-list"></div>' +
            '</div>';
            renderRoomList(idx);
        }

        function renderRoomList(idx) {
            const b = ownerBuildings[idx];
            const list = document.getElementById('bm-room-list');
            if (!b.rooms || b.rooms.length === 0) {
                list.innerHTML = '<p style="color: #a0aec0; font-size: 13px;">등록된 호실이 없습니다.</p>';
                return;
            }
            list.innerHTML = b.rooms.map(function(r, rIdx) {
                const matched = activeTenantsData.find(function(m) { return m.room === r.roomNumber && m.address === b.address; });
                const badge = matched ? '<span style="background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; border: 1px solid #b2f5ea;"><i class="fa-solid fa-user-check"></i> 입주: ' + matched.tenantName + '</span>' : '';
                
                const actionButtons = matched ? 
                    '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + ')" style="background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold; font-size: 12px;">삭제</button>' :
                    '<button onclick="openManualTenantModal(' + idx + ', ' + rIdx + ')" style="background: none; border: 1px solid #3182ce; border-radius: 4px; padding: 2px 8px; color: #3182ce; cursor: pointer; font-size: 11px; margin-right: 8px;">수동 등록</button>' +
                    '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + ')" style="background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold; font-size: 12px;">삭제</button>';

                return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; background: #f8fafc;">' +
                    '<span><strong style="color: var(--primary-deep-navy);">' + r.roomNumber + '</strong> <span style="font-size: 12px; color: #718096;">(' + r.type + ')</span>' + badge + '</span>' +
                    '<div>' + actionButtons + '</div>' +
                '</div>';
            }).join('');
        }

        function openManualTenantModal(bIdx, rIdx) {
            const b = ownerBuildings[bIdx];
            const roomNum = b.rooms[rIdx].roomNumber;
            document.getElementById('mt-room-display').innerText = roomNum;
            document.getElementById('mt-building-id').value = b.id || '';
            document.getElementById('mt-building-address').value = b.address;
            document.getElementById('mt-room-number').value = roomNum;
            
            // 초기화
            document.getElementById('mt-name').value = '';
            document.getElementById('mt-phone').value = '';
            document.getElementById('mt-start').value = '';
            document.getElementById('mt-end').value = '';
            document.getElementById('mt-file').value = '';

            document.getElementById('manual-tenant-modal').classList.remove('hidden');
        }

        function closeManualTenantModal() {
            document.getElementById('manual-tenant-modal').classList.add('hidden');
        }

        async function submitManualTenant() {
            const bId = document.getElementById('mt-building-id').value;
            const bAddr = document.getElementById('mt-building-address').value;
            const rNum = document.getElementById('mt-room-number').value;
            const tName = document.getElementById('mt-name').value;
            const tPhone = document.getElementById('mt-phone').value;
            const sDate = document.getElementById('mt-start').value;
            const eDate = document.getElementById('mt-end').value;

            if (!tName) {
                showModalAlert('임차인 이름을 입력해주세요.');
                return;
            }

            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (!session) {
                        showModalAlert('로그인이 필요합니다.');
                        return;
                    }

                    // Base64 파일 변환 (선택적)
                    let fileBase64 = null;
                    const fileInput = document.getElementById('mt-file');
                    if (fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        const reader = new FileReader();
                        fileBase64 = await new Promise((resolve) => {
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(file);
                        });
                    }

                    const payload = {
                        owner_id: session.user.id,
                        address: bAddr,
                        room_number: rNum,
                        status: 'manual',
                        tenant_name: tName,
                        tenant_phone: tPhone,
                        start_date: sDate || null,
                        end_date: eDate || null,
                        contract_url: fileBase64 // 단순 텍스트 컬럼에 임시 저장
                    };

                    const { error } = await supabaseClient.from('contracts').insert([payload]);
                    if (error) {
                        console.error('수동 등록 실패:', error);
                        showModalAlert('DB 저장 실패: ' + error.message + '\\n\\n(참고: contracts 테이블에 tenant_name 등의 추가 컬럼이 반영되어 있어야 합니다.)');
                        return;
                    }
                } catch(e) {
                    console.error(e);
                    showModalAlert('오류가 발생했습니다.');
                    return;
                }
            }
            
            showModalAlert(tName + ' 님의 정보가 수동으로 등록되었습니다.');
            closeManualTenantModal();
            loadActiveTenants(); // 목록 갱신
        }

        async function saveBuildingManagement(idx) {
            const newName = document.getElementById('bm-name').value;
            const newFloors = parseInt(document.getElementById('bm-floors').value) || 1;
            const b = ownerBuildings[idx];

            if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
                try {
                    const { error } = await supabaseClient.from('buildings')
                        .update({ name: newName, floors: newFloors })
                        .eq('id', b.id);
                    if (error) {
                        console.error("DB 수정 실패", error);
                        showModalAlert('DB 수정 실패: ' + error.message);
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    showModalAlert('오류가 발생했습니다.');
                    return;
                }
            }

            b.name = newName;
            b.floors = newFloors;
            showModalAlert('건물 정보가 성공적으로 수정되었습니다.');
            renderOwnerBuildings();
        }

        async function setPrimaryBuildingFromPage(idx) {
            const targetBuilding = ownerBuildings[idx];
            
            if (typeof supabaseClient !== 'undefined' && supabaseClient && targetBuilding.id) {
                try {
                    // 기존 대표 건물 해제
                    const prevPrimary = ownerBuildings.find(b => b.isPrimary || b.is_primary);
                    if (prevPrimary && prevPrimary.id !== targetBuilding.id) {
                        await supabaseClient.from('buildings').update({ is_primary: false }).eq('id', prevPrimary.id);
                    }
                    
                    // 새 대표 건물 지정
                    const { error } = await supabaseClient.from('buildings').update({ is_primary: true }).eq('id', targetBuilding.id);
                    if (error) {
                        console.error("DB 대표건물 설정 실패", error);
                        showModalAlert('DB 수정 실패: ' + error.message);
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    showModalAlert('오류가 발생했습니다.');
                    return;
                }
            }

            ownerBuildings.forEach(b => {
                b.isPrimary = false;
                b.is_primary = false;
            });
            targetBuilding.isPrimary = true;
            targetBuilding.is_primary = true;
            showModalAlert('대표 건물로 지정되었습니다.');
            renderOwnerBuildings();
        }

        function deleteBuildingFromPage(idx) {
            showModalConfirm('정말로 이 건물을 삭제하시겠습니까? 삭제 시 복구할 수 없습니다.', async function(confirmed) {
                if (confirmed) {
                    const b = ownerBuildings[idx];
                    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                        try {
                            const { error } = await supabaseClient.from('buildings').delete().eq('id', b.id);
                            if (error) {
                                console.error("DB 삭제 실패", error);
                                showModalAlert('DB 삭제 실패: ' + error.message + ' (Supabase RLS DELETE 정책을 확인해주세요.)');
                                return;
                            }
                        } catch (e) {
                            console.error(e);
                            showModalAlert('오류가 발생했습니다.');
                            return;
                        }
                    }
                    const wasPrimary = b.isPrimary;
                    ownerBuildings.splice(idx, 1);
                    if (wasPrimary && ownerBuildings.length > 0) {
                        ownerBuildings[0].isPrimary = true;
                    }
                    showModalAlert('건물이 삭제되었습니다.');
                    renderOwnerBuildings();
                    
                    // 건물이 모두 삭제된 경우
                    if (ownerBuildings.length === 0) {
                        isAuthenticated = false; // 인증 초기화 처리
                    }
                    showView('owner-app');
                }
            });
        }

        function addRoomFromPage(idx) {
            const num = document.getElementById('bm-add-room-num').value;
            const type = document.getElementById('bm-add-room-type').value;
            if (!num) return showModalAlert('호실 번호를 입력해주세요.');
            if (!ownerBuildings[idx].rooms) ownerBuildings[idx].rooms = [];
            ownerBuildings[idx].rooms.push({ roomNumber: num, type: type });
            document.getElementById('bm-add-room-num').value = '';
            renderRoomList(idx);
            renderOwnerBuildings();
        }

        function deleteRoomFromPage(bIdx, rIdx) {
            ownerBuildings[bIdx].rooms.splice(rIdx, 1);
            renderRoomList(bIdx);
            renderOwnerBuildings();
        }

        function authenticateTenantDetailed(event) {
            event.preventDefault();
            markUserVerified();
            showModalAlert('임대인에게 인증 코드를 발송했습니다. 승인 시 최종 인증이 완료됩니다.');
            showView('tenant-app');
        }


        function handleWriteStory() {
            if (!isAuthenticated) {
                showModalAlert('2차 인증(임대인/임차인) 완료 후 방 등록이 가능합니다.');
                return;
            }
            showModalAlert('방 등록 기능은 준비 중입니다.');
        }

        function handleCommentSubmit() {
            if (!isAuthenticated) {
                showModalAlert('2차 인증(임대인/임차인) 완료 후 댓글 작성이 가능합니다.');
                return;
            }
            showModalAlert('댓글이 성공적으로 등록되었습니다!');
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
                showModalAlert('임대인 ' + ownerName + '님에게 매칭 및 가입 유도 알림톡 초대가 성공적으로 발송되었습니다!');
                document.getElementById('invite-owner-name').value = '';
                document.getElementById('invite-owner-phone').value = '';
                document.getElementById('invite-room').value = '';
            });
        }

        // 임대인의 보류 중인 임차인 매칭 요청 목록 로드
        async function loadActiveTenants() {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session) {
                        const { data, error } = await supabaseClient
                            .from('contracts')
                            .select('*')
                            .eq('owner_id', session.user.id)
                            .in('status', ['matched', 'manual']);
                        
                        if (!error && data) {
                            // Map Supabase fields to frontend fields
                            activeTenantsData = data.map(d => ({
                                id: d.id,
                                tenantName: d.tenant_name || '이름 없음',
                                room: d.room_number,
                                address: d.address,
                                isManual: d.status === 'manual',
                                roomStatus: d.room_status || '공실',
                                tenantPhone: d.tenant_phone || ''
                            }));
                        }
                    }
                } catch(e) { console.error(e); }
            } else {
                // Fallback to mock API if no Supabase
                try {
                    const res = await fetch('/api/matched-tenants');
                    const data = await res.json();
                    activeTenantsData = data;
                } catch(e) { console.error(e); }
            }

            const data = (activeTenantsData || []).filter(function(d) { return d.roomStatus === '입주중'; });
            const section = document.getElementById('active-tenants-section');
            if (data.length === 0) {
                section.innerHTML = '';
                return;
            }
            section.innerHTML = '<div class="card" style="border-top: 4px solid #3182ce;">' +
                '<div class="card-title" style="margin-bottom: 15px;"><i class="fa-solid fa-users"></i> 현재 관리 중인 임차인</div>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">' +
                data.map(function(m) {
                    const phoneInfo = m.tenantPhone ? '<div style="font-size: 12px; color: #718096; margin-top: 4px;">' + m.tenantPhone + '</div>' : '';
                    return '<div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">' +
                        '<div>' +
                        '<div style="font-size: 14px; font-weight: bold; color: var(--primary-deep-navy);"><span style="font-size: 11px; font-weight: bold; background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">' + m.room + '</span>' + m.tenantName + '</div>' +
                        phoneInfo +
                        '</div>' +
                        '<button class="btn" style="padding: 6px 12px; font-size: 12px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="showModalAlert(&quot;채널 연결 준비 중입니다.&quot;)">메시지</button>' +
                    '</div>';
                }).join('') +
                '</div></div>';
            
            // 건물 목록 다시 렌더링하여 배지 업데이트
            renderOwnerBuildings();
        }

        function checkPendingInvites() {
            loadActiveTenants();
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
                showModalAlert('임차인 매칭 승인이 완료되어 계약 공간이 동기화되었습니다!');
                checkPendingInvites();
            });
        }

        function checkTenantMatchStatus() {
            const tenantName = document.getElementById('tenant-display-name').innerText.trim();
            fetch('/api/tenant-status?name=' + encodeURIComponent(tenantName))
                .then(res => res.json())
                .then(data => {
                    const unmatchedView = document.getElementById('tenant-unmatched-view');
                    const matchedView = document.getElementById('tenant-matched-view');
                    if (data.matched) {
                        unmatchedView.classList.add('hidden');
                        matchedView.classList.remove('hidden');
                        document.getElementById('matched-owner-name').innerText = data.info.ownerName;
                        document.getElementById('matched-owner-phone').innerText = data.info.ownerPhone;
                        document.getElementById('matched-room').innerText = data.info.room;
                    } else {
                        unmatchedView.classList.remove('hidden');
                        matchedView.classList.add('hidden');
                    }
                });
        }

        function handleComplaintSubmit(e) {
            e.preventDefault();
            showModalAlert('민원이 성공적으로 접수되었습니다. 임대인에게 알림이 발송됩니다.');
            document.getElementById('complaint-title').value = '';
            document.getElementById('complaint-desc').value = '';
        }

        function handleAddBuildingFileChange(event) {
            const dropText = document.getElementById('drag-drop-text-add');
            const dropIcon = document.getElementById('drag-drop-icon-add');
                            if (event.target.files.length > 0) {
                                dropText.innerText = event.target.files[0].name;
                                dropIcon.className = "fa-solid fa-file-circle-check";
                                dropIcon.style.color = "var(--primary-light-blue)";
                            } else {
                                dropText.innerText = "클릭하거나 이미지를 드래그하여 업로드하세요";
                                dropIcon.className = "fa-solid fa-cloud-arrow-up";
                                dropIcon.style.color = "#a0aec0";
                            }
                        }

                        async function submitAddBuilding(event) {
                            event.preventDefault();
                            const submitBtn = event.target.querySelector('button[type="submit"]');
                            if (submitBtn) {
                                if (submitBtn.disabled) return;
                                submitBtn.disabled = true;
                            }

                            const bAddr = document.getElementById('add-building-address').value.trim();
                            const bName = document.getElementById('add-building-name').value.trim();
                            const fileInput = document.getElementById('add-building-file');

                            if (!bAddr || !bName) {
                                showModalAlert('주소와 건물명을 입력해주세요.');
                                if (submitBtn) submitBtn.disabled = false;
                                return;
                            }
                            if (!fileInput.files[0]) {
                                showModalAlert('소유권 증빙 서류를 첨부해주세요.');
                                if (submitBtn) submitBtn.disabled = false;
                                return;
                            }

                            document.getElementById('loading-view').classList.remove('hidden');
                            document.getElementById('loading-view').querySelector('h3').innerText = '계약서 OCR 대조 중...';

                            try {
                                // 시뮬레이션 지연 (2초)
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                if (!supabaseClient) {
                                    const isDuplicate = ownerBuildings.some(b => b.address.replace(/\s+/g, '') === bAddr.replace(/\s+/g, ''));
                                    if (isDuplicate) {
                                        document.getElementById('loading-view').classList.add('hidden');
                                        showModalAlert('이미 동일한 주소지로 등록된 건물이 존재합니다.');
                                        if (submitBtn) submitBtn.disabled = false;
                                        return;
                                    }
                                    const newBuilding = { name: bName, address: bAddr, isPrimary: ownerBuildings.length === 0, floors: 1, rooms: [] };
                                    ownerBuildings.push(newBuilding);
                                    document.getElementById('loading-view').classList.add('hidden');
                                    document.getElementById('loading-view').querySelector('h3').innerText = '데이터를 처리 중입니다...';
                                    showModalAlert('새 건물 추가가 완료되었습니다.\\n[추가된 건물: ' + bName + ']');
                                    renderOwnerBuildings();
                                    showView('owner-app');
                                    
                                    document.getElementById('add-building-address').value = '';
                                    document.getElementById('add-building-name').value = '';
                                    fileInput.value = '';
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                const { data: { session } } = await supabaseClient.auth.getSession();
                                if (!session) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('로그인 세션이 없습니다.');
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                // 중복 검사 로직
                                const { data: existingBuildings, error: checkError } = await supabaseClient
                                    .from('buildings')
                                    .select('address')
                                    .eq('owner_id', session.user.id);

                                if (checkError) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('중복 검사 중 오류가 발생했습니다.');
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                const isSupaDuplicate = existingBuildings && existingBuildings.some(b => b.address.replace(/\s+/g, '') === bAddr.replace(/\s+/g, ''));

                                if (isSupaDuplicate) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('이미 동일한 주소지로 등록된 건물이 존재합니다.');
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                const { data: insertedData, error } = await supabaseClient
                                    .from('buildings')
                                    .insert([{ owner_id: session.user.id, address: bAddr, name: bName, is_primary: ownerBuildings.length === 0, floors: 1, is_verified: true }])
                                    .select();

                                document.getElementById('loading-view').classList.add('hidden');
                                document.getElementById('loading-view').querySelector('h3').innerText = '데이터를 처리 중입니다...';

                                if (error) {
                                    showModalAlert('건물 등록 실패: ' + error.message);
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                if (!ownerBuildings) ownerBuildings = [];
                                ownerBuildings.push(...insertedData);
                                
                                showModalAlert('새 건물 추가가 완료되었습니다.\\n[추가된 건물: ' + bName + ']');
                                renderOwnerBuildings();
                                showView('owner-app');

                                document.getElementById('add-building-address').value = '';
                                document.getElementById('add-building-name').value = '';
                                fileInput.value = '';
                            } catch (error) {
                                document.getElementById('loading-view').classList.add('hidden');
                                document.getElementById('loading-view').querySelector('h3').innerText = '데이터를 처리 중입니다...';
                                showModalAlert('인증 중 오류가 발생했습니다: ' + error.message);
                            }
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

        let apiSigunguCd = '';
        let apiBjdongCd = '';
        let apiPlatGbCd = '0';
        let apiBun = '';
        let apiJi = '';

        function execDaumPostcode() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('owner-building-address').value = data.address;
                    if (data.buildingName && data.buildingName !== '') {
                        document.getElementById('owner-building-name').value = data.buildingName;
                    }
                    
                    // API 연동을 위한 코드 추출 로직
                    if (data.bcode && data.bcode.length === 10) {
                        apiSigunguCd = data.bcode.substring(0, 5);
                        apiBjdongCd = data.bcode.substring(5, 10);
                    }
                    
                    const jibunStr = data.jibunAddress || data.autoJibunAddress || '';
                    if (jibunStr.includes('산 ')) {
                        apiPlatGbCd = '1';
                    } else {
                        apiPlatGbCd = '0';
                    }
                    
                    // 지번 추출 (마지막 덩어리가 보통 "10-227" 형태)
                    const tokens = jibunStr.split(' ');
                    const lastToken = tokens[tokens.length - 1];
                    if (lastToken) {
                        const parts = lastToken.split('-');
                        apiBun = parts[0].padStart(4, '0');
                        apiJi = (parts.length > 1 ? parts[1] : '0').padStart(4, '0');
                    }
                }
            }).open();
        }

        function execDaumPostcodeForTenant() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('tenant-search-address').value = data.address;
                    document.getElementById('tenant-registered-section').classList.add('hidden');
                    document.getElementById('tenant-unregistered-section').classList.add('hidden');
                }
            }).open();
        }

        let currentFoundOwnerName = '';

        function searchBuildingForTenant() {
            const address = document.getElementById('tenant-search-address').value;
            const room = document.getElementById('tenant-search-room').value;
            if (!address) {
                showModalAlert('주소를 먼저 검색해주세요.');
                return;
            }
            if (!room) {
                showModalAlert('호실을 입력해주세요.');
                return;
            }

            fetch('/api/search-building?address=' + encodeURIComponent(address))
                .then(res => res.json())
                .then(data => {
                    if (data.isRegistered) {
                        currentFoundOwnerName = '대표'; // 실제로는 data.building의 소유자명을 사용해야 하지만 데모용이므로 하드코딩
                        document.getElementById('tenant-found-owner-name').innerText = currentFoundOwnerName;
                        document.getElementById('tenant-registered-section').classList.remove('hidden');
                        document.getElementById('tenant-unregistered-section').classList.add('hidden');
                    } else {
                        document.getElementById('tenant-registered-section').classList.add('hidden');
                        document.getElementById('tenant-unregistered-section').classList.remove('hidden');
                    }
                });
        }

        function requestAuthToOwner() {
            const address = document.getElementById('tenant-search-address').value;
            const room = document.getElementById('tenant-search-room').value;
            const tenantName = document.getElementById('common-edit-name').value || '임차인';

            fetch('/api/invite-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantName: tenantName,
                    address: address,
                    room: room,
                    ownerName: currentFoundOwnerName
                })
            }).then(() => {
                markUserVerified();
                showModalAlert('임대인에게 성공적으로 인증 요청을 발송했습니다!\\n임대인이 승인하면 대시보드에서 계약 정보가 연동됩니다.');
                showView('tenant-app');
            });
        }

        function sendInviteToOwner() {
            const phone = document.getElementById('tenant-invite-phone').value;
            if (!phone) {
                showModalAlert('임대인 전화번호를 입력해주세요.');
                return;
            }
            markUserVerified();
            showModalAlert(phone + ' 번호로 모두의 방 가입 초대 문자가 발송되었습니다!\\n임대인이 가입하시면 추후 자동으로 연동 신청이 가능합니다.');
            showView('tenant-app');
        }
        let adminUsersData = [];

        async function loadAdminUsers() {\n            loadGeminiKeyIntoAdmin();
            if (!supabaseClient) return;
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                showModalAlert('회원 목록 조회 실패: ' + error.message);
                return;
            }
            adminUsersData = data || [];
            filterAdminUsers();
        }

        function filterAdminUsers() {
            const startDate = document.getElementById('admin-filter-start').value;
            const endDate = document.getElementById('admin-filter-end').value;
            const role = document.getElementById('admin-filter-role').value;

            let filtered = adminUsersData;

            if (startDate) {
                const sDate = new Date(startDate.replace(/\\./g, '-'));
                filtered = filtered.filter(u => new Date(u.created_at) >= sDate);
            }
            if (endDate) {
                const end = new Date(endDate.replace(/\\./g, '-'));
                end.setHours(23, 59, 59, 999);
                filtered = filtered.filter(u => new Date(u.created_at) <= end);
            }
            if (role) {
                filtered = filtered.filter(u => u.role === role);
            }

            renderAdminUsers(filtered);
        }

        function renderAdminUsers(users) {
            const list = document.getElementById('admin-users-list');
            if (users.length === 0) {
                list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #a0aec0;">조회된 회원이 없습니다.</td></tr>';
                return;
            }

            list.innerHTML = users.map(u => {
                const dateStr = new Date(u.created_at).toLocaleDateString();
                const roleBadge = u.role === 'owner' ? '<span style="background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">임대인</span>' :
                                  u.role === 'tenant' ? '<span style="background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; font-size: 11px;">임차인</span>' :
                                  '<span style="background: #fed7d7; color: #c53030; padding: 2px 6px; border-radius: 4px; font-size: 11px;">관리자</span>';
                
                const verifyBtnClass = u.is_verified ? 'btn-orange' : 'btn';
                const verifyBtnText = u.is_verified ? '인증됨' : '미인증';
                
                let actionHtml = '';
                if (u.role === 'admin') {
                    actionHtml = \`<button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openUserEditPage('\${u.id}')">수정</button>\`;
                } else if (u.role === 'owner') {
                    actionHtml = \`
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568; margin-right: 4px;" onclick="toggleOwnerBuildings('\${u.id}', this)"><i class="fa-solid fa-building"></i> 건물</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openUserEditPage('\${u.id}')">수정</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;" onclick="deleteAdminUser('\${u.id}')">삭제</button>
                    \`;
                } else {
                    actionHtml = \`
                        <button class="\${verifyBtnClass}" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="toggleVerification('\${u.id}', \${u.is_verified})">\${verifyBtnText}</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openUserEditPage('\${u.id}')">수정</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;" onclick="deleteAdminUser('\${u.id}')">삭제</button>
                    \`;
                }
                
                return \`
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 8px;">\${u.name}</td>
                        <td style="padding: 12px 8px;">\${u.email}</td>
                        <td style="padding: 12px 8px;">\${u.phone || '-'}</td>
                        <td style="padding: 12px 8px;">\${roleBadge}</td>
                        <td style="padding: 12px 8px; text-align: center;">\${dateStr}</td>
                        <td style="padding: 12px 8px; text-align: center;">
                            \${actionHtml}
                        </td>
                    </tr>
                \`;
            }).join('');
        }

        async function toggleOwnerBuildings(ownerId, btnEl) {
            const tr = btnEl.closest('tr');
            const nextTr = tr.nextElementSibling;
            
            // 이미 확장되어 있으면 닫기
            if (nextTr && nextTr.id === 'buildings-row-' + ownerId) {
                nextTr.remove();
                return;
            }
            
            // 기존에 열려있는 다른 건물 목록들 닫기 (원치 않으면 이 블록 삭제)
            // document.querySelectorAll('tr[id^="buildings-row-"]').forEach(el => el.remove());

            // 로딩 표시용 행 추가
            const loadingTr = document.createElement('tr');
            loadingTr.id = 'buildings-row-' + ownerId;
            loadingTr.innerHTML = '<td colspan="6" style="padding: 15px; background: #f8fafc; text-align: center; color: #718096; font-size: 12px;"><i class="fa-solid fa-spinner fa-spin"></i> 건물 정보를 불러오는 중...</td>';
            tr.parentNode.insertBefore(loadingTr, nextTr);

            try {
                const { data: bldgs, error } = await supabaseClient
                    .from('buildings')
                    .select('*')
                    .eq('owner_id', ownerId);
                    
                if (error) throw error;
                
                if (!bldgs || bldgs.length === 0) {
                    loadingTr.innerHTML = '<td colspan="6" style="padding: 15px; background: #f8fafc; text-align: center; color: #718096; font-size: 13px;">등록된 건물이 없습니다.</td>';
                    return;
                }
                
                let bldgHtml = '<div style="padding: 5px 10px 10px 40px;">';
                bldgHtml += '<div style="margin-bottom: 10px; color: #4a5568; font-size: 13px; font-weight: bold;"><i class="fa-solid fa-turn-up fa-rotate-90" style="margin-right: 8px; color: #a0aec0;"></i>소유 건물 목록</div>';
                bldgHtml += '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
                bldgHtml += '<thead style="color: #4a5568;"><tr style="border-bottom: 2px solid #e2e8f0;">';
                bldgHtml += '<th style="padding: 12px 8px; text-align: left; font-weight: 600;">건물명</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: left; font-weight: 600;">주소</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">층수</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">등록일</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">인증 상태</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">관리</th>';
                bldgHtml += '</tr></thead><tbody>';
                bldgs.forEach(b => {
                    const bDate = new Date(b.created_at).toLocaleDateString();
                    const verifyStatus = b.is_verified ? '<span style="color: #3182ce; font-weight: 600;">2차 인증 완료</span>' : '<span style="color: #dd6b20; font-weight: 600;">미인증</span>';
                    bldgHtml += \`<tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 8px;">\${b.name || '-'}</td>
                        <td style="padding: 12px 8px;">\${b.address || '-'}</td>
                        <td style="padding: 12px 8px; text-align: center;">\${b.floors ? b.floors + '층' : '-'}</td>
                        <td style="padding: 12px 8px; text-align: center;">\${bDate}</td>
                        <td style="padding: 12px 8px; text-align: center;">\${verifyStatus}</td>
                        <td style="padding: 12px 8px; text-align: center; display: flex; gap: 5px; justify-content: center;">
                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568; cursor: pointer;" onclick="openUserEditPage('\${ownerId}')">수정</button>
                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: \${b.is_verified ? '#ed8936' : '#48bb78'}; border: none; color: white; cursor: pointer;" onclick="toggleBuildingVerify('\${b.id}', \${b.is_verified})">\${b.is_verified ? '인증취소' : '인증승인'}</button>
                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #e53e3e; border: none; color: white; cursor: pointer;" onclick="deleteAdminBuilding('\${b.id}')">삭제</button>
                        </td>
                    </tr>\`;
                });
                bldgHtml += '</tbody></table></div>';
                
                loadingTr.innerHTML = '<td colspan="6" style="padding: 10px 15px 20px 15px; background: #fafafa; border-bottom: 2px solid #cbd5e0;">' + bldgHtml + '</td>';
            } catch (err) {
                loadingTr.innerHTML = '<td colspan="6" style="padding: 15px; background: #fff5f5; text-align: center; color: #e53e3e; font-size: 13px;">건물 정보를 불러오지 못했습니다.</td>';
            }
        }

        function toggleVerification(id, currentStatus) {
            if (!supabaseClient) return;
            showModalConfirm(currentStatus ? '2차 인증을 취소하시겠습니까?' : '2차 인증을 수동으로 승인하시겠습니까?', async (res) => {
                if (!res) return;
                
                const { error } = await supabaseClient.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
                if (error) {
                    showModalAlert('인증 상태 변경 실패: ' + error.message);
                    return;
                }
                loadAdminUsers();
            });
        }

        async function openUserEditPage(id) {
            document.getElementById('admin-edit-page-id').value = id;
            document.getElementById('admin-edit-page-name').value = '불러오는 중...';
            document.getElementById('admin-edit-page-phone').value = '불러오는 중...';
            document.getElementById('admin-edit-page-buildings-container').classList.add('hidden');
            document.getElementById('admin-edit-page-buildings-list').innerHTML = '';
            showView('admin-user-edit-app');

            try {
                const { data: user, error } = await supabaseClient.from('profiles').select('*').eq('id', id).single();
                if (error) throw error;
                
                document.getElementById('admin-edit-page-name').value = user.name || '';
                document.getElementById('admin-edit-page-phone').value = user.phone || '';

                if (user.role === 'owner') {
                    document.getElementById('admin-edit-page-buildings-container').classList.remove('hidden');
                    const { data: bldgs } = await supabaseClient.from('buildings').select('*').eq('owner_id', id);
                    if (bldgs && bldgs.length > 0) {
                        let bHtml = '';
                        bldgs.forEach(b => {
                            bHtml += \`
                                <div class="card" style="margin-bottom: 15px; border: 1px solid #e2e8f0; box-shadow: none;">
                                    <input type="hidden" class="edit-building-id" value="\${b.id}">
                                    <div class="form-group" style="margin-bottom: 10px;">
                                        <label style="font-size: 13px;">건물명</label>
                                        <input type="text" class="form-control edit-building-name" value="\${b.name || ''}">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 10px;">
                                        <label style="font-size: 13px;">주소</label>
                                        <input type="text" class="form-control edit-building-address" value="\${b.address || ''}">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label style="font-size: 13px;">층수</label>
                                        <input type="number" class="form-control edit-building-floors" value="\${b.floors || ''}">
                                    </div>
                                </div>
                            \`;
                        });
                        document.getElementById('admin-edit-page-buildings-list').innerHTML = bHtml;
                    } else {
                        document.getElementById('admin-edit-page-buildings-list').innerHTML = '<p style="font-size: 13px; color: #718096; padding: 10px;">등록된 건물이 없습니다.</p>';
                    }
                }
            } catch (err) {
                showModalAlert('정보를 불러오지 못했습니다: ' + err.message);
            }
        }

        async function saveAdminUserEditData() {
            const id = document.getElementById('admin-edit-page-id').value;
            const name = document.getElementById('admin-edit-page-name').value;
            const phone = document.getElementById('admin-edit-page-phone').value;

            // Update user profile
            const { error } = await supabaseClient.from('profiles').update({ name, phone }).eq('id', id);
            if (error) {
                showModalAlert('회원 수정 실패: ' + error.message);
                return;
            }

            // Update buildings if owner
            const bldgCards = document.querySelectorAll('#admin-edit-page-buildings-list .card');
            for (let card of bldgCards) {
                const bId = card.querySelector('.edit-building-id').value;
                const bName = card.querySelector('.edit-building-name').value;
                const bAddress = card.querySelector('.edit-building-address').value;
                const bFloors = card.querySelector('.edit-building-floors').value;
                
                await supabaseClient.from('buildings').update({ 
                    name: bName, 
                    address: bAddress, 
                    floors: bFloors ? parseInt(bFloors) : null 
                }).eq('id', bId);
            }

            showModalAlert('변경사항이 성공적으로 저장되었습니다.');
            showView('admin-users-app');
            loadAdminUsers();
        }

        function deleteAdminUser(id) {
            showModalConfirm('정말로 이 회원을 삭제(강제 탈퇴)하시겠습니까? 연관된 데이터도 모두 삭제됩니다.', async (res) => {
                if (!res) return;
                
                if (!supabaseClient) {
                    adminUsersData = adminUsersData.filter(u => u.id !== id);
                    filterAdminUsers();
                    showModalAlert('회원이 삭제되었습니다. (로컬)');
                    return;
                }

                try {
                    // 혹시 모를 외래 키 제약 조건을 피하기 위해 해당 회원의 건물 먼저 삭제 시도
                    await supabaseClient.from('buildings').delete().eq('owner_id', id);
                    
                    const { error } = await supabaseClient.from('profiles').delete().eq('id', id);
                    if (error) {
                        showModalAlert('삭제 실패: ' + error.message);
                        return;
                    }
                    showModalAlert('회원이 삭제되었습니다.');
                    loadAdminUsers();
                } catch (err) {
                    showModalAlert('삭제 중 오류가 발생했습니다: ' + err.message);
                }
            });
        }

        async function loadAdminDashboardStats() {
            if (!supabaseClient) return;
            try {
                // 총 회원 수, 임대인, 임차인 및 가입 일자별 회원 수
                const { data: profiles, error: profError } = await supabaseClient.from('profiles').select('role, created_at');
                if (!profError && profiles) {
                    const totalUsers = profiles.length;
                    const ownerCount = profiles.filter(p => p.role === 'owner').length;
                    const tenantCount = profiles.filter(p => p.role === 'tenant').length;
                    const elTotal = document.getElementById('stat-total-users');
                    const elOwner = document.getElementById('stat-owner-users');
                    const elTenant = document.getElementById('stat-tenant-users');
                    if(elTotal) elTotal.innerHTML = totalUsers + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span>';
                    if(elOwner) elOwner.innerHTML = ownerCount + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span>';
                    if(elTenant) elTenant.innerHTML = tenantCount + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span>';
                
                    // 가입 일자별 그룹핑
                    const dateGroups = {};
                    profiles.forEach(p => {
                        const d = p.created_at ? new Date(p.created_at).toLocaleDateString() : '알 수 없음';
                        dateGroups[d] = (dateGroups[d] || 0) + 1;
                    });
                    
                    const dateListEl = document.getElementById('stat-signup-date-list');
                    if(dateListEl) {
                        const sortedDates = Object.keys(dateGroups).sort((a,b) => new Date(b) - new Date(a));
                        if(sortedDates.length === 0) {
                            dateListEl.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #a0aec0;">가입 내역이 없습니다.</td></tr>';
                        } else {
                            dateListEl.innerHTML = sortedDates.map(date => {
                                return '<tr><td style="padding: 10px 8px; border-bottom: 1px solid #edf2f7;">' + date + '</td><td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #edf2f7; font-weight: 500;">' + dateGroups[date] + ' 명</td></tr>';
                            }).join('');
                        }
                    }
                }

                // 총 등록 건물 수 및 지역별 통계
                const { data: bldgs, error: bldgError } = await supabaseClient.from('buildings').select('address, owner_id');
                if (!bldgError && bldgs) {
                    const elBldg = document.getElementById('stat-total-buildings');
                    if(elBldg) elBldg.innerHTML = (bldgs.length || 0) + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">개</span>';
                    
                    // 지역별 그룹핑
                    const regionMap = {};
                    bldgs.forEach(b => {
                        let region = '지역 미상';
                        if (b.address) {
                            const parts = b.address.split(' ');
                            if (parts.length >= 2) {
                                region = parts[0] + ' ' + parts[1]; // 예: 서울특별시 관악구
                            } else {
                                region = b.address;
                            }
                        }
                        if (!regionMap[region]) {
                            regionMap[region] = { bldgCount: 0, owners: new Set() };
                        }
                        regionMap[region].bldgCount += 1;
                        if (b.owner_id) regionMap[region].owners.add(b.owner_id);
                    });

                    const regionListEl = document.getElementById('stat-region-list');
                    if (regionListEl) {
                        const regions = Object.keys(regionMap).sort((a,b) => regionMap[b].bldgCount - regionMap[a].bldgCount);
                        if (regions.length === 0) {
                            regionListEl.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #a0aec0;">등록된 건물이 없습니다.</td></tr>';
                        } else {
                            regionListEl.innerHTML = regions.map(reg => {
                                const data = regionMap[reg];
                                return '<tr><td style="padding: 10px 8px; border-bottom: 1px solid #edf2f7;">' + reg + '</td><td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #edf2f7; font-weight: 500;">' + data.bldgCount + ' 개</td><td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #edf2f7; font-weight: 500;">' + data.owners.size + ' 명</td></tr>';
                            }).join('');
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load admin stats", err);
            }
        }

        async function loadAdminBuildings() {
            if (!supabaseClient) return;
            const { data, error } = await supabaseClient
                .from('buildings')
                .select('*, profiles:owner_id(name)')
                .order('created_at', { ascending: false });
            
            if (error) {
                showModalAlert('건물 목록 조회 실패: ' + error.message);
                return;
            }
            renderAdminBuildings(data || []);
        }

        function renderAdminBuildings(buildings) {
            const list = document.getElementById('admin-buildings-list');
            if (!list) return;
            if (buildings.length === 0) {
                list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #a0aec0;">등록된 건물이 없습니다.</td></tr>';
                return;
            }
            list.innerHTML = buildings.map(b => {
                const ownerName = b.profiles ? b.profiles.name : '알수없음';
                return \`
                <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 12px 8px; font-weight: 500;">\${b.name || '-'}</td>
                    <td style="padding: 12px 8px;">\${b.address || '-'}</td>
                    <td style="padding: 12px 8px; text-align: center;">\${new Date(b.created_at).toLocaleDateString()}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                        \${b.is_verified 
                            ? \`<span class="badge badge-blue">검증완료 (\${ownerName})</span>\`
                            : \`<span class="badge badge-orange">미인증 (\${ownerName})</span>\`
                        }
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #ed8936; border: none; color: white; margin-right: 5px;" onclick="toggleBuildingVerify('\${b.id}', \${b.is_verified})">\${b.is_verified ? '인증취소' : '인증승인'}</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #e53e3e; border: none; color: white;" onclick="deleteAdminBuilding('\${b.id}')">삭제</button>
                    </td>
                </tr>
            \`}).join('');
        }

        function toggleBuildingVerify(id, currentStatus) {
            showModalConfirm(currentStatus ? '이 건물의 인증을 취소하시겠습니까?' : '이 건물을 검증완료 처리하시겠습니까?', async (res) => {
                if (!res) return;
                
                const { error } = await supabaseClient
                    .from('buildings')
                    .update({ is_verified: !currentStatus })
                    .eq('id', id);
                    
                if (error) {
                    showModalAlert('인증 상태 변경 실패: ' + error.message);
                    return;
                }
                showModalAlert('건물 인증 상태가 변경되었습니다.');
                loadAdminUsers();
            });
        }

        
        async function saveGeminiKey() {
            const keyVal = document.getElementById('admin-gemini-key').value.trim();
            if(!keyVal) return showModalAlert('키를 입력해주세요.');
            
            const { error } = await supabaseClient.from('system_settings').upsert(
                { key_name: 'GEMINI_API_KEY', key_value: keyVal },
                { onConflict: 'key_name' }
            );
            
            if (error) {
                console.error(error);
                showModalAlert('저장 실패: system_settings 테이블이 없거나 권한이 없습니다.');
            } else {
                showModalAlert('API Key가 성공적으로 저장되었습니다.');
            }
        }

        async function loadGeminiKeyIntoAdmin() {
            if (!supabaseClient) return;
            try {
                const { data } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                if (data && data.key_value) {
                    const el = document.getElementById('admin-gemini-key');
                    if (el) el.value = data.key_value;
                }
            } catch(e) {}
        }

        async function getGeminiApiKey() {
            if (!supabaseClient) return null;
            try {
                const { data } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                return data ? data.key_value : null;
            } catch(e) {
                return null;
            }
        }
\n        async function executeGeminiExtraction() {
            const previewImage = document.getElementById('ocr-preview-img');
            if (!previewImage || !previewImage.src || previewImage.src === '') {
                showModalAlert('분석할 계약서 이미지가 없습니다.');
                return;
            }
            
            document.getElementById('loading-view').querySelector('h3').innerText = 'AI 모델을 통해 15개 항목을 추출 중입니다...';
            document.getElementById('loading-view').classList.remove('hidden');
            
            try {
                const response = await fetch('/api/gemini-extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                          imageBase64: previewImage.src,
                          apiKey: await getGeminiApiKey()
                      })
                });
                
                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'AI 데이터 추출에 실패했습니다.');
                }
                
                const data = result.data;
                const fields = [
                    'ocr_room_number', 'ocr_area', 'ocr_deposit', 'ocr_monthly_rent', 'ocr_maintenance_fee', 'ocr_cleaning_fee',
                    'ocr_contract_date', 'ocr_lease_period', 'ocr_tenant_name', 'ocr_tenant_phone', 'ocr_broker_address',
                    'ocr_broker_agency_name', 'ocr_broker_representative', 'ocr_broker_registration_no', 'ocr_broker_phone'
                ];
                
                fields.forEach(fieldId => {
                    const el = document.getElementById(fieldId);
                    if (el && data[fieldId] !== undefined) {
                        el.value = data[fieldId];
                        // 시각적 피드백 효과
                        const originalBg = el.style.backgroundColor;
                        el.style.transition = 'background-color 0.5s';
                        el.style.backgroundColor = '#e6fffa';
                        setTimeout(() => {
                            el.style.backgroundColor = originalBg;
                        }, 1000);
                    }
                });
                
            } catch (err) {
                showModalAlert('오류 발생: ' + err.message);
            } finally {
                document.getElementById('loading-view').classList.add('hidden');
            }
        }

        async function submitExtractedContract(event) {
            event.preventDefault();
            const sessionData = await supabaseClient.auth.getSession();
            const session = sessionData?.data?.session;
            if (!session) {
                showModalAlert('로그인이 필요합니다.');
                return;
            }

            const buildingId = window.ocrTargetBuildingId;
            if (!buildingId) {
                showModalAlert('선택된 건물이 없습니다.');
                return;
            }

            // Get all input values
            const inputs = document.querySelectorAll('#ocr-fields-container input');
            const contractData = {};
            inputs.forEach(input => {
                contractData[input.id] = input.value;
            });

            document.getElementById('loading-view').querySelector('h3').innerText = '데이터베이스에 저장 중입니다...';
            document.getElementById('loading-view').classList.remove('hidden');

            try {
                // Insert Tenant
                const { error: tError } = await supabaseClient
                    .from('tenants')
                    .insert([{
                        building_id: buildingId,
                        owner_id: session.user.id,
                        address: '',
                        room: contractData['ocr_room_number'],
                        tenant_name: contractData['ocr_tenant_name']
                    }]);

                if (tError) {
                    throw new Error('임차인 정보 저장 실패: ' + tError.message);
                }

                // Insert Contract
                const { error: cError } = await supabaseClient
                    .from('contracts')
                    .insert([{
                        building_id: buildingId,
                        owner_id: session.user.id,
                        status: 'matched',
                        room_number: contractData['ocr_room_number'],
                        area: contractData['ocr_area'],
                        deposit: contractData['ocr_deposit'] ? parseInt(contractData['ocr_deposit']) : 0,
                        monthly_rent: contractData['ocr_monthly_rent'] ? parseInt(contractData['ocr_monthly_rent']) : 0,
                        maintenance_fee: contractData['ocr_maintenance_fee'] ? parseInt(contractData['ocr_maintenance_fee']) : 0,
                        cleaning_fee: contractData['ocr_cleaning_fee'] ? parseInt(contractData['ocr_cleaning_fee']) : 0,
                        contract_date: contractData['ocr_contract_date'],
                        lease_period: contractData['ocr_lease_period'],
                        tenant_name: contractData['ocr_tenant_name'],
                        tenant_phone: contractData['ocr_tenant_phone'],
                        broker_address: contractData['ocr_broker_address'],
                        broker_agency_name: contractData['ocr_broker_agency_name'],
                        broker_rep_name: contractData['ocr_broker_representative'],
                        broker_reg_number: contractData['ocr_broker_registration_no'],
                        broker_phone: contractData['ocr_broker_phone']
                    }]);

                if (cError) {
                    throw new Error('계약서 세부정보 저장 실패: ' + cError.message);
                }

                document.getElementById('loading-view').classList.add('hidden');
                showView('owner-app');
                showModalAlert('AI 계약서 추출 정보가 성공적으로 저장되었습니다!');
                
                // Refresh list if possible
                if (typeof renderOwnerBuildings === 'function') {
                    renderOwnerBuildings();
                }

            } catch (err) {
                document.getElementById('loading-view').classList.add('hidden');
                showModalAlert('데이터베이스 저장 중 오류가 발생했습니다: ' + err.message);
            }
        }

        function selectDateFromCalendar(dateStr) {
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = dateStr;
                filterAdminUsers();
            }
            closeCalendarModal();
        }

        function deleteAdminBuilding(id) {
            showModalConfirm('정말로 이 건물을 시스템에서 강제 삭제하시겠습니까? 연관된 모든 데이터가 삭제됩니다.', async (res) => {
                if (!res) return;
                
                if (!supabaseClient) {
                    showModalAlert('건물이 삭제되었습니다. (로컬)');
                    return;
                }

                try {
                    const { data, error } = await supabaseClient.from('buildings').delete().eq('id', id).select();
                    if (error) {
                        showModalAlert('삭제 실패: ' + error.message);
                        return;
                    }
                    if (!data || data.length === 0) {
                        showModalAlert('삭제 실패: DB 권한(RLS) 문제로 삭제되지 않았습니다. Supabase에서 Delete 정책을 확인하세요.');
                        return;
                    }
                    showModalAlert('건물이 삭제되었습니다.');
                    loadAdminUsers();
                } catch (err) {
                    showModalAlert('삭제 중 오류가 발생했습니다: ' + err.message);
                }
            });
        }

        // --- Custom Calendar Logic ---
        let calendarTargetId = '';
        let currentCalDate = new Date();
        let selectedCalDateStr = '';

        function openCalendarModal(targetId) {
            calendarTargetId = targetId;
            const targetVal = document.getElementById(targetId).value;
            selectedCalDateStr = targetVal;
            if (targetVal) {
                const parts = targetVal.split('.');
                if(parts.length === 3) {
                    currentCalDate = new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    currentCalDate = new Date();
                }
            } else {
                currentCalDate = new Date();
            }
            currentCalMode = 'date';
            renderCalendar();
            document.getElementById('calendar-modal').classList.remove('hidden');
        }

        function closeCalendarModal() {
            document.getElementById('calendar-modal').classList.add('hidden');
        }

        function resetCalendarToToday() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = year + '.' + month + '.' + d;
                filterAdminUsers();
            }
            closeCalendarModal();
        }

        function clearCalendarDate() {
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = '';
                filterAdminUsers();
            }
            closeCalendarModal();
        }

        let decadePageStart = 1920;
        let selectedDecadeStart = 2020;

        function changeCalendarRange(offset) {
            if (currentCalMode === 'date') {
                currentCalDate.setMonth(currentCalDate.getMonth() + offset);
            } else if (currentCalMode === 'month') {
                currentCalDate.setFullYear(currentCalDate.getFullYear() + offset);
            } else if (currentCalMode === 'year') {
                selectedDecadeStart += (offset * 12);
            } else if (currentCalMode === 'decade') {
                decadePageStart += (offset * 120);
            }
            renderCalendar();
        }

        let currentCalMode = 'date';

        function switchCalendarMode(mode) {
            if (mode === 'decade') {
                decadePageStart = Math.floor(currentCalDate.getFullYear() / 10) * 10 - 50;
            } else if (mode === 'year') {
                selectedDecadeStart = Math.floor(currentCalDate.getFullYear() / 10) * 10;
            }
            currentCalMode = mode;
            renderCalendar();
        }

        function setCalendarDecade(startYear) {
            selectedDecadeStart = startYear;
            currentCalMode = 'year';
            renderCalendar();
        }

        function setCalendarYearMonth(val, type) {
            if (type === 'year') {
                currentCalDate.setFullYear(parseInt(val));
                currentCalMode = 'month';
            } else if (type === 'month') {
                currentCalDate.setMonth(parseInt(val));
                currentCalMode = 'date';
            }
            renderCalendar();
        }

        function renderCalendar() {
            const year = currentCalDate.getFullYear();
            const month = currentCalDate.getMonth();
            
            let headerHtml = \`
                <div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var(--primary-deep-navy); font-size:15px;" onmouseover="this.style.background='#edf2f7'" onmouseout="this.style.background='transparent'" onclick="switchCalendarMode('decade')">\${year}년</div>
                <div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var(--primary-deep-navy); font-size:15px;" onmouseover="this.style.background='#edf2f7'" onmouseout="this.style.background='transparent'" onclick="switchCalendarMode('month')">\${month + 1}월</div>
            \`;
            document.getElementById('calendar-month-year').innerHTML = headerHtml;

            const gridEl = document.getElementById('calendar-grid');
            const daysHeader = document.getElementById('calendar-days-header');
            
            let gridHtml = '';

            if (currentCalMode === 'decade') {
                daysHeader.style.display = 'none';
                gridEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                for (let d = decadePageStart; d < decadePageStart + 120; d += 10) {
                    gridHtml += \`
                        <div style="padding: 15px 5px; cursor: pointer; border-radius: 4px; transition: 0.2s;" 
                             onmouseover="this.style.background='#edf2f7'" 
                             onmouseout="this.style.background='transparent'" 
                             onclick="setCalendarDecade(\${d})">\${d}년대</div>
                    \`;
                }
            } else if (currentCalMode === 'year') {
                daysHeader.style.display = 'none';
                gridEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                for (let y = selectedDecadeStart; y < selectedDecadeStart + 12; y++) {
                    gridHtml += \`
                        <div style="padding: 15px 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; \${y === year ? 'background:var(--primary-light-blue);color:white;' : ''}" 
                             onmouseover="if(\${y !== year}) this.style.background='#edf2f7'" 
                             onmouseout="if(\${y !== year}) this.style.background='transparent'" 
                             onclick="setCalendarYearMonth(\${y}, 'year')">\${y}</div>
                    \`;
                }
            } else if (currentCalMode === 'month') {
                daysHeader.style.display = 'none';
                gridEl.style.gridTemplateColumns = 'repeat(4, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                for (let m = 0; m < 12; m++) {
                    gridHtml += \`
                        <div style="padding: 10px 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; \${m === month ? 'background:var(--primary-light-blue);color:white;' : ''}" 
                             onmouseover="if(\${m !== month}) this.style.background='#edf2f7'" 
                             onmouseout="if(\${m !== month}) this.style.background='transparent'" 
                             onclick="setCalendarYearMonth(\${m}, 'month')">\${m + 1}월</div>
                    \`;
                }
            } else {
                daysHeader.style.display = 'grid';
                gridEl.style.gridTemplateColumns = 'repeat(7, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                const firstDay = new Date(year, month, 1).getDay();
                const lastDate = new Date(year, month + 1, 0).getDate();

                for (let i = 0; i < firstDay; i++) {
                    gridHtml += '<div></div>';
                }
                const realToday = new Date();
                const isCurrentMonth = (realToday.getFullYear() === year && realToday.getMonth() === month);
                const todayDate = realToday.getDate();

                for (let d = 1; d <= lastDate; d++) {
                    const dateStr = year + '.' + String(month + 1).padStart(2, '0') + '.' + String(d).padStart(2, '0');
                    const isToday = isCurrentMonth && d === todayDate;
                    const isSelected = (dateStr === selectedCalDateStr);
                    
                    const dayOfWeek = new Date(year, month, d).getDay();
                    let textColor = '#2d3748';
                    if (dayOfWeek === 0) textColor = '#e53e3e';
                    else if (dayOfWeek === 6) textColor = '#3182ce';

                    let styleStr = \`padding: 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; color: \${textColor};\`;
                    if (isSelected) {
                        styleStr += ' background: var(--primary-light-blue); color: white; font-weight: bold; border: 1px solid var(--primary-light-blue);';
                    } else if (isToday) {
                        styleStr += ' border: 1px solid var(--primary-light-blue); color: var(--primary-light-blue); font-weight: bold;';
                    } else {
                        styleStr += ' border: 1px solid transparent;';
                    }

                    gridHtml += \`
                        <div style="\${styleStr}" 
                             onmouseover="if(!\${isSelected}) this.style.background='#edf2f7'" 
                             onmouseout="if(!\${isSelected}) this.style.background='transparent'" 
                             onclick="selectCalendarDate('\${dateStr}')">\${d}</div>
                    \`;
                }
            }
            gridEl.innerHTML = gridHtml;
        }

        function selectCalendarDate(dateStr) {
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = dateStr;
                filterAdminUsers();
            }
            closeCalendarModal();
        }
    </script>
</body>
</html>
`;

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  
  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html' || parsedUrl.pathname === '/admin')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    let content = htmlTemplate;
    if (parsedUrl.pathname === '/admin') {
      content = content.replace('</head>', '<script>window.IS_ADMIN_ROUTE = true;</script></head>');
    }
    res.end(content);
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
  } else if (req.method === 'GET' && parsedUrl.pathname === '/api/matched-tenants') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(matchedContracts));
  } else if (req.method === 'GET' && parsedUrl.pathname === '/api/tenant-status') {
    const tenantName = parsedUrl.searchParams.get('name');
    const matched = matchedContracts.find(c => tenantName && (tenantName.includes(c.tenantName) || c.tenantName.includes(tenantName)));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (matched) {
        res.end(JSON.stringify({ matched: true, info: matched }));
    } else {
        res.end(JSON.stringify({ matched: false }));
    }
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/register-building') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const data = JSON.parse(body);
      registeredBuildings.push(data);
      console.log(`[임대인 건물 등록] 주소: ${data.address}, 건물명: ${data.name}`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
    });
  } else if (req.method === 'GET' && parsedUrl.pathname === '/api/config/supabase') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(supabaseConfig));
  } else if (req.method === 'GET' && parsedUrl.pathname === '/api/search-building') {
    const address = parsedUrl.searchParams.get('address');
    const matchedBuilding = registeredBuildings.find(b => b.address === address);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (matchedBuilding) {
        res.end(JSON.stringify({ isRegistered: true, building: matchedBuilding }));
    } else {
        res.end(JSON.stringify({ isRegistered: false }));
    }
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
        const matched = pendingContracts.splice(index, 1)[0]; // 대기열에서 제거 (승인 완료)
        matchedContracts.push(matched); // 매칭 완료 리스트로 이동
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
    });
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/verify-contract-ocr') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const imageBase64 = data.imageBase64;
        const ownerName = data.ownerName;
        const bAddr = data.bAddr;

        if (!imageBase64 || !ownerName || !bAddr) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: '계약서 이미지, 임대인 이름 또는 건물 주소가 누락되었습니다.' }));
        }

        const tesseract = require('tesseract.js');
        // Base64 헤더 제거 (e.g., data:image/png;base64,...)
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        console.log(`[OCR 분석 시작] 대상 명의자: ${ownerName}, 대상 주소: ${bAddr}`);
        
        // Tesseract.js 언어팩(kor) 자동 다운로드 및 텍스트 추출 (최초 1회 다운로드 소요)
        const result = await tesseract.recognize(buffer, 'kor');
        const text = result.data.text;
        
        console.log(`[OCR 분석 완료] 추출된 텍스트 길이: ${text.length}`);
        
        // 공백 및 줄바꿈 제거 후 매칭 검사
        const cleanText = text.replace(/\s+/g, '');
        const cleanOwnerName = ownerName.replace(/\s+/g, '');
        
        // 1. 이름 검증 (유연한 매칭)
        let isNameMatched = cleanText.includes(cleanOwnerName);
        if (!isNameMatched && cleanOwnerName.length >= 2) {
            // OCR 인식 오류 감안: 연속된 2글자가 포함되어 있는지 확인
            for (let i = 0; i < cleanOwnerName.length - 1; i++) {
                if (cleanText.includes(cleanOwnerName.substring(i, i + 2))) {
                    isNameMatched = true;
                    break;
                }
            }
        }
        
        // 2. 주소 검증 (토큰 단위 유연한 매칭)
        const addrParts = bAddr.split(/\s+/).filter(p => p.length > 0);
        let matchedAddrCount = 0;
        for (let part of addrParts) {
            // '서울' -> '서울특별시' 등 축약어/풀네임 차이 완화
            if (part === '서울') part = '서울';
            if (cleanText.includes(part) || text.includes(part)) {
                matchedAddrCount++;
            } else if (part === '서울' && cleanText.includes('서울특별시')) {
                matchedAddrCount++;
            } else if (part === '경기' && cleanText.includes('경기도')) {
                matchedAddrCount++;
            }
        }
        // 주소 구성 요소 중 50% 이상 일치하거나, 건물 번지수(마지막 토큰)가 일치하면 인정
        const lastToken = addrParts[addrParts.length - 1];
        const isAddrMatched = (matchedAddrCount >= Math.ceil(addrParts.length / 2)) || (lastToken && cleanText.includes(lastToken) && lastToken.length >= 2);
        
        // 3. 계약서 필수 키워드 확인 ('소재지', '소재시', '임대인', '성명' 등)
        const hasContractKeywords = cleanText.includes('소재지') || cleanText.includes('소재시') || cleanText.includes('임대인') || cleanText.includes('성명');
        
        console.log("=== OCR 추출 텍스트 (앞부분) ===");
        console.log(text.substring(0, 500));
        console.log("================================");
        
        if (!hasContractKeywords) {
            console.log("[OCR 매칭 실패] 계약서 양식이 아님 (필수 단어 미검출)");
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: '첨부하신 이미지가 임대차 계약서가 아닌 것 같습니다.\\n(계약서 필수 식별 단어가 검출되지 않았습니다.)' }));
        }

        // 4. 임차인 정보 및 호실 추출 시도 (가상)
        let extractedTenant = null;
        const tenantNameMatch = cleanText.match(/임차인(?:성명)?(?:[^\\w가-힣]{0,3})([가-힣]{2,4})/);
        const roomMatch = cleanText.match(/(?:제\\s*|호실\\s*|\\s)([0-9]{2,4})\\s*호/);
        
        if (tenantNameMatch || roomMatch) {
            extractedTenant = {
                name: tenantNameMatch ? tenantNameMatch[1] : '임차인',
                room: roomMatch ? roomMatch[1] + '호' : '미지정'
            };
        }

        // 5. 계약서 세부 정보 추출 시도 (가상)
        let extractedContract = {
            deposit: null,
            rent: null,
            detailed_address: extractedTenant ? extractedTenant.room : null,
            lease_period: null,
            realtor_address: null,
            realtor_name: null,
            realtor_representative: null,
            realtor_phone: null,
            realtor_registration_no: null
        };
        
        const depositMatch = cleanText.match(/보증금[^0-9]*([0-9,]+(?:만)?)\s*원?/);
        extractedContract.deposit = depositMatch ? depositMatch[1] : (cleanText.includes('보증금') ? '확인필요' : null);
        
        const rentMatch = cleanText.match(/차임[^0-9]*([0-9,]+(?:만)?)\s*원?/);
        extractedContract.rent = rentMatch ? rentMatch[1] : (cleanText.includes('차임') || cleanText.includes('월세') ? '확인필요' : null);
        
        const leasePeriodMatch = cleanText.match(/([0-9]{4}년\s*[0-9]{1,2}월\s*[0-9]{1,2}일부터.*?[0-9]{4}년\s*[0-9]{1,2}월\s*[0-9]{1,2}일)/);
        extractedContract.lease_period = leasePeriodMatch ? leasePeriodMatch[1] : (cleanText.includes('존속기간') || cleanText.includes('임대기간') ? '자동 추출 실패 (수동 확인 필요)' : null);
        
        const realtorAddrMatch = cleanText.match(/중개사무소소재지([^명칭등록]+)/);
        extractedContract.realtor_address = realtorAddrMatch ? realtorAddrMatch[1] : '추출 실패';
        
        const realtorNameMatch = cleanText.match(/명칭([^대표]+)/);
        extractedContract.realtor_name = realtorNameMatch ? realtorNameMatch[1] : '추출 실패';
        
        const realtorRepMatch = cleanText.match(/대표([^전화등록]+)/);
        extractedContract.realtor_representative = realtorRepMatch ? realtorRepMatch[1] : '추출 실패';
        
        const realtorPhoneMatch = cleanText.match(/전화([0-9-]+)/);
        extractedContract.realtor_phone = realtorPhoneMatch ? realtorPhoneMatch[1] : '추출 실패';
        
        const realtorRegMatch = cleanText.match(/등록번호([가-힣0-9-]+)/);
        extractedContract.realtor_registration_no = realtorRegMatch ? realtorRegMatch[1] : '추출 실패';

        // 최종 판별: 이름과 주소가 모두 (유연한 기준을 통과하여) 일치해야 성공 처리
        let matched = (isNameMatched && isAddrMatched);
        
        console.log(`[OCR 매칭 결과] 이름: \${isNameMatched}, 주소: \${isAddrMatched}, 양식확인: \${hasContractKeywords} -> 최종: \${matched ? '일치' : '불일치'}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, matched: matched, extractedTenant: extractedTenant, extractedContract: extractedContract }));
      } catch (err) {
        console.error('[OCR 처리 중 에러 발생]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'OCR 이미지 처리 중 오류가 발생했습니다.' }));
      }
    });
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/gemini-extract') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const imageBase64 = data.imageBase64;
        if (!imageBase64) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: '계약서 이미지가 누락되었습니다.' }));
        }

        console.log('[Gemini API 호출 시뮬레이션 시작...]');
        // AI 모델 시뮬레이션 딜레이 1.5초
        setTimeout(() => {
          const result = {
            success: true,
            data: {
              ocr_room_number: "302호",
              ocr_room_count: "1",
              ocr_bathroom_count: "1",
              ocr_living_room_count: "0",
              ocr_veranda_count: "1",
              ocr_area: "24.5",
              ocr_deposit: "10000000",
              ocr_monthly_rent: "550000",
              ocr_maintenance_fee: "70000",
              ocr_cleaning_fee: "0",
              ocr_contract_date: "2026-06-16",
              ocr_lease_period: "2026-06-16 ~ 2028-06-15",
              ocr_tenant_name: "홍길동",
              ocr_tenant_phone: "010-1234-5678",
              ocr_broker_address: "서울특별시 마포구 백범로 123",
              ocr_broker_agency_name: "대박공인중개사사무소",
              ocr_broker_representative: "김대박",
              ocr_broker_registration_no: "11440-2015-00123",
              ocr_broker_phone: "02-987-6543"
            }
          };
          console.log('[Gemini API 호출 성공: 15개 항목 추출 완료]');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result));
        }, 1500);
      } catch (err) {
        console.error('[Gemini 추출 에러]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'AI 데이터 추출 중 오류가 발생했습니다.' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[ModuRoom] 로컬 개발 서버가 작동 중입니다: http://localhost:${PORT}`);
});
