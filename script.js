(function () {
    'use strict';

    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
    var DEFAULT_PANEL = 'summary';

    // The hash is the source of truth, so tabs are linkable and the browser's
    // back button works. Hashes that aren't a panel (like #contact) resolve to
    // the panel that holds them.
    function panelForHash() {
        var id = decodeURIComponent(location.hash.slice(1));
        if (!id) return DEFAULT_PANEL;
        var target = document.getElementById(id);
        var panel = target && target.closest('.panel');
        return panel ? panel.id : DEFAULT_PANEL;
    }

    function showPanel(id) {
        panels.forEach(function (panel) {
            var active = panel.id === id;
            panel.hidden = !active;
            panel.classList.toggle('is-active', active);
        });
        tabs.forEach(function (tab) {
            if (tab.getAttribute('href') === '#' + id) {
                tab.setAttribute('aria-current', 'page');
            } else {
                tab.removeAttribute('aria-current');
            }
        });
    }

    function onHashChange() {
        var id = panelForHash();
        showPanel(id);

        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target && target.id !== id) {
            target.scrollIntoView();
        } else {
            window.scrollTo(0, 0);
            var heading = document.getElementById(id + '-title');
            if (heading) heading.focus({ preventScroll: true });
        }
    }

    window.addEventListener('hashchange', onHashChange);
    showPanel(panelForHash());

    // Document switcher on the Resume / CV tab. The iframe is replaced rather
    // than re-pointed, since changing its src would add a browser history entry.
    var docOptions = Array.prototype.slice.call(document.querySelectorAll('.doc-option'));
    var docFrame = document.getElementById('docFrame');
    var docDownload = document.getElementById('docDownload');
    var docOpen = document.getElementById('docOpen');

    function selectDoc(option) {
        var href = option.getAttribute('href');
        var title = option.getAttribute('data-title');

        docOptions.forEach(function (other) {
            if (other === option) {
                other.setAttribute('aria-current', 'true');
            } else {
                other.removeAttribute('aria-current');
            }
        });

        var iframe = document.createElement('iframe');
        iframe.src = href + '#toolbar=0&navpanes=0&view=FitH';
        iframe.title = title + ' preview';
        docFrame.replaceChild(iframe, docFrame.querySelector('iframe'));

        docDownload.href = href;
        docDownload.setAttribute('download', option.getAttribute('data-name'));
        docOpen.href = href;
    }

    docOptions.forEach(function (option) {
        option.addEventListener('click', function (e) {
            e.preventDefault();
            selectDoc(option);
        });
    });

    // Contact rows carry a copy button next to the link, with a brief check
    // mark as confirmation instead of a separate toast.
    document.querySelectorAll('.copy').forEach(function (btn) {
        var originalLabel = btn.getAttribute('aria-label');
        var resetTimer;
        btn.addEventListener('click', function () {
            var value = btn.getAttribute('data-copy');
            if (!value || !navigator.clipboard || !navigator.clipboard.writeText) return;
            navigator.clipboard.writeText(value).then(function () {
                btn.classList.add('is-copied');
                btn.setAttribute('aria-label', 'Copied');
                clearTimeout(resetTimer);
                resetTimer = setTimeout(function () {
                    btn.classList.remove('is-copied');
                    btn.setAttribute('aria-label', originalLabel);
                }, 1600);
            }).catch(function () { /* clipboard permission denied; the link itself still works */ });
        });
    });

    // GitHub graph: live data, with a saved copy if the API is down
    var commitGraph = document.getElementById('commitGraph');
    var commitTotal = document.getElementById('commitTotal');
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function getJson(url) {
        return fetch(url).then(function (res) {
            if (!res.ok) throw new Error(res.status);
            return res.json();
        });
    }

    function make(className) {
        var el = document.createElement('div');
        el.className = className;
        return el;
    }

    function renderHalf(weeks) {
        var half = make('commits-half');
        var months = make('commits-months');
        var grid = make('commits-weeks');
        var lastMonth = null;
        var lastLabel = null;

        weeks.forEach(function (week, i) {
            var firstDay = week.filter(Boolean)[0];
            var month = Number(firstDay.date.slice(5, 7)) - 1;
            if (month !== lastMonth && i < weeks.length - 2) {
                var label = document.createElement('span');
                label.textContent = MONTHS[month];
                label.style.gridColumn = (i + 1) + ' / span 3';
                // A partial month at the start would run into the next label
                if (lastLabel && i - lastLabel.week < 3) months.removeChild(lastLabel.el);
                months.appendChild(label);
                lastLabel = { el: label, week: i };
            }
            lastMonth = month;

            week.forEach(function (day) {
                var square = make('commits-day' + (day ? '' : ' is-empty'));
                if (day) {
                    square.dataset.level = day.level;
                    square.title = day.count + (day.count === 1 ? ' contribution on ' : ' contributions on ') + day.date;
                }
                grid.appendChild(square);
            });
        });

        half.appendChild(months);
        half.appendChild(grid);
        return half;
    }

    function renderCommits(data) {
        var weeks = [];
        data.contributions.forEach(function (day) {
            var weekday = new Date(day.date + 'T00:00:00').getDay();
            if (!weeks.length || weekday === 0) weeks.push([null, null, null, null, null, null, null]);
            weeks[weeks.length - 1][weekday] = day;
        });

        var middle = Math.ceil(weeks.length / 2);
        commitGraph.appendChild(renderHalf(weeks.slice(0, middle)));
        commitGraph.appendChild(renderHalf(weeks.slice(middle)));
        commitTotal.textContent = data.total.lastYear;
    }

    if (commitGraph) {
        getJson('https://github-contributions-api.jogruber.de/v4/alchin2?y=last')
            .catch(function () { return getJson('etc/contributions.json'); })
            .then(renderCommits)
            .catch(function () { /* no data; the link to GitHub still works */ });
    }
})();
