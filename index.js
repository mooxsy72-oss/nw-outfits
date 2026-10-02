(function () {
    'use strict';

    const SITE_URL    = 'https://mooxsy72-oss.github.io/collections-of-outfits/';
    const SITE_ORIGIN = 'https://mooxsy72-oss.github.io';
    const BTN_ID   = 'nw-outfit-btn';
    const PANEL_ID = 'nw-outfit-panel';
    const LS_BTN   = 'nwOutfitBtnPos';
    const LS_BOX   = 'nwOutfitPanelBox';
    const LS_STATE = 'nwOutfitSiteState';
    const LS_ON    = 'nwOutfitEnabled';
    const LS_CFG   = 'nwOutfitConfig';
    const DRAG_THRESHOLD = 8;

    const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    function lsGet(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    }
    function lsSet(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* пофиг */ }
    }

    // Настройки отображения
    let cfg = Object.assign({
        mode: null,          // float | tab | wand
        wand: true,          // дублировать в меню палочки
        icon: 'svg-shirt',
        btnSize: 0,          // 0 = по умолчанию (46 на ПК, 38 на телефоне)
        tabSide: 'right', tabTop: 40,
        dockW: 420, dockH: 86,   // закладка: ширина окна в px, высота в % экрана
        mobW: 92, mobH: 80       // телефон: размер окна в % экрана
    }, lsGet(LS_CFG) || {});
    if (!cfg.mode) cfg.mode = lsGet(LS_ON) === false ? 'wand' : 'float';
    const saveCfg = () => lsSet(LS_CFG, cfg);

    const vp = () => ({
        w: document.documentElement.clientWidth || window.innerWidth,
        h: (window.visualViewport && window.visualViewport.height) || document.documentElement.clientHeight || window.innerHeight
    });

    /* ---------------- ИКОНКИ ---------------- */

    const SHIRT_SVG = '<svg class="nw-op-icon" viewBox="0 0 24 24" aria-hidden="true">'
        + '<path d="M9 2 L4 4.5 L2.4 9.2 L5 10.2 L5 22 L19 22 L19 10.2 '
        + 'L21.6 9.2 L20 4.5 L15 2 C15 3.66 13.66 5 12 5 C10.34 5 9 3.66 9 2 Z"/></svg>';

    // svg-shirt — родная иконка расширения, остальные — бесплатные solid из Font Awesome 6
    const ICONS = [
        'svg-shirt', 'fa-shirt', 'fa-person-dress', 'fa-vest', 'fa-vest-patches', 'fa-socks',
        'fa-mitten', 'fa-hat-cowboy', 'fa-hat-wizard', 'fa-glasses', 'fa-user-tie', 'fa-shoe-prints',
        'fa-bag-shopping', 'fa-gem', 'fa-ring', 'fa-crown', 'fa-scissors', 'fa-palette',
        'fa-spray-can-sparkles', 'fa-wand-magic-sparkles', 'fa-star', 'fa-heart', 'fa-fire', 'fa-feather',
        'fa-leaf', 'fa-moon', 'fa-sun', 'fa-snowflake', 'fa-cat', 'fa-paw',
        'fa-ghost', 'fa-images', 'fa-camera', 'fa-tag', 'fa-bookmark', 'fa-layer-group'
    ];
    const iconHtml = (name) => name === 'svg-shirt' || !/^fa-[a-z0-9-]+$/.test(name || '')
        ? SHIRT_SVG
        : '<i class="fa-solid ' + name + ' nw-op-fa" aria-hidden="true"></i>';

    // состояние сайта внутри окна: { hash, search, scroll, tag, more }
    let siteState = lsGet(LS_STATE) || { filter: 'all', gender: 'all', count: 40, scroll: 0 };

    function buildSrc() {
        return SITE_URL + (siteState.search || '') + (siteState.hash || '');
    }

    function savePanelBox() {
        if (!panel || isMobile() || cfg.mode === 'tab') return;
        lsSet(LS_BOX, {
            left:   panel.offsetLeft,
            top:    panel.offsetTop,
            width:  panel.offsetWidth,
            height: panel.offsetHeight
        });
    }

    /* ---------------- КНОПКА ---------------- */

    const btn = document.createElement('div');
    btn.id = BTN_ID;
    btn.title = 'Наряды';
    btn.innerHTML = iconHtml(cfg.icon);
    document.body.appendChild(btn);

    // восстановление позиции кнопки
    (function restoreBtn() {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(LS_BTN)); } catch (e) { saved = null; }
        const w = btn.offsetWidth || 46;
        const h = btn.offsetHeight || 46;
        let left, top;
        if (saved && typeof saved.left === 'number') {
            left = saved.left;
            top = saved.top;
        } else {
            left = window.innerWidth - w - 14;
            top = Math.round(window.innerHeight * 0.35);
        }
        btn.style.left = clamp(left, 4, window.innerWidth - w - 4) + 'px';
        btn.style.top = clamp(top, 4, window.innerHeight - h - 4) + 'px';
    })();

    /* ---------------- ПАНЕЛЬ ---------------- */

    let panel = null;

    function buildPanel() {
        panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.innerHTML = `
            <div class="nw-op-head">
                <span class="nw-op-title"><span class="nw-op-title-ic"></span> Наряды</span>
                <div class="nw-op-actions">
                    <div class="nw-op-btn nw-op-reload" title="Обновить"><i class="fa-solid fa-rotate-right"></i></div>
                    <div class="nw-op-btn nw-op-ext" title="Открыть в новой вкладке"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
                    <div class="nw-op-btn nw-op-close" title="Закрыть"><i class="fa-solid fa-xmark"></i></div>
                </div>
            </div>
            <div class="nw-op-warn">Таверна открыта по http — копирование в буфер браузером запрещено. Нужен https или localhost.</div>
            <div class="nw-op-body">
                <iframe class="nw-op-frame" src="about:blank"
                        allow="clipboard-write *; clipboard-read *"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"></iframe>
                <div class="nw-op-fallback">
                    Сайт не разрешил встраивание.
                    <a href="${SITE_URL}" target="_blank" rel="noopener">Открыть в новой вкладке</a>
                </div>
            </div>
            <div class="nw-op-resize"></div>
        `;
        document.body.appendChild(panel);

        const frame = panel.querySelector('.nw-op-frame');

        if (!window.isSecureContext) {
            panel.classList.add('nw-op-insecure');
        }

        // восстанавливаем размер окна ДО показа, иначе позиция посчитается неверно
        const box = lsGet(LS_BOX);
        if (box && !isMobile()) {
            if (typeof box.width  === 'number') panel.style.width  = clamp(box.width,  280, window.innerWidth  - 16) + 'px';
            if (typeof box.height === 'number') panel.style.height = clamp(box.height, 220, window.innerHeight - 16) + 'px';
        }

        frame.src = buildSrc();

        panel.querySelector('.nw-op-close').addEventListener('click', closePanel);
        panel.querySelector('.nw-op-ext').addEventListener('click', () => window.open(buildSrc(), '_blank'));
        panel.querySelector('.nw-op-reload').addEventListener('click', () => {
            frame.src = 'about:blank';
            setTimeout(() => {
                armBlockTimer();
                frame.src = buildSrc();
            }, 50);
        });

        // двойной клик по шапке — сброс позиции и размера
        panel.querySelector('.nw-op-head').addEventListener('dblclick', (e) => {
            if (e.target.closest('.nw-op-btn')) return;
            try { localStorage.removeItem(LS_BOX); } catch (err) { /* пофиг */ }
            panel.style.width  = '420px';
            panel.style.height = '560px';
            requestAnimationFrame(() => placePanel(window.innerWidth / 2, window.innerHeight / 2, true));
        });

        // если iframe заблокирован — покажем фолбэк
        let loaded = false;
        let blockTimer = null;

        function armBlockTimer() {
            loaded = false;
            panel.classList.remove('nw-op-blocked');
            if (blockTimer) clearTimeout(blockTimer);
            blockTimer = setTimeout(() => {
                if (!loaded) panel.classList.add('nw-op-blocked');
            }, 15000);
        }

        frame.addEventListener('load', () => {
            if (frame.getAttribute('src') === 'about:blank') return;
            loaded = true;
            if (blockTimer) clearTimeout(blockTimer);
            panel.classList.remove('nw-op-blocked');
            try {
                frame.contentWindow.postMessage({
                    nwOutfitsRestore: true,
                    filter: siteState.filter,
                    gender: siteState.gender,
                    count:  siteState.count,
                    scroll: siteState.scroll
                }, SITE_ORIGIN);
            } catch (err) { /* пофиг */ }
        });

        armBlockTimer();

        makeDraggable(panel, panel.querySelector('.nw-op-head'));
        makeResizable(panel, panel.querySelector('.nw-op-resize'));

        // В режиме закладки: смахнуть шапку к краю — закрыть.
        // (по самому сайту свайп не поймать — iframe забирает касания себе)
        const head = panel.querySelector('.nw-op-head');
        let sw = null;
        head.addEventListener('pointerdown', (e) => {
            sw = panel.classList.contains('nw-op-docked') && !e.target.closest('.nw-op-btn')
                ? { x: e.clientX, y: e.clientY } : null;
        });
        head.addEventListener('pointerup', (e) => {
            if (!sw) return;
            const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
            sw = null;
            const out = cfg.tabSide === 'left' ? -dx : dx;
            if (out > 35 && Math.abs(dx) > Math.abs(dy)) closePanel();
        });
        head.addEventListener('pointercancel', () => { sw = null; });

        applyLook();
    }

    // Закладка: окно выезжает сбоку, по вертикали по центру
    function placeDocked() {
        const { w: vw, h: vh } = vp();
        const left = cfg.tabSide === 'left';
        const w = Math.min(clamp(cfg.dockW || 420, 280, 900), Math.round(vw * 0.92));
        const h = Math.round(vh * clamp(cfg.dockH || 86, 40, 96) / 100);
        panel.classList.add('nw-op-docked');
        panel.classList.toggle('nw-op-dock-left', left);
        panel.style.width  = w + 'px';
        panel.style.height = h + 'px';
        panel.style.left   = (left ? 0 : vw - w) + 'px';
        panel.style.top    = Math.max(4, Math.round((vh - h) / 2)) + 'px';
    }

    function placePanel(x, y, ignoreSaved) {
        if (cfg.mode === 'tab') return placeDocked();
        panel.classList.remove('nw-op-docked', 'nw-op-dock-left');

        if (isMobile()) {
            // МОБИЛКА: жёсткие пиксели, никаких transform, размер — из настроек в % экрана
            const { w: vw, h: vh } = vp();
            const w = Math.round(vw * clamp(cfg.mobW || 92, 50, 100) / 100);
            const h = Math.round(vh * clamp(cfg.mobH || 80, 40, 96) / 100);
            panel.style.width  = w + 'px';
            panel.style.height = h + 'px';
            panel.style.left   = Math.round((vw - w) / 2) + 'px';
            panel.style.top    = Math.round((vh - h) / 2) + 'px';
            return;
        }

        // если окно уже перетаскивали — открываем там же
        const box = ignoreSaved ? null : lsGet(LS_BOX);
        // после бокового режима возвращаем обычный размер
        panel.style.width  = clamp((box && box.width)  || 420, 280, window.innerWidth  - 16) + 'px';
        panel.style.height = clamp((box && box.height) || 560, 220, window.innerHeight - 16) + 'px';
        const w = panel.offsetWidth  || 420;
        const h = panel.offsetHeight || 560;

        if (box && typeof box.left === 'number' && typeof box.top === 'number') {
            panel.style.left = clamp(box.left, 8, Math.max(8, window.innerWidth  - w - 8)) + 'px';
            panel.style.top  = clamp(box.top,  8, Math.max(8, window.innerHeight - h - 8)) + 'px';
            return;
        }

        let left = x + 14;
        let top  = y - 40;

        if (left + w > window.innerWidth - 8)  left = x - w - 14;
        if (top  + h > window.innerHeight - 8) top  = window.innerHeight - h - 8;

        panel.style.left = clamp(left, 8, Math.max(8, window.innerWidth  - w - 8)) + 'px';
        panel.style.top  = clamp(top,  8, Math.max(8, window.innerHeight - h - 8)) + 'px';
    }

    function openPanel(x, y) {
        if (!panel) buildPanel();
        panel.classList.add('nw-op-open');
        // размеры должны быть посчитаны ДО позиционирования
        requestAnimationFrame(() => placePanel(x, y));
    }

    function closePanel() {
        if (panel) panel.classList.remove('nw-op-open');
    }

    function togglePanel(x, y) {
        if (panel && panel.classList.contains('nw-op-open')) closePanel();
        else openPanel(x, y);
    }

    /* ---------------- DRAG (с порогом, тап не ломается) ---------------- */

    function makeDraggable(el, handle) {
        let sx = 0, sy = 0, ox = 0, oy = 0, active = false, moved = false, id = null;

        handle.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.nw-op-btn')) return;
            if (el.classList.contains('nw-op-docked')) return;
            active = true; moved = false; id = e.pointerId;
            sx = e.clientX; sy = e.clientY;
            ox = el.offsetLeft; oy = el.offsetTop;
            handle.setPointerCapture(id);
        });

        handle.addEventListener('pointermove', (e) => {
            if (!active || e.pointerId !== id) return;
            const dx = e.clientX - sx;
            const dy = e.clientY - sy;
            if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            if (!moved) { moved = true; document.body.classList.add('nw-op-dragging'); }
            e.preventDefault();
            el.style.left = clamp(ox + dx, 0, window.innerWidth  - el.offsetWidth)  + 'px';
            el.style.top  = clamp(oy + dy, 0, window.innerHeight - el.offsetHeight) + 'px';
        });

        const end = () => {
            if (!active) return;
            active = false;
            document.body.classList.remove('nw-op-dragging');
            if (moved) savePanelBox();
        };
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
    }

    function makeResizable(el, grip) {
        let sx = 0, sy = 0, sw = 0, sh = 0, active = false, id = null;

        grip.addEventListener('pointerdown', (e) => {
            active = true; id = e.pointerId;
            sx = e.clientX; sy = e.clientY;
            sw = el.offsetWidth; sh = el.offsetHeight;
            grip.setPointerCapture(id);
            document.body.classList.add('nw-op-dragging');
            e.preventDefault();
        });

        grip.addEventListener('pointermove', (e) => {
            if (!active || e.pointerId !== id) return;
            el.style.width  = clamp(sw + (e.clientX - sx), 280, window.innerWidth  - el.offsetLeft) + 'px';
            el.style.height = clamp(sh + (e.clientY - sy), 220, window.innerHeight - el.offsetTop)  + 'px';
        });

        const end = () => {
            if (!active) return;
            active = false;
            document.body.classList.remove('nw-op-dragging');
            savePanelBox();
        };
        grip.addEventListener('pointerup', end);
        grip.addEventListener('pointercancel', end);
    }


    /* ---------------- КНОПКА: тап vs драг ---------------- */

    (function btnInteraction() {
        let sx = 0, sy = 0, ox = 0, oy = 0, down = false, moved = false, axis = null, id = null;
        const inward = (dx) => cfg.tabSide === 'left' ? dx : -dx;

        btn.addEventListener('pointerdown', (e) => {
            down = true; moved = false; axis = null; id = e.pointerId;
            sx = e.clientX; sy = e.clientY;
            ox = btn.offsetLeft; oy = btn.offsetTop;
            btn.setPointerCapture(id);
            btn.classList.add('nw-press');
            // НЕ вызываем preventDefault — иначе на телефоне ломается тап
        });

        btn.addEventListener('pointermove', (e) => {
            if (!down || e.pointerId !== id) return;
            const dx = e.clientX - sx;
            const dy = e.clientY - sy;
            if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            if (!moved) { moved = true; axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; }
            e.preventDefault();
            if (cfg.mode === 'tab') {
                if (axis === 'y') {
                    btn.style.top = clamp(oy + dy, 4, window.innerHeight - btn.offsetHeight - 4) + 'px';
                } else {
                    const pull = clamp(inward(dx), 0, 28);
                    btn.style.transform = 'translateX(' + (cfg.tabSide === 'left' ? pull : -pull) + 'px)';
                }
                return;
            }
            btn.style.left = clamp(ox + dx, 4, window.innerWidth  - btn.offsetWidth  - 4) + 'px';
            btn.style.top  = clamp(oy + dy, 4, window.innerHeight - btn.offsetHeight - 4) + 'px';
        });

        btn.addEventListener('pointerup', (e) => {
            if (!down || e.pointerId !== id) return;
            down = false;
            btn.classList.remove('nw-press');
            if (!moved) { togglePanel(e.clientX, e.clientY); return; }
            if (cfg.mode === 'tab') {
                btn.style.transform = '';
                if (axis === 'x') {
                    if (inward(e.clientX - sx) > 6) openPanel(e.clientX, e.clientY);
                } else {
                    cfg.tabTop = clamp(Math.round(((btn.offsetTop + btn.offsetHeight / 2) / window.innerHeight) * 100), 3, 97);
                    saveCfg();
                    placeTab();
                    announceTabs();
                }
                return;
            }
            try {
                localStorage.setItem(LS_BTN, JSON.stringify({ left: btn.offsetLeft, top: btn.offsetTop }));
            } catch (err) { /* пофиг */ }
        });

        btn.addEventListener('pointercancel', () => {
            down = false;
            btn.classList.remove('nw-press');
            btn.style.transform = '';
        });
    })();

    /* ---------------- ЗАКЛАДКИ РАЗНЫХ РАСШИРЕНИЙ ---------------- */
    // Общее правило с другими расширениями: закладка помечает себя data-st-sidetab="left|right"
    // и при размещении обходит чужие закладки у того же края, чтобы не налезать.

    function placeSideTab(el, side, pct) {
        el.dataset.stSidetab = side;
        const vh = window.innerHeight;
        const h = el.offsetHeight || 50, w = el.offsetWidth || 20;
        el.style.left = (side === 'left' ? 0 : Math.max(0, window.innerWidth - w)) + 'px';
        let top = clamp(Math.round(vh * pct / 100 - h / 2), 4, Math.max(4, vh - h - 4));
        const GAP = 8;
        const others = Array.from(document.querySelectorAll('[data-st-sidetab="' + side + '"]'))
            .filter(o => o !== el && o.getClientRects().length)
            .map(o => { const r = o.getBoundingClientRect(); return { t: r.top, b: r.bottom }; });
        const hitAt = (t) => others.find(o => t < o.b + GAP && t + h > o.t - GAP);
        if (hitAt(top)) {
            let d = top, u = top, g = 0, hit;
            while ((hit = hitAt(d)) && g++ < 20) d = hit.b + GAP;
            g = 0;
            while ((hit = hitAt(u)) && g++ < 20) u = hit.t - GAP - h;
            const dOk = d + h <= vh - 4, uOk = u >= 4;
            top = dOk && (!uOk || d - top <= top - u) ? d : (uOk ? u : d);
        }
        el.style.top = clamp(top, 4, Math.max(4, vh - h - 4)) + 'px';
    }
    // Сообщаем остальным, что закладки поменялись — пусть пересчитаются
    const announceTabs = () => window.dispatchEvent(new CustomEvent('st-sidetab-moved', { detail: BTN_ID }));
    window.addEventListener('st-sidetab-moved', (e) => {
        if (e.detail !== BTN_ID && cfg.mode === 'tab') placeTab();
    });

    function placeTab() {
        btn.classList.toggle('nw-op-tab-left', cfg.tabSide === 'left');
        placeSideTab(btn, cfg.tabSide, cfg.tabTop);
    }

    function placeFloat() {
        const saved = lsGet(LS_BTN);
        const w = btn.offsetWidth || 46, h = btn.offsetHeight || 46;
        const left = saved && typeof saved.left === 'number' ? saved.left : window.innerWidth - w - 14;
        const top  = saved && typeof saved.top  === 'number' ? saved.top  : Math.round(window.innerHeight * 0.35);
        btn.style.left = clamp(left, 4, Math.max(4, window.innerWidth  - w - 4)) + 'px';
        btn.style.top  = clamp(top,  4, Math.max(4, window.innerHeight - h - 4)) + 'px';
    }

    /* ---------------- РЕЖИМЫ ---------------- */

    const MODES = {
        float: { label: 'Плавающая кнопка', ic: 'fa-circle-dot',
                 desc: 'Круглая кнопка, которую можно таскать по экрану.' },
        tab:   { label: 'Закладка сбоку', ic: 'fa-bookmark',
                 desc: 'Язычок у края экрана. Тап или свайп — окно выезжает сбоку. Не налезает на закладки других расширений.' },
        wand:  { label: 'Только в волшебной палочке', ic: 'fa-wand-magic-sparkles',
                 desc: 'На экране ничего не висит, окно открывается из меню палочки.' }
    };

    function applyMode() {
        const m = cfg.mode;
        if (cfg.btnSize) btn.style.setProperty('--nw-btn-size', clamp(cfg.btnSize, 28, 72) + 'px');
        else btn.style.removeProperty('--nw-btn-size');
        btn.style.transform = '';
        btn.classList.toggle('nw-op-hidden', m === 'wand');
        btn.classList.toggle('nw-op-tab', m === 'tab');
        if (m === 'tab') placeTab();
        else { delete btn.dataset.stSidetab; if (m === 'float') placeFloat(); }
        if (panel && panel.classList.contains('nw-op-open')) placePanel(window.innerWidth / 2, window.innerHeight / 2);
        mountWand();
        announceTabs();
    }

    function applyLook() {
        btn.innerHTML = iconHtml(cfg.icon);
        const t = panel && panel.querySelector('.nw-op-title-ic');
        if (t) t.innerHTML = iconHtml(cfg.icon);
        const w = document.querySelector('#nw-op-wand .extensionsMenuExtensionButton');
        if (w) w.innerHTML = iconHtml(cfg.icon);
    }

    /* ---------------- ПУНКТ В МЕНЮ ВОЛШЕБНОЙ ПАЛОЧКИ ---------------- */

    function mountWand() {
        const menu = document.getElementById('extensionsMenu');
        if (!menu) return false;
        let item = document.getElementById('nw-op-wand');
        if (!item) {
            item = document.createElement('div');
            item.id = 'nw-op-wand';
            item.className = 'list-group-item flex-container flexGap5 interactable';
            item.tabIndex = 0;
            item.innerHTML = '<div class="extensionsMenuExtensionButton nw-op-wand-ic"></div><span>Наряды</span>';
            item.addEventListener('click', () => openPanel(window.innerWidth / 2, window.innerHeight / 2));
            menu.appendChild(item);
        }
        item.classList.toggle('nw-op-hidden', !(cfg.wand || cfg.mode === 'wand'));
        applyLook();
        return true;
    }

        /* ---------------- Слушаем состояние сайта ---------------- */

    window.addEventListener('message', (e) => {
        if (e.origin !== SITE_ORIGIN) return;
        const d = e.data;
        if (!d || d.nwOutfits !== true) return;

        siteState = {
            filter: typeof d.filter === 'string' ? d.filter : 'all',
            gender: typeof d.gender === 'string' ? d.gender : 'all',
            count:  typeof d.count  === 'number' ? d.count  : 40,
            scroll: typeof d.scroll === 'number' ? d.scroll : 0
        };
        lsSet(LS_STATE, siteState);
    });

    /* ---------------- Ресайз/поворот экрана ---------------- */

    window.addEventListener('resize', () => {
        if (cfg.mode === 'tab') placeTab();
        else if (cfg.mode === 'float') {
            const w = btn.offsetWidth, h = btn.offsetHeight;
            btn.style.left = clamp(btn.offsetLeft, 4, window.innerWidth  - w - 4) + 'px';
            btn.style.top  = clamp(btn.offsetTop,  4, window.innerHeight - h - 4) + 'px';
        }

        if (panel && panel.classList.contains('nw-op-open')) {
            if (isMobile() || cfg.mode === 'tab') {
                placePanel(0, 0);
            } else {
                panel.style.left = clamp(panel.offsetLeft, 8, Math.max(8, window.innerWidth  - panel.offsetWidth  - 8)) + 'px';
                panel.style.top  = clamp(panel.offsetTop,  8, Math.max(8, window.innerHeight - panel.offsetHeight - 8)) + 'px';
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });

    /* ---------------- НАСТРОЙКИ В ПАНЕЛИ РАСШИРЕНИЙ ---------------- */

    function resetPositions() {
        try {
            localStorage.removeItem(LS_BTN);
            localStorage.removeItem(LS_BOX);
        } catch (e) { /* пофиг */ }
        cfg.tabTop = 40; saveCfg();
        applyMode();
        if (panel) requestAnimationFrame(() => placePanel(window.innerWidth / 2, window.innerHeight / 2, true));
    }

    // Размер окна на ПК живёт вместе с позицией в LS_BOX
    function setDesktopBox(part) {
        const box = Object.assign({ width: 420, height: 560 }, lsGet(LS_BOX) || {}, part);
        lsSet(LS_BOX, box);
        if (panel && panel.classList.contains('nw-op-open') && cfg.mode !== 'tab' && !isMobile()) placePanel(0, 0);
    }

    function buildSettings() {
        const host = document.getElementById('extensions_settings2')
                  || document.getElementById('extensions_settings');
        if (!host) return false;
        if (document.getElementById('nw-op-settings')) return true;

        const block = document.createElement('div');
        block.id = 'nw-op-settings';
        block.className = 'inline-drawer';

        const head = document.createElement('div');
        head.className = 'inline-drawer-toggle inline-drawer-header nw-op-set-head';
        head.innerHTML = '<b>Наряды</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>';

        const body = document.createElement('div');
        body.className = 'inline-drawer-content';
        const inner = document.createElement('div');
        inner.className = 'nw-op-set-inner';

        // клики внутри настроек не должны утекать в обработчики таверны
        const own = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); fn(e); };
        const cap = (text) => { const d = document.createElement('div'); d.className = 'nw-op-cap'; d.textContent = text; return d; };

        const mkRange = (label, min, max, get, set, unit) => {
            const row = document.createElement('div');
            row.className = 'nw-op-range';
            row.innerHTML = '<span class="nw-op-range-lb"></span><input type="range"><span class="nw-op-range-val"></span>';
            row.querySelector('.nw-op-range-lb').textContent = label;
            const inp = row.querySelector('input');
            const val = row.querySelector('.nw-op-range-val');
            inp.min = String(min); inp.max = String(max); inp.step = '1';
            const sync = () => { inp.value = String(get()); val.textContent = inp.value + unit; };
            ['pointerdown', 'click'].forEach(ev => inp.addEventListener(ev, e => e.stopPropagation()));
            inp.addEventListener('input', (e) => { e.stopPropagation(); set(Number(inp.value)); val.textContent = inp.value + unit; });
            inp.addEventListener('change', () => saveCfg());
            sync();
            return { row, sync };
        };

        const mkCheck = (text, get, set) => {
            const l = document.createElement('div');
            l.className = 'nw-op-check';
            l.tabIndex = 0;
            l.innerHTML = '<span class="nw-op-check-box"><i class="fa-solid fa-check"></i></span><span></span>';
            l.lastChild.textContent = text;
            const sync = () => l.classList.toggle('nw-op-check-on', !!get());
            l.addEventListener('click', own(() => { set(!get()); sync(); }));
            sync();
            return { el: l, sync };
        };

        const mkSection = (title, previewFn, build) => {
            const sec = document.createElement('div');
            sec.className = 'nw-op-sub';
            const h = document.createElement('div');
            h.className = 'nw-op-sub-head';
            h.innerHTML = '<i class="fa-solid fa-chevron-right nw-op-sub-arrow"></i><span class="nw-op-sub-title"></span><span class="nw-op-sub-prev"></span>';
            h.querySelector('.nw-op-sub-title').textContent = title;
            const prev = h.querySelector('.nw-op-sub-prev');
            const b = document.createElement('div');
            b.className = 'nw-op-sub-body';
            let built = false;
            const refresh = () => previewFn && previewFn(prev);
            h.addEventListener('click', own(() => {
                if (!built) { build(b, refresh); built = true; }
                sec.classList.toggle('nw-op-sub-open');
            }));
            refresh();
            sec.append(h, b);
            return sec;
        };

        // --- Где показывать ---
        const grid = document.createElement('div');
        grid.className = 'nw-op-mode-grid';
        Object.entries(MODES).forEach(([key, m]) => {
            const card = document.createElement('div');
            card.className = 'nw-op-mode-card';
            card.dataset.mode = key;
            card.innerHTML = '<i class="fa-solid ' + m.ic + ' nw-op-mode-ic"></i><div class="nw-op-mode-txt"><b></b><small></small></div>';
            card.querySelector('b').textContent = m.label;
            card.querySelector('small').textContent = m.desc;
            card.addEventListener('click', own(() => { cfg.mode = key; saveCfg(); applyMode(); sync(); }));
            grid.appendChild(card);
        });

        // --- Настройки выбранного режима ---
        const opts = document.createElement('div');
        opts.className = 'nw-op-mode-opts';
        const rBtn  = mkRange('Размер кнопки', 28, 64, () => cfg.btnSize || (isMobile() ? 38 : 46),
            (v) => { cfg.btnSize = v; applyMode(); }, 'px');
        const rTab  = mkRange('Размер закладки', 28, 64, () => cfg.btnSize || 40,
            (v) => { cfg.btnSize = v; applyMode(); }, 'px');
        const rDockW = mkRange('Ширина окна', 280, 900, () => cfg.dockW,
            (v) => { cfg.dockW = v; if (panel && panel.classList.contains('nw-op-open')) placeDocked(); }, 'px');
        const rDockH = mkRange('Высота окна', 40, 96, () => cfg.dockH,
            (v) => { cfg.dockH = v; if (panel && panel.classList.contains('nw-op-open')) placeDocked(); }, '%');

        const side = document.createElement('div');
        side.className = 'nw-op-range';
        side.innerHTML = '<span class="nw-op-range-lb">Сторона</span><div class="nw-op-seg"></div>';
        const seg = side.querySelector('.nw-op-seg');
        [['left', 'Слева', 'fa-arrow-left'], ['right', 'Справа', 'fa-arrow-right']].forEach(([k, t, ic]) => {
            const b = document.createElement('div');
            b.className = 'nw-op-seg-btn';
            b.dataset.side = k;
            b.innerHTML = '<i class="fa-solid ' + ic + '"></i> ' + t;
            b.addEventListener('click', own(() => { cfg.tabSide = k; saveCfg(); applyMode(); sync(); }));
            seg.appendChild(b);
        });

        const tip = document.createElement('small');
        tip.className = 'nw-op-set-hint';
        const TIPS = {
            float: 'Тяни кнопку куда удобно. Окно можно двигать за шапку и тянуть за уголок.',
            tab: 'Тяни закладку вверх-вниз вдоль края. Тап или свайп от края — открыть, смахнуть шапку окна к краю — закрыть.',
            wand: 'Окно открывается через меню волшебной палочки слева от поля ввода.'
        };
        opts.append(rBtn.row, rTab.row, side, rDockW.row, rDockH.row, tip);

        const cWand = mkCheck('Ещё и в меню волшебной палочки', () => cfg.wand,
            (v) => { cfg.wand = v; saveCfg(); mountWand(); });

        // --- Размер окна (для кнопки и палочки; у закладки свои размеры выше) ---
        const sizeSec = mkSection('Размер окна', null, (b) => {
            const pcBox = () => Object.assign({ width: 420, height: 560 }, lsGet(LS_BOX) || {});
            const rW  = mkRange('Ширина', 280, 1000, () => pcBox().width,  (v) => setDesktopBox({ width: v }), 'px');
            const rH  = mkRange('Высота', 220, 1000, () => pcBox().height, (v) => setDesktopBox({ height: v }), 'px');
            const rMW = mkRange('Ширина', 50, 100, () => cfg.mobW,
                (v) => { cfg.mobW = v; if (panel && isMobile() && cfg.mode !== 'tab') placePanel(0, 0); }, '%');
            const rMH = mkRange('Высота', 40, 96, () => cfg.mobH,
                (v) => { cfg.mobH = v; if (panel && isMobile() && cfg.mode !== 'tab') placePanel(0, 0); }, '%');
            const capPc = document.createElement('div'); capPc.className = 'nw-op-mini'; capPc.textContent = 'На компьютере';
            const capMb = document.createElement('div'); capMb.className = 'nw-op-mini'; capMb.textContent = 'На телефоне (от размера экрана)';
            b.append(capPc, rW.row, rH.row, capMb, rMW.row, rMH.row);
        });

        // --- Иконка ---
        const icoSec = mkSection('Иконка',
            (p) => { p.innerHTML = iconHtml(cfg.icon); },
            (b, refresh) => {
                const g = document.createElement('div');
                g.className = 'nw-op-ico-grid';
                g.innerHTML = ICONS.map(n =>
                    '<div class="nw-op-ico-opt" data-ico="' + n + '" title="' + (n === 'svg-shirt' ? 'родная' : n.slice(3)) + '">' + iconHtml(n) + '</div>'
                ).join('');
                const mark = () => g.querySelectorAll('.nw-op-ico-opt').forEach(o => o.classList.toggle('nw-op-sel', o.dataset.ico === cfg.icon));
                g.addEventListener('click', own((e) => {
                    const o = e.target.closest('.nw-op-ico-opt');
                    if (!o) return;
                    cfg.icon = o.dataset.ico; saveCfg(); applyLook(); mark(); refresh();
                }));
                b.appendChild(g);
                mark();
            });

        // --- Действия ---
        const row = document.createElement('div');
        row.className = 'nw-op-set-row';
        const mkBtn = (ic, text, fn) => {
            const b = document.createElement('div');
            b.className = 'menu_button menu_button_icon';
            b.innerHTML = '<i class="fa-solid ' + ic + '"></i><span></span>';
            b.querySelector('span').textContent = text;
            b.addEventListener('click', own(fn));
            return b;
        };
        row.append(
            mkBtn('fa-up-right-from-square', 'Открыть окно', () => openPanel(window.innerWidth / 2, window.innerHeight / 2)),
            mkBtn('fa-rotate-left', 'Сбросить положение', resetPositions)
        );

        const hint = document.createElement('small');
        hint.className = 'nw-op-set-hint';
        hint.textContent = 'Позиция, размер окна и последний тег на сайте сохраняются.';

        function sync() {
            const m = cfg.mode;
            grid.querySelectorAll('.nw-op-mode-card').forEach(c => c.classList.toggle('nw-op-sel', c.dataset.mode === m));
            seg.querySelectorAll('.nw-op-seg-btn').forEach(b => b.classList.toggle('nw-op-sel', b.dataset.side === cfg.tabSide));
            rBtn.row.classList.toggle('nw-op-hidden', m !== 'float');
            [rTab.row, side, rDockW.row, rDockH.row].forEach(r => r.classList.toggle('nw-op-hidden', m !== 'tab'));
            sizeSec.classList.toggle('nw-op-hidden', m === 'tab');
            cWand.el.classList.toggle('nw-op-hidden', m === 'wand');
            tip.textContent = TIPS[m] || '';
            [rBtn, rTab, rDockW, rDockH].forEach(r => r.sync());
        }

        inner.append(cap('Где показывать'), grid, opts, cWand.el, sizeSec,
                     cap('Внешний вид'), icoSec, cap('Действия'), row, hint);
        body.appendChild(inner);
        block.append(head, body);
        host.appendChild(block);
        sync();

        // capture: true — перехватываем клик до того, как он дойдёт
        // до делегированного обработчика таверны со slideToggle
        head.addEventListener('click', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            block.classList.toggle('nw-op-set-open');
        }, true);

        return true;
    }

    applyMode();
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => {
        if (panel && panel.classList.contains('nw-op-open') && (isMobile() || cfg.mode === 'tab')) placePanel(0, 0);
    });

    (function waitForSettingsHost() {
        let tries = 0;
        const step = () => {
            const a = buildSettings();
            const b = mountWand();
            return a && b;
        };
        if (step()) return;
        const iv = setInterval(() => {
            if (step() || ++tries > 60) clearInterval(iv);
        }, 500);
    })();
})();
