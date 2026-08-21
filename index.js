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
    const DRAG_THRESHOLD = 8;

    const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    function lsGet(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    }
    function lsSet(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* пофиг */ }
    }

    // состояние сайта внутри окна: { hash, search, scroll, tag, more }
    let siteState = lsGet(LS_STATE) || { filter: 'all', gender: 'all', count: 40, scroll: 0 };

    function buildSrc() {
        return SITE_URL + (siteState.search || '') + (siteState.hash || '');
    }

    function savePanelBox() {
        if (!panel || isMobile()) return;
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
    btn.innerHTML = '<svg class="nw-op-icon" viewBox="0 0 24 24" aria-hidden="true">'
                  + '<path d="M9 2 L4 4.5 L2.4 9.2 L5 10.2 L5 22 L19 22 L19 10.2 '
                  + 'L21.6 9.2 L20 4.5 L15 2 C15 3.66 13.66 5 12 5 C10.34 5 9 3.66 9 2 Z"/>'
                  + '</svg>';
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
                <span class="nw-op-title"><i class="fa-solid fa-shirt"></i> Наряды</span>
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
    }

    function placePanel(x, y, ignoreSaved) {
        if (isMobile()) {
            // МОБИЛКА: жёсткие пиксели, никаких transform, сохранённая позиция игнорируется
            const w = Math.round(window.innerWidth * 0.92);
            const h = Math.round(window.innerHeight * 0.80);
            panel.style.width  = w + 'px';
            panel.style.height = h + 'px';
            panel.style.left   = Math.round((window.innerWidth - w) / 2) + 'px';
            panel.style.top    = Math.round((window.innerHeight - h) / 2) + 'px';
            return;
        }

        const w = panel.offsetWidth  || 420;
        const h = panel.offsetHeight || 560;

        // если окно уже перетаскивали — открываем там же
        const box = ignoreSaved ? null : lsGet(LS_BOX);
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
        let sx = 0, sy = 0, ox = 0, oy = 0, down = false, moved = false, id = null;

        btn.addEventListener('pointerdown', (e) => {
            down = true; moved = false; id = e.pointerId;
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
            moved = true;
            e.preventDefault();
            btn.style.left = clamp(ox + dx, 4, window.innerWidth  - btn.offsetWidth  - 4) + 'px';
            btn.style.top  = clamp(oy + dy, 4, window.innerHeight - btn.offsetHeight - 4) + 'px';
        });

        btn.addEventListener('pointerup', (e) => {
            if (!down || e.pointerId !== id) return;
            down = false;
            btn.classList.remove('nw-press');
            if (moved) {
                try {
                    localStorage.setItem(LS_BTN, JSON.stringify({ left: btn.offsetLeft, top: btn.offsetTop }));
                } catch (err) { /* пофиг */ }
            } else {
                togglePanel(e.clientX, e.clientY);
            }
        });

        btn.addEventListener('pointercancel', () => {
            down = false;
            btn.classList.remove('nw-press');
        });
    })();

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
        const w = btn.offsetWidth, h = btn.offsetHeight;
        btn.style.left = clamp(btn.offsetLeft, 4, window.innerWidth  - w - 4) + 'px';
        btn.style.top  = clamp(btn.offsetTop,  4, window.innerHeight - h - 4) + 'px';

        if (panel && panel.classList.contains('nw-op-open')) {
            if (isMobile()) {
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

    let enabled = lsGet(LS_ON);
    if (enabled === null || enabled === undefined) enabled = true;

    function applyEnabled(on) {
        enabled = !!on;
        lsSet(LS_ON, enabled);
        btn.classList.toggle('nw-op-hidden', !enabled);
        if (!enabled) closePanel();
    }

    function resetPositions() {
        try {
            localStorage.removeItem(LS_BTN);
            localStorage.removeItem(LS_BOX);
        } catch (e) { /* пофиг */ }

        const w = btn.offsetWidth  || 46;
        const h = btn.offsetHeight || 46;
        btn.style.left = clamp(window.innerWidth - w - 14, 4, window.innerWidth - w - 4) + 'px';
        btn.style.top  = Math.round(window.innerHeight * 0.35) + 'px';

        if (panel) {
            panel.style.width  = '420px';
            panel.style.height = '560px';
            requestAnimationFrame(() => placePanel(window.innerWidth / 2, window.innerHeight / 2, true));
        }
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

        const title = document.createElement('b');
        title.textContent = 'Наряды';

        const icon = document.createElement('div');
        icon.className = 'inline-drawer-icon fa-solid fa-circle-chevron-down down';

        head.appendChild(title);
        head.appendChild(icon);

        const body = document.createElement('div');
        body.className = 'inline-drawer-content';

        const inner = document.createElement('div');
        inner.className = 'nw-op-set-inner';


        const label = document.createElement('label');
        label.className = 'checkbox_label';
        label.htmlFor = 'nw-op-toggle';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'nw-op-toggle';
        cb.checked = enabled;

        const labelText = document.createElement('span');
        labelText.textContent = 'Плавающая кнопка';

        label.appendChild(cb);
        label.appendChild(labelText);

        const row = document.createElement('div');
        row.className = 'nw-op-set-row';

        const openBtn = document.createElement('div');
        openBtn.className = 'menu_button menu_button_icon';
        openBtn.id = 'nw-op-open-now';
        openBtn.textContent = 'Открыть панель';

        const resetBtn = document.createElement('div');
        resetBtn.className = 'menu_button menu_button_icon';
        resetBtn.id = 'nw-op-reset-now';
        resetBtn.textContent = 'Сбросить положение';

        row.appendChild(openBtn);
        row.appendChild(resetBtn);

        const hint = document.createElement('small');
        hint.className = 'nw-op-set-hint';
        hint.textContent = 'Выключатель убирает кнопку и закрывает окно. Позиция, размер и последний тег сохраняются.';

        inner.appendChild(label);
        inner.appendChild(row);
        inner.appendChild(hint);
        body.appendChild(inner);

        block.appendChild(head);
        block.appendChild(body);
        host.appendChild(block);

        // capture: true — перехватываем клик до того, как он дойдёт
        // до делегированного обработчика таверны со slideToggle
        head.addEventListener('click', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            block.classList.toggle('nw-op-set-open');
        }, true);

        cb.addEventListener('change', () => applyEnabled(cb.checked));

        openBtn.addEventListener('click', () => {
            openPanel(window.innerWidth / 2, window.innerHeight / 2);
        });

        resetBtn.addEventListener('click', resetPositions);

        return true;
    }

    applyEnabled(enabled);

    (function waitForSettingsHost() {
        if (buildSettings()) return;
        let tries = 0;
        const iv = setInterval(() => {
            if (buildSettings() || ++tries > 60) clearInterval(iv);
        }, 500);
    })();
})();
