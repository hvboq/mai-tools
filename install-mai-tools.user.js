// ==UserScript==
// @name         run mai-tools on all maimaidx-net pages
// @namespace    https://github.com/hvboq/mai-tools
// @version      0.26.129.558
// @description  run mai-tools on all maimaidx-net pages
// @author       Ming-Yuan Jian
// @contributor  hvboq (distribution & packaging)
// @match        https://maimaidx.jp/*
// @match        https://maimaidx-eng.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @downloadURL  https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.meta.js
// ==/UserScript==

(function() {
    'use strict';
    const scriptId = 'mai-tools-user-script-loader';
    if (document.getElementById(scriptId)) {
        return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://hvboq.github.io/mai-tools/scripts/all-in-one.js?t=' + Math.floor(Date.now() / 60000);
    script.onload = function() {
        script.remove();
    };
    (document.body || document.documentElement).append(script);
})();
