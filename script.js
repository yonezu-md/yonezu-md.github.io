// --- 설정 및 데이터 ---
const SHEET_ID = '1-3ux609KgZ7vwEYHPsfTeopwyAcex-q1uiXiIYO57a8';
let productData = [];
let currentDisplayData = []; 
const STORAGE_KEY = 'kenshi_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

const listContainer = document.getElementById('listContainer');
const navMenuContainer = document.getElementById('navMenuContainer');
const sidebarContent = document.getElementById('sidebarContent');

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
        listContainer.innerHTML = '<div class="status-msg">데이터 불러오기 실패!</div>';
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

// --- [추가] 타이틀 클릭 시 실행될 홈 함수 ---
function goHome() {
    resetFilter();
    closeSidebar();
    scrollToTop();
}

// --- 네비게이션 메뉴 및 사이드바 생성 ---
function renderNavMenu() {
    navMenuContainer.innerHTML = '';
    sidebarContent.innerHTML = '';

    // [1] HOME 그룹 생성
    const createHomeGroup = () => {
        const homeGroup = document.createElement('div');
        homeGroup.className = 'nav-group';
        
        // HOME 버튼
        const homeBtn = document.createElement('button');
        homeBtn.className = 'nav-header'; 
        homeBtn.innerText = 'HOME';
        homeBtn.onclick = goHome; // goHome 연결
        homeGroup.appendChild(homeBtn);

        // 이미지 저장 버튼
        const saveBtn = document.createElement('button');
        saveBtn.className = 'nav-item nav-action'; 
        saveBtn.innerText = '이미지 저장';
        saveBtn.onclick = () => {
            generateImage();
            closeSidebar(); 
        };
        homeGroup.appendChild(saveBtn);

        // 기록 초기화 버튼
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

    // [2] 카테고리 데이터 수집
    const catMap = new Map();
    productData.forEach(item => {
        const main = item.category;
        const sub = item.sub_category;
        if (!catMap.has(main)) catMap.set(main, new Set());
        if (sub && sub.trim() !== '') catMap.get(main).add(sub);
    });

    // [3] 카테고리 순회하며 버튼 생성
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
        listContainer.innerHTML = '<div class="status-msg">상품이 없습니다.</div>';
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

async function generateImage() {
    await document.fonts.ready;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const items = productData.filter(item => ownedItems.has(item.id));

    if (items.length === 0) {
        alert("선택된 상품이 없습니다.");
        return;
    }
    
    const userConfirm = confirm(`선택한 ${items.length}개의 상품을 이미지로 저장합니다.`);
    if(!userConfirm) return;

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

    const link = document.createElement('a');
    link.download = 'kenshi_collection_export.jpg';
    link.href = cvs.toDataURL('image/jpeg', 0.9);
    link.click();
}

init();