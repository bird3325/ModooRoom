/**
 * 소모품 자재 재고 트래킹 서비스
 */
class InventoryService {
  constructor() {
    // 기본 품목 데이터베이스 초기 설정
    this.items = [
      { id: 'led_bulb', name: 'LED 전등', stock: 5, min_required: 3 },
      { id: 'doorlock_battery', name: '도어락 배터리', stock: 12, min_required: 10 },
      { id: 'sink_faucet', name: '싱크대 수전', stock: 2, min_required: 1 },
      { id: 'drain_trap', name: '배수구 트랩', stock: 1, min_required: 2 } // 현재 최소 재고 이하 경고 상태 예시
    ];
  }

  /**
   * 전체 자재 재고 상태 및 경고 플래그 목록을 가져옵니다.
   */
  getItemsStatus() {
    return this.items.map(item => {
      const is_low_stock = item.stock <= item.min_required;
      return {
        ...item,
        is_low_stock,
        badge_color: is_low_stock ? '#ed8936' : '#2b6cb0',
        badge_text: is_low_stock ? '주문 필요' : '보유중'
      };
    });
  }

  /**
   * 특정 자재의 사용 및 입고 처리를 진행합니다.
   * @param {string} itemId - 자재 ID
   * @param {number} amount - 증감 수량 (사용 시 음수, 입고 시 양수)
   */
  updateStock(itemId, amount) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error('존재하지 않는 자재 품목입니다.');
    }
    item.stock = Math.max(0, item.stock + amount);
    return this.getItemsStatus().find(i => i.id === itemId);
  }
}

module.exports = InventoryService;
