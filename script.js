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

// [옵션 컨트롤 엘리먼트]
const optTitleCheck = document.getElementById('optTitleCheck');
const optTitleInput = document.getElementById('optTitleInput');
const optNameKoCheck = document.getElementById('optNameKoCheck');
const optNameJpCheck = document.getElementById('optNameJpCheck');

// --- 초기화 ---
async function init() {
    setupEventListeners(); // 리스너 등록
    await fetchData();
    if(productData.length > 0) {
        renderNavMenu();
        renderAllList(); 
        updateProgress();
    }
}

// --- 이벤트 리스너 설정 (실시간 반영) ---
function setupEventListeners() {
    // 타이틀 입력 시 -> 타이틀 체크박스 자동 체크 & 다시 그리기
    optTitleInput.addEventListener('input', () => {
        if(optTitleInput.value.trim().length > 0) {
            optTitleCheck.checked = true;
        }
        updateCollectionPreview();
    });

    // 타이틀 체크박스 변경 -> 다시 그리기
    optTitleCheck.addEventListener('change', updateCollectionPreview);

    // 상품명(한글) 변경 -> 일어 해제 & 다시 그리기
    optNameKoCheck.addEventListener('change', () => {
        if(optNameKoCheck.checked) optNameJpCheck.checked = false;
        updateCollectionPreview();
    });

    // 商品名(일어) 변경 -> 한글 해제 & 다시 그리기
    optNameJpCheck.addEventListener('change', () => {
        if(optNameJpCheck.checked) optNameKoCheck.checked = false;
        updateCollectionPreview();
    });
}

// --- 미리보기 업데이트 (디바운스 없이 즉시 실행, 로컬 이미지는 빠름) ---
async function updateCollectionPreview() {
    // 체크된 아이템 확인
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) return;

    const collectionUrl = await drawCollectionCanvas(checkedItems);
    document.getElementById('imgCollection').src = collectionUrl;
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
    
    document.getElementById('imgCollection').src = "";
    document.getElementById('imgStats').src = "";
}

function showPreview(collectionUrl, statsUrl) {
    listContainer.style.display = 'none';
    previewContainer.style.display = 'flex'; 
    
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

// --- 이미지 생성 메인 ---
async function generateImage() {
    await document.fonts.ready;

    // 체크된 아이템 확인
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) {
        alert("선택된 상품이 없습니다.");
        return;
    }
    
    // 1. 체크 리스트 (옵션 반영)
    updateCollectionPreview();
    
    // 2. 수집률 카드 (고정)
    const statsUrl = await drawStatsCanvas();
    document.getElementById('imgStats').src = statsUrl;

    // 3. 화면 전환
    listContainer.style.display = 'none';
    previewContainer.style.display = 'flex';
    scrollToTop();
}

// 1) 체크 리스트 그리기 (옵션 적용)
async function drawCollectionCanvas(items) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    // [옵션값 가져오기]
    const showTitle = optTitleCheck.checked;
    const titleText = optTitleInput.value;
    const showNameKo = optNameKoCheck.checked;
    const showNameJp = optNameJpCheck.checked;
    // 둘 중 하나라도 켜져 있으면 텍스트 표시
    const showText = showNameKo || showNameJp;

    // 카드 높이 설정 (텍스트 유무에 따라)
    const cardWidth = 200;
    const imgHeight = 200;
    const textHeight = showText ? 60 : 0; // 텍스트 공간 (이름 길어질 수 있으니 넉넉히)
    const cardHeight = imgHeight + textHeight;
    const gap = 20; 
    const colCount = 5;
    const padding = 40; 
    
    // 타이틀 높이
    const titleAreaHeight = showTitle ? 80 : 0;

    const rowCount = Math.ceil(items.length / colCount);
    const contentWidth = (cardWidth * colCount) + (gap * (colCount - 1));
    const contentHeight = (cardHeight * rowCount) + (gap * (rowCount - 1));

    cvs.width = padding * 2 + contentWidth;
    cvs.height = padding * 2 + contentHeight + titleAreaHeight; // 타이틀 높이 추가

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // [타이틀 그리기]
    let startY = padding;
    if (showTitle) {
        ctx.font = "bold 40px 'Paperlogy', sans-serif";
        ctx.fillStyle = "#182558";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(titleText, cvs.width / 2, padding + 20);
        startY += titleAreaHeight; // 시작 Y좌표 밀기
    }

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
        
        const x = padding + c * (cardWidth + gap);
        const y = startY + r * (cardHeight + gap);
        const borderRadius = 15; 

        // 1. 카드 배경
        ctx.save(); 
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)"; 
        ctx.shadowBlur = 12; 
        ctx.shadowOffsetY = 6; 
        ctx.shadowOffsetX = 0;

        ctx.fillStyle = "#f0f2f5"; 
        ctx.beginPath();
        // 텍스트 포함 전체 카드 영역
        ctx.roundRect(x, y, cardWidth, cardHeight, borderRadius);
        ctx.fill();
        ctx.restore();

        // 2. 이미지 그리기 (클리핑)
        const img = await loadImage(item.image);
        if (img) {
            ctx.save();
            ctx.beginPath();
            // 위쪽 둥글게, 아래쪽은 텍스트 있으면 직각, 없으면 둥글게
            if (showText) {
                // 상단만 둥글게 (복잡하니 clip으로 처리)
                ctx.roundRect(x, y, cardWidth, imgHeight, [borderRadius, borderRadius, 0, 0]);
            } else {
                ctx.roundRect(x, y, cardWidth, imgHeight, borderRadius);
            }
            ctx.clip();

            const aspect = img.width / img.height;
            let dw = cardWidth, dh = imgHeight;
            if (aspect > 1) dw = imgHeight * aspect; 
            else dh = cardWidth / aspect;
            
            // 이미지 중앙 정렬 (Cover)
            ctx.drawImage(img, x + (cardWidth - dw)/2, y + (imgHeight - dh)/2, dw, dh);
            ctx.restore(); 
        }

        // 3. 텍스트 그리기
        if (showText) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#333";
            ctx.font = "bold 16px 'Pretendard', sans-serif";
            
            const textY = y + imgHeight + (textHeight / 2);
            let textToDraw = showNameKo ? item.nameKo : item.nameJp;
            
            // 글자가 너무 길면 ... 처리 (간단히 너비 체크)
            const maxWidth = cardWidth - 20;
            if (ctx.measureText(textToDraw).width > maxWidth) {
                // 글자수 줄이기 (단순 접근)
                while(ctx.measureText(textToDraw + "...").width > maxWidth && textToDraw.length > 0) {
                    textToDraw = textToDraw.slice(0, -1);
                }
                textToDraw += "...";
            }
            
            ctx.fillText(textToDraw, x + (cardWidth/2), textY);
        }
    }
    return cvs.toDataURL('image/jpeg', 0.9);
}

// 2) 수집률 카드 그리기 (변동 없음)
async function drawStatsCanvas() {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const statsMap = new Map(); 
    let totalAll = 0;
    let ownedAll = 0;

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

    const width = 600;
    const padding = 40;
    const rowHeight = 80; 
    const footerHeight = 100;
    
    const contentHeight = (statsMap.size * rowHeight) + footerHeight;
    const height = padding + contentHeight + padding;

    cvs.width = width;
    cvs.height = height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.textBaseline = 'middle';

    let currentY = padding + 30; 

    for (const [catName, stat] of statsMap) {
        const percent = Math.round((stat.owned / stat.total) * 100);
        
        ctx.font = "bold 24px 'Paperlogy', sans-serif";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.fillText(catName, padding, currentY);

        const statText = `${stat.owned}/${stat.total} (${percent}%)`;
        ctx.font = "bold 20px 'Pretendard', sans-serif";
        ctx.fillStyle = "#182558"; 
        ctx.textAlign = "right";
        ctx.fillText(statText, width - padding, currentY);

        const barY = currentY + 15;
        const barHeight = 12;
        ctx.fillStyle = "#eeeeee";
        ctx.beginPath();
        ctx.roundRect(padding, barY, width - (padding * 2), barHeight, 6);
        ctx.fill();

        if (percent > 0) {
            const fillWidth = (width - (padding * 2)) * (percent / 100);
            ctx.fillStyle = "#182558";
            ctx.beginPath();
            ctx.roundRect(padding, barY, fillWidth, barHeight, 6);
            ctx.fill();
        }

        currentY += rowHeight; 
    }

    ctx.strokeStyle = "#eeeeee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - padding, currentY);
    ctx.stroke();

    currentY += 50; 
    const totalPercent = Math.round((ownedAll / totalAll) * 100);
    const totalText = `TOTAL: ${ownedAll}/${totalAll} (${totalPercent}%)`;

    ctx.font = "900 32px 'Paperlogy', sans-serif";
    ctx.fillStyle = "#182558";
    ctx.textAlign = "center";
    ctx.fillText(totalText, width / 2, currentY);

    return cvs.toDataURL('image/png');
}

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
