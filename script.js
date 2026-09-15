(function () {
    'use strict';

    var body = document.body;
    var hitCircle = document.getElementById('hitCircle');
    var modeFan = document.getElementById('modeFan');
    var modeItems = Array.prototype.slice.call(modeFan.querySelectorAll('.mode-item'));
    var gateHint = document.getElementById('gateHint');
    var stage = document.getElementById('stage');
    var stageExit = document.getElementById('stageExit');
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));

    var desktopQuery = window.matchMedia('(min-width: 641px)');
    var activeSection = 'about';

    // Gate state only: a full radial ring of icons around the large centered
    // hit-circle.
    function positionFan() {
        if (!desktopQuery.matches) return;
        if (body.classList.contains('is-entered')) return;

        var n = modeItems.length;
        var radius = Math.min(200, window.innerWidth * 0.28, window.innerHeight * 0.26);

        modeItems.forEach(function (item, i) {
            // Offset off the compass points: nothing lands due north (crowds
            // the badge) or due south (crowds the name/tagline).
            var deg = -60 + (360 / n) * i;
            var rad = (deg * Math.PI) / 180;
            var x = Math.cos(rad) * radius;
            var y = Math.sin(rad) * radius;
            item.style.setProperty('--tx', x.toFixed(1) + 'px');
            item.style.setProperty('--ty', y.toFixed(1) + 'px');
        });
    }

    // Docked state: a jog-wheel. Items sit on a ring around the small
    // avatar; `rotation` spins that ring (wheel, drag, keyboard focus, or
    // landing on a section), and only the arc facing into the open canvas
    // stays legible — full opacity near the window's center, fading out
    // and finally hidden/non-interactive past it, so three read clearly
    // and the rest are dialed in rather than laid in a line.
    var FAN_RADIUS = 95;
    var WINDOW_CENTER = 45;
    var FADE_FULL = 65;
    var FADE_ZERO = 125;
    var SLOT_STEP = 360 / modeItems.length;
    var rotation = WINDOW_CENTER;
    var snapTimer;

    // Wheel/drag rotate the dial from anywhere in this corner zone, not
    // just when the pointer is precisely over one of the small icons —
    // the fan's own box is 0x0, so without this a real hover target would
    // only ever be the handful of scattered icon discs.
    var DIAL_ZONE = 230;
    function inDialZone(x, y) {
        return x <= DIAL_ZONE && y <= DIAL_ZONE;
    }

    function angleDelta(a, b) {
        return (((a - b) % 360) + 540) % 360 - 180;
    }

    function renderDockedFan() {
        modeItems.forEach(function (item, i) {
            var angle = i * SLOT_STEP + rotation;
            var rad = (angle * Math.PI) / 180;
            var x = Math.cos(rad) * FAN_RADIUS;
            var y = Math.sin(rad) * FAN_RADIUS;
            var dist = Math.abs(angleDelta(angle, WINDOW_CENTER));
            var opacity;
            if (dist <= FADE_FULL) {
                opacity = 1;
            } else if (dist >= FADE_ZERO) {
                opacity = 0;
            } else {
                opacity = 1 - (dist - FADE_FULL) / (FADE_ZERO - FADE_FULL);
            }
            item.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) scale(1)';
            item.style.opacity = opacity.toFixed(3);
            item.style.pointerEvents = opacity > 0.15 ? 'auto' : 'none';
        });
    }

    function resetDockedFanStyles() {
        modeItems.forEach(function (item) {
            item.style.removeProperty('transform');
            item.style.removeProperty('opacity');
            item.style.removeProperty('pointer-events');
        });
    }

    function snapRotation() {
        var nearest = Math.round((rotation - WINDOW_CENTER) / SLOT_STEP) * SLOT_STEP + WINDOW_CENTER;
        rotation = nearest;
        renderDockedFan();
    }

    function rotateToIndex(i) {
        rotation = WINDOW_CENTER - i * SLOT_STEP;
    }

    function setFanOpen(open, viaKeyboard) {
        body.classList.toggle('is-open', open);
        hitCircle.setAttribute('aria-expanded', open ? 'true' : 'false');

        if (open) {
            if (body.classList.contains('is-entered')) {
                if (desktopQuery.matches) renderDockedFan();
            } else {
                positionFan();
            }
            gateHint.textContent = 'Choose where to go';
            if (viaKeyboard) {
                var first = modeItems[0];
                if (first) first.focus();
            }
        } else {
            gateHint.textContent = 'Click to select a section';
            clearTimeout(snapTimer);
            resetDockedFanStyles();
        }
    }

    function isFanOpen() {
        return body.classList.contains('is-open');
    }

    function setActiveMode(section) {
        modeItems.forEach(function (item) {
            item.classList.toggle('is-active', item.getAttribute('data-section') === section);
        });
    }

    function showSection(section) {
        activeSection = section;
        panels.forEach(function (panel) {
            panel.hidden = panel.getAttribute('data-panel') !== section;
        });
        setActiveMode(section);

        var idx = modeItems.findIndex(function (item) {
            return item.getAttribute('data-section') === section;
        });
        if (idx >= 0) rotateToIndex(idx);
    }

    function enterStage(section) {
        showSection(section);
        stage.hidden = false;
        // Force layout so the hidden -> visible swap doesn't collapse into the class toggle.
        // eslint-disable-next-line no-unused-expressions
        stage.offsetHeight;
        requestAnimationFrame(function () {
            body.classList.add('is-entered');
        });
        positionFan();
    }

    function exitStage() {
        body.classList.remove('is-entered');
        positionFan();

        var handled = false;
        var onEnd = function (e) {
            if (e.target !== stage || e.propertyName !== 'opacity') return;
            handled = true;
            stage.removeEventListener('transitionend', onEnd);
            stage.hidden = true;
        };
        stage.addEventListener('transitionend', onEnd);
        setTimeout(function () {
            if (!handled) {
                stage.removeEventListener('transitionend', onEnd);
                stage.hidden = true;
            }
        }, 700);

        hitCircle.focus();
    }

    hitCircle.addEventListener('click', function (e) {
        setFanOpen(!isFanOpen(), e.detail === 0);
    });

    modeItems.forEach(function (item, i) {
        item.addEventListener('click', function () {
            var section = item.getAttribute('data-section');
            setFanOpen(false);

            if (body.classList.contains('is-entered')) {
                showSection(section);
            } else {
                enterStage(section);
            }
        });

        // Tabbing to an item outside the visible window brings it into
        // view by spinning the dial to center it, same as a horizontal
        // scroller auto-revealing a focused child.
        item.addEventListener('focus', function () {
            if (!body.classList.contains('is-entered') || !isFanOpen() || !desktopQuery.matches) return;
            clearTimeout(snapTimer);
            rotateToIndex(i);
            renderDockedFan();
        });
    });

    stageExit.addEventListener('click', exitStage);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isFanOpen()) {
            setFanOpen(false);
            hitCircle.focus();
        }
    });

    document.addEventListener('click', function (e) {
        if (!isFanOpen()) return;
        if (hitCircle.contains(e.target) || modeFan.contains(e.target)) return;
        setFanOpen(false);
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (!desktopQuery.matches) resetDockedFanStyles();
            positionFan();
        }, 120);
    });

    // Wheel spins the dial — from anywhere in the corner zone, not just
    // while hovering a specific icon — a plain vertical mouse wheel works
    // just like a horizontal trackpad gesture would. Outside the zone,
    // wheel behaves normally (page/stage scroll is never hijacked).
    document.addEventListener('wheel', function (e) {
        if (!body.classList.contains('is-entered') || !isFanOpen() || !desktopQuery.matches) return;
        if (!inDialZone(e.clientX, e.clientY)) return;
        e.preventDefault();
        var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        rotation += delta * 0.25;
        renderDockedFan();
        clearTimeout(snapTimer);
        snapTimer = setTimeout(snapRotation, 180);
    }, { passive: false });

    // Drag spins the dial like a jog wheel, from anywhere in the same
    // corner zone. A small movement threshold keeps a plain tap-to-navigate
    // click working normally, and starting on the avatar itself is
    // excluded so it keeps its own click-to-toggle behavior undisturbed.
    var dragState = null;
    var DRAG_THRESHOLD = 6;
    var suppressNextClick = false;

    // A drag gesture still ends in a native click at pointerup; swallow
    // that one synthetic click (in the capture phase, ahead of every other
    // click handler) so a rotate never also fires item navigation or the
    // click-outside-closes-fan listener below.
    document.addEventListener('click', function (e) {
        if (!suppressNextClick) return;
        suppressNextClick = false;
        e.stopPropagation();
        e.preventDefault();
    }, true);

    document.addEventListener('pointerdown', function (e) {
        if (!body.classList.contains('is-entered') || !isFanOpen() || !desktopQuery.matches) return;
        if (!inDialZone(e.clientX, e.clientY) || hitCircle.contains(e.target)) return;
        dragState = { startX: e.clientX, startRotation: rotation, dragging: false, pointerId: e.pointerId };
    });

    document.addEventListener('pointermove', function (e) {
        if (!dragState || dragState.pointerId !== e.pointerId) return;
        var dx = e.clientX - dragState.startX;
        if (!dragState.dragging && Math.abs(dx) > DRAG_THRESHOLD) {
            dragState.dragging = true;
            clearTimeout(snapTimer);
        }
        if (dragState.dragging) {
            e.preventDefault();
            rotation = dragState.startRotation + dx * 0.6;
            renderDockedFan();
        }
    }, { passive: false });

    function endDrag(e) {
        if (!dragState || dragState.pointerId !== e.pointerId) return;
        var wasDragging = dragState.dragging;
        dragState = null;
        if (wasDragging) {
            snapRotation();
            suppressNextClick = true;
        }
    }
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    // Resume file size, read from the actual response so it can never go
    // stale if the PDF is ever replaced with a different one.
    function computeResumeMeta() {
        var targets = document.querySelectorAll('[data-resume-size]');
        if (!targets.length) return;
        fetch('etc/resume.pdf', { method: 'HEAD' }).then(function (res) {
            var len = res.headers.get('content-length');
            if (!len) return;
            var kb = Math.round(parseInt(len, 10) / 1024);
            targets.forEach(function (el) { el.textContent = kb + ' KB'; });
        }).catch(function () { /* leave the em dash placeholder */ });
    }
    computeResumeMeta();

    // Contact rows carry a standalone copy button next to the platform
    // link, with a brief rank-green "confirmed" flash instead of a
    // separate toast.
    document.querySelectorAll('.contact-copy').forEach(function (btn) {
        var originalLabel = btn.getAttribute('aria-label');
        var resetTimer;
        btn.addEventListener('click', function () {
            var value = btn.getAttribute('data-copy');
            if (!value || !navigator.clipboard || !navigator.clipboard.writeText) return;
            navigator.clipboard.writeText(value).then(function () {
                btn.classList.add('is-copied');
                btn.setAttribute('aria-label', 'Copied');
                clearTimeout(resetTimer);
                resetTimer = setTimeout(function () {
                    btn.classList.remove('is-copied');
                    btn.setAttribute('aria-label', originalLabel);
                }, 1600);
            }).catch(function () { /* clipboard permission denied; link itself still works */ });
        });
    });

    setActiveMode(activeSection);
    positionFan();
})();
