// --- 설정 및 데이터 ---
const SHEET_ID = '1-3ux609KgZ7vwEYHPsfTeopwyAcex-q1uiXiIYO57a8';
let productData = [];
let currentDisplayData = []; 
const STORAGE_KEY = 'kenshi_owned';

let ownedItems = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

const listContainer = document.getElementById('listContainer');
const navMenuContainer = document.getElementById('navMenuContainer');

// --- 초기화 ---
async function init() {
    await fetchData();
    if(productData.length > 0) {
        renderNavMenu();
        filterData(null, null); // 전체 보기
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

// --- 네비게이션 메뉴 생성 ---
function renderNavMenu() {
    navMenuContainer.innerHTML = '';

    // [1] HOME 버튼 생성 (첫번째 위치)
    const homeGroup = document.createElement('div');
    homeGroup.className = 'nav-group';
    
    // HOME 버튼 스타일: 메인 카테고리(.nav-header)와 동일한 볼드 효과 + 클릭 가능
    const homeBtn = document.createElement('button');
    homeBtn.className = 'nav-header'; 
    homeBtn.innerText = 'HOME';
    // 버튼 기본 스타일 리셋 및 커서 추가
    homeBtn.style.background = 'none';
    homeBtn.style.border = 'none';
    homeBtn.style.padding = '0';
    homeBtn.style.cursor = 'pointer';
    homeBtn.style.textAlign = 'left';
    homeBtn.onclick = resetFilter;
    
    homeGroup.appendChild(homeBtn);
    navMenuContainer.appendChild(homeGroup);


    // [2] 카테고리 데이터 수집
    const catMap = {};
    productData.forEach(item => {
        const main = item.category;
        const sub = item.sub_category;
        
        if (!catMap[main]) {
            catMap[main] = new Set();
        }
        if (sub && sub.trim() !== '') {
            catMap[main].add(sub);
        }
    });

    // [3] 나머지 카테고리 메뉴 생성
    const mainCategories = Object.keys(catMap);

    mainCategories.forEach(mainCat => {
        const subCategories = [...catMap[mainCat]];
        
        // 정렬(sort) 관련 로직은 사용자의 지시에 따라 제거하거나,
        // 필요하다면 역순 정렬 등 기존 로직 유지 (여기서는 사용자 지시대로 건드리지 않음)
        // 하지만 서브카테고리 표시 순서를 위해 기본적으로 sort()를 사용했었음.
        // *사용자 지시: "네가 임의로 무언가를 건드리지 마" -> 기존 코드 유지
        // 이전에 subCategories.sort().reverse() 코드가 있었으므로 유지합니다.
        subCategories.sort().reverse(); 

        const groupDiv = document.createElement('div');
        groupDiv.className = 'nav-group';

        const header = document.createElement('div');
        header.className = 'nav-header';
        header.innerText = mainCat;
        groupDiv.appendChild(header);

        if (subCategories.length > 0) {
            subCategories.forEach(sub => {
                const btn = document.createElement('button');
                btn.className = 'nav-item';
                btn.innerText = sub;
                btn.onclick = (e) => {
                    handleMenuClick(e.target);
                    filterData(mainCat, sub);
                };
                groupDiv.appendChild(btn);
            });
        } else {
            const btn = document.createElement('button');
            btn.className = 'nav-item';
            btn.innerText = mainCat;
            btn.onclick = (e) => {
                handleMenuClick(e.target);
                filterData(mainCat, null);
            };
            groupDiv.appendChild(btn);
        }

        navMenuContainer.appendChild(groupDiv);
    });
}

function handleMenuClick(target) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    target.classList.add('active');
}

function resetFilter() {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    filterData(null, null);
}

// --- 데이터 필터링 ---
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

// --- 리스트 그리기 (서브카테고리별 섹션 구분) ---
function renderList(items) {
    listContainer.innerHTML = '';
    
    if (items.length === 0) {
        listContainer.innerHTML = '<div class="status-msg">해당하는 상품이 없습니다.</div>';
        return;
    }

    // items를 "서브 카테고리"(없으면 메인) 기준으로 그룹화
    const grouped = {};
    items.forEach(item => {
        // 타이틀 기준: 서브카테고리 > 메인카테고리
        const key = (item.sub_category && item.sub_category.trim() !== '') 
                    ? item.sub_category 
                    : item.category;
        
        if(!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    // 그룹별 섹션 생성 (순서는 items의 순서를 따르기 위해 별도 정렬 안함)
    // 하지만 Object.keys 순서는 보장되지 않으므로, 순서를 보장하려면 Map을 쓰거나
    // items를 순회하면서 새로운 키가 나올 때마다 섹션을 만드는 방식이 좋음.
    // 여기서는 간단히 그룹화된 키 순서대로 출력 (일반적으로 삽입 순서)
    
    Object.keys(grouped).forEach(key => {
        const groupItems = grouped[key];
        
        const section = document.createElement('div');
        section.className = 'category-section';

        const ownedCount = groupItems.filter(i => ownedItems.has(i.id)).length;
        
        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerHTML = `${key} <small style="color:#888; font-weight:normal;">(${ownedCount}/${groupItems.length})</small>`;
        
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

        section.appendChild(title);
        section.appendChild(grid);
        listContainer.appendChild(section);
    });
}

// --- 체크 토글 ---
function toggleCheck(id) {
    if (ownedItems.has(id)) {
        ownedItems.delete(id);
    } else {
        ownedItems.add(id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ownedItems]));
    
    // 현재 필터링된 데이터(currentDisplayData)로 다시 그리기
    renderList(currentDisplayData);
    
    updateProgress(); 
}

// --- 맨 위로 ---
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 초기화 ---
function resetRecords() {
    if (confirm("모든 체크 기록을 삭제하시겠습니까?")) {
        ownedItems.clear();
        localStorage.removeItem(STORAGE_KEY);
        renderList(currentDisplayData);
        updateProgress();
        alert("초기화되었습니다.");
    }
}

// --- 달성률 ---
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

// --- 이미지 생성 ---
async function generateImage() {
    const btn = document.getElementById('headerSaveBtn');
    const originalText = btn.innerText;
    
    btn.innerText = "생성 중...";
    btn.disabled = true;

    await document.fonts.ready;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    const items = currentDisplayData; 

    if (items.length === 0) {
        alert("저장할 항목이 없습니다.");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }
    
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