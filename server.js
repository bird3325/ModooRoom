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
                    <input type="email" id="login-email" class="form-control" required value="user@moduroom.com">
                </div>
                <div class="form-group">
                    <label>비밀번호</label>
                    <input type="password" id="login-password" class="form-control" required value="password123">
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
                <button type="submit" class="btn-auth" id="btn-signup-submit">회원가입 완료</button>
            </form>
            <div class="auth-switch">
                이미 가입하셨나요? <a href="#" onclick="showView('login')">로그인하기</a>
            </div>
        </div>
    </div>

    <!-- 인증 전 메인 뷰 추가 -->
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
                    <a href="#" class="dropdown-item" onclick="authenticateRole('owner')">임대인 인증</a>
                    <a href="#" class="dropdown-item" onclick="authenticateRole('tenant')">임차인 인증</a>
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
                            <div style="display: flex; gap: 10px;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="padding: 8px 12px; font-size: 13px;">
                                <button class="btn btn-orange" style="padding: 8px 16px;" onclick="handleCommentSubmit()">등록</button>
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
                            <div style="display: flex; gap: 10px;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="padding: 8px 12px; font-size: 13px;">
                                <button class="btn btn-orange" style="padding: 8px 16px;" onclick="handleCommentSubmit()">등록</button>
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
                            <div style="display: flex; gap: 10px;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="padding: 8px 12px; font-size: 13px;">
                                <button class="btn btn-orange" style="padding: 8px 16px;" onclick="handleCommentSubmit()">등록</button>
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
                            <div style="display: flex; gap: 10px;">
                                <input type="text" class="form-control" placeholder="댓글을 입력하세요..." style="padding: 8px 12px; font-size: 13px;">
                                <button class="btn btn-orange" style="padding: 8px 16px;" onclick="handleCommentSubmit()">등록</button>
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

    <!-- 커스텀 알럿 모달 -->
    <div id="custom-alert-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; padding: 25px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center;">
            <i class="fa-solid fa-circle-info" style="font-size: 40px; color: var(--point-orange); margin-bottom: 15px;"></i>
            <p id="custom-alert-message" style="font-size: 15px; color: var(--primary-deep-navy); margin-bottom: 25px; line-height: 1.5;"></p>
            <button class="btn btn-orange" style="width: 100%; justify-content: center;" onclick="closeCustomAlert()">확인</button>
        </div>
    </div>

    <script>
        let isAuthenticated = false;

        function showModalAlert(message) {
            document.getElementById('custom-alert-message').innerText = message;
            document.getElementById('custom-alert-modal').classList.remove('hidden');
        }

        function closeCustomAlert() {
            document.getElementById('custom-alert-modal').classList.add('hidden');
        }

        // 드롭다운 외부 클릭 시 닫기
        window.addEventListener('click', function(e) {
            if (!document.getElementById('main-display-name').contains(e.target)) {
                document.getElementById('user-dropdown').classList.add('hidden');
            }
        });

        function toggleUserMenu(e) {
            e.stopPropagation();
            document.getElementById('user-dropdown').classList.toggle('hidden');
        }

        function showView(viewName) {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('owner-app').classList.add('hidden');
            document.getElementById('tenant-app').classList.add('hidden');
            if(document.getElementById('map-app')) document.getElementById('map-app').classList.add('hidden');
            if(document.getElementById('story-detail-app')) document.getElementById('story-detail-app').classList.add('hidden');

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
            } else if (viewName === 'owner-app') {
                document.getElementById('owner-app').classList.remove('hidden');
                loadInventory();
                checkPendingInvites();
            } else if (viewName === 'tenant-app') {
                document.getElementById('tenant-app').classList.remove('hidden');
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

        function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const namePrefix = email.split('@')[0].toUpperCase();
            
            // 메인 뷰 사용자 이름 렌더링
            document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            
            // 임대인, 임차인 화면의 이름도 미리 준비 (인증 시 활용)
            document.getElementById('owner-display-name').innerText = namePrefix + ' 파트너';
            document.getElementById('tenant-display-name').innerText = namePrefix + ' 입주민';
            
            isAuthenticated = false; // 로그인 직후는 미인증 상태
            showView('main-app');
        }

        function handleSignup(e) {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
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
                showModalAlert('임차인 매칭 승인이 완료되어 계약 공간이 동기화되었습니다!');
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
