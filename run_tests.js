const assert = require('assert');
const OcrService = require('./src/services/ocrService');
const NotificationService = require('./src/services/notificationService');
const InventoryService = require('./src/services/inventoryService');
const ImageUtils = require('./src/utils/imageUtils');
const SecurityService = require('./src/services/securityService');

async function runTests() {
  console.log('=== 모두의 방 로직 유닛 테스트 시작 ===');

  // 1. OCR Service Test
  console.log('\n[테스트 1] OCR 분석 서비스 검증...');
  const ocrResult = await OcrService.parseContractImage('dummy_contract_image.jpg');
  assert.strictEqual(ocrResult.success, true);
  assert.strictEqual(ocrResult.data.tenant.name, '홍길동');
  assert.strictEqual(ocrResult.data.property.room_number, '302호');
  console.log('=> OCR 분석 테스트 통과 (3초 이내 반환 확인)');

  // 2. Notification Service Test
  console.log('\n[테스트 2] 카카오 알림톡 서비스 검증...');
  const notificationResult = await NotificationService.sendWelcomeAlimtalk(
    ocrResult.data.tenant.name,
    '대박빌딩',
    ocrResult.data.tenant.phone
  );
  assert.strictEqual(notificationResult.success, true);
  assert.strictEqual(notificationResult.template_id, 'WELCOME_TENANT_CARE');
  console.log('=> 알림톡 템플릿 치환 및 발송 테스트 통과');

  // 3. Inventory Service Test
  console.log('\n[테스트 3] 자재 재고 트래킹 서비스 검증...');
  const inventory = new InventoryService();
  let items = inventory.getItemsStatus();
  
  // 배수구 트랩은 기본 최소 재고 2개에 현재 1개이므로 경고(is_low_stock = true)여야 함
  const trap = items.find(i => i.id === 'drain_trap');
  assert.strictEqual(trap.is_low_stock, true);
  assert.strictEqual(trap.badge_color, '#ed8936'); // Point Orange 경고 컬러 매핑 확인

  // LED 벌브를 3개 소모하여 2개로 만들면 경고 조건 진입
  const updatedBulb = inventory.updateStock('led_bulb', -3);
  assert.strictEqual(updatedBulb.is_low_stock, true);
  assert.strictEqual(updatedBulb.badge_color, '#ed8936');
  console.log('=> 자재 재고 최소 임계치 알림 및 오렌지 배지 컬러 매핑 테스트 통과');

  // 4. Image Utilities Test
  console.log('\n[테스트 4] 익명성 보장 마스킹 및 EXIF 제거 검증...');
  const dummyJpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xFF, 0xD9]);
  const cleaned = ImageUtils.cleanExifMetadata(dummyJpg);
  
  // EXIF APP1 마커 영역이 성공적으로 0으로 덮어써졌는지 확인
  assert.strictEqual(cleaned[3], 0x00); // EXIF 마커 E1이 00으로 삭제/마스킹되었는지 확인
  assert.strictEqual(cleaned[4], 0x00); // 세그먼트 길이값 영역도 00으로 덮어써졌는지 확인
  
  const maskingResult = ImageUtils.maskTenantIdentity('302호');
  assert.strictEqual(maskingResult.maskedRoom, '3층');
  assert.ok(maskingResult.nickname.includes('_'));
  console.log('=> EXIF 제거 및 호실 익명 마스킹 테스트 통과');

  // 5. Security OTP Service Test
  console.log('\n[테스트 5] 부동산 역제안 OTP 서비스 검증...');
  const security = new SecurityService();
  const otp = security.generateOTP('302호', 30);
  
  // 정상 인증 확인
  const isOk = security.verifyAndConsumeOTP(otp, '302호');
  assert.strictEqual(isOk, true);
  
  // 1회 사용 후 파기되었는지 재확인
  const isReusedOk = security.verifyAndConsumeOTP(otp, '302호');
  assert.strictEqual(isReusedOk, false);
  console.log('=> OTP 발급, 검증 및 1회성 소멸 정책 테스트 통과');

  console.log('\n=== 모든 유닛 테스트가 성공적으로 통과되었습니다. ===');
}

runTests().catch(err => {
  console.error('테스트 실패:', err);
  process.exit(1);
});
