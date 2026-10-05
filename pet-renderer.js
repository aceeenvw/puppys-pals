import { railPosition } from './pet-core.js';
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
    let image;
    let mirror;
    let editor;
    let listeners;
    let resizeObserver;
    let layoutObserver;
    let frame = 0;
    let resetTimer = 0;
    let compositionTimer = 0;
    let composing = false;
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
        host.style.cssText = 'all:initial!important;position:fixed!important;inset:0 auto auto 0!important;pointer-events:none!important;z-index:9990!important;display:none!important;';
        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = 'img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;pointer-events:none;filter:drop-shadow(0 2px 2px #0003)}';
        image = document.createElement('img');
        image.alt = '';
        image.draggable = false;
        image.src = sources[0];
        mirror = document.createElement('div');
        mirror.style.cssText = 'all:initial;position:fixed;top:0;left:-10000px;visibility:hidden;pointer-events:none;box-sizing:border-box;border-style:solid;overflow:hidden;';
        shadow.append(style, image, mirror);
        document.documentElement.append(host);
    }

    function bindEditor(next) {
        editor = next;
        positioned = false;
        resizeObserver.disconnect();
        layoutObserver.disconnect();
        const container = document.getElementById('form_sheld');
        if (container) layoutObserver.observe(container, { childList: true, subtree: true });
        // Observe composer ancestors to avoid streaming updates.
        for (let node = editor || container; node; node = node.parentElement) {
            resizeObserver.observe(node);
            layoutObserver.observe(node, {
                childList: node === container, subtree: node === container,
                attributes: true, attributeFilter: ['style', 'class', 'hidden', 'disabled', 'readonly'],
            });
        }
    }

    function caretPosition() {
        const rect = editor.getBoundingClientRect();
        const style = getComputedStyle(editor);
        for (const key of mirroredStyles) mirror.style[key] = style[key];
        mirror.style.width = `${editor.clientWidth + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)}px`;
        mirror.style.whiteSpace = editor.wrap === 'off' ? 'pre' : 'pre-wrap';
        mirror.style.overflowWrap = editor.wrap === 'off' ? 'normal' : 'break-word';
        const position = (editor.selectionDirection === 'backward' ? editor.selectionStart : editor.selectionEnd) ?? editor.value.length;
        mirror.textContent = editor.value.slice(0, position);
        const marker = document.createElement('span');
        marker.textContent = editor.value.slice(position) || '\u200b';
        mirror.append(marker);
        const markerRect = marker.getClientRects()[0] || marker.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();
        return { x: rect.left + (style.direction === 'rtl' ? markerRect.right : markerRect.left) - mirrorRect.left - editor.scrollLeft, rect };
    }

    function hide() {
        host?.style.setProperty('display', 'none', 'important');
        positioned = false;
    }

    function update() {
        frame = 0;
        if (!listeners || document.hidden) { hide(); return; }
        const next = document.getElementById('send_textarea');
        if (next !== editor) bindEditor(next);
        if (!editor || editor.disabled || editor.readOnly) { hide(); return; }
        const rect = editor.getBoundingClientRect();
        const style = getComputedStyle(editor);
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
        const caret = caretPosition();
        const rail = { left: rect.left - leftEdge, right: rect.right - leftEdge, top: rect.top - topEdge };
        const position = railPosition({ x: caret.x - leftEdge }, size, settings.gap, width, rail);
        host.style.setProperty('width', `${size}px`, 'important');
        host.style.setProperty('height', `${size * 0.75}px`, 'important');
        host.style.setProperty('transition', positioned && !motion.matches ? 'transform 120ms ease-out' : 'none', 'important');
        host.style.setProperty('top', `${position.top + topEdge}px`, 'important');
        host.style.setProperty('transform', `translateX(${position.left + leftEdge}px)`, 'important');
        positioned = true;
    }

    function schedule() {
        if (listeners && !frame) frame = requestAnimationFrame(update);
    }

    function idle() {
        clearTimeout(resetTimer);
        resetTimer = 0;
        if (image) image.src = sources[0];
    }

    function canPlaySound(event) {
        return settings.typingSound && event.isTrusted && !document.hidden
            && isComposer(event) && !event.target.disabled && !event.target.readOnly;
    }
    function primeSound(event) { if (canPlaySound(event)) sound.prime(); }

    function tap(event) {
        if (canPlaySound(event)) sound.play();
        if (!image || motion.matches || document.hidden) return;
        image.src = sources[pose + 1];
        pose = (pose + 1) % (sources.length - 1);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(idle, 140);
    }

    function isComposer(event) { return event.target?.id === 'send_textarea'; }
    function input(event) {
        if (!isComposer(event)) return;
        schedule();
        if (!event.isComposing && !composing && event.inputType !== 'insertFromPaste') tap(event);
    }
    function compositionStart(event) {
        if (!isComposer(event)) return;
        clearTimeout(compositionTimer);
        composing = true;
    }
    function compositionEnd(event) {
        if (!isComposer(event)) return;
        clearTimeout(compositionTimer);
        compositionTimer = setTimeout(() => { composing = false; }, 0);
        if (event.data) tap(event);
        schedule();
    }
    function composerEvent(event) { if (isComposer(event)) schedule(); }

    function start() {
        if (listeners) return;
        listeners = new AbortController();
        resizeObserver = new ResizeObserver(schedule);
        layoutObserver = new MutationObserver(schedule);
        bindEditor(document.getElementById('send_textarea'));
        on(document, 'input', input);
        on(document, 'compositionstart', compositionStart);
        on(document, 'compositionend', compositionEnd);
        on(document, 'pointerup', primeSound);
        on(document, 'keydown', primeSound);
        for (const name of ['keyup', 'pointerup', 'focusin', 'focusout']) on(document, name, composerEvent);
        on(document, 'selectionchange', () => { if (document.activeElement === editor) schedule(); });
        on(document, 'scroll', event => {
            if (event.target === document || event.target === editor || event.target?.contains?.(editor)) schedule();
        }, true);
        on(document, 'visibilitychange', () => { sound.pause(); idle(); schedule(); });
        on(window, 'resize', schedule);
        on(window.visualViewport, 'resize', schedule);
        on(window.visualViewport, 'scroll', schedule);
        on(document.fonts, 'loadingdone', schedule);
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
        clearTimeout(compositionTimer);
        host?.remove();
        host = image = mirror = editor = null;
        resizeObserver = layoutObserver = null;
        frame = resetTimer = compositionTimer = pose = 0;
        positioned = composing = false;
    }

    function configure(nextSettings, nextSources, active, customSound = null) {
        const changed = !sources || sources.length !== nextSources.length || sources.some((src, index) => src !== nextSources[index]);
        settings = nextSettings;
        sources = nextSources;
        sound.setPreset(settings.soundPreset, customSound);
        if (!settings.typingSound) sound.stop();
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
