// ... (이전 코드: 설정, 초기화, 데이터 가져오기, CSV 파싱, 필터 생성, 스크롤 이동, 리스트 렌더링, 체크 토글)

// --- 이미지 생성 (순수하게 상품 이미지만 배열) ---
async function generateImage() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerText;
    btn.innerText = "생성 중...";
    btn.disabled = true;

    await document.fonts.ready;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    // 모든 상품 데이터 가져오기 (카테고리 구분 없음)
    const items = productData;
    
    // 캔버스 및 그리드 설정
    const cardSize = 200; // 정사각형 이미지 크기
    const gap = 10;       // 이미지 사이 간격
    const colCount = 5;   // 한 줄에 5개
    const padding = 30;   // 전체 여백

    // 전체 행 및 높이 계산
    const rowCount = Math.ceil(items.length / colCount);
    const contentWidth = (cardSize * colCount) + (gap * (colCount - 1));
    const contentHeight = (cardSize * rowCount) + (gap * (rowCount - 1));

    cvs.width = padding * 2 + contentWidth;
    cvs.height = padding * 2 + contentHeight;

    // 배경 채우기
    ctx.fillStyle = "#ffffff"; // 깔끔한 흰색 배경
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // 이미지 로딩 헬퍼
    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    // 그리기 루프 (타이틀, 텍스트, 테두리, 체크 표시 모두 제외)
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % colCount;
        const r = Math.floor(i / colCount);
        
        const x = padding + c * (cardSize + gap);
        const y = padding + r * (cardSize + gap);

        const isOwned = ownedItems.has(item.id);

        const img = await loadImage(item.image);
        if (img) {
            ctx.save(); // 상태 저장
            
            // 이미지 영역 설정 (클리핑 없이 사각형 전체 사용)
            ctx.beginPath();
            ctx.rect(x, y, cardSize, cardSize);
            // ctx.clip(); // 클리핑 제거

            // [이미지 생성 시 흑백 처리 로직]
            if (!isOwned) {
                ctx.filter = 'grayscale(100%) opacity(0.6)';
            }

            // 이미지 비율 맞춰 그리기 (cover 효과 흉내)
            const aspect = img.width / img.height;
            let dw = cardSize, dh = cardSize;
            if (aspect > 1) dw = cardSize * aspect; 
            else dh = cardSize / aspect;
            
            // 중앙 정렬하여 그리기
            ctx.drawImage(img, x + (cardSize - dw)/2, y + (cardSize - dh)/2, dw, dh);
            
            ctx.restore(); // 필터 해제 및 상태 복구
        }
        // 이미지 로드 실패 시 빈 공간 유지
    }

    // 다운로드
    const link = document.createElement('a');
    link.download = 'kenshi_goods_collection.jpg';
    link.href = cvs.toDataURL('image/jpeg', 0.9);
    link.click();

    btn.innerText = originalText;
    btn.disabled = false;
}

// ... (이전 코드: 실행)