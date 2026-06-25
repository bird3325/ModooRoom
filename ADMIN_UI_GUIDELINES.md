# 관리자 페이지 UI/UX 가이드라인 (Admin UI Guidelines)

본 문서는 '모두의 방' 관리자 페이지를 신규 생성하거나 수정할 때, 전체 페이지에서 공통된 UI와 동작을 유지하기 위해 작성된 규칙입니다.

## 1. 관리자 헤더 (Header / Navbar) 공통 규칙

새로운 관리자 페이지(`div#admin-...-app`)를 생성할 때, `<nav>` 헤더는 반드시 아래의 동일한 구조와 간격을 사용해야 합니다.

### 1.1 헤더 로고 영역 (navbar-brand)
- **배경색**: `style="background: #2d3748;"`
- **로고 텍스트**: `<span>모두의 방 ...</span>` (내부에 `margin-left: 5px` 등 불필요한 인라인 여백 사용 금지. 부모의 `gap: 8px` 속성을 통해 자동 정렬됨)
- **클릭 이벤트**: 로고 클릭 시 기본 관리자 대시보드(`admin-app`)로 이동하도록 `cursor: pointer;`와 `onclick="showView('admin-app')"`를 적용합니다.

**✅ 올바른 예시:**
```html
<nav class="navbar" style="background: #2d3748;">
    <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('admin-app')">
        <i class="fa-solid fa-user-shield"></i>
        <span>모두의 방 <span style="font-size:12px; color:#a0aec0;">[관리자 전용 - 메뉴 이름]</span></span>
    </div>
    ...
```

## 2. 관리자 드롭다운 메뉴 공통 규칙

우측 상단의 "관리자 메뉴" 드롭다운 역시 모든 관리자 페이지에서 동일한 순서와 구분선(`<hr>`)을 가져야 합니다. 특정 페이지에서 임의로 항목을 빼거나 구분선 개수를 다르게 하지 마세요.

### 2.1 드롭다운 메뉴 구조
드롭다운 내부 항목은 다음의 순서와 형식을 엄격히 따릅니다:
1. 관리자 대시보드
2. (구분선)
3. 회원 관리
4. (구분선)
5. 시스템 설정
6. (구분선)
7. 로그아웃

**✅ 올바른 드롭다운 예시:**
```html
<div class="user-profile" style="position: relative;">
    <button id="[PAGE_ID]-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggle[PAGE_ID]Menu(event)">
        관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
    </button>
    <div id="[PAGE_ID]-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
        <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('[PAGE_ID]-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
        <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
        <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('[PAGE_ID]-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
        <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
        <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('[PAGE_ID]-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
        <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
        <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('[PAGE_ID]-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
    </div>
</div>
```

---
*이 문서는 추후 관리자 전용 뷰가 추가될 때마다 일관된 사용자 경험(UX)을 제공하기 위한 체크리스트로 활용됩니다.*
