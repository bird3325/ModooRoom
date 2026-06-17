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
const matchedContracts = []; // 임대인이 승인하여 매칭이 완료된 계약들
const registeredBuildings = []; // 임대인이 등록한 건물 목록
let supabaseConfig = { url: '', key: '' }; // Supabase 연동 설정

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

    <!-- 1. 로그인 뷰 -->
    <div class="auth-wrapper" id="login-view">
        <div class="auth-card">
            <div class="auth-logo">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방</span>
            </div>

            <h3 style="text-align: center; margin-bottom: 25px; color: var(--primary-deep-navy);" id="login-title">로그인</h3>
            
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>이메일 주소</label>
                    <input type="email" id="login-email" class="form-control" required value="user@moduroom.com" autocomplete="username">
                </div>
                <div class="form-group">
                    <label>비밀번호</label>
                    <input type="password" id="login-password" class="form-control" required value="password123" autocomplete="current-password">
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
            <div class="navbar-brand">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:#718096;">[환영합니다]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
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
    <div id="map-app" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand">
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
            <div class="navbar-brand">
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
            <div class="navbar-brand">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[임대인 파트너]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                <button id="owner-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="toggleOwnerMenu(event)">
                    김임대 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div id="owner-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
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
                            <button class="btn btn-orange" style="padding: 6px 12px; font-size: 12px;" onclick="showModalAlert('건물 추가 기능은 준비 중입니다.')"><i class="fa-solid fa-plus"></i> 건물 추가</button>
                        </div>
                        <div id="owner-buildings-list">
                        </div>
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
            <div class="user-profile" style="position: relative;">
                <button id="tenant-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="toggleTenantMenu(event)">
                    이세입 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div id="tenant-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
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
            <div class="navbar-brand">
                <i class="fa-solid fa-house-chimney-window"></i>
                <span>모두의 방 <span style="font-size:12px; color:var(--primary-light-blue);">[마이페이지]</span></span>
            </div>
            <div class="user-profile">
                <button class="btn-logout" onclick="showView('main-app')"><i class="fa-solid fa-arrow-left"></i> 메인으로</button>
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
                <p style="font-size: 13.5px; color: #4a5568; margin-bottom: 20px; line-height: 1.5;">
                    2차 인증을 완료하시면 더 안전하고 편리하게 '모두의 방'을 이용하실 수 있습니다.<br>
                    <strong>임대인</strong>은 내 건물을 등록하고 안전하게 관리해 보세요!
                </p>
                <form onsubmit="authenticateOwnerDetailed(event)">
                    <p style="font-size: 13px; color: #718096; margin-bottom: 15px;">회원님의 이름(마이페이지 수정란 기준)과 건축물대장의 명의자를 대조하여 인증합니다.</p>
                    <div class="form-group">
                        <label>건물 주소</label>
                        <input type="text" class="form-control" id="owner-building-address" required placeholder="클릭하여 주소를 검색하세요" readonly onclick="execDaumPostcode()" style="cursor: pointer; background-color: #f8fafc;">
                    </div>
                    <div class="form-group">
                        <label>건물명</label>
                        <input type="text" class="form-control" id="owner-building-name" required placeholder="예) 모두빌라 1동">
                    </div>

                    <button type="submit" class="btn" style="width: 100%; justify-content: center; margin-top: 15px; padding: 14px;">건축물대장 명의 대조 후 인증</button>
                </form>
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

    <!-- 내 건물 관리 페이지 -->
    <div id="building-management-page" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand">
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

    <!-- 커스텀 알럿 모달 -->
    <div id="custom-alert-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; padding: 25px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center;">
            <i class="fa-solid fa-circle-info" style="font-size: 40px; color: var(--point-orange); margin-bottom: 15px;"></i>
            <p id="custom-alert-message" style="font-size: 15px; color: var(--primary-deep-navy); margin-bottom: 25px; line-height: 1.5;"></p>
            <button class="btn btn-orange" style="width: 100%; justify-content: center;" onclick="closeCustomAlert()">확인</button>
        </div>
    </div>

    <script>
        // Supabase 동적 초기화
        let supabaseClient = null;
        window.onload = () => {
            fetch('/api/config/supabase')
                .then(res => res.json())
                .then(config => {
                    if (config.url && config.key && config.url !== 'YOUR_SUPABASE_URL') {
                        supabaseClient = window.supabase.createClient(config.url, config.key);
                        console.log('Supabase 클라이언트가 초기화되었습니다. (.env 사용)');
                    }
                })
                .catch(err => console.error('설정을 불러오는 데 실패했습니다.', err));
        };

        // 글로벌 상태 변상태를 관리
        let isAuthenticated = false; // 2차 인증 여부
        let currentRole = 'owner';   // 'owner' or 'tenant'
        let activeTenantsData = [];  // 임대인: 현재 매칭된 임차인 목록 데이터

        function saveMyInfo() {
            const pwd = document.getElementById('common-edit-password').value;
            const pwdConfirm = document.getElementById('common-edit-password-confirm').value;
            
            if (pwd || pwdConfirm) {
                if (pwd !== pwdConfirm) {
                    showModalAlert('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
                    return;
                }
            }
            showModalAlert('개인정보 및 비밀번호가 성공적으로 수정되었습니다.');
        }

        function showModalAlert(message) {
            document.getElementById('custom-alert-message').innerText = message;
            document.getElementById('custom-alert-modal').classList.remove('hidden');
        }

        function closeCustomAlert() {
            document.getElementById('custom-alert-modal').classList.add('hidden');
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

        function toggleOwnerMenu(e) {
            e.stopPropagation();
            document.getElementById('owner-dropdown').classList.toggle('hidden');
        }

        function toggleTenantMenu(e) {
            e.stopPropagation();
            document.getElementById('tenant-dropdown').classList.toggle('hidden');
        }

        function showView(viewName) {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('owner-app').classList.add('hidden');
            document.getElementById('tenant-app').classList.add('hidden');
            if(document.getElementById('map-app')) document.getElementById('map-app').classList.add('hidden');
            if(document.getElementById('story-detail-app')) document.getElementById('story-detail-app').classList.add('hidden');
            if(document.getElementById('auth-page')) document.getElementById('auth-page').classList.add('hidden');
            if(document.getElementById('building-management-page')) document.getElementById('building-management-page').classList.add('hidden');

            if (viewName === 'login') {
                document.getElementById('login-view').classList.remove('hidden');
            } else if (viewName === 'signup') {
                document.getElementById('signup-view').classList.remove('hidden');
            } else if (viewName === 'main-app') {
                document.getElementById('main-app').classList.remove('hidden');
            } else if (viewName === 'map-app') {
                document.getElementById('map-app').classList.remove('hidden');
            } else if (viewName === 'story-detail-app') {
                document.getElementById('story-detail-app').classList.remove('hidden');
            } else if (viewName === 'auth-page') {
                document.getElementById('auth-page').classList.remove('hidden');
                // 마이페이지 진입 시
                if(document.getElementById('auth-choice-container')) {
                    document.getElementById('auth-choice-container').classList.remove('hidden');
                    
                    // 공통 폼 이름 세팅
                    const loginName = document.getElementById('main-display-name').innerText.split(' ')[0] || '홍길동';
                    document.getElementById('common-edit-name').value = loginName;
                    document.getElementById('common-edit-phone').value = '010-1234-5678';

                    document.getElementById('auth-owner-form').classList.add('hidden');
                    document.getElementById('auth-tenant-form').classList.add('hidden');
                    
                    // 회원가입 시 선택한 역할에 따라 인증 폼 렌더링
                    if (globalUserRole === 'owner') {
                        document.getElementById('auth-owner-form').classList.remove('hidden');
                    } else {
                        document.getElementById('auth-tenant-form').classList.remove('hidden');
                    }
                }
            } else if (viewName === 'owner-app') {
                document.getElementById('owner-app').classList.remove('hidden');
                loadInventory();
                checkPendingInvites();
                renderOwnerBuildings();
            } else if (viewName === 'tenant-app') {
                document.getElementById('tenant-app').classList.remove('hidden');
                checkTenantMatchStatus();
            } else if (viewName === 'building-management-page') {
                document.getElementById('building-management-page').classList.remove('hidden');
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
                    showModalAlert('프로필을 불러오지 못했습니다. DB 쿼리 연동이 필요합니다.');
                    return;
                }

                globalUserRole = profile.role;
                const namePrefix = profile.name;
                
                document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                
                isAuthenticated = false;
                showView('main-app');
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

            showModalAlert(name + '님, 가입이 완료되었습니다. 로그인해주세요.');
            showView('login');
        }

        function handleLogout() {
            isAuthenticated = false;
            showView('login');
        }

        function authenticateRole(role) {
            isAuthenticated = true; // 인증 완료 상태로 전환
            if (role === 'owner') {
                showModalAlert('임대인 인증이 완료되었습니다.');
                showView('owner-app');
            } else if (role === 'tenant') {
                showModalAlert('임차인 인증이 완료되었습니다.');
                showView('tenant-app');
            }
        }

        let ownerBuildings = [];

        function authenticateOwnerDetailed(event) {
            event.preventDefault();
            const bName = document.getElementById('owner-building-name').value;
            const bAddr = document.getElementById('owner-building-address').value;
            
            // 처음 등록하는 건물을 대표 건물로
            const newBuilding = { 
                name: bName || '이름 없음', 
                address: bAddr || '주소 없음', 
                isPrimary: true,
                floors: 1,
                rooms: []
            };
            
            ownerBuildings = [newBuilding];

            // 백엔드 API에 건물 등록 (비동기)
            fetch('/api/register-building', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBuilding)
            }).then(res => res.json()).then(data => {
                isAuthenticated = true;
                showModalAlert('건축물대장 명의 대조 완료! 임대인 인증이 성공적으로 처리되었습니다.');
                showView('owner-app');
            });
        }


        function renderOwnerBuildings() {
            const list = document.getElementById('owner-buildings-list');
            if (!list) return;
            
            if (ownerBuildings.length === 0) {
                list.innerHTML = '<p style="font-size: 13px; color: #718096; text-align: center; padding: 20px;">등록된 건물이 없습니다.</p>';
                return;
            }
            
            list.innerHTML = ownerBuildings.map(function(b, idx) {
                var badge = b.isPrimary ? '<span style="font-size: 11px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #4a5568; margin-left: 5px;">대표 건물</span>' : '';
                
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
                       b.name + ' ' + badge + 
                       '</h4>' +
                       '<p style="font-size: 12px; color: #718096;">' + b.address + '</p>' +
                       '</div>' +
                       '<div style="position: relative;">' +
                       '<button onclick="openBuildingManagementPage(' + idx + ')" style="background: none; border: none; color: #a0aec0; cursor: pointer; padding: 5px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>' +
                       '</div>' +
                       '</div>' +
                       roomsHtml +
                       '</div>';
            }).join('');
        }

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
                const matched = activeTenantsData.find(function(m) { return m.room === r.roomNumber; });
                const badge = matched ? '<span style="background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; border: 1px solid #b2f5ea;"><i class="fa-solid fa-user-check"></i> 입주: ' + matched.tenantName + '</span>' : '';
                return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; background: #f8fafc;">' +
                    '<span><strong style="color: var(--primary-deep-navy);">' + r.roomNumber + '</strong> <span style="font-size: 12px; color: #718096;">(' + r.type + ')</span>' + badge + '</span>' +
                    '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + ')" style="background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;">삭제</button>' +
                '</div>';
            }).join('');
        }

        function saveBuildingManagement(idx) {
            ownerBuildings[idx].name = document.getElementById('bm-name').value;
            ownerBuildings[idx].floors = parseInt(document.getElementById('bm-floors').value) || 1;
            showModalAlert('건물 정보가 성공적으로 수정되었습니다.');
            renderOwnerBuildings();
            showView('owner-app');
        }

        function setPrimaryBuildingFromPage(idx) {
            ownerBuildings.forEach(b => b.isPrimary = false);
            ownerBuildings[idx].isPrimary = true;
            showModalAlert('대표 건물로 지정되었습니다.');
            renderOwnerBuildings();
            showView('owner-app');
        }

        function deleteBuildingFromPage(idx) {
            if(confirm('정말로 이 건물을 삭제하시겠습니까?')) {
                const wasPrimary = ownerBuildings[idx].isPrimary;
                ownerBuildings.splice(idx, 1);
                if (wasPrimary && ownerBuildings.length > 0) {
                    ownerBuildings[0].isPrimary = true;
                }
                showModalAlert('건물이 삭제되었습니다.');
                renderOwnerBuildings();
                showView('owner-app');
            }
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
            isAuthenticated = true;
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
        function loadActiveTenants() {
            fetch('/api/matched-tenants')
                .then(res => res.json())
                .then(data => {
                    activeTenantsData = data;
                    const section = document.getElementById('active-tenants-section');
                    if (data.length === 0) {
                        section.innerHTML = '';
                        return;
                    }
                    section.innerHTML = '<div class="card" style="border-top: 4px solid #3182ce;">' +
                        '<div class="card-title" style="margin-bottom: 15px;"><i class="fa-solid fa-users"></i> 현재 관리 중인 임차인</div>' +
                        '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">' +
                        data.map(function(m) {
                            return '<div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">' +
                                '<div>' +
                                '<div style="font-size: 14px; font-weight: bold; color: var(--primary-deep-navy);">' + m.tenantName + ' <span style="font-size: 11px; font-weight: normal; background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">' + m.room + '</span></div>' +
                                '<div style="font-size: 12px; color: #718096; margin-top: 4px;">상태: 안전 거주 중</div>' +
                                '</div>' +
                                '<button class="btn" style="padding: 6px 12px; font-size: 12px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="showModalAlert(&quot;채널 연결 준비 중입니다.&quot;)">메시지</button>' +
                            '</div>';
                        }).join('') +
                        '</div></div>';
                    
                    // 건물 목록 다시 렌더링하여 배지 업데이트
                    renderOwnerBuildings();
                });
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

        function execDaumPostcode() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('owner-building-address').value = data.address;
                    if (data.buildingName && data.buildingName !== '') {
                        document.getElementById('owner-building-name').value = data.buildingName;
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
                isAuthenticated = true;
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
            isAuthenticated = true;
            showModalAlert(phone + ' 번호로 모두의 방 가입 초대 문자가 발송되었습니다!\\n임대인이 가입하시면 추후 자동으로 연동 신청이 가능합니다.');
            showView('tenant-app');
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
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[ModuRoom] 로컬 개발 서버가 작동 중입니다: http://localhost:${PORT}`);
});
