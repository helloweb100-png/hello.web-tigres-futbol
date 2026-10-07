/* ════════════════════════════════════════════════════════════
   ACADEMIA TIGRES CHALCO · app.js
   Vanilla JS · sin dependencias (Lenis opcional para scroll suave)
   Módulos: loader · scroll · header/menú · hero (canvas, slider, tilt)
            reveal/split/contadores · parallax · marquee · timeline
            lightbox · sedes (estado en vivo) · checklist · FAQ
            formulario → WhatsApp · confetti · cursor · WhatsApp flotante
════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    const root = document.documentElement;
    root.classList.add('app-ok'); // avisa al <head> que el JS cargó correctamente

    /* ─────────── Utilidades ─────────── */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const store = {
        get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } }
    };

    /* WhatsApp de la academia (número de contacto de la carta de autorización) */
    const WA_NUMBER = '525510533889';
    const waUrl = (msg) => `https://wa.me/${WA_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
    const setWaHref = (el) => { el.href = waUrl(el.dataset.wa); };

    /* ─────────── 1. Scroll suave (Lenis) ─────────── */
    let lenis = null;
    function initLenis() {
        if (reduce || typeof window.Lenis !== 'function') return;
        try {
            lenis = new window.Lenis({
                duration: 1.3,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                wheelMultiplier: .9
            });
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
            if ($('#loader')) lenis.stop(); // bloqueado hasta terminar el loader
        } catch (e) { lenis = null; }
    }
    const scrollTo = (target, offset = -68) => {
        if (lenis) { lenis.scrollTo(target, { offset, duration: 1.5 }); return; }
        const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    };
    const lockScroll = () => { if (lenis) lenis.stop(); };
    const unlockScroll = () => { if (lenis) lenis.start(); };

    /* ─────────── 2. Enlaces de WhatsApp con mensaje ─────────── */
    function initWaLinks() { $$('[data-wa]').forEach(setWaHref); }

    /* ─────────── 3. Texto dividido en palabras ─────────── */
    function splitNode(el) {
        let idx = 0;
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const outer = document.createElement('span');
                        outer.className = 'w';
                        const inner = document.createElement('span');
                        inner.className = 'wi';
                        inner.style.setProperty('--i', idx++);
                        inner.textContent = part;
                        outer.appendChild(inner);
                        frag.appendChild(outer);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        };
        walk(el);
    }
    function initSplit() { $$('[data-split]').forEach(splitNode); }

    /* ─────────── 4. Loader ─────────── */
    function initLoader() {
        return new Promise((resolve) => {
            const loader = $('#loader');
            if (!loader) { resolve(); return; }
            if (reduce) { loader.remove(); resolve(); return; }

            const pctEl = $('#loaderPct'), msgEl = $('#loaderMsg'), barEl = $('#loaderBar'), arc = $('#loaderArc');
            const CIRC = 565.5, MIN = 2200, MAX = 6500;
            const msgs = ['Calentando motores', 'Alineando el equipo', 'Marcando la cancha', 'Saltando a jugar'];
            let p = 0, last = -1, done = false;
            let loaded = document.readyState === 'complete';
            if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
            const start = performance.now();

            const tick = (now) => {
                const el = now - start;
                const ready = (loaded && el > MIN) || el > MAX;
                const target = ready ? 1 : Math.min(.92, (el / MIN) * .92);
                p += (target - p) * (ready ? .14 : .07);
                if (ready && p > .996) p = 1;

                pctEl.textContent = Math.round(p * 100);
                arc.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(1);
                barEl.style.transform = `scaleX(${p.toFixed(3)})`;
                const mi = Math.min(msgs.length - 1, Math.floor(p * msgs.length));
                if (mi !== last) { msgEl.textContent = msgs[mi]; last = mi; }

                if (p >= 1 && !done) {
                    done = true;
                    setTimeout(() => {
                        loader.classList.add('is-done');
                        resolve();
                        setTimeout(() => { loader.classList.add('is-gone'); loader.remove(); }, 1600);
                    }, 380);
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    function revealPage() {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        unlockScroll();
        setTimeout(() => { const h = $('.hero__headline'); if (h) h.classList.add('is-in'); }, 500);
        initWaTip();
    }

    /* ─────────── 5. Reveal al hacer scroll ─────────── */
    function initReveal() {
        const els = $$('[data-reveal], [data-split]:not(.hero__headline)');
        if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                // también revela lo que quedó por encima del viewport (saltos por ancla)
                if (en.isIntersecting || en.boundingClientRect.top < 0) {
                    en.target.classList.add('is-in');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
        els.forEach((e) => io.observe(e));
    }

    /* ─────────── 6. Contadores ─────────── */
    function initCounters() {
        const els = $$('[data-count]');
        if (reduce || !('IntersectionObserver' in window)) return;
        const run = (el) => {
            const target = +el.dataset.count;
            const sep = el.hasAttribute('data-sep');
            const t0 = performance.now(), dur = 1900;
            const step = (now) => {
                const k = clamp((now - t0) / dur, 0, 1);
                const v = Math.round(target * (1 - Math.pow(1 - k, 4)));
                el.textContent = sep ? v.toLocaleString('es-MX') : String(v);
                if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        els.forEach((el) => { el.textContent = '0'; });
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
        }, { threshold: .6 });
        els.forEach((el) => io.observe(el));
    }

    /* ─────────── 7. Header, progreso, menú móvil ─────────── */
    const header = $('#siteHeader');
    const progressBar = $('#progress');
    const toTopBtn = $('#toTop');
    let lastY = 0;

    const burger = $('#burger');
    const mnav = $('#mnav');
    function openMenu() {
        mnav.classList.add('is-open');
        mnav.setAttribute('aria-hidden', 'false');
        burger.classList.add('is-open');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        document.body.classList.add('menu-open');
        lockScroll();
    }
    function closeMenu() {
        if (!mnav.classList.contains('is-open')) return;
        mnav.classList.remove('is-open');
        mnav.setAttribute('aria-hidden', 'true');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        document.body.classList.remove('menu-open');
        unlockScroll();
    }
    function initMenu() {
        if (!burger || !mnav) return;
        $$('.mnav__nav a', mnav).forEach((a, i) => a.style.setProperty('--k', i));
        burger.addEventListener('click', () => (mnav.classList.contains('is-open') ? closeMenu() : openMenu()));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
    }

    function initAnchors() {
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const target = $(id);
            if (!target) return;
            e.preventDefault();
            closeMenu();
            scrollTo(target);
            history.replaceState(null, '', id);
        });
        if (toTopBtn) toTopBtn.addEventListener('click', () => scrollTo(0, 0));
    }

    function initActiveNav() {
        const links = $$('.nav a, .mnav__nav a');
        const map = new Map();
        links.forEach((a) => {
            const sec = $(a.getAttribute('href'));
            if (sec) map.set(sec, (map.get(sec) || []).concat(a));
        });
        if (!map.size || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                links.forEach((l) => l.classList.remove('is-active'));
                (map.get(en.target) || []).forEach((l) => l.classList.add('is-active'));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, sec) => io.observe(sec));
    }

    /* ─────────── 8. Bucle de scroll (progreso, header, timeline, parallax) ─────────── */
    const tl = $('#timeline');
    const tlItems = tl ? $$('.tl', tl) : [];
    const para = $$('[data-parallax]').map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || .05, vis: false, t: 0 }));

    function updateTimeline() {
        if (!tl) return;
        const r = tl.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = clamp((vh * .62 - r.top) / r.height, 0, 1);
        tl.style.setProperty('--p', p.toFixed(4));
        tlItems.forEach((it) => {
            const d = $('.tl__dot', it).getBoundingClientRect();
            it.classList.toggle('is-active', d.top + d.height / 2 < vh * .62);
        });
    }
    function updateParallax() {
        if (reduce) return;
        const vh = window.innerHeight;
        para.forEach((p) => {
            if (!p.vis) return;
            const r = p.el.getBoundingClientRect();
            const c = r.top + r.height / 2 - vh / 2 - p.t;
            p.t = -c * p.speed;
            p.el.style.translate = `0 ${p.t.toFixed(1)}px`;
        });
    }
    function onScrollFrame() {
        const y = window.scrollY || 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
        if (header) {
            header.classList.toggle('is-scrolled', y > 40);
            const dy = y - lastY;
            if (!document.body.classList.contains('menu-open')) {
                if (y > 520 && dy > 4) header.classList.add('is-hidden');
                else if (dy < -4 || y <= 520) header.classList.remove('is-hidden');
            }
        }
        lastY = y;
        updateTimeline();
        updateParallax();
    }
    function initScrollLoop() {
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((en) => { const p = para.find((x) => x.el === en.target); if (p) p.vis = en.isIntersecting; });
            }, { rootMargin: '200px 0px' });
            para.forEach((p) => io.observe(p.el));
        }
        let ticking = false;
        const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScrollFrame(); }); } };
        window.addEventListener('scroll', req, { passive: true });
        window.addEventListener('resize', debounce(req, 100));
        onScrollFrame();
    }

    /* ─────────── 9. Hero: partículas + foco de luz ─────────── */
    function initHero() {
        const hero = $('#inicio');
        const cv = $('#heroCanvas');
        const spot = $('#heroSpot');
        if (!hero || !cv) return;
        const ctx = cv.getContext('2d');
        let w = 0, h = 0, dpr = 1, pts = [], raf = 0, running = false;
        const mouse = { x: -9999, y: -9999 };
        const spotPos = { x: 0, y: 0, tx: 0, ty: 0 };

        const make = () => ({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
            r: Math.random() * 1.7 + .6, gold: Math.random() < .34
        });
        const resize = () => {
            const r = cv.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = r.width; h = r.height;
            cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.round(clamp((w * h) / 12000, 34, 110));
            pts = Array.from({ length: n }, make);
            spotPos.x = spotPos.tx = w * .72; spotPos.y = spotPos.ty = h * .3;
            if (reduce) draw();
        };
        const LINK = 125;
        function draw() {
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                for (let j = i + 1; j < pts.length; j++) {
                    const b = pts[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        const al = (1 - Math.sqrt(d2) / LINK) * .26;
                        ctx.strokeStyle = (a.gold || b.gold) ? `rgba(253,187,17,${al})` : `rgba(120,170,255,${al})`;
                        ctx.lineWidth = .8;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const mx = a.x - mouse.x, my = a.y - mouse.y;
                const md = mx * mx + my * my;
                if (md < 170 * 170) {
                    ctx.strokeStyle = `rgba(253,187,17,${(1 - Math.sqrt(md) / 170) * .5})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                }
            }
            for (const p of pts) {
                ctx.fillStyle = p.gold ? 'rgba(253,187,17,.9)' : 'rgba(150,190,255,.75)';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            }
        }
        function step() {
            for (const p of pts) {
                const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
                if (d < 130 && d > 0) { p.x += (dx / d) * (130 - d) * .02; p.y += (dy / d) * (130 - d) * .02; }
                p.x += p.vx; p.y += p.vy;
                if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
            }
            spotPos.x = lerp(spotPos.x, spotPos.tx, .08);
            spotPos.y = lerp(spotPos.y, spotPos.ty, .08);
            if (spot) { spot.style.setProperty('--mx', `${spotPos.x.toFixed(0)}px`); spot.style.setProperty('--my', `${spotPos.y.toFixed(0)}px`); }
            draw();
            raf = requestAnimationFrame(step);
        }
        const run = () => { if (!running && !reduce) { running = true; raf = requestAnimationFrame(step); } };
        const stop = () => { running = false; cancelAnimationFrame(raf); };

        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
            spotPos.tx = mouse.x; spotPos.ty = mouse.y;
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

        resize();
        window.addEventListener('resize', debounce(resize, 200));
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([en]) => (en.isIntersecting ? run() : stop()), { threshold: 0 }).observe(hero);
        } else { run(); }
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
    }

    /* ─────────── 10. Hero: slider de jugadores ─────────── */
    function initStage() {
        const slides = $$('#stageSlides img');
        const dots = $$('#stageDots button');
        const stage = $('#stage');
        if (slides.length < 2) return;
        let i = 0, timer = null;
        const go = (n) => {
            i = (n + slides.length) % slides.length;
            slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
            dots.forEach((d, k) => { d.classList.toggle('is-active', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
        };
        const stop = () => clearInterval(timer);
        const start = () => { stop(); if (!reduce) timer = setInterval(() => go(i + 1), 4300); };
        dots.forEach((d, k) => d.addEventListener('click', () => { go(k); start(); }));
        if (stage) { stage.addEventListener('pointerenter', stop); stage.addEventListener('pointerleave', start); }
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        go(0); start();
    }

    /* ─────────── 11. Interacciones de puntero: tilt, spotlight, magnético ─────────── */
    function initTilt() {
        if (!fine || reduce) return;
        $$('[data-tilt]').forEach((el) => {
            const max = parseFloat(el.dataset.tilt) || 9;
            let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
            const tick = () => {
                cx += (tx - cx) * .12; cy += (ty - cy) * .12;
                el.style.transform = `perspective(900px) rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`;
                if (Math.abs(tx - cx) > .02 || Math.abs(ty - cy) > .02) raf = requestAnimationFrame(tick);
                else { raf = 0; if (tx === 0 && ty === 0) el.style.transform = ''; }
            };
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                tx = ((e.clientX - r.left) / r.width - .5) * max * 2;
                ty = -((e.clientY - r.top) / r.height - .5) * max * 2;
                if (!raf) raf = requestAnimationFrame(tick);
            });
            el.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
        });
    }
    function initSpotlight() {
        document.addEventListener('pointermove', (e) => {
            const el = e.target.closest && e.target.closest('[data-spotlight]');
            if (!el) return;
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${e.clientX - r.left}px`);
            el.style.setProperty('--my', `${e.clientY - r.top}px`);
        }, { passive: true });
    }
    function initMagnetic() {
        if (!fine || reduce) return;
        $$('[data-magnetic]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - (r.left + r.width / 2)) * .22;
                const y = (e.clientY - (r.top + r.height / 2)) * .3;
                el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
            });
            el.addEventListener('pointerleave', () => { el.style.translate = ''; });
        });
    }

    /* ─────────── 12. Marquee reactivo al scroll ─────────── */
    function initMarquee() {
        const rows = $$('[data-marquee]');
        if (!rows.length || reduce) return;
        const states = [];
        rows.forEach((row) => {
            const group = row.firstElementChild;
            if (!group) return;
            const s = { row, group, dir: parseFloat(row.dataset.marquee) || -1, x: 0, gw: 0, vis: true };
            const build = () => {
                $$('.strip__clone', row).forEach((n) => n.remove());
                s.gw = group.offsetWidth;
                if (!s.gw) return;
                const n = Math.ceil((window.innerWidth * 2) / s.gw) + 1;
                for (let k = 0; k < n; k++) {
                    const c = group.cloneNode(true);
                    c.classList.add('strip__clone');
                    c.setAttribute('aria-hidden', 'true');
                    row.appendChild(c);
                }
                s.x = s.dir > 0 ? -s.gw : 0;
            };
            build();
            window.addEventListener('resize', debounce(build, 250));
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([en]) => { s.vis = en.isIntersecting; }, { rootMargin: '100px' }).observe(row.parentElement);
            }
            states.push(s);
        });
        let lastScroll = window.scrollY, vel = 0, flip = 1;
        const loop = () => {
            const y = window.scrollY;
            vel = lerp(vel, y - lastScroll, .15);
            lastScroll = y;
            if (vel > 1.2) flip = lerp(flip, 1, .1); else if (vel < -1.2) flip = lerp(flip, -1, .1);
            const speed = .75 + Math.min(Math.abs(vel) * .35, 10);
            states.forEach((s) => {
                if (!s.vis || !s.gw) return;
                s.x += s.dir * speed * flip;
                if (s.x <= -s.gw) s.x += s.gw;
                if (s.x > 0) s.x -= s.gw;
                s.row.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
            });
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    /* ─────────── 13. Lightbox ─────────── */
    function initLightbox() {
        const lb = $('#lightbox');
        if (!lb) return;
        const img = $('#lbImg'), cap = $('#lbCap'), cnt = $('#lbCount');
        const prev = $('#lbPrev'), next = $('#lbNext'), close = $('#lbClose');
        let group = [], idx = 0, lastFocus = null, sx = null;

        const show = (i, instant) => {
            idx = (i + group.length) % group.length;
            const el = group[idx];
            const src = el.dataset.lbSrc;
            const alt = (el.querySelector('img') || {}).alt || '';
            const apply = () => {
                img.onload = () => img.classList.remove('is-swap');
                img.src = src; img.alt = alt;
                cap.textContent = el.dataset.lbCaption || alt;
                cnt.textContent = group.length > 1 ? `${idx + 1} / ${group.length}` : '';
                setTimeout(() => img.classList.remove('is-swap'), 700);
            };
            if (instant) apply(); else { img.classList.add('is-swap'); setTimeout(apply, 170); }
            prev.hidden = next.hidden = group.length < 2;
            [1, -1].forEach((d) => {
                const n = group[(idx + d + group.length) % group.length];
                if (n && n !== el) { const im = new Image(); im.src = n.dataset.lbSrc; }
            });
        };
        const open = (el) => {
            const scope = el.closest('.bento, .posters__track, .doc');
            group = scope ? $$('[data-lb]', scope) : [el];
            lastFocus = document.activeElement;
            show(group.indexOf(el), true);
            lb.classList.add('is-open');
            lb.setAttribute('aria-hidden', 'false');
            lockScroll();
            document.body.style.overflow = 'hidden';
            setTimeout(() => close.focus(), 60);
        };
        const shut = () => {
            if (!lb.classList.contains('is-open')) return;
            lb.classList.remove('is-open');
            lb.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (!mnav.classList.contains('is-open')) unlockScroll();
            if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        };

        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-lb]');
            if (!el) return;
            if (el.closest('.posters__track.is-dragged')) return;
            open(el);
        });
        close.addEventListener('click', shut);
        prev.addEventListener('click', () => show(idx - 1));
        next.addEventListener('click', () => show(idx + 1));
        lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__fig')) shut(); });
        document.addEventListener('keydown', (e) => {
            if (!lb.classList.contains('is-open')) return;
            if (e.key === 'Escape') shut();
            else if (e.key === 'ArrowRight' && group.length > 1) show(idx + 1);
            else if (e.key === 'ArrowLeft' && group.length > 1) show(idx - 1);
            else if (e.key === 'Tab') {
                const f = [close, prev, next].filter((b) => !b.hidden);
                const k = f.indexOf(document.activeElement);
                e.preventDefault();
                f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
            }
        });
        lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
        lb.addEventListener('pointerup', (e) => {
            if (sx === null) return;
            const dx = e.clientX - sx; sx = null;
            if (Math.abs(dx) > 60 && group.length > 1) show(idx + (dx < 0 ? 1 : -1));
        });
    }

    /* Arrastrar las infografías con el mouse */
    function initPostersDrag() {
        const track = $('#postersTrack');
        if (!track || !fine) return;
        let down = false, startX = 0, startL = 0, moved = 0;
        track.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse') return;
            down = true; moved = 0; startX = e.clientX; startL = track.scrollLeft;
        });
        window.addEventListener('pointermove', (e) => {
            if (!down) return;
            const dx = e.clientX - startX;
            moved = Math.max(moved, Math.abs(dx));
            if (moved > 5) { track.classList.add('is-drag', 'is-dragged'); track.scrollLeft = startL - dx; }
        });
        window.addEventListener('pointerup', () => {
            if (!down) return;
            down = false; track.classList.remove('is-drag');
            setTimeout(() => track.classList.remove('is-dragged'), 60);
        });
    }

    /* ─────────── 14. Sedes: tabs, mapa diferido y estado en vivo ─────────── */
    const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const SESSIONS = { '1,2,3,4': [[9, 11], [16, 18]], '1,3,5': [[16, 18]] };
    const fmtHour = (h) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'pm' : 'am'}`;
    const mxNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));

    function updateToday() {
        const now = mxNow();
        const dow = now.getDay();
        const hour = now.getHours() + now.getMinutes() / 60;
        $$('.days[data-days]').forEach((box) => {
            const set = box.dataset.days.split(',').map(Number);
            $$('[data-d]', box).forEach((s) => {
                const d = +s.dataset.d;
                s.classList.toggle('is-on', set.includes(d));
                s.classList.toggle('is-today', d === dow);
            });
        });
        $$('.today[data-today]').forEach((chip) => {
            const key = chip.dataset.today;
            const set = key.split(',').map(Number);
            const sessions = SESSIONS[key] || [];
            const label = $('em', chip);
            let text, on = false;
            const nextDay = () => { for (let k = 1; k <= 7; k++) { const d = (dow + k) % 7; if (set.includes(d)) return DAY_NAMES[d]; } return ''; };
            if (set.includes(dow)) {
                const current = sessions.find(([a, b]) => hour >= a && hour < b);
                const upcoming = sessions.find(([a]) => hour < a);
                if (current) { text = `Entrenando ahora · hasta ${fmtHour(current[1])}`; on = true; }
                else if (upcoming) { text = `Hoy entrenamos · ${fmtHour(upcoming[0])}`; on = true; }
                else text = `Hoy ya terminó · próximo ${nextDay()}`;
            } else text = `Hoy descansamos · próximo ${nextDay()}`;
            label.textContent = text;
            chip.classList.toggle('is-on', on);
        });
    }
    function initSedes() {
        const tabs = $$('.tabs [role="tab"]');
        if (!tabs.length) return;
        const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
        const loadMap = (p) => {
            const f = p && p.querySelector('iframe[data-src]');
            if (f) { f.src = f.dataset.src; f.removeAttribute('data-src'); }
        };
        const select = (i, focus) => {
            tabs.forEach((t, k) => {
                const on = k === i;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
                panels[k].hidden = !on;
                panels[k].classList.toggle('is-active', on);
            });
            loadMap(panels[i]);
            if (focus) tabs[i].focus();
        };
        tabs.forEach((t, i) => {
            t.addEventListener('click', () => select(i));
            t.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select((i + 1) % tabs.length, true); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
            });
        });
        const wrap = $('.sedes');
        if (wrap && 'IntersectionObserver' in window) {
            const io = new IntersectionObserver(([en]) => {
                if (en.isIntersecting) { loadMap(panels.find((p) => !p.hidden)); io.disconnect(); }
            }, { rootMargin: '500px' });
            io.observe(wrap);
        } else { loadMap(panels[0]); }
        updateToday();
        setInterval(updateToday, 60000);
    }

    /* ─────────── 15. Checklist de inscripción ─────────── */
    function initChecklist() {
        const box = $('#check');
        const items = $$('[data-check]');
        if (!box || !items.length) return;
        const ring = $('#ring'), count = $('#checkCount'), total = $('#checkTotal');
        const hint = $('#checkHint'), cta = $('#checkCta'), ctaTxt = $('#checkCtaTxt');
        const KEY = 'tigres-checklist-v1';
        const saved = store.get(KEY);
        if (Array.isArray(saved)) items.forEach((it, i) => { it.checked = !!saved[i]; });
        total.textContent = items.length;

        const update = (persist) => {
            const n = items.filter((i) => i.checked).length;
            const all = n === items.length;
            ring.style.setProperty('--p', Math.round((n / items.length) * 100));
            ring.classList.toggle('is-full', all);
            ring.classList.toggle('is-empty', n === 0);
            box.classList.toggle('is-complete', all);
            count.textContent = n;
            ring.setAttribute('aria-label', `Llevas ${n} de ${items.length} elementos listos`);
            hint.textContent = all ? '¡Todo listo, Tigre! Ya puedes inscribirte.' : n === 0 ? 'Marca lo que ya tienes listo.' : `Te faltan ${items.length - n} para estar listo.`;
            ctaTxt.textContent = all ? '¡Todo listo! Quiero inscribirme ya' : 'Ya tengo todo, ¡quiero inscribirme!';
            cta.dataset.wa = all
                ? 'Hola, ya tengo todos los documentos y requisitos listos. Quiero inscribir a mi hijo/a en Academia Tigres Chalco. ¿Cuáles son los siguientes pasos?'
                : `Hola, quiero inscribir a mi hijo/a en Academia Tigres Chalco. Ya tengo ${n} de ${items.length} requisitos listos, ¿me ayudan con lo que falta?`;
            setWaHref(cta);
            if (persist) store.set(KEY, items.map((i) => i.checked));
        };
        items.forEach((it) => it.addEventListener('change', () => update(true)));
        update(false);
    }

    /* ─────────── 16. FAQ ─────────── */
    function initFaq() {
        const items = $$('.qa');
        if (!items.length) return;
        const set = (it, open) => {
            it.classList.toggle('is-open', open);
            $('.qa__q', it).setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        items.forEach((it) => {
            $('.qa__q', it).addEventListener('click', () => {
                const open = !it.classList.contains('is-open');
                items.forEach((o) => set(o, false));
                set(it, open);
            });
        });
        set(items[0], true);
    }

    /* ─────────── 17. Formulario → WhatsApp ─────────── */
    function confetti(x, y) {
        if (reduce) return;
        const cv = document.createElement('canvas');
        cv.className = 'confetti';
        document.body.appendChild(cv);
        const ctx = cv.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = window.innerWidth, H = window.innerHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        ctx.scale(dpr, dpr);
        const cols = ['#FDBB11', '#FFD54A', '#0056C3', '#ffffff', '#0A63D8'];
        const ps = Array.from({ length: 160 }, () => {
            const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
            return { x, y, vx: Math.cos(a) * s * (.6 + Math.random()), vy: Math.sin(a) * s - 7, w: 6 + Math.random() * 7, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[(Math.random() * cols.length) | 0], life: 1 };
        });
        const t0 = performance.now();
        const loop = (now) => {
            ctx.clearRect(0, 0, W, H);
            let alive = 0;
            ps.forEach((p) => {
                p.vy += .28; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= .006;
                if (p.life > 0 && p.y < H + 30) {
                    alive++;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, p.life);
                    ctx.translate(p.x, p.y); ctx.rotate(p.r);
                    ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            });
            if (alive && now - t0 < 4200) requestAnimationFrame(loop); else cv.remove();
        };
        requestAnimationFrame(loop);
    }

    function initForm() {
        const form = $('#leadForm');
        if (!form) return;
        const yearSel = $('#f-anio'), modSel = $('#f-mod'), dateIn = $('#f-fecha');
        const btn = $('#leadBtn'), btnTxt = $('#leadBtnTxt'), ok = $('#leadOk'), retry = $('#leadRetry');

        // Años de nacimiento 2022 → 2007 (+ opción Femenil edad libre)
        for (let y = 2022; y >= 2007; y--) yearSel.add(new Option(String(y), String(y)));
        yearSel.add(new Option('2006 o antes (Femenil, edad libre)', '2006 o antes'));

        // Fecha mínima: hoy (hora de la Ciudad de México)
        const n = mxNow();
        const pad = (v) => String(v).padStart(2, '0');
        dateIn.min = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;

        // Sugerir modalidad según el año
        yearSel.addEventListener('change', () => {
            if (modSel.value) return;
            const y = parseInt(yearSel.value, 10);
            let want = '';
            if (y >= 2019) want = 'Baby Tigres';
            else if (y >= 2007) want = 'Academia Tigres';
            else want = 'Academia Femenil';
            const opt = Array.from(modSel.options).find((o) => o.text.startsWith(want));
            if (opt) modSel.value = opt.value || opt.text;
        });

        const fieldOf = (el) => el.closest('.field');
        const setErr = (el, msg) => {
            const f = fieldOf(el);
            f.classList.toggle('has-error', !!msg);
            $('.field__err', f).textContent = msg || '';
            el.setAttribute('aria-invalid', msg ? 'true' : 'false');
        };
        $$('input[required], select[required]', form).forEach((el) => {
            el.addEventListener('input', () => setErr(el, ''));
            el.addEventListener('change', () => setErr(el, ''));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(form).entries());
            let first = null;
            const need = [['tutor', 'Escribe tu nombre'], ['jugador', 'Escribe el nombre del jugador o jugadora'], ['anio', 'Elige el año de nacimiento'], ['mod', 'Elige una modalidad']];
            need.forEach(([k, m]) => {
                const el = form.elements[k];
                const bad = !String(f[k] || '').trim();
                setErr(el, bad ? m : '');
                if (bad && !first) first = el;
            });
            if (first) { first.focus(); return; }

            let fecha = '';
            if (f.fecha) {
                fecha = new Date(`${f.fecha}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            }
            const lines = [
                '¡Hola, Academia Tigres Chalco! 🐯',
                `Soy ${f.tutor.trim()}, tutor/a de ${f.jugador.trim()} (nacido/a en ${f.anio}).`,
                `Me interesa: ${f.mod}.`,
                f.horario ? `Horario preferido: ${f.horario}.` : '',
                fecha ? `Fecha deseada para la clase muestra: ${fecha}.` : '',
                f.msg && f.msg.trim() ? `Comentarios: ${f.msg.trim()}` : '',
                '¿Me ayudan a agendar la clase muestra gratuita? ¡Gracias!'
            ].filter(Boolean);
            const url = waUrl(lines.join('\n'));

            // Se abre de inmediato (gesto del usuario) para evitar bloqueo de pop-ups
            const win = window.open(url, '_blank', 'noopener');
            btn.classList.add('is-loading');
            btnTxt.textContent = 'Abriendo WhatsApp…';
            const r = btn.getBoundingClientRect();
            confetti(r.left + r.width / 2, r.top + r.height / 2);
            retry.href = url;
            setTimeout(() => {
                form.hidden = true;
                $('.form-card__head').hidden = true;
                ok.hidden = false;
                btn.classList.remove('is-loading');
                btnTxt.textContent = 'Sí, quiero reservar mi clase muestra';
                if (!win) retry.focus();
            }, 900);
        });
    }

    /* ─────────── 18. WhatsApp flotante + volver arriba ─────────── */
    function initWaTip() {
        const w = $('#waFloat');
        if (!w) return;
        const close = $('#waTipClose');
        let dismissed = false;
        try { dismissed = sessionStorage.getItem('wa-tip') === '1'; } catch (e) { /* noop */ }
        close.addEventListener('click', () => {
            w.classList.remove('show-tip');
            try { sessionStorage.setItem('wa-tip', '1'); } catch (e) { /* noop */ }
        });
        if (!dismissed) {
            setTimeout(() => {
                w.classList.add('show-tip');
                setTimeout(() => w.classList.remove('show-tip'), 9000);
            }, 8000);
        }
    }

    /* ─────────── 19. Cursor personalizado ─────────── */
    function initCursor() {
        if (!fine || reduce) return;
        const c = document.createElement('div');
        c.className = 'cursor is-hidden';
        c.setAttribute('aria-hidden', 'true');
        document.body.appendChild(c);
        let x = window.innerWidth / 2, y = window.innerHeight / 2, tx = x, ty = y, label = '';
        window.addEventListener('pointermove', (e) => {
            tx = e.clientX; ty = e.clientY;
            c.classList.remove('is-hidden');
            const t = e.target;
            const view = t.closest && t.closest('[data-lb]');
            const link = t.closest && t.closest('a, button, label, [role="tab"], select, input, textarea');
            c.classList.toggle('is-view', !!view);
            c.classList.toggle('is-link', !!link && !view);
            const next = view ? 'Ver' : '';
            if (next !== label) { label = next; c.textContent = next; }
        }, { passive: true });
        document.documentElement.addEventListener('mouseleave', () => c.classList.add('is-hidden'));
        const loop = () => {
            x = lerp(x, tx, .22); y = lerp(y, ty, .22);
            c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
            requestAnimationFrame(loop);
        };
        loop();
    }

    /* ─────────── 20. Varios ─────────── */
    function initMisc() {
        const y = $('#year');
        if (y) y.textContent = new Date().getFullYear();
        $$('[data-hero]').forEach((el, i) => el.style.setProperty('--hi', i));
    }

    /* ─────────── ARRANQUE ─────────── */
    if ('scrollRestoration' in history && !location.hash) {
        history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
    }
    initMisc();
    initWaLinks();
    initSplit();
    initLenis();
    initMenu();
    initAnchors();
    initReveal();
    initCounters();
    initScrollLoop();
    initActiveNav();
    initHero();
    initStage();
    initTilt();
    initSpotlight();
    initMagnetic();
    initMarquee();
    initLightbox();
    initPostersDrag();
    initSedes();
    initChecklist();
    initFaq();
    initForm();
    initCursor();
    initLoader().then(revealPage);
})();
