// --- 설정 및 데이터 ---
const SHEET_ID = '1-3ux609KgZ7vwEYHPsfTeopwyAcex-q1uiXiIYO57a8';
let productData = [];
let currentDisplayData = []; 
const STORAGE_KEY = 'kenshi_owned';

// [NEW] 테마 설정 (배경 이미지, 텍스트/바 색상)
// barBg는 프로그레스 바의 빈 공간 색상 (보통 텍스트 색상의 투명도 조절 버전)
const THEMES = [
    { name: 'Pale Blue', bg: 'img/theme1.jpg', color: '#182558', barBg: 'rgba(24, 37, 88, 0.2)' },
    { name: 'Lemon',     bg: 'img/theme2.jpg', color: '#D4AF37', barBg: 'rgba(212, 175, 55, 0.2)' },
    { name: 'Black',     bg: 'img/theme3.jpg', color: '#333333', barBg: 'rgba(51, 51, 51, 0.2)' },
    { name: 'Cyan',      bg: 'img/theme4.jpg', color: '#4A90E2', barBg: 'rgba(74, 144, 226, 0.2)' },
    { name: 'Red',       bg: 'img/theme5.jpg', color: '#E24A4A', barBg: 'rgba(226, 74, 74, 0.2)' }
];
let currentThemeIndex = 0;

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

const listContainer = document.getElementById('listContainer');
const navMenuContainer = document.getElementById('navMenuContainer');
const sidebarContent = document.getElementById('sidebarContent');
const previewContainer = document.getElementById('previewContainer');

// [옵션 엘리먼트]
const optTitleCheck = document.getElementById('optTitleCheck');
const optTitleInput = document.getElementById('optTitleInput');
const optNameKoCheck = document.getElementById('optNameKoCheck');
const optNameJpCheck = document.getElementById('optNameJpCheck');
const optPriceCheck = document.getElementById('optPriceCheck');

// --- 초기화 ---
async function init() {
    setupEventListeners();
    await fetchData();
    if(productData.length > 0) {
        renderNavMenu();
        renderAllList(); 
        updateProgress();
    }
}

function setupEventListeners() {
    optTitleInput.addEventListener('input', () => {
        if(optTitleInput.value.trim().length > 0) optTitleCheck.checked = true;
        updateCollectionPreview();
    });
    optTitleCheck.addEventListener('change', updateCollectionPreview);
    
    optNameKoCheck.addEventListener('change', () => {
        if(optNameKoCheck.checked) optNameJpCheck.checked = false;
        updateCollectionPreview();
    });
    optNameJpCheck.addEventListener('change', () => {
        if(optNameJpCheck.checked) optNameKoCheck.checked = false;
        updateCollectionPreview();
    });
    optPriceCheck.addEventListener('change', updateCollectionPreview);
}

// [NEW] 테마 변경 함수
async function changeTheme(index) {
    currentThemeIndex = index;
    
    // 버튼 활성화 스타일 변경
    const btns = document.querySelectorAll('.theme-btn');
    btns.forEach((btn, idx) => {
        if(idx === index) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // 수집률 카드 다시 그리기
    const statsUrl = await drawStatsCanvas();
    document.getElementById('imgStats').src = statsUrl;
}

async function updateCollectionPreview() {
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

// --- 네비게이션 ---
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
        const key = (item.sub_category && item.sub_category.trim() !== '') ? item.sub_category : item.category;
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
    const checkedItems = productData.filter(item => ownedItems.has(item.id));
    if (checkedItems.length === 0) {
        alert("선택된 상품이 없습니다.");
        return;
    }
    updateCollectionPreview();
    
    // 수집률 카드 그리기
    const statsUrl = await drawStatsCanvas();
    document.getElementById('imgStats').src = statsUrl;
    
    listContainer.style.display = 'none';
    previewContainer.style.display = 'flex';
    scrollToTop();
}

async function drawCollectionCanvas(items) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const showTitle = optTitleCheck.checked;
    const titleText = optTitleInput.value;
    const showNameKo = optNameKoCheck.checked;
    const showNameJp = optNameJpCheck.checked;
    const showPrice = optPriceCheck.checked;
    const showText = showNameKo || showNameJp;

    const cardWidth = 200;
    const imgHeight = 200;
    
    let textHeight = 0;
    const nameLineHeight = 20;
    const priceLineHeight = 20;
    const paddingY = 10;

    if (showText) textHeight += (nameLineHeight * 2); 
    if (showPrice) textHeight += priceLineHeight;
    if (showText || showPrice) textHeight += (paddingY * 2);

    const cardHeight = imgHeight + textHeight;
    const gap = 20; 
    const colCount = 5;
    const padding = 40; 
    const titleAreaHeight = showTitle ? 80 : 0;

    const rowCount = Math.ceil(items.length / colCount);
    const contentWidth = (cardWidth * colCount) + (gap * (colCount - 1));
    const contentHeight = (cardHeight * rowCount) + (gap * (rowCount - 1));

    cvs.width = padding * 2 + contentWidth;
    cvs.height = padding * 2 + contentHeight + titleAreaHeight;

    ctx.fillStyle = "#fafafa"; 
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    let startY = padding;
    if (showTitle) {
        ctx.font = "bold 40px 'Paperlogy', sans-serif";
        ctx.fillStyle = "#182558";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(titleText, cvs.width / 2, padding + 20);
        startY += titleAreaHeight;
    }

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    const getLines = (text, maxWidth) => {
        const words = text.split('');
        const lines = [];
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + word).width;
            if (width < maxWidth) {
                currentLine += word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % colCount;
        const r = Math.floor(i / colCount);
        
        const x = padding + c * (cardWidth + gap);
        const y = startY + r * (cardHeight + gap);
        const borderRadius = 15; 

        ctx.save(); 
        ctx.shadowColor = "rgba(0, 0, 0, 0.1)"; 
        ctx.shadowBlur = 10; 
        ctx.shadowOffsetY = 4; 
        ctx.fillStyle = "#ffffff"; 
        ctx.beginPath();
        ctx.roundRect(x, y, cardWidth, cardHeight, borderRadius);
        ctx.fill();
        ctx.restore();

        const img = await loadImage(item.image);
        if (img) {
            ctx.save();
            ctx.beginPath();
            if (showText || showPrice) {
                ctx.roundRect(x, y, cardWidth, imgHeight, [borderRadius, borderRadius, 0, 0]);
            } else {
                ctx.roundRect(x, y, cardWidth, imgHeight, borderRadius);
            }
            ctx.clip();

            const aspect = img.width / img.height;
            let dw = cardWidth, dh = imgHeight;
            if (aspect > 1) dw = imgHeight * aspect; 
            else dh = cardWidth / aspect;
            
            ctx.drawImage(img, x + (cardWidth - dw)/2, y + (imgHeight - dh)/2, dw, dh);
            ctx.restore(); 
        }

        if (showText || showPrice) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#333";

            let lines = [];
            if (showText) {
                ctx.font = "bold 15px 'Pretendard', sans-serif";
                let textToDraw = showNameJp 
                                 ? (item.nameJp && item.nameJp.trim() !== '' ? item.nameJp : item.nameKo) 
                                 : item.nameKo;
                
                let tempLines = getLines(textToDraw, cardWidth - 20);
                if (tempLines.length > 2) {
                    tempLines = tempLines.slice(0, 2);
                    tempLines[1] = tempLines[1].slice(0, -1) + "...";
                }
                lines = tempLines;
            }

            let contentHeight = 0;
            if (showText) contentHeight += lines.length * nameLineHeight;
            if (showPrice) contentHeight += priceLineHeight;
            if (showText && showPrice) contentHeight += 5; 

            const textAreaCenterY = y + imgHeight + (textHeight / 2);
            let drawY = textAreaCenterY - (contentHeight / 2) + (nameLineHeight / 2); 

            if (showText) {
                ctx.font = "bold 15px 'Pretendard', sans-serif";
                lines.forEach(line => {
                    ctx.fillText(line, x + (cardWidth/2), drawY);
                    drawY += nameLineHeight;
                });
            }

            if (showPrice) {
                if (showText) drawY += 5; 
                if (!showText) {
                     drawY = textAreaCenterY - (priceLineHeight / 2) + (priceLineHeight / 2); 
                }
                
                ctx.font = "14px 'Pretendard', sans-serif";
                ctx.fillStyle = "#182558"; 
                ctx.fillText(item.price || '-', x + (cardWidth/2), drawY);
            }
        }
    }
    return cvs.toDataURL('image/jpeg', 0.9);
}

// [수정] 테마 적용 및 사진 기반 디자인 재현
async function drawStatsCanvas() {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');
    const statsMap = new Map(); 
    let totalAll = 0;
    let ownedAll = 0;

    // 데이터 집계
    productData.forEach(item => {
        const cat = item.category;
        if (!statsMap.has(cat)) statsMap.set(cat, { total: 0, owned: 0 });
        const data = statsMap.get(cat);
        data.total++;
        if (ownedItems.has(item.id)) {
            data.owned++;
            ownedAll++;
        }
        totalAll++;
    });

    const theme = THEMES[currentThemeIndex];
    const width = 600;
    const height = 900; // 카드 비율 (세로형)

    cvs.width = width;
    cvs.height = height;

    // 1. 배경 이미지 그리기
    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // 이미지가 없으면 null 반환
    });

    const bgImg = await loadImage(theme.bg);
    
    // 배경 클리핑 (둥근 모서리)
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 30);
    ctx.clip();

    if (bgImg) {
        // 이미지가 있으면 꽉 채우기 (Cover)
        const aspect = bgImg.width / bgImg.height;
        const canvasAspect = width / height;
        let drawW, drawH, drawX, drawY;

        if (aspect > canvasAspect) { // 이미지가 더 납작함 -> 높이 맞춤
            drawH = height;
            drawW = height * aspect;
            drawX = (width - drawW) / 2;
            drawY = 0;
        } else { // 이미지가 더 길쭉함 -> 너비 맞춤
            drawW = width;
            drawH = width / aspect;
            drawX = 0;
            drawY = (height - drawH) / 2;
        }
        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
    } else {
        // 이미지가 없으면 기본 테마색 배경
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, width, height);
    }

    // 2. 텍스트 및 바 그리기
    ctx.fillStyle = theme.color; // 테마 색상 적용
    ctx.textAlign = "center";

    // 헤더 (상단 여백 100px)
    let yPos = 100;
    ctx.font = "bold 48px 'Paperlogy', sans-serif";
    ctx.fillText("굿즈 수집 현황", width / 2, yPos);
    
    yPos += 40;
    ctx.font = "24px 'Pretendard', sans-serif";
    ctx.globalAlpha = 0.7; // 서브타이틀 약간 투명
    ctx.fillText("yonezu-md.github.io", width / 2, yPos);
    ctx.globalAlpha = 1.0; // 복구

    // 카테고리 리스트 (중간 영역)
    yPos += 100;
    const padding = 60;
    const barHeight = 24; // 두꺼운 바
    
    for (const [catName, stat] of statsMap) {
        const percent = Math.round((stat.owned / stat.total) * 100);
        
        // 텍스트 라인 (좌: 카테고리, 우: 수치)
        ctx.fillStyle = theme.color;
        ctx.font = "bold 28px 'Paperlogy', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(catName, padding, yPos);

        const statText = `${stat.owned}/${stat.total} (${percent}%)`;
        ctx.font = "bold 28px 'Pretendard', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(statText, width - padding, yPos);

        // 진행 바 (텍스트 아래)
        yPos += 15; // 간격
        
        // 바 배경
        ctx.fillStyle = theme.barBg || "rgba(0,0,0,0.1)"; 
        ctx.beginPath();
        ctx.roundRect(padding, yPos, width - (padding * 2), barHeight, barHeight/2);
        ctx.fill();

        // 바 채우기
        if (percent > 0) {
            const fillWidth = (width - (padding * 2)) * (percent / 100);
            ctx.fillStyle = theme.color;
            ctx.beginPath();
            ctx.roundRect(padding, yPos, fillWidth, barHeight, barHeight/2);
            ctx.fill();
        }

        yPos += 90; // 다음 카테고리 간격
    }

    // 푸터 (하단 Total)
    // 위치를 하단 고정으로 계산하거나 마지막 항목 아래로 배치
    yPos = height - 100; // 하단에서 100px 위
    const totalPercent = Math.round((ownedAll / totalAll) * 100);
    const totalText = `TOTAL ${ownedAll}/${totalAll} (${totalPercent}%)`;

    ctx.fillStyle = theme.color;
    ctx.font = "bold 36px 'Pretendard', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(totalText, width / 2, yPos);

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