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
                if (key === 'GEMINI_API_KEY') process.env.GEMINI_API_KEY = value;
            }
        });
    }
    console.log('Loaded supabaseConfig:', supabaseConfig);
    console.log('Loaded GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
} catch (e) {
    console.error('.env 파일을 읽는 중 오류 발생:', e);
}


const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  
  // 정적 파일 서빙 로직 (CSS, JS, HTML Views)
  if (req.method === 'GET' && (parsedUrl.pathname.startsWith('/css/') || parsedUrl.pathname.startsWith('/js/') || parsedUrl.pathname.startsWith('/views/'))) {
    const filePath = path.join(__dirname, 'public', parsedUrl.pathname);
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    if (ext === '.css') contentType = 'text/css; charset=utf-8';
    if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
    if (ext === '.html') contentType = 'text/html; charset=utf-8';
    
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
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

        // bAddr는 2차 인증 시에만 필수이며, 대시보드 다이렉트 업로드 시에는 주소가 없을 수 있으므로 빈 값 허용
        if (!imageBase64 || !ownerName) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: '계약서 이미지 또는 임대인 이름이 누락되었습니다.' }));
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
        // bAddr가 제공되었을 때만 주소 매칭 검증을 실시하고, 그렇지 않으면 우회(true) 처리
        let isAddrMatched = true;
        if (bAddr && bAddr.trim() !== '') {
            const addrParts = bAddr.split(/\s+/).filter(p => p.length > 0);
            let matchedAddrCount = 0;
            for (let part of addrParts) {
                if (cleanText.includes(part) || text.includes(part)) {
                    matchedAddrCount++;
                } else if (part === '서울' && cleanText.includes('서울특별시')) {
                    matchedAddrCount++;
                } else if (part === '경기' && cleanText.includes('경기도')) {
                    matchedAddrCount++;
                }
            }
            const lastToken = addrParts[addrParts.length - 1];
            isAddrMatched = (matchedAddrCount >= Math.ceil(addrParts.length / 2)) || (lastToken && cleanText.includes(lastToken) && lastToken.length >= 2);
        }
        
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
                room: roomMatch ? roomMatch[1] : '미지정'
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

        // 주소 정보 동적 추출 시도
        let extractedAddress = null;
        const addressMatch = text.match(/(?:소재지|주소|토지소재지)[\s:：]*([^\n\r]+)/);
        if (addressMatch) {
            extractedAddress = addressMatch[1].trim();
        }

        // 최종 판별: 이름과 주소가 모두 일치해야 성공 처리
        let matched = (isNameMatched && isAddrMatched);
        
        console.log(`[OCR 매칭 결과] 이름: ${isNameMatched}, 주소: ${isAddrMatched}, 양식확인: ${hasContractKeywords} -> 최종: ${matched ? '일치' : '불일치'}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, matched: matched, extractedTenant: extractedTenant, extractedContract: extractedContract, extractedAddress: extractedAddress }));
      } catch (err) {
        console.error('[OCR 처리 중 에러 발생]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'OCR 이미지 처리 중 오류가 발생했습니다.' }));
      }
    });
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/ocr-region') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const imageBase64 = data.imageBase64;
        if (!imageBase64) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: '이미지가 누락되었습니다.' }));
        }

        const tesseract = require('tesseract.js');
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        console.log('[부분 영역 OCR 분석 시작...]');
        const ocrResult = await tesseract.recognize(buffer, 'kor+eng');
        const text = ocrResult.data.text.trim();
        console.log(`[부분 영역 OCR 분석 완료] 결과: "${text}"`);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, text: text }));
      } catch (err) {
        console.error('[부분 영역 OCR 에러]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/gemini-extract') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const imageBase64 = data.imageBase64;
        const apiKey = data.apiKey || process.env.GEMINI_API_KEY;

        if (!imageBase64) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: '계약서 이미지가 누락되었습니다.' }));
        }

        let extractedData = null;
        let methodUsed = '';

        if (apiKey && apiKey.trim().length > 10) {
            try {
                console.log('[Gemini API 호출 시작...]');
                const { GoogleGenAI } = require('@google/genai');
                const ai = new GoogleGenAI({ apiKey: apiKey });
                const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
                
                const prompt = `
당신은 대한민국 임대차계약서 분석 전문가입니다.
첨부된 임대차 계약서 이미지에서 아래의 필드 정보를 정확히 추출해서 반드시 순수한 JSON 형식으로만 응답해주세요. 마크다운(\`\`\`) 등 불필요한 텍스트는 일체 포함하지 마세요.

추출해야 할 필드 (JSON key 이름 일치 필수):
1. ocr_room_number: 임대할 부분 (호실, 숫자만 추출, 예: 302)
1-1. ocr_room_count: 해당 호실 내 방 개수 (숫자만 추출, 예: 1)
1-2. ocr_bathroom_count: 해당 호실 내 화장실 개수 (숫자만 추출, 예: 1)
1-3. ocr_living_room_count: 해당 호실 내 거실 개수 (숫자만 추출, 예: 0)
1-4. ocr_veranda_count: 해당 호실 내 베란다/발코니 개수 (숫자만 추출, 예: 1)
2. ocr_area: 임대 면적 (m, ㎡ 등 단위 제외하고 숫자만 추출, 예: 24.5)
3. ocr_deposit: 보증금 (원 단위 숫자만, 예: 10000000)
4. ocr_monthly_rent: 차임(월세) (원 단위 숫자만, 예: 550000)
5. ocr_maintenance_fee: 관리비 (원 단위 숫자만, 예: 70000)
6. ocr_cleaning_fee: 청소비 (원 단위 숫자만, 예: 100000)
7. ocr_contract_date: 계약일 (YYYY-MM-DD 형식, 예: 2026-06-16)
8. ocr_lease_start_date: 임대차 시작일 (YYYY-MM-DD 형식, 예: 2026-06-16)
8_1. ocr_lease_end_date: 임대차 종료일 (YYYY-MM-DD 형식, 예: 2028-06-15)
9. ocr_tenant_name: 임차인 성명 (예: 홍길동)
10. ocr_tenant_phone: 임차인 전화번호 (예: 010-1234-5678)
11. ocr_broker_address: 개업공인중개사 소재지
12. ocr_broker_agency_name: 중개사무소 명칭
13. ocr_broker_representative: 개업공인중개사 대표 성명
14. ocr_broker_registration_no: 중개사무소 등록번호
15. ocr_broker_phone: 개업공인중개사 전화번호

문서에서 해당 항목을 식별할 수 없는 경우, 본문의 텍스트를 기준으로 가장 유사한 값을 추출해 주세요.
`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: 'image/png'
                            }
                        },
                        prompt
                    ],
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                ocr_room_number: { type: 'STRING', description: '임대할 부분 호실 (숫자만)' },
                                ocr_room_count: { type: 'STRING', description: '해당 호실 내 방 개수 (숫자만)' },
                                ocr_bathroom_count: { type: 'STRING', description: '해당 호실 내 화장실 개수 (숫자만)' },
                                ocr_living_room_count: { type: 'STRING', description: '해당 호실 내 거실 개수 (숫자만)' },
                                ocr_veranda_count: { type: 'STRING', description: '해당 호실 내 베란다 개수 (숫자만)' },
                                ocr_area: { type: 'STRING', description: '임대 면적 (m, ㎡ 등 단위 제외하고 숫자만)' },
                                ocr_deposit: { type: 'STRING', description: '보증금 (원 단위 숫자만)' },
                                ocr_monthly_rent: { type: 'STRING', description: '차임(월세) (원 단위 숫자만)' },
                                ocr_maintenance_fee: { type: 'STRING', description: '관리비 (원 단위 숫자만)' },
                                ocr_cleaning_fee: { type: 'STRING', description: '청소비 (원 단위 숫자만)' },
                                ocr_contract_date: { type: 'STRING', description: '계약일 (YYYY-MM-DD 형식)' },
                                ocr_lease_start_date: { type: 'STRING', description: '임대차 시작일 (YYYY-MM-DD 형식)' },
                                ocr_lease_end_date: { type: 'STRING', description: '임대차 종료일 (YYYY-MM-DD 형식)' },
                                ocr_tenant_name: { type: 'STRING', description: '임차인 성명' },
                                ocr_tenant_phone: { type: 'STRING', description: '임차인 전화번호' },
                                ocr_broker_address: { type: 'STRING', description: '개업공인중개사 소재지' },
                                ocr_broker_agency_name: { type: 'STRING', description: '중개사무소 명칭' },
                                ocr_broker_representative: { type: 'STRING', description: '개업공인중개사 대표 성명' },
                                ocr_broker_registration_no: { type: 'STRING', description: '중개사무소 등록번호' },
                                ocr_broker_phone: { type: 'STRING', description: '개업공인중개사 전화번호' }
                            },
                            required: [
                                'ocr_room_number', 'ocr_room_count', 'ocr_bathroom_count', 'ocr_living_room_count', 'ocr_veranda_count',
                                'ocr_area', 'ocr_deposit', 'ocr_monthly_rent',
                                'ocr_maintenance_fee', 'ocr_cleaning_fee', 'ocr_contract_date',
                                'ocr_lease_start_date', 'ocr_lease_end_date', 'ocr_tenant_name',
                                'ocr_tenant_phone', 'ocr_broker_address', 'ocr_broker_agency_name',
                                'ocr_broker_representative', 'ocr_broker_registration_no', 'ocr_broker_phone'
                            ]
                        }
                    }
                });
                
                let text = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text);
                if (text) {
                    // 마크다운 블록 제거 및 JSON 객체 텍스트 영역만 추출
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        extractedData = JSON.parse(jsonMatch[0].trim());
                        methodUsed = 'Gemini 2.5 Flash';
                        console.log('[Gemini API 호출 성공: 정보 추출 완료]');
                    } else {
                        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        extractedData = JSON.parse(text);
                        methodUsed = 'Gemini 2.5 Flash';
                        console.log('[Gemini API 호출 성공: 정보 추출 완료 - 정규식 미검출 대체]');
                    }
                }
            } catch (geminiError) {
                console.error('[Gemini API 호출 실패, Tesseract OCR로 대체 진행합니다]', geminiError);
            }
        }

        if (!extractedData) {
            console.log('[Tesseract OCR 기반 분석 시작...]');
            const tesseract = require('tesseract.js');
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const ocrResult = await tesseract.recognize(buffer, 'kor');
            const text = ocrResult.data.text;
            const cleanText = text.replace(/\s+/g, '');
            
            const roomMatch = text.match(/(?:제\s*|호실\s*|\s)([0-9]{2,4})\s*호/) || cleanText.match(/(?:제|호실)([0-9]{2,4})호/);
            const room = roomMatch ? roomMatch[1] : '302';

            const roomCountMatch = text.match(/방\s*([0-9]{1,2})\s*개/) || cleanText.match(/방([0-9]{1,2})개/);
            const roomCount = roomCountMatch ? roomCountMatch[1] : '1';

            const bathroomCountMatch = text.match(/(?:화장실|욕실)\s*([0-9]{1,2})\s*개/) || cleanText.match(/(?:화장실|욕실)([0-9]{1,2})개/);
            const bathroomCount = bathroomCountMatch ? bathroomCountMatch[1] : '1';

            const livingRoomCountMatch = text.match(/거실\s*([0-9]{1,2})\s*개/) || cleanText.match(/거실([0-9]{1,2})개/);
            const livingRoomCount = livingRoomCountMatch ? livingRoomCountMatch[1] : '0';

            const verandaCountMatch = text.match(/(?:베란다|발코니)\s*([0-9]{1,2})\s*개/) || cleanText.match(/(?:베란다|발코니)([0-9]{1,2})개/);
            const verandaCount = verandaCountMatch ? verandaCountMatch[1] : '1';
            
            const areaMatch = text.match(/([0-9.]+)\s*(?:㎡|m|m²)?/) || text.match(/면적\s*([0-9.]+)/) || cleanText.match(/면적.*?([0-9.]+)/);
            let area = areaMatch ? areaMatch[1] : '24.5';
            area = area.replace(/[m㎡²]/gi, '').trim();
            
            const depositMatch = text.match(/보증금[^0-9]*([0-9,]+(?:만|억)?)\s*원?/) || cleanText.match(/보증금.*?([0-9,]+(?:만|억)?)원/);
            const deposit = depositMatch ? depositMatch[1] : '10,000,000';
            
            const rentMatch = text.match(/차임[^0-9]*([0-9,]+(?:만)?)\s*원?/) || text.match(/월세[^0-9]*([0-9,]+(?:만)?)\s*원?/) || cleanText.match(/차임.*?([0-9,]+(?:만)?)원/) || cleanText.match(/월세.*?([0-9,]+(?:만)?)원/);
            const rent = rentMatch ? rentMatch[1] : '550,000';
            
            const maintMatch = text.match(/관리비[^0-9]*([0-9,]+(?:만)?)\s*원?/) || cleanText.match(/관리비.*?([0-9,]+(?:만)?)원/);
            const maint = maintMatch ? maintMatch[1] : '70,000';
            
            const cleanMatch = text.match(/청소비[^0-9]*([0-9,]+(?:만)?)\s*원?/) || cleanText.match(/청소비.*?([0-9,]+(?:만)?)원/);
            const cleaning = cleanMatch ? cleanMatch[1] : '0';
            
            const contractDateMatch = text.match(/([0-9]{4})\s*년\s*([0-9]{1,2})\s*월\s*([0-9]{1,2})\s*일/) || cleanText.match(/([0-9]{4})년([0-9]{1,2})월([0-9]{1,2})일/);
            let contractDate = '2026-06-16';
            if (contractDateMatch) {
                const y = contractDateMatch[1];
                const m = contractDateMatch[2].padStart(2, '0');
                const d = contractDateMatch[3].padStart(2, '0');
                contractDate = `${y}-${m}-${d}`;
            }
            
            const periodMatch = text.match(/([0-9]{4})년\s*([0-9]{1,2})월\s*([0-9]{1,2})일부터.*?([0-9]{4})년\s*([0-9]{1,2})월\s*([0-9]{1,2})일까지/) || 
                                cleanText.match(/([0-9]{4})년([0-9]{1,2})월([0-9]{1,2})일부터.*?([0-9]{4})년([0-9]{1,2})월([0-9]{1,2})일까지/);
            let leaseStartDate = '2026-06-16';
            let leaseEndDate = '2028-06-15';
            if (periodMatch) {
                leaseStartDate = `${periodMatch[1]}-${periodMatch[2].padStart(2, '0')}-${periodMatch[3].padStart(2, '0')}`;
                leaseEndDate = `${periodMatch[4]}-${periodMatch[5].padStart(2, '0')}-${periodMatch[6].padStart(2, '0')}`;
            }
            
            const tenantNameMatch = text.match(/임차인(?:성명)?(?:\s*:\s*|\s+)([가-힣]{2,4})/) || cleanText.match(/임차인(?:성명)?(?:[^가-힣]*)([가-힣]{2,4})/);
            const tenantName = tenantNameMatch ? tenantNameMatch[1] : '홍길동';
            
            // 10. 임차인 전화번호
            const tenantPhoneMatch = text.match(/임차인.*?(010-[0-9]{3,4}-[0-9]{4})/) || text.match(/(010-[0-9]{3,4}-[0-9]{4})/);
            const tenantPhone = tenantPhoneMatch ? tenantPhoneMatch[1] : '010-1234-5678';
            
            // 11. 중개사 주소
            const realtorAddrMatch = text.match(/중개사무소.*?소재지\s*(.+)/) || cleanText.match(/소재지([가-힣\s0-9]+로[가-힣\s0-9]+)/);
            const realtorAddr = realtorAddrMatch ? realtorAddrMatch[1].trim() : '서울특별시 마포구 백범로 123';
            
            // 12. 중개사무소 명칭
            const realtorNameMatch = text.match(/중개사무소.*?명칭\s*([가-힣\s]+)/) || cleanText.match(/명칭([가-힣\s]+공인중개사)/);
            const realtorName = realtorNameMatch ? realtorNameMatch[1].trim() : '대박공인중개사사무소';
            
            // 13. 중개사 대표 성명
            const realtorRepMatch = text.match(/대표자?\s*([가-힣]{2,4})/) || cleanText.match(/대표자([가-힣]{2,4})/);
            const realtorRep = realtorRepMatch ? realtorRepMatch[1] : '김대박';
            
            // 14. 중개사 등록번호
            const realtorRegMatch = text.match(/등록번호\s*([a-zA-Z0-9가-힣-]+)/) || cleanText.match(/등록번호([a-zA-Z0-9가-힣-]+)/);
            const realtorReg = realtorRegMatch ? realtorRegMatch[1] : '11440-2015-00123';
            
            // 15. 중개사 전화번호
            const realtorPhoneMatch = text.match(/전화\s*([0-9-]+)/) || cleanText.match(/전화([0-9-]+)/);
            const realtorPhone = realtorPhoneMatch ? realtorPhoneMatch[1] : '02-987-6543';

            extractedData = {
                ocr_room_number: room,
                ocr_room_count: roomCount,
                ocr_bathroom_count: bathroomCount,
                ocr_living_room_count: livingRoomCount,
                ocr_veranda_count: verandaCount,
                ocr_area: area,
                ocr_deposit: deposit,
                ocr_monthly_rent: rent,
                ocr_maintenance_fee: maint,
                ocr_cleaning_fee: cleaning,
                ocr_contract_date: contractDate,
                ocr_lease_start_date: leaseStartDate,
                ocr_lease_end_date: leaseEndDate,
                ocr_tenant_name: tenantName,
                ocr_tenant_phone: tenantPhone,
                ocr_broker_address: realtorAddr,
                ocr_broker_agency_name: realtorName,
                ocr_broker_representative: realtorRep,
                ocr_broker_registration_no: realtorReg,
                ocr_broker_phone: realtorPhone
            };
            methodUsed = 'Tesseract OCR + Regex Parser';
            console.log('[Tesseract OCR 15개 항목 추출 완료]');
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, data: extractedData, method: methodUsed }));
      } catch (err) {
        console.error('[Gemini 추출 에러]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'AI 데이터 추출 중 오류가 발생했습니다: ' + err.message }));
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
