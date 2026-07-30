(function () {
    'use strict';

    var fanItems = Array.prototype.slice.call(document.querySelectorAll('.fan-item'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));

    fanItems.forEach(function (item) {
        item.addEventListener('click', function () {
            var tab = item.getAttribute('data-tab');

            panels.forEach(function (panel) {
                panel.hidden = panel.getAttribute('data-tab-panel') !== tab;
            });

            fanItems.forEach(function (fi) {
                fi.classList.toggle('is-active', fi === item);
            });
        });
    });
})();
