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


const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  
  // 정적 파일 서빙 로직 (CSS, JS)
  if (req.method === 'GET' && (parsedUrl.pathname.startsWith('/css/') || parsedUrl.pathname.startsWith('/js/'))) {
    const filePath = path.join(__dirname, 'public', parsedUrl.pathname);
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    if (ext === '.css') contentType = 'text/css; charset=utf-8';
    if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
    
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(content);
    } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
    }
  }

  // HTML 서빙 로직
  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html' || parsedUrl.pathname === '/admin')) {
    try {
        let content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (parsedUrl.pathname === '/admin') {
            content = content.replace('</head>', '<script>window.IS_ADMIN_ROUTE = true;</script></head>');
        }
        return res.end(content);
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Error loading index.html');
    }
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
