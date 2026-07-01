/**
 * 소모품 자재 재고 트래킹 서비스
 */
class InventoryService {
  constructor() {
    // 기본 품목 데이터베이스 초기 설정
    this.items = [
      { 
        id: 'led_bulb', 
        name: 'LED 전등', 
        stock: 5, 
        min_required: 3,
        image_url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2VkODkzNiI+PHBhdGggZD0iTTEyIDJDOC4xNCAyIDUgNS4xNCA1IDljMCAyLjM4IDEuMTkgNC40NyAzIDUuNzRWMTdjMCAuNTUuNDUgMSAxIDFoNmMuNTUgMCAxLS40NSAxLTF2LTIuMjZjMS44MS0xLjI3IDMtMy4zNiAzLTUuNzQgMC0zLjg2LTMuMTQtNy03LTd6bTIgMThoLTRjLS41NSAwLTEgLjQ1LTEgMXMuNDUgMSAxIDFoNGMuNTUgMCAxLS40NSAxLTFzLS40NS0xLTEtMXoiLz48L3N2Zz4='
      },
      { 
        id: 'doorlock_battery', 
        name: '도어락 배터리', 
        stock: 12, 
        min_required: 10,
        image_url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzQ4YmI3OCI+PHBhdGggZD0iTTE3IDZoLTJWNWMwLS41NS0uNDUtMS0xLTFoLTRjLS41NSAwLTEgLjQ1LTEgMXYxSDdjLTEuMSAwLTIgLjktMiAydjEwYzAgMS4xLjkgMiAyIDJoMTBjMS4xIDAgMi0uOSAyLTJWOGMwLTEuMS0uOS0yLTItMnptLTEgMTBIOHYtMmg4djJ6bTAtNEg4VjhoOHY0eiIvPjwvc3ZnPg=='
      },
      { 
        id: 'sink_faucet', 
        name: '싱크대 수전', 
        stock: 2, 
        min_required: 1,
        image_url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzMxODJjZSI+PHBhdGggZD0iTTE5IDEyaC0ydi0yYzAtMi43Ni0yLjI0LTUtNS01UzcgNy4yNCA3IDEwdjJINWMtMS4xIDAtMiAuOS0yIDJ2M2MwIC41NS40NSAxIDEgMWgxNmMuNTUgMCAxLS40NSAxLTF2LTNjMC0xLjEtLjktMi0yLTJ6TTEyIDdjMS42NiAwIDMgMS4zNCAzIDN2Mkg5di0yYzAtMS42NiAxLjM0LTMgMy0zeiIvPjwvc3ZnPg=='
      },
      { 
        id: 'drain_trap', 
        name: '배수구 트랩', 
        stock: 1, 
        min_required: 2,
        image_url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzRhNTU2OCI+PHBhdGggZD0iTTE5IDNoLTRjLTEuMSAwLTIgLjktMiAydjJIOWMtMS4xIDAtMiAuOS0yIDJ2NGMwIDEuNjYgMS4zNCAzIDMgM2g0djJjMCAxLjEtLjkgMi0yIDJzLTItLjktMi0ydi0xYzAtLS41NS0uNDUtMS0xLTFzLTEgLjQ1LTEgMXYxYzAgMi4yMSAxLjc5IDQgNCA0czQtMS43OSA0LTR2LTJoM2MxLjY2IDAgMy0xLjM0IDMtM1Y1YzAtMS4xLS45LTItMy0yeiIvPjwvc3ZnPg=='
      }
    ];

    // 기본 트랜잭션 내역 초기 설정
    this.transactions = [
      { id: 't-1', itemId: 'led_bulb', type: 'in', amount: 5, date: '2026-06-25 10:15:30', description: '초기 재고 등록' },
      { id: 't-2', itemId: 'doorlock_battery', type: 'in', amount: 12, date: '2026-06-26 14:20:00', description: '초기 재고 등록' },
      { id: 't-3', itemId: 'sink_faucet', type: 'in', amount: 2, date: '2026-06-27 11:30:15', description: '초기 재고 등록' },
      { id: 't-4', itemId: 'drain_trap', type: 'in', amount: 2, date: '2026-06-28 09:00:00', description: '초기 재고 등록' },
      { id: 't-5', itemId: 'drain_trap', type: 'out', amount: -1, date: '2026-06-30 16:45:00', description: '302호 세면대 하자 보수 교체 사용' }
    ];
  }

  /**
   * YYYY-MM-DD HH:mm:ss 형태의 날짜 헬퍼
   */
  getFormattedDate() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * 트랜잭션 내역을 추가합니다.
   */
  addTransaction(itemId, type, amount, description) {
    const tx = {
      id: 't-' + (this.transactions.length + 1) + '-' + Math.random().toString(36).substr(2, 5),
      itemId,
      type,
      amount,
      date: this.getFormattedDate(),
      description: description || (amount > 0 ? '재고 입고' : '재고 사용')
    };
    this.transactions.push(tx);
    return tx;
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
   * 새로운 자재 품목을 등록합니다.
   */
  addItem(name, stock, minRequired, imageUrl = '') {
    const id = name.replace(/\s+/g, '_') + '_' + Date.now().toString(36);
    const newItem = {
      id,
      name,
      stock: parseInt(stock) || 0,
      min_required: parseInt(minRequired) || 0,
      image_url: imageUrl
    };
    this.items.push(newItem);
    
    // 입고 이력 추가
    if (newItem.stock > 0) {
      this.addTransaction(id, 'in', newItem.stock, '신규 자재 등록 입고');
    } else {
      this.addTransaction(id, 'adjust', 0, '신규 자재 등록 (재고 없음)');
    }
    return newItem;
  }

  /**
   * 특정 자재의 사용 및 입고 처리를 진행합니다.
   */
  updateStock(itemId, amount, description = '') {
    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error('존재하지 않는 자재 품목입니다.');
    }
    item.stock = Math.max(0, item.stock + amount);
    
    // 트랜잭션 기록 연동
    const desc = description || (amount > 0 ? '수동 입고 조정' : '수동 사용 조정');
    this.addTransaction(itemId, amount > 0 ? 'in' : 'out', amount, desc);
    
    return this.getItemsStatus().find(i => i.id === itemId);
  }

  /**
   * 특정 자재의 히스토리 트랙을 가져옵니다.
   */
  getTransactions(itemId) {
    return this.transactions
      .filter(t => t.itemId === itemId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}

module.exports = InventoryService;
