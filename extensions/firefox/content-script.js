(() => {
  const marker = "data-mai-tools-extension";
  if (document.documentElement.hasAttribute(marker)) {
    return;
  }

  document.documentElement.setAttribute(marker, "firefox");

  const script = document.createElement("script");
  script.src = browser.runtime.getURL("all-in-one.js");
  script.dataset.source = "mai-tools-firefox-extension";
  script.onload = () => script.remove();
  (document.head || document.documentElement).append(script);
})();
