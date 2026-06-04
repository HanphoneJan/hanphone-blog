chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["enableOnAllSites", "customDomains"], ({ enableOnAllSites, customDomains }) => {
        const shouldBlock = enableOnAllSites || (customDomains || []).some(domain => details.initiator?.includes(domain));
        if (!shouldBlock) return resolve({});

        if (details.type === "main_frame" && details.method === "GET" && details.url !== details.initiator) {
          const allow = confirm(`是否允许跳转到：\n${details.url}`);
          if (!allow) return resolve({ cancel: true });
        }

        resolve({});
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
