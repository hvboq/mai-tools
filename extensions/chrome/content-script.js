(() => {
  const marker = "data-mai-tools-extension";
  if (document.documentElement.hasAttribute(marker)) {
    return;
  }

  document.documentElement.setAttribute(marker, "chrome");

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("all-in-one.js");
  script.dataset.source = "mai-tools-chrome-extension";
  script.onload = () => script.remove();
  (document.head || document.documentElement).append(script);
})();
