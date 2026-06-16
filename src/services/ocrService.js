/**
 * 종이 계약서 이미지에서 AI OCR 분석을 통해 코어 데이터를 추출하는 시뮬레이션 서비스
 */
class OcrService {
  /**
   * 계약서 이미지를 파싱하여 데이터를 추출합니다.
   * @param {string} imageUri - 분석할 이미지 경로 또는 Base64 데이터
   * @returns {Promise<object>} 파싱된 계약서 데이터 객체
   */
  static async parseContractImage(imageUri) {
    return new Promise((resolve, reject) => {
      if (!imageUri) {
        return reject(new Error('계약서 이미지 경로가 누락되었습니다.'));
      }

      // OCR 분석 지연 시간 시뮬레이션 (3초 이내 반환 보장)
      setTimeout(() => {
        const mockResult = {
          success: true,
          execution_time_ms: 1100,
          data: {
            property: {
              address: "서울특별시 마포구 백범로 123",
              room_number: "302호",
              area_m2: 24.5
            },
            contract: {
              deposit: 10000000,
              monthly_rent: 550000,
              maintenance_fee: 70000,
              start_date: "2026-06-16",
              end_date: "2028-06-15"
            },
            tenant: {
              name: "홍길동",
              phone: "010-1234-5678"
            },
            broker: {
              agency_name: "대박공인중개사사무소",
              phone: "02-987-6543"
            }
          }
        };
        resolve(mockResult);
      }, 1000); // 1초 대기 후 결과 반환
    });
  }
}

module.exports = OcrService;
