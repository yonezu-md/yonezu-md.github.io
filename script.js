// --- 설정 및 데이터 ---
const SHEET_ID = '1-3ux609KgZ7vwEYHPsfTeopwyAcex-q1uiXiIYO57a8';
let productData = [];
// 저장소 키 (요네즈 켄시 전용)
const STORAGE_KEY = 'kenshi_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

const listContainer = document.getElementById('listContainer');
const filterContainer = document.getElementById('filterContainer');

// --- 초기화 ---
async function init() {
    await fetchData();
    if(productData.length > 0) {
        renderFilters();
        renderList();
    }
}

// --- 데이터 가져오기 ---
async function fetchData() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("네트워크 오류");
        const text = await response.text();
        productData = parseCSV(text);
        console.log(`Loaded ${productData.length} items.`);
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<div class="status-msg">데이터를 불러오지 못했습니다.<br>스프레드시트 권한이나 ID를 확인해주세요.</div>';
    }
}

// --- CSV 파싱 ---
function parseCSV(csvText) {
    const rows = csvText.split('\n').map(row => {
        const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
        let columns = [];
        let match;
        while (match = regex.exec(row)) {
            let col = match[1].replace(/^"|"$/g, '').replace(/""/g, '"');
            columns.push(col.trim());
        }
        return columns;
    });

    const headers = rows[0]; 
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length) continue;
        const item = {};
        headers.forEach((h, idx) => item[h] = row[idx]);
        if(item.id) data.push(item);
    }
    return data;
}

// --- 필터 버튼 생성 ---
function renderFilters() {
    const categories = [...new Set(productData.map(item => item.category))];
    
    filterContainer.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = cat;
        btn.onclick = () => scrollToCategory(cat);
        filterContainer.appendChild(btn);
    });
}

// --- 카테고리 스크롤 이동 ---
function scrollToCategory(category) {
    const element = document.getElementById(`cat-${category}`);
    if(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- 리스트 렌더링 ---
function renderList() {
    listContainer.innerHTML = '';
    
    const grouped = {};
    productData.forEach(item => {
        if(!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    });

    for (const [category, items] of Object.entries(grouped)) {
        const section = document.createElement('div');
        section.className = 'category-section';
        section.id = `cat-${category}`;

        const ownedCount = items.filter(i => ownedItems.has(i.id)).length;
        
        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerHTML = `${category} <small style="color:#888; font-weight:normal;">(${ownedCount}/${items.length})</small>`;
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';

        items.forEach(item => {
            const isOwned = ownedItems.has(item.id);
            const card = document.createElement('div');
            card.className = `item-card ${isOwned ? 'checked' : ''}`;
            card.onclick = () => toggleCheck(item.id);

            const imgSrc = item.image || 'https://via.placeholder.com/150?text=No+Image';

            card.innerHTML = `
                <div class="item-img-wrapper">
                    <img src="${imgSrc}" loading="lazy" alt="${item.nameKo}">
                    <div class="check-overlay"></div>
                </div>
                <div class="item-info">
                    <div class="item-name">${item.nameKo}</div>
                    <div class="item-subname">${item.nameJp || ''}</div>
                    <div class="item-price">${item.price || '-'}</div>
                </div>
            `;
            grid.appendChild(card);
        });

        section.appendChild(title);
        section.appendChild(grid);
        listContainer.appendChild(section);
    }
}

// --- 체크 토글 ---
function toggleCheck(id) {
    if (ownedItems.has(id)) {
        ownedItems.delete(id);
    } else {
        ownedItems.add(id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ownedItems]));
    renderList();
}

// --- 이미지 생성 (전체 + 미보유 흑백) ---
async function generateImage() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerText;
    btn.innerText = "생성 중...";
    btn.disabled = true;

    await document.fonts.ready;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const categories = [...new Set(productData.map(item => item.category))];
    
    const cardW = 200;
    const cardH = 300;
    const gap = 20;
    const colCount = 5;
    const padding = 60;
    const headerH = 120;
    const catTitleH = 60;

    let totalHeight = headerH + padding;

    categories.forEach(cat => {
        const items = productData.filter(p => p.category === cat);
        const rows = Math.ceil(items.length / colCount);
        totalHeight += catTitleH + (rows * cardH) + ((rows - 1) * gap) + 60;
    });

    const contentWidth = (cardW * colCount) + (gap * (colCount - 1));
    cvs.width = padding * 2 + contentWidth;
    cvs.height = totalHeight;

    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = "#4A6E75";
    ctx.font = "bold 50px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("요네즈 켄시 굿즈 체크리스트", cvs.width / 2, 60);
    
    ctx.font = "20px 'Noto Sans KR', sans-serif";
    ctx.fillStyle = "#666";
    ctx.fillText(new Date().toLocaleDateString(), cvs.width / 2, 100);

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    let currentY = headerH;

    for (const cat of categories) {
        const items = productData.filter(p => p.category === cat);
        
        ctx.textAlign = "left";
        ctx.fillStyle = "#333";
        ctx.font = "bold 30px 'Noto Sans KR', sans-serif";
        ctx.fillText(cat, padding, currentY + 40);
        
        const ownedCnt = items.filter(i => ownedItems.has(i.id)).length;
        ctx.font = "20px 'Noto Sans KR', sans-serif";
        ctx.fillStyle = "#666";
        ctx.fillText(`(${ownedCnt}/${items.length})`, padding + ctx.measureText(cat).width + 10, currentY + 40);

        currentY += catTitleH;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const c = i % colCount;
            const r = Math.floor(i / colCount);
            
            const x = padding + c * (cardW + gap);
            const y = currentY + r * (cardH + gap);

            const isOwned = ownedItems.has(item.id);

            ctx.fillStyle = "#fff";
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, cardW, cardH, 10);
            } else {
                ctx.rect(x, y, cardW, cardH); // 구형 브라우저 호환
            }
            ctx.fill();

            ctx.strokeStyle = isOwned ? "#4A6E75" : "#ddd";
            ctx.lineWidth = isOwned ? 3 : 1;
            ctx.stroke();

            const img = await loadImage(item.image);
            if (img) {
                ctx.save();
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, cardW, cardW, [10, 10, 0, 0]);
                } else {
                    ctx.rect(x, y, cardW, cardW);
                }
                ctx.clip();

                // [이미지 생성 시 흑백 처리 로직]
                if (!isOwned) {
                    ctx.filter = 'grayscale(100%) opacity(0.6)';
                }

                const aspect = img.width / img.height;
                let dw = cardW, dh = cardW;
                if (aspect > 1) dw = cardW * aspect; 
                else dh = cardW / aspect;
                
                ctx.drawImage(img, x + (cardW - dw)/2, y + (cardW - dh)/2, dw, dh);
                
                ctx.restore();
            }

            ctx.textAlign = "center";
            ctx.fillStyle = "#333";
            
            ctx.font = "bold 16px 'Noto Sans KR', sans-serif";
            const words = item.nameKo.split(' ');
            let line = '', lineY = y + cardW + 25;
            for(let w of words) {
                let test = line + w + ' ';
                if(ctx.measureText(test).width > cardW - 20) {
                    ctx.fillText(line, x + cardW/2, lineY);
                    line = w + ' ';
                    lineY += 20;
                } else {
                    line = test;
                }
            }
            ctx.fillText(line, x + cardW/2, lineY);

            ctx.fillStyle = "#4A6E75";
            ctx.font = "bold 14px 'Noto Sans KR', sans-serif";
            ctx.fillText(item.price || '', x + cardW/2, y + cardH - 15);
        }

        const rows = Math.ceil(items.length / colCount);
        currentY += (rows * cardH) + ((rows - 1) * gap) + 60;
    }

    const link = document.createElement('a');
    link.download = 'kenshi_goods_checklist.jpg';
    link.href = cvs.toDataURL('image/jpeg', 0.9);
    link.click();

    btn.innerText = originalText;
    btn.disabled = false;
}

init();