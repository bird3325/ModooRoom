/**
 * 임차인 유도 카카오 알림톡 발송 모듈
 */
class NotificationService {
  /**
   * 신규 계약 등록 시 임차인에게 안전 주거 케어 혜택 안내 알림톡을 발송합니다.
   * @param {string} tenantName - 임차인 성명
   * @param {string} buildingName - 건물명
   * @param {string} phone - 수신 연락처
   * @returns {Promise<object>} 발송 결과 객체
   */
  static async sendWelcomeAlimtalk(tenantName, buildingName, phone) {
    return new Promise((resolve, reject) => {
      if (!tenantName || !buildingName || !phone) {
        return reject(new Error('발송에 필요한 파라미터가 누락되었습니다.'));
      }

      // 발송 시뮬레이션
      setTimeout(() => {
        const title = "🏠 [모두의 방] 입주민 안전 주거 케어 서비스 안내";
        const body = `안녕하세요 ${tenantName}님! 신규 입주하시는 ${buildingName}의 만족도 높은 거주를 위해 임대인께서 하우스 케어 시스템을 등록하셨습니다. 본 앱을 설치하시면 1) 번거로운 연락 없이 사진 한 장으로 1초 만에 접수하는 스마트 비대면 하자 보수 시스템, 2) 나와 완벽히 똑같은 구조의 이웃들은 방을 어떻게 꾸미고 사는지 구경하는 익명 인테리어 커뮤니티 '룸스토리' 가입 혜택을 즉시 누리실 수 있습니다.`;
        
        console.log(`[카카오 알림톡 발송 완료] -> ${phone}`);
        console.log(`[제목] ${title}`);
        console.log(`[본문] ${body}`);

        resolve({
          success: true,
          template_id: "WELCOME_TENANT_CARE",
          sent_at: new Date().toISOString(),
          recipient: {
            name: tenantName,
            phone: phone
          }
        });
      }, 500);
    });
  }
}

module.exports = NotificationService;
