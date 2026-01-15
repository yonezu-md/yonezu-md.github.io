// --- 설정 및 데이터 ---
const SHEET_ID = '1-3ux609KgZ7vwEYHPsfTeopwyAcex-q1uiXiIYO57a8';
let productData = [];
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
    if(element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// --- 이미지 생성 (체크 안 된 건 여기서 흑백 처리) ---
async function generateImage() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerText;
    btn.innerText = "생성 중...";
    btn.disabled = true;

    await document.fonts.ready;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const items = productData;
    
    const cardSize = 200;
    const gap = 10;
    const colCount = 5;
    const padding = 30;

    const rowCount = Math.ceil(items.length / colCount);
    const contentWidth = (cardSize * colCount) + (gap * (colCount - 1));
    const contentHeight = (cardSize * rowCount) + (gap * (rowCount - 1));

    cvs.width = padding * 2 + contentWidth;
    cvs.height = padding * 2 + contentHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % colCount;
        const r = Math.floor(i / colCount);
        
        const x = padding + c * (cardSize + gap);
        const y = padding + r * (cardSize + gap);

        const isOwned = ownedItems.has(item.id);

        const img = await loadImage(item.image);
        if (img) {
            ctx.save();
            
            ctx.beginPath();
            ctx.rect(x, y, cardSize, cardSize);

            // [핵심] 미보유 상품은 생성 이미지에서만 흑백 필터 적용
            if (!isOwned) {
                ctx.filter = 'grayscale(100%) opacity(0.6)';
            }

            const aspect = img.width / img.height;
            let dw = cardSize, dh = cardSize;
            if (aspect > 1) dw = cardSize * aspect; 
            else dh = cardSize / aspect;
            
            ctx.drawImage(img, x + (cardSize - dw)/2, y + (cardSize - dh)/2, dw, dh);
            
            ctx.restore();
        }
    }

    const link = document.createElement('a');
    link.download = 'kenshi_goods_collection.jpg';
    link.href = cvs.toDataURL('image/jpeg', 0.9);
    link.click();

    btn.innerText = originalText;
    btn.disabled = false;
}

init();