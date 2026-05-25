(() => {
  const marker = "data-mai-tools-extension";
  if (document.documentElement.hasAttribute(marker)) {
    return;
  }

  document.documentElement.setAttribute(marker, "samsung-internet");

  const runtime = globalThis.chrome?.runtime || globalThis.browser?.runtime;
  const scriptUrl = runtime.getURL("all-in-one.js");
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.dataset.source = "mai-tools-samsung-internet-extension";
  script.onload = () => script.remove();
  (document.body || document.documentElement).append(script);
})();
