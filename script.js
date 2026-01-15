// --- 설정 및 데이터 ---
const SHEET_ID = '1-3ux609KgZ7vwEYHPsfTeopwyAcex-q1uiXiIYO57a8';
let productData = [];
let currentDisplayData = []; 
const STORAGE_KEY = 'kenshi_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

const listContainer = document.getElementById('listContainer');
const navMenuContainer = document.getElementById('navMenuContainer');
const sidebarContent = document.getElementById('sidebarContent');
const previewContainer = document.getElementById('previewContainer');

// --- 초기화 ---
async function init() {
    await fetchData();
    if(productData.length > 0) {
        renderNavMenu();
        renderAllList(); 
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
        listContainer.innerHTML = '<div class="status-msg">데이터를 불러오지 못했습니다.</div>';
    }
}

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

// --- 화면 전환 ---
function goHome() {
    resetFilter();
    closeSidebar();
    closePreview();
    scrollToTop();
}

function closePreview() {
    listContainer.style.display = 'block';
    previewContainer.style.display = 'none';
    // 이미지 초기화
    document.getElementById('imgCollection').src = "";
    document.getElementById('imgStats').src = "";
}

function showPreview(collectionUrl, statsUrl) {
    listContainer.style.display = 'none';
    previewContainer.style.display = 'flex'; // flex로 변경하여 가로 배치
    
    document.getElementById('imgCollection').src = collectionUrl;
    document.getElementById('imgStats').src = statsUrl;
    
    scrollToTop();
}

// --- 네비게이션 생성 ---
function renderNavMenu() {
    navMenuContainer.innerHTML = '';
    sidebarContent.innerHTML = '';

    const createHomeGroup = () => {
        const homeGroup = document.createElement('div');
        homeGroup.className = 'nav-group';
        
        const homeBtn = document.createElement('button');
        homeBtn.className = 'nav-header'; 
        homeBtn.innerText = 'HOME';
        homeBtn.onclick = goHome;
        homeGroup.appendChild(homeBtn);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'nav-item nav-action'; 
        saveBtn.innerText = '이미지 저장';
        saveBtn.onclick = () => {
            generateImage();
            closeSidebar(); 
        };
        homeGroup.appendChild(saveBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'nav-item nav-action';
        resetBtn.innerText = '기록 초기화';
        resetBtn.onclick = () => {
            resetRecords();
            closeSidebar();
        };
        homeGroup.appendChild(resetBtn);

        return homeGroup;
    };

    navMenuContainer.appendChild(createHomeGroup());
    sidebarContent.appendChild(createHomeGroup());

    const catMap = new Map();
    productData.forEach(item => {
        const main = item.category;
        const sub = item.sub_category;
        if (!catMap.has(main)) catMap.set(main, new Set());
        if (sub && sub.trim() !== '') catMap.get(main).add(sub);
    });

    for (const [mainCat, subSet] of catMap) {
        const subCats = [...subSet];
        const pcGroup = createCategoryGroup(mainCat, subCats, false);
        navMenuContainer.appendChild(pcGroup);
        const mobileGroup = createCategoryGroup(mainCat, subCats, true);
        sidebarContent.appendChild(mobileGroup);
    }
}

function createCategoryGroup(mainCat, subCats, isMobile) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'nav-group';

    const header = document.createElement('button');
    header.className = 'nav-header';
    header.innerText = mainCat;
    
    header.onclick = (e) => {
        handleMenuClick(e.target); 
        filterData(mainCat, null); 
        if(isMobile) closeSidebar();
        closePreview();
    };
    
    groupDiv.appendChild(header);

    if (subCats.length > 0) {
        subCats.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = 'nav-item';
            btn.innerText = sub;
            btn.onclick = (e) => {
                handleMenuClick(e.target);
                filterData(mainCat, sub);
                if(isMobile) closeSidebar();
                closePreview();
            };
            groupDiv.appendChild(btn);
        });
    } 
    return groupDiv;
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    hamburger.classList.toggle('open'); 
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
}

function handleMenuClick(target) {
    document.querySelectorAll('.nav-item, .nav-header').forEach(b => b.classList.remove('active'));
    target.classList.add('active');
}

function resetFilter() {
    document.querySelectorAll('.nav-item, .nav-header').forEach(b => b.classList.remove('active'));
    renderAllList(); 
}

function filterData(mainCat, subCat) {
    if (mainCat === null) {
        currentDisplayData = productData;
    } else {
        currentDisplayData = productData.filter(item => {
            const m = item.category === mainCat;
            const s = subCat ? (item.sub_category === subCat) : true;
            return m && s;
        });
    }
    renderList(currentDisplayData);
}

function renderList(items) {
    listContainer.innerHTML = '';
    
    if (items.length === 0) {
        listContainer.innerHTML = '<div class="status-msg">해당하는 상품이 없습니다.</div>';
        return;
    }

    const grouped = new Map();
    items.forEach(item => {
        const key = (item.sub_category && item.sub_category.trim() !== '') 
                    ? item.sub_category 
                    : item.category;
        
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
    });

    for (const [title, groupItems] of grouped) {
        const section = document.createElement('div');
        section.className = 'category-section';

        const ownedCount = groupItems.filter(i => ownedItems.has(i.id)).length;
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'category-title';
        titleDiv.innerHTML = `${title} <small style="color:#888; font-weight:normal;">(${ownedCount}/${groupItems.length})</small>`;
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';

        groupItems.forEach(item => {
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

        section.appendChild(titleDiv);
        section.appendChild(grid);
        listContainer.appendChild(section);
    }
}

function renderAllList() {
    currentDisplayData = productData;
    renderList(productData);
}

function toggleCheck(id) {
    if (ownedItems.has(id)) {
        ownedItems.delete(id);
    } else {
        ownedItems.add(id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ownedItems]));
    renderList(currentDisplayData);
    updateProgress(); 
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetRecords() {
    if (confirm("모든 체크 기록을 삭제하시겠습니까?")) {
        ownedItems.clear();
        localStorage.removeItem(STORAGE_KEY);
        renderList(currentDisplayData);
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

// --- [이미지 생성 메인] ---
async function generateImage() {
    await document.fonts.ready;

    // 체크된 아이템 확인
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) {
        alert("선택된 상품이 없습니다.");
        return;
    }
    
    // 안내 메시지
    if(!confirm("이미지를 생성하시겠습니까?\n(체크된 상품만 포함됩니다)")) return;

    // 1. 체크 리스트 이미지 생성
    const collectionUrl = await drawCollectionCanvas(checkedItems);
    
    // 2. 수집률 카드 이미지 생성 (전체 데이터를 넘김 - 통계용)
    const statsUrl = await drawStatsCanvas();

    // 3. 미리보기 화면 표시
    showPreview(collectionUrl, statsUrl);
}

// 1) 체크 리스트 그리기 함수 (기존 로직 유지)
async function drawCollectionCanvas(items) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

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

        const img = await loadImage(item.image);
        if (img) {
            ctx.save(); 
            ctx.shadowColor = "rgba(0, 0, 0, 0.15)"; 
            ctx.shadowBlur = 12; 
            ctx.shadowOffsetY = 6; 
            ctx.shadowOffsetX = 0;

            ctx.fillStyle = "#f0f2f5"; 
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, cardSize, cardSize, borderRadius);
            else ctx.rect(x, y, cardSize, cardSize); 
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, cardSize, cardSize, borderRadius);
            else ctx.rect(x, y, cardSize, cardSize);
            ctx.clip();

            const aspect = img.width / img.height;
            let dw = cardSize, dh = cardSize;
            if (aspect > 1) dw = cardSize * aspect; 
            else dh = cardSize / aspect;
            
            ctx.drawImage(img, x + (cardSize - dw)/2, y + (cardSize - dh)/2, dw, dh);
            ctx.restore(); 
        }
    }
    return cvs.toDataURL('image/jpeg', 0.9);
}

// 2) 수집률 카드 그리기 함수 (신규)
async function drawStatsCanvas() {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    // 통계 계산
    const statsMap = new Map(); // 순서 유지용 Map
    let totalAll = 0;
    let ownedAll = 0;

    // 카테고리 순서대로 수집 (productData 순서 따름)
    productData.forEach(item => {
        const cat = item.category;
        if (!statsMap.has(cat)) {
            statsMap.set(cat, { total: 0, owned: 0 });
        }
        const data = statsMap.get(cat);
        data.total++;
        if (ownedItems.has(item.id)) {
            data.owned++;
            ownedAll++;
        }
        totalAll++;
    });

    // 캔버스 크기 설정
    const width = 600;
    const padding = 40;
    const rowHeight = 80; // 카테고리당 높이
    const footerHeight = 100;
    
    // 높이 계산: 상단 패딩 + (카테고리 수 * 높이) + 푸터 + 하단 패딩
    const contentHeight = (statsMap.size * rowHeight) + footerHeight;
    const height = padding + contentHeight + padding;

    cvs.width = width;
    cvs.height = height;

    // 배경
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 텍스트 스타일 공통
    ctx.textBaseline = 'middle';

    let currentY = padding + 30; // 시작 Y좌표

    // 카테고리별 그리기
    for (const [catName, stat] of statsMap) {
        const percent = Math.round((stat.owned / stat.total) * 100);
        
        // 1. 카테고리명 (Paperlogy)
        ctx.font = "bold 24px 'Paperlogy', sans-serif";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.fillText(catName, padding, currentY);

        // 2. 수치 텍스트 (우측 정렬)
        const statText = `${stat.owned}/${stat.total} (${percent}%)`;
        ctx.font = "bold 20px 'Pretendard', sans-serif";
        ctx.fillStyle = "#182558"; // Primary Color
        ctx.textAlign = "right";
        ctx.fillText(statText, width - padding, currentY);

        // 3. 프로그레스 바 배경
        const barY = currentY + 15;
        const barHeight = 12;
        ctx.fillStyle = "#eeeeee";
        ctx.beginPath();
        ctx.roundRect(padding, barY, width - (padding * 2), barHeight, 6);
        ctx.fill();

        // 4. 프로그레스 바 채우기
        if (percent > 0) {
            const fillWidth = (width - (padding * 2)) * (percent / 100);
            ctx.fillStyle = "#182558";
            ctx.beginPath();
            ctx.roundRect(padding, barY, fillWidth, barHeight, 6);
            ctx.fill();
        }

        currentY += rowHeight; // 다음 줄로
    }

    // 구분선
    ctx.strokeStyle = "#eeeeee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - padding, currentY);
    ctx.stroke();

    // 푸터 (TOTAL)
    currentY += 50; // 여백
    const totalPercent = Math.round((ownedAll / totalAll) * 100);
    const totalText = `TOTAL: ${ownedAll}/${totalAll} (${totalPercent}%)`;

    ctx.font = "900 32px 'Paperlogy', sans-serif";
    ctx.fillStyle = "#182558";
    ctx.textAlign = "center";
    ctx.fillText(totalText, width / 2, currentY);

    return cvs.toDataURL('image/png');
}

// 다운로드 (타입에 따라 분기)
function downloadImage(type) {
    let imgId = '';
    let fileName = '';

    if (type === 'collection') {
        imgId = 'imgCollection';
        fileName = 'kenshi_collection_list.jpg';
    } else {
        imgId = 'imgStats';
        fileName = 'kenshi_collection_stats.png';
    }

    const img = document.getElementById(imgId);
    if(!img || !img.src) return;

    const link = document.createElement('a');
    link.download = fileName;
    link.href = img.src;
    link.click();
}

init();
