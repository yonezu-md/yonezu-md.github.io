// --- 설정 및 데이터 ---
const SHEET_ID = '1-3ux609KgZ7vwEYHPsfTeopwyAcex-q1uiXiIYO57a8';
let productData = [];
const STORAGE_KEY = 'kenshi_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

const listContainer = document.getElementById('listContainer');
const mainFilterContainer = document.getElementById('mainFilterContainer');
const subFilterContainer = document.getElementById('subFilterContainer');

// --- 초기화 ---
async function init() {
    await fetchData();
    if(productData.length > 0) {
        renderMainFilters(); // 1차 필터 생성
        renderList();        // 리스트 그리기
        updateProgress();
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

// --- CSV 파싱 (category, sub_category 포함) ---
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

// --- 1차 필터 (대분류) 생성 ---
function renderMainFilters() {
    // 중복 없는 대분류 목록 추출 (순서 유지)
    const categories = [...new Set(productData.map(item => item.category))];
    
    mainFilterContainer.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = cat;
        
        // 버튼 클릭 이벤트
        btn.onclick = () => {
            // 모든 버튼 비활성화 후 현재 버튼 활성화
            document.querySelectorAll('#mainFilterContainer .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 'LIVE 굿즈' 클릭 시 2차 필터(연도) 보여주기
            if (cat === 'LIVE 굿즈' || cat === 'LIVE MD') { // 이름에 맞춰 수정 가능
                renderSubFilters(cat);
                subFilterContainer.style.display = 'flex';
                // 첫 번째 연도로 스크롤 이동
                const firstYearItem = productData.find(p => p.category === cat && p.sub_category);
                if (firstYearItem) scrollToTarget(`year-${firstYearItem.sub_category}`);
                else scrollToTarget(`cat-${cat}`);
            } else {
                // 다른 카테고리는 2차 필터 숨김
                subFilterContainer.style.display = 'none';
                scrollToTarget(`cat-${cat}`);
            }
        };
        mainFilterContainer.appendChild(btn);
    });
}

// --- 2차 필터 (소분류/연도) 생성 ---
function renderSubFilters(parentCategory) {
    // 해당 카테고리 내의 sub_category(연도)만 추출
    const items = productData.filter(item => item.category === parentCategory && item.sub_category);
    const years = [...new Set(items.map(item => item.sub_category))].sort(); // 연도 정렬

    subFilterContainer.innerHTML = '';

    years.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = year;
        btn.onclick = () => {
            // 서브 필터 활성화 스타일
            document.querySelectorAll('#subFilterContainer .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 해당 연도 섹션으로 이동
            scrollToTarget(`year-${year}`);
        };
        subFilterContainer.appendChild(btn);
    });
}

// --- 스크롤 이동 헬퍼 ---
function scrollToTarget(elementId) {
    const element = document.getElementById(elementId);
    if(element) {
        // 헤더 높이만큼 빼고 스크롤 (헤더가 relative여도 시각적 여유를 위해)
        const headerOffset = 20; 
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
        window.scrollTo({
             top: offsetPosition,
             behavior: "smooth"
        });
    }
}

// --- 리스트 렌더링 (2단 구조 반영) ---
function renderList() {
    listContainer.innerHTML = '';
    
    // 1. 카테고리별로 묶기
    const groupedByCategory = {};
    productData.forEach(item => {
        if(!groupedByCategory[item.category]) groupedByCategory[item.category] = [];
        groupedByCategory[item.category].push(item);
    });

    for (const [category, items] of Object.entries(groupedByCategory)) {
        
        // LIVE 굿즈(혹은 서브카테고리 있는 경우)는 연도별로 다시 쪼갬
        const hasSubCategory = items.some(i => i.sub_category);

        if (hasSubCategory) {
            // 서브카테고리(연도)별 그룹핑
            const groupedByYear = {};
            items.forEach(item => {
                const key = item.sub_category || 'Etc'; // 서브카테고리 없으면 기타 처리
                if(!groupedByYear[key]) groupedByYear[key] = [];
                groupedByYear[key].push(item);
            });

            // 연도별 섹션 생성 (오름차순 정렬)
            const sortedYears = Object.keys(groupedByYear).sort();
            
            sortedYears.forEach(year => {
                const yearItems = groupedByYear[year];
                createSection(yearItems, year, `year-${year}`, category); // ID를 year-2014 형식으로
            });

        } else {
            // 일반 카테고리는 통짜로 생성
            createSection(items, category, `cat-${category}`);
        }
    }
}

// --- 섹션 생성 함수 (코드 중복 제거) ---
function createSection(items, titleText, elementId, parentTitle = '') {
    const section = document.createElement('div');
    section.className = 'category-section';
    section.id = elementId;

    const ownedCount = items.filter(i => ownedItems.has(i.id)).length;
    
    // 타이틀 보여주기 (LIVE 굿즈인 경우 'LIVE 굿즈 > 2014' 처럼 보이게 할 수도 있고, 그냥 '2014'만 보여줄 수도 있음)
    // 여기서는 깔끔하게 타이틀만 표시
    const displayTitle = parentTitle ? `${parentTitle} <span style="font-size:0.8em; color:#888;">${titleText}</span>` : titleText;

    const title = document.createElement('div');
    title.className = 'category-title';
    title.innerHTML = `${displayTitle} <small style="color:#888; font-weight:normal;">(${ownedCount}/${items.length})</small>`;
    
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

// --- 기존 기능들 (체크, 초기화, 이미지 생성 등) ---

function toggleCheck(id) {
    if (ownedItems.has(id)) {
        ownedItems.delete(id);
    } else {
        ownedItems.add(id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ownedItems]));
    renderList(); // 체크 상태 반영을 위해 리스트 갱신
    updateProgress(); 
}

function resetRecords() {
    if (confirm("모든 체크 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
        ownedItems.clear();
        localStorage.removeItem(STORAGE_KEY);
        renderList();
        updateProgress();
        alert("초기화되었습니다.");
    }
}

function updateProgress() {
    const totalCount = productData.length;
    if (totalCount === 0) return;

    const validOwnedCount = productData.filter(item => ownedItems.has(item.id)).length;
    const percent = Math.round((validOwnedCount / totalCount) * 100);

    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if(progressBar) progressBar.style.width = `${percent}%`;
    if(progressText) progressText.innerText = `${validOwnedCount}/${totalCount} (${percent}%)`;
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 이미지 생성 (변경 없음) ---
async function generateImage() {
    const btn = document.getElementById('headerSaveBtn');
    const originalText = btn.innerText;
    
    btn.innerText = "생성 중...";
    btn.disabled = true;

    await document.fonts.ready;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const items = productData;
    
    const cardSize = 200;
    const gap = 20; 
    const colCount = 5;
    const padding = 40; 

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
        const borderRadius = 15; 

        const isOwned = ownedItems.has(item.id);

        const img = await loadImage(item.image);
        if (img) {
            ctx.save(); 
            
            ctx.shadowColor = "rgba(0, 0, 0, 0.15)"; 
            ctx.shadowBlur = 12; 
            ctx.shadowOffsetY = 6; 
            ctx.shadowOffsetX = 0;

            ctx.fillStyle = "#f0f2f5"; 
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, cardSize, cardSize, borderRadius);
            } else {
                ctx.rect(x, y, cardSize, cardSize); 
            }
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, cardSize, cardSize, borderRadius);
            } else {
                ctx.rect(x, y, cardSize, cardSize);
            }
            ctx.clip();

            if (!isOwned) {
                ctx.filter = 'grayscale(100%) opacity(0.7)';
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