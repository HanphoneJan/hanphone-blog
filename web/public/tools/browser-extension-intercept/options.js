document.addEventListener("DOMContentLoaded", function () {
  const enableOnAllSites = document.getElementById("enableOnAllSites");
  const customDomains = document.getElementById("customDomains");
  const saveBtn = document.getElementById("saveBtn");

  chrome.storage.sync.get(["enableOnAllSites", "customDomains"], function (data) {
    enableOnAllSites.checked = data.enableOnAllSites || false;
    customDomains.value = (data.customDomains || []).join(",");
  });

  saveBtn.addEventListener("click", function () {
    chrome.storage.sync.set({
      enableOnAllSites: enableOnAllSites.checked,
      customDomains: customDomains.value.split(",").map(d => d.trim()).filter(d => d)
    }, () => {
      alert("设置已保存");
    });
  });
});
