(() => {
  const marker = "data-mai-tools-extension";
  if (document.documentElement.hasAttribute(marker)) {
    return;
  }

  document.documentElement.setAttribute(marker, "firefox");

  const runtime = globalThis.browser?.runtime || globalThis.chrome?.runtime;
  const scriptUrl = runtime.getURL("all-in-one.js");
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.dataset.source = "mai-tools-firefox-extension";
  script.onload = () => script.remove();
  (document.body || document.documentElement).append(script);
})();
