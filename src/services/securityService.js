/**
 * 부동산 예약 및 OTP 보안 관리 서비스
 */
class SecurityService {
  constructor() {
    this.otpStore = new Map(); // token -> { expiry, roomNumber }
  }

  /**
   * 특정 호실의 중개인 방문 예약을 위한 일회용 비밀번호(OTP)를 생성합니다.
   * @param {string} roomNumber - 대상 호실
   * @param {number} durationMinutes - 유효 기간 (기본 30분)
   * @returns {string} 6자리 일회용 비밀번호
   */
  generateOTP(roomNumber, durationMinutes = 30) {
    // 6자리 난수 생성
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + durationMinutes * 60 * 1000;

    this.otpStore.set(otp, {
      roomNumber,
      expiry
    });

    console.log(`[SecurityService] 호실 ${roomNumber}에 대해 일회용 비밀번호 [${otp}]가 발급되었습니다. (유효시간: ${durationMinutes}분)`);
    return otp;
  }

  /**
   * 중개인이 입력한 OTP를 검증하고 사용 완료 처리(폐기)를 진행합니다.
   * @param {string} otp - 입력받은 OTP 번호
   * @param {string} roomNumber - 검증할 대상 호실
   * @returns {boolean} 검증 통과 여부
   */
  verifyAndConsumeOTP(otp, roomNumber) {
    if (!this.otpStore.has(otp)) {
      console.log(`[SecurityService] 존재하지 않는 OTP입니다.`);
      return false;
    }

    const record = this.otpStore.get(otp);

    // 유효 기간 검증
    if (Date.now() > record.expiry) {
      console.log(`[SecurityService] 만료된 OTP입니다.`);
      this.otpStore.delete(otp); // 만료 시 자동 파기
      return false;
    }

    // 대상 호실 일치 여부 검증
    if (record.roomNumber !== roomNumber) {
      console.log(`[SecurityService] 요청된 호실과 일치하지 않는 OTP입니다.`);
      return false;
    }

    // 1회성 사용 원칙에 따라 즉시 파기
    this.otpStore.delete(otp);
    console.log(`[SecurityService] OTP 검증 성공. 일회용 비밀번호 [${otp}]가 정상 소멸되었습니다.`);
    return true;
  }
}

module.exports = SecurityService;
