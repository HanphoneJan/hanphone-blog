(function () {
  chrome.storage.sync.get(["enableOnAllSites", "customDomains"], function ({ enableOnAllSites, customDomains }) {
    const hostname = window.location.hostname;
    const active = enableOnAllSites || (customDomains || []).some(domain => hostname.includes(domain));
    if (!active) return;

    const confirmNavigation = (e, url) => {
      const ok = confirm(`是否跳转到：\n${url || '未知地址'}？`);
      if (!ok) {
        e?.preventDefault?.();
        e?.stopImmediatePropagation?.();
      }
      return ok;
    };

    // 拦截链接
    document.addEventListener("click", function (e) {
      const a = e.target.closest("a[href]");
      if (a && a.href && a.target !== "_blank") {
        confirmNavigation(e, a.href);
      }
    }, true);

    // 表单提交
    document.addEventListener("submit", function (e) {
      confirmNavigation(e, e.target.action);
    }, true);

    // history API
    const push = history.pushState;
    history.pushState = function (...args) {
      if (confirm("是否跳转到新页面？")) {
        return push.apply(history, args);
      }
    };

    const replace = history.replaceState;
    history.replaceState = function (...args) {
      if (confirm("是否替换当前页面？")) {
        return replace.apply(history, args);
      }
    };

    // location.assign / replace
    const loc = window.location;
    const assign = loc.assign.bind(loc);
    loc.assign = function (url) {
      if (confirm(`是否跳转到：\n${url}`)) assign(url);
    };
    const replaceFn = loc.replace.bind(loc);
    loc.replace = function (url) {
      if (confirm(`是否跳转到：\n${url}`)) replaceFn(url);
    };

    // meta refresh
    const observer = new MutationObserver(() => {
      const metas = document.querySelectorAll('meta[http-equiv="refresh"]');
      metas.forEach(meta => {
        const content = meta.getAttribute('content');
        const match = content?.match(/url=(.+)$/i);
        if (match) {
          const url = match[1];
          if (!confirm(`检测到页面即将跳转到：\n${url}，是否允许？`)) {
            meta.remove();
          }
        }
      });
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

    // 轮询检测 href 变化
    let last = location.href;
    setInterval(() => {
      if (location.href !== last) {
        if (!confirm(`页面地址变更为：\n${location.href}\n是否允许？`)) {
          history.back();
        } else {
          last = location.href;
        }
      }
    }, 500);
  });
})();
