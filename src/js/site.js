"use strict";
(() => {
  // src/ts/shell/preferences.ts
  function installPreferences(shell, root) {
    const langListeners = [];
    let lang = shell.lang;
    function store(storage, key, value) {
      try {
        storage.setItem(key, value);
      } catch (_error) {
      }
    }
    function localizeAttributes(scope) {
      scope.querySelectorAll("[data-i18n]").forEach((el) => {
        (el.getAttribute("data-i18n") || "").split(/\s+/).forEach((name) => {
          if (!name) return;
          const enKey = `data-en-${name}`;
          if (!el.hasAttribute(enKey)) el.setAttribute(enKey, el.getAttribute(name) || "");
          const value = lang === "zh" ? el.getAttribute(`data-zh-${name}`) : el.getAttribute(enKey);
          if (value !== null) el.setAttribute(name, value);
        });
      });
    }
    const titleEl = document.querySelector("title");
    const titleEn = titleEl ? titleEl.getAttribute("data-en") || titleEl.textContent || "" : document.title;
    function applyLang(next) {
      lang = next;
      shell.lang = next;
      root.setAttribute("data-lang", next);
      root.lang = next === "zh" ? "zh-Hans" : "en";
      const zhTitle = titleEl ? titleEl.getAttribute("data-zh") : null;
      document.title = next === "zh" && zhTitle ? zhTitle : titleEn;
      localizeAttributes(document);
      syncLangToggle();
      syncThemeButton();
      langListeners.forEach((listener) => listener(next));
    }
    function syncLangToggle() {
      document.querySelectorAll("[data-lang-toggle]").forEach((link) => {
        const url = new URL(window.location.href);
        url.searchParams.set("lang", lang === "en" ? "zh" : "en");
        link.href = url.pathname + url.search + url.hash;
      });
      document.querySelectorAll("[data-lang-peer]").forEach((link) => {
        const target = link.getAttribute("data-lang-nav");
        const peerCandidate = target === "zh" ? root.getAttribute("data-section-zh") : root.getAttribute("data-section-en");
        if (!peerCandidate) return;
        const peer = peerCandidate;
        const url = new URL(peer, window.location.href);
        url.search = window.location.search;
        url.searchParams.delete("lang");
        url.hash = window.location.hash;
        link.href = url.pathname + url.search + url.hash;
      });
    }
    function setLang(next) {
      store(localStorage, "siteLanguage", next);
      const url = new URL(window.location.href);
      if (next === "zh") url.searchParams.set("lang", "zh");
      else url.searchParams.delete("lang");
      try {
        history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      } catch (_error) {
      }
      applyLang(next);
    }
    shell.setLang = setLang;
    shell.onLang = (listener) => langListeners.push(listener);
    shell.syncLangToggle = syncLangToggle;
    window.addEventListener("hashchange", syncLangToggle);
    window.addEventListener("popstate", syncLangToggle);
    window.addEventListener("pageshow", syncLangToggle);
    document.querySelectorAll("[data-lang-toggle]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setLang(lang === "en" ? "zh" : "en");
      });
    });
    document.querySelectorAll("[data-lang-nav]").forEach((link) => {
      link.addEventListener("click", () => {
        const target = link.getAttribute("data-lang-nav");
        if (target === "zh" || target === "en") store(localStorage, "siteLanguage", target);
      });
    });
    const themeQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    function isDark() {
      return root.getAttribute("data-theme") === "dark";
    }
    function syncThemeButton() {
      const label = isDark() ? lang === "zh" ? "浅色模式" : "Light mode" : lang === "zh" ? "深色模式" : "Dark mode";
      document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
      });
    }
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = isDark() ? "light" : "dark";
        store(localStorage, "themeMode", next);
        root.setAttribute("data-theme-mode", next);
        root.setAttribute("data-theme", next);
        syncThemeButton();
      });
    });
    if (themeQuery) {
      const follow = () => {
        if (root.getAttribute("data-theme-mode") !== "system") return;
        root.setAttribute("data-theme", themeQuery.matches ? "dark" : "light");
        syncThemeButton();
      };
      if (typeof themeQuery.addEventListener === "function") themeQuery.addEventListener("change", follow);
    }
    return { applyLang, get lang() {
      return lang;
    }, store };
  }

  // src/ts/shell/menu.ts
  function installMenu(root, WIDE) {
    const menuButton = document.querySelector("[data-menu-toggle]");
    const menuSheet = document.getElementById("menu-sheet");
    function setMenu(open) {
      if (!menuButton || !menuSheet) return;
      menuSheet.hidden = !open;
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
      root.classList.toggle("menu-open", open);
      document.querySelectorAll("main, footer").forEach((el) => el.toggleAttribute("inert", open));
    }
    if (menuButton && menuSheet) {
      menuButton.addEventListener("click", () => setMenu(Boolean(menuSheet.hidden)));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !menuSheet.hidden) {
          event.preventDefault();
          setMenu(false);
          menuButton.focus();
        }
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth >= WIDE) setMenu(false);
      });
    }
    return { menuSheet, setMenu };
  }

  // src/ts/shell/navigation.ts
  function installNavigation(shell, root, language, store, menu) {
    const EASE_IO = "cubic-bezier(0.76, 0, 0.24, 1)";
    const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
    const { menuSheet, setMenu } = menu;
    const main = document.querySelector("main");
    let curtain = null;
    let covered = false;
    let timer = 0;
    function curtainEl() {
      if (!curtain) {
        curtain = document.createElement("div");
        curtain.className = "curtain";
        curtain.setAttribute("aria-hidden", "true");
        curtain.appendChild(document.createElement("span"));
        document.body.appendChild(curtain);
      }
      return curtain;
    }
    function reset() {
      window.clearTimeout(timer);
      covered = false;
      if (curtain) {
        curtain.style.transition = "none";
        curtain.style.clipPath = "inset(0 0 100% 0)";
      }
      if (main) {
        main.style.transition = "none";
        main.style.opacity = "";
        main.style.transform = "";
      }
    }
    function leave(href, note) {
      store(sessionStorage, shell.navKey, JSON.stringify({
        mode: note.mode,
        label: note.label || "",
        href: new URL(href, window.location.href).href,
        t: Date.now()
      }));
      window.location.href = href;
      timer = window.setTimeout(reset, 8e3);
    }
    function go(href, dest) {
      reset();
      const here = shell.here;
      if (!here || here.section !== dest.section) {
        const label = dest.label[language()];
        const cover = curtainEl();
        cover.firstChild.textContent = label;
        cover.style.transition = "none";
        cover.style.clipPath = "inset(100% 0 0 0)";
        void cover.offsetHeight;
        cover.style.transition = `clip-path 0.36s ${EASE_IO}`;
        cover.style.clipPath = "inset(0 0 0 0)";
        covered = true;
        timer = window.setTimeout(() => leave(href, { mode: "curtain", label }), 380);
        return;
      }
      if (!main) {
        window.location.href = href;
        return;
      }
      main.style.transition = "opacity 0.14s ease, transform 0.14s ease";
      main.style.opacity = "0";
      main.style.transform = "translate3d(0, 6px, 0)";
      timer = window.setTimeout(() => leave(href, { mode: "fade" }), 150);
    }
    shell.fade = (swap) => {
      reset();
      if (shell.reduced || !main) {
        swap();
        return;
      }
      main.style.transition = "opacity 0.14s ease, transform 0.14s ease";
      main.style.opacity = "0";
      main.style.transform = "translate3d(0, 6px, 0)";
      timer = window.setTimeout(() => {
        swap();
        main.style.transition = "none";
        main.style.transform = "translate3d(0, 10px, 0)";
        void main.offsetHeight;
        main.style.transition = `opacity 0.28s ease, transform 0.4s ${EASE_OUT}`;
        main.style.opacity = "1";
        main.style.transform = "none";
      }, 150);
    };
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target?.closest?.("a");
      if (!link || !link.href || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      const dest = shell.route(url.pathname);
      if (!dest || shell.reduced) return;
      event.preventDefault();
      if (menuSheet && !menuSheet.hidden) setMenu(false);
      go(url.href, dest);
    });
    window.addEventListener("pagehide", () => {
      store(sessionStorage, shell.lastKey, shell.here ? shell.here.section : "none");
    });
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      window.clearTimeout(timer);
      root.removeAttribute("data-arrive");
      if (curtain) {
        curtain.style.transition = covered ? `clip-path 0.42s ${EASE_IO}` : "none";
        curtain.style.clipPath = "inset(0 0 100% 0)";
      }
      covered = false;
      if (main) {
        main.style.transition = `opacity 0.28s ease, transform 0.4s ${EASE_OUT}`;
        main.style.opacity = "1";
        main.style.transform = "none";
      }
      if (menuSheet) setMenu(false);
    });
    if (root.hasAttribute("data-arrive")) {
      window.setTimeout(() => {
        root.removeAttribute("data-arrive");
        root.removeAttribute("data-curtain");
        document.querySelectorAll("main.enter").forEach((el) => el.classList.remove("enter"));
      }, 900);
    }
    return { main };
  }

  // src/ts/shell/links.ts
  function markExternal(scope) {
    scope.querySelectorAll('a[href^="http"]').forEach((link) => {
      if (link.hasAttribute("data-ext") || link.hasAttribute("data-noext")) return;
      let host = "";
      try {
        host = new URL(link.href).host;
      } catch (_error) {
        return;
      }
      if (host === window.location.host) return;
      link.target = "_blank";
      link.rel = "noopener";
      const text = link.textContent || "";
      if (/[↗→]/.test(text) || link.querySelector("img, canvas")) link.setAttribute("data-noext", "");
      else link.setAttribute("data-ext", "");
    });
  }

  // src/ts/shell/preview.ts
  function installPreview(WIDE) {
    let float = null;
    let floatImg = null;
    let floatHost = null;
    function canFloat(event) {
      return event.pointerType === "mouse" && window.innerWidth >= WIDE;
    }
    function floatEl() {
      if (!float) {
        float = document.createElement("div");
        float.className = "float";
        float.setAttribute("aria-hidden", "true");
        floatImg = document.createElement("img");
        floatImg.alt = "";
        float.appendChild(floatImg);
        document.body.appendChild(float);
      }
      return float;
    }
    document.addEventListener("pointerover", (event) => {
      if (!canFloat(event)) return;
      const host = event.target?.closest?.("[data-float]");
      if (!host || host === floatHost) return;
      floatHost = host;
      const el = floatEl();
      const src = host.getAttribute("data-float") || "";
      if (floatImg && floatImg.getAttribute("src") !== src) floatImg.src = src;
      el.classList.add("on");
    });
    document.addEventListener("pointerout", (event) => {
      if (!floatHost || !float) return;
      const next = event.relatedTarget;
      if (next && floatHost.contains(next)) return;
      floatHost = null;
      float.classList.remove("on");
    });
    window.addEventListener("pointermove", (event) => {
      if (float && event.pointerType === "mouse") {
        float.style.transform = `translate3d(${event.clientX + 28}px, ${event.clientY - 130}px, 0)`;
      }
    }, { passive: true });
  }

  // src/ts/shell/clipboard.ts
  function installClipboard() {
    function copyByCommand(text) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_error) {
        ok = false;
      }
      area.remove();
      return ok;
    }
    function copyText(text) {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          return navigator.clipboard.writeText(text).then(() => true, () => copyByCommand(text));
        }
      } catch (_error) {
      }
      return Promise.resolve(copyByCommand(text));
    }
    document.querySelectorAll("[data-copy]").forEach((button) => {
      let reset = 0;
      button.addEventListener("click", () => {
        copyText(button.getAttribute("data-copy") || "").then((ok) => {
          button.classList.toggle("is-copied", ok);
          button.classList.toggle("is-failed", !ok);
          window.clearTimeout(reset);
          reset = window.setTimeout(() => button.classList.remove("is-copied", "is-failed"), ok ? 1600 : 3200);
        });
      });
    });
  }

  // src/ts/site.ts
  (() => {
    const shell = window.SITE_SHELL;
    if (!shell) return;
    const root = document.documentElement;
    const WIDE = 860;
    const preferences = installPreferences(shell, root);
    const menu = installMenu(root, WIDE);
    const { main } = installNavigation(shell, root, () => preferences.lang, preferences.store, menu);
    installPreview(WIDE);
    installClipboard();
    document.querySelectorAll("[data-bad-path]").forEach((el) => {
      let path = window.location.pathname;
      try {
        path = decodeURIComponent(path);
      } catch (_error) {
      }
      el.textContent = ` · ${path}`;
    });
    if (main) markExternal(main);
    preferences.applyLang(preferences.lang);
  })();
})();
