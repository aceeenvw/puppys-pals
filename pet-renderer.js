import { railPosition, mobileDevice } from './pet-core.js';
import { createTypingSound } from './typing-sound.js';

const mirroredStyles = [
    'direction', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
    'lineHeight', 'letterSpacing', 'textTransform', 'textIndent', 'textAlign',
    'tabSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'wordBreak', 'wordSpacing', 'textRendering',
];

export function createPetRenderer() {
    let settings;
    let sources;
    let host;
    let sprite;
    let image;
    let mirror;
    let marker;
    let beforeCaret;
    let afterCaret;
    let mirrorDirty = true;
    let mirrorWidth = 0;
    let caretCache = null;
    let currentSource;
    let editor;
    let mobileRail;
    let listeners;
    let resizeObserver;
    let layoutObserver;
    let frame = 0;
    let resetTimer = 0;
    let lastInputValue = '';
    let positioned = false;
    let pose = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sound = createTypingSound();

    function on(target, name, handler, capture = false) {
        target?.addEventListener(name, handler, { signal: listeners.signal, capture });
    }

    function createHost() {
        host = document.createElement('div');
        host.id = 'puppys-pals-pet';
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = `all:initial!important;position:${mobileDevice ? 'absolute' : 'fixed'}!important;inset:0 auto auto 0!important;width:0!important;height:0!important;pointer-events:none!important;z-index:9990!important;display:none!important;`;
        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = `img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;pointer-events:none;${mobileDevice ? '' : 'filter:drop-shadow(0 2px 2px #0003)'}}`;
        sprite = document.createElement('div');
        sprite.style.cssText = 'position:absolute;left:0;pointer-events:none;';
        image = document.createElement('img');
        image.alt = '';
        image.draggable = false;
        image.src = sources[0];
        currentSource = sources[0];
        mirror = document.createElement('div');
        mirror.style.cssText = `all:initial;${mobileDevice ? 'position:absolute;left:0;height:0;' : 'position:fixed;left:-10000px;'}top:0;visibility:hidden;pointer-events:none;box-sizing:border-box;border-style:solid;overflow:hidden;`;
        beforeCaret = document.createTextNode('');
        afterCaret = document.createTextNode('');
        marker = document.createElement('span');
        marker.append(afterCaret);
        mirror.append(beforeCaret, marker);
        mirrorDirty = true;
        caretCache = null;
        sprite.append(image);
        shadow.append(style, sprite, mirror);
        (mobileDevice ? mobileRail : document.documentElement).append(host);
    }

    function bindEditor(next) {
        editor = next;
        lastInputValue = editor?.value || '';
        mirrorDirty = true;
        caretCache = null;
        positioned = false;
        resizeObserver.disconnect();
        layoutObserver.disconnect();
        mobileRail = mobileDevice ? editor?.closest('#nonQRFormItems') : null;
        if (mobileDevice && host) {
            if (mobileRail) mobileRail.append(host);
            else host.remove();
        }
        const container = document.getElementById('form_sheld');
        if (container) layoutObserver.observe(container, { childList: true, subtree: true });
        // Observe composer ancestors to avoid streaming updates.
        for (let node = editor || container; node; node = node.parentElement) {
            resizeObserver.observe(node);
            layoutObserver.observe(node, {
                childList: node === container, subtree: node === container,
                attributes: true, attributeFilter: ['style', 'class', 'hidden', 'disabled', 'readonly', 'dir', 'wrap'],
            });
        }
    }

    function caretPosition(rect, style) {
        const width = editor.clientWidth;
        if (mirrorDirty || mirrorWidth !== width) {
            for (const key of mirroredStyles) mirror.style[key] = style[key];
            mirror.style.width = `${width + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)}px`;
            mirror.style.whiteSpace = editor.wrap === 'off' ? 'pre' : 'pre-wrap';
            mirror.style.overflowWrap = editor.wrap === 'off' ? 'normal' : 'break-word';
            mirrorWidth = width;
            mirrorDirty = false;
            caretCache = null;
        }
        const position = (editor.selectionDirection === 'backward' ? editor.selectionStart : editor.selectionEnd) ?? editor.value.length;
        if (!caretCache || caretCache.value !== editor.value || caretCache.position !== position) {
            beforeCaret.data = editor.value.slice(0, position);
            afterCaret.data = editor.value.slice(position) || '\u200b';
            const markerRect = marker.getClientRects()[0] || marker.getBoundingClientRect();
            const mirrorRect = mirror.getBoundingClientRect();
            caretCache = { value: editor.value, position, x: (style.direction === 'rtl' ? markerRect.right : markerRect.left) - mirrorRect.left };
        }
        return rect.left + caretCache.x - editor.scrollLeft;
    }

    function hide() {
        host?.style.setProperty('display', 'none', 'important');
        positioned = false;
    }

    function mobilePosition(style) {
        const parent = host.offsetParent;
        if (!parent) return null;
        let left = 0, top = 0, node = editor;
        while (node && node !== parent) {
            left += node.offsetLeft;
            top += node.offsetTop;
            node = node.offsetParent;
            if (node && node !== parent) {
                left += node.clientLeft - node.scrollLeft;
                top += node.clientTop - node.scrollTop;
            }
        }
        if (node !== parent || editor.offsetWidth <= 80 || editor.offsetHeight <= 15) return null;
        const size = Math.min(settings.size, editor.offsetWidth);
        const caretX = caretPosition({ left }, style);
        return {
            size,
            left: Math.max(left, Math.min(left + editor.offsetWidth - size, caretX - size / 2)),
            top: top - size * 0.75 - settings.gap,
        };
    }

    function update() {
        frame = 0;
        if (!listeners || document.hidden) { hide(); return; }
        const next = document.getElementById('send_textarea');
        if (next !== editor || (mobileDevice && (next?.closest('#nonQRFormItems') !== mobileRail || (host && !host.isConnected)))) bindEditor(next);
        if (!editor || editor.disabled || editor.readOnly) { hide(); return; }
        const style = getComputedStyle(editor);
        if (mobileDevice) {
            if (!mobileRail || style.visibility === 'hidden') { hide(); return; }
            if (!host) createHost();
            host.style.setProperty('display', 'block', 'important');
            const position = mobilePosition(style);
            if (!position) { hide(); return; }
            place(position.size, position.left, position.top);
            return;
        }
        const rect = editor.getBoundingClientRect();
        const viewport = window.visualViewport;
        const leftEdge = viewport?.offsetLeft || 0;
        const topEdge = viewport?.offsetTop || 0;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        if (rect.width <= 80 || rect.height <= 15 || style.visibility === 'hidden'
            || rect.right < leftEdge || rect.left > leftEdge + width
             || rect.bottom < topEdge || rect.top > topEdge + height) { hide(); return; }
        const availableWidth = Math.min(rect.right, leftEdge + width) - Math.max(rect.left, leftEdge);
        const size = Math.min(settings.size, availableWidth);
        if (size <= 0) { hide(); return; }
        if (!host?.isConnected) createHost();
        host.style.setProperty('display', 'block', 'important');
        const origin = host.getBoundingClientRect();
        const caretX = caretPosition(rect, style);
        const rail = { left: rect.left - leftEdge, right: rect.right - leftEdge, top: rect.top - topEdge };
        const position = railPosition({ x: caretX - leftEdge }, size, settings.gap, width, rail);
        place(size, position.left + leftEdge - origin.left, position.top + topEdge - origin.top);
    }

    function place(size, left, top) {
        sprite.style.width = `${size}px`;
        sprite.style.height = `${size * 0.75}px`;
        sprite.style.top = `${top}px`;
        if (mobileDevice) {
            sprite.style.left = `${left}px`;
        } else {
            sprite.style.transition = positioned && !motion.matches ? 'transform 120ms ease-out' : 'none';
            sprite.style.transform = `translateX(${left}px)`;
            positioned = true;
        }
    }

    function schedule() {
        if (listeners && !frame) frame = requestAnimationFrame(update);
    }

    function layoutChanged() {
        mirrorDirty = true;
        schedule();
    }

    function showPose(src) {
        if (image && currentSource !== src) {
            image.src = src;
            currentSource = src;
        }
    }

    function idle() {
        clearTimeout(resetTimer);
        resetTimer = 0;
        showPose(sources[0]);
    }

    function canPlaySound(event) {
        return !mobileDevice && settings.typingSound && event.isTrusted && !document.hidden
            && isComposer(event) && !event.target.disabled && !event.target.readOnly;
    }
    function primeSound(event) { if (canPlaySound(event)) sound.prime(); }

    function tap(event) {
        if (canPlaySound(event)) sound.play();
        if (!image || motion.matches || document.hidden) return;
        showPose(sources[pose + 1]);
        pose = (pose + 1) % (sources.length - 1);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(idle, 140);
    }

    function isComposer(event) { return event.target?.id === 'send_textarea'; }
    function input(event) {
        if (!isComposer(event)) return;
        schedule();
        // Some keyboards remove composition text before reinserting the committed word.
        if (event.inputType === 'deleteCompositionText') return;
        const changed = event.target.value !== lastInputValue;
        lastInputValue = event.target.value;
        if (changed && event.inputType !== 'insertFromPaste') tap(event);
    }
    function compositionStart(event) {
        if (!isComposer(event)) return;
        lastInputValue = event.target.value;
    }
    function compositionEnd(event) {
        if (!isComposer(event)) return;
        if (event.data && event.target.value !== lastInputValue) tap(event);
        lastInputValue = event.target.value;
        schedule();
    }
    function composerEvent(event) {
        if (!isComposer(event)) return;
        if (event.type === 'focusin' || event.type === 'focusout') layoutChanged();
        else schedule();
    }

    function start() {
        if (listeners) return;
        listeners = new AbortController();
        resizeObserver = new ResizeObserver(layoutChanged);
        layoutObserver = new MutationObserver(records => {
            if (records.some(record => record.target !== host)) layoutChanged();
        });
        bindEditor(document.getElementById('send_textarea'));
        on(document, 'input', input);
        on(document, 'compositionstart', compositionStart);
        on(document, 'compositionend', compositionEnd);
        if (!mobileDevice) {
            on(document, 'pointerup', primeSound);
            on(document, 'keydown', primeSound);
        }
        for (const name of ['keyup', 'pointerup', 'focusin', 'focusout']) on(document, name, composerEvent);
        on(document, 'selectionchange', () => { if (document.activeElement === editor) schedule(); });
        on(document, 'scroll', event => {
            if (event.target === document || event.target === editor || event.target?.contains?.(editor)) schedule();
        }, true);
        on(document, 'visibilitychange', () => { sound.pause(); idle(); schedule(); });
        on(window, 'resize', layoutChanged);
        if (!mobileDevice) {
            on(window.visualViewport, 'resize', layoutChanged);
            on(window.visualViewport, 'scroll', schedule);
        }
        on(document.fonts, 'loadingdone', layoutChanged);
        on(motion, 'change', () => { idle(); schedule(); });
        schedule();
    }

    function stop() {
        sound.stop();
        listeners?.abort();
        listeners = null;
        resizeObserver?.disconnect();
        layoutObserver?.disconnect();
        cancelAnimationFrame(frame);
        clearTimeout(resetTimer);
        host?.remove();
        host = sprite = image = mirror = editor = mobileRail = null;
        marker = beforeCaret = afterCaret = caretCache = null;
        currentSource = undefined;
        mirrorWidth = 0;
        mirrorDirty = true;
        resizeObserver = layoutObserver = null;
        frame = resetTimer = pose = 0;
        positioned = false;
        lastInputValue = '';
    }

    function configure(nextSettings, nextSources, active, customSound = null) {
        const changed = !sources || sources.length !== nextSources.length || sources.some((src, index) => src !== nextSources[index]);
        settings = nextSettings;
        sources = nextSources;
        if (!mobileDevice) sound.setPreset(settings.soundPreset, customSound);
        if (mobileDevice || !settings.typingSound) sound.stop();
        if (changed) {
            idle();
            pose = 0;
            if (settings.enabled && active) for (const src of sources) { const preload = new Image(); preload.src = src; }
        }
        if (settings.enabled && active) { start(); schedule(); }
        else stop();
    }

    return { configure, schedule, stop };
}
