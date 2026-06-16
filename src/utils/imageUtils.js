/**
 * 이미지 전처리 및 메타데이터 파싱/삭제 유틸리티
 */
class ImageUtils {
  /**
   * EXIF 위치 메타데이터(GPS 등) 및 기타 민감 헤더를 강제 삭제하여 익명성을 보호합니다.
   * Node.js Buffer 환경에서의 간이 메타데이터 헤더 삭제 시뮬레이션
   * @param {Buffer} imageBuffer - 원본 이미지 버퍼
   * @returns {Buffer} 메타데이터가 파싱 및 삭제된 안전한 이미지 버퍼
   */
  static cleanExifMetadata(imageBuffer) {
    if (!Buffer.isBuffer(imageBuffer)) {
      throw new Error('올바른 이미지 버퍼 형식이 아닙니다.');
    }

    // JPEG의 경우 APP1(EXIF) 세그먼트 마커인 [0xFF, 0xE1]를 찾아 제거하거나 더미 데이터로 치환
    // 실제 프로덕션 라이브러리(ex. sharp, piexifjs 등) 동작의 간이 구현체
    console.log('[ImageUtils] 이미지 EXIF 위치 메타데이터를 강제 삭제합니다.');
    
    // EXIF 영역을 필터링한 새 안전 버퍼를 리턴하는 시뮬레이션
    // 원본 데이터를 복제하되 EXIF 헤더만 필터링한 것처럼 처리
    const cleanedBuffer = Buffer.from(imageBuffer);
    
    // JPEG 헤더 분석을 통한 간이 EXIF 제거 알고리즘
    let i = 0;
    if (cleanedBuffer[0] === 0xFF && cleanedBuffer[1] === 0xD8) {
      i = 2;
      while (i < cleanedBuffer.length) {
        if (cleanedBuffer[i] === 0xFF && cleanedBuffer[i + 1] === 0xE1) {
          // APP1 EXIF 마커 발견 시 해당 섹션 길이 파악 후 마스킹/삭제 진행
          const length = (cleanedBuffer[i + 2] << 8) + cleanedBuffer[i + 3];
          console.log(`[ImageUtils] EXIF Marker (APP1) 발견. 길이: ${length} 바이트. 제거 처리를 시작합니다.`);
          // 해당 범위를 0으로 마스킹하거나 제거 처리
          cleanedBuffer.fill(0, i, i + 2 + length);
          break;
        }
        i++;
      }
    }
    return cleanedBuffer;
  }

  /**
   * 커뮤니티 등록을 위해 상세 호실을 마스킹하고 랜덤 닉네임을 생성합니다.
   * @param {string} roomNumber - 예: "302호"
   * @returns {object} { maskedRoom: "3층", nickname: "행복한_방주인_12" }
   */
  static maskTenantIdentity(roomNumber) {
    const floorMatch = roomNumber.match(/(\d+)층|(\d+)\d{2}호/);
    let floor = "N층";
    if (floorMatch) {
      floor = `${floorMatch[1] || floorMatch[2]}층`;
    }

    // 랜덤 닉네임 생성
    const prefixes = ["포근한", "안락한", "맥시멀리스트", "미니멀리스트", "초록식물"];
    const suffixes = ["자취생", "인테리어왕", "집돌이", "집순이", "방꾸미기"];
    const randomIdx1 = Math.floor(Math.random() * prefixes.length);
    const randomIdx2 = Math.floor(Math.random() * suffixes.length);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const nickname = `${prefixes[randomIdx1]}_${suffixes[randomIdx2]}_${randomNum}`;

    return {
      maskedRoom: floor,
      nickname: nickname
    };
  }
}

module.exports = ImageUtils;
