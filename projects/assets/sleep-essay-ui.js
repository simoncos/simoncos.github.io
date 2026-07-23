"use strict";
// Shared editorial navigation and accessibility enhancements for the Sleep Essay.
(function () {
    function initSleepEssayUi() {
        const progress = document.getElementById('reading-progress');
        const chapterLinks = Array.from(document.querySelectorAll('.chapter-link[href^="#"]'));
        const chapterTargets = chapterLinks
            .map(link => {
            const id = link.getAttribute('href')?.slice(1);
            return id ? { link, section: document.getElementById(id) } : null;
        })
            .filter((item) => Boolean(item?.section));
        let updateQueued = false;
        function updateReadingState() {
            updateQueued = false;
            if (progress) {
                const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
                progress.style.transform = `scaleX(${ratio})`;
            }
            if (!chapterTargets.length)
                return;
            const marker = window.scrollY + Math.min(180, window.innerHeight * 0.3);
            let active = null;
            chapterTargets.forEach(item => {
                if (item.section.offsetTop <= marker)
                    active = item;
            });
            chapterTargets.forEach(item => {
                const selected = item === active;
                item.link.classList.toggle('active', selected);
                if (selected) {
                    item.link.setAttribute('aria-current', 'location');
                }
                else {
                    item.link.removeAttribute('aria-current');
                }
            });
        }
        function queueReadingStateUpdate() {
            if (updateQueued)
                return;
            updateQueued = true;
            window.requestAnimationFrame(updateReadingState);
        }
        window.addEventListener('scroll', queueReadingStateUpdate, { passive: true });
        window.addEventListener('resize', queueReadingStateUpdate);
        updateReadingState();
        function syncPressedState(group) {
            group.querySelectorAll('button').forEach(button => {
                button.setAttribute('aria-pressed', String(button.classList.contains('active')));
            });
        }
        function enhanceButtonGroup(id, observeChildren = false) {
            const group = document.getElementById(id);
            if (!group)
                return;
            syncPressedState(group);
            group.addEventListener('click', event => {
                const target = event.target;
                if (!target?.closest('button'))
                    return;
                window.requestAnimationFrame(() => syncPressedState(group));
            });
            if (observeChildren) {
                const observer = new MutationObserver(() => syncPressedState(group));
                observer.observe(group, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
            }
        }
        enhanceButtonGroup('event-selector');
        enhanceButtonGroup('scatter-selector', true);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSleepEssayUi);
    }
    else {
        initSleepEssayUi();
    }
})();
