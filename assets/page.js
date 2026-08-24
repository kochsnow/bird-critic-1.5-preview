(function () {
  "use strict";

  var LANG_LABEL = { overall: "Overall", python: "Python", ruby: "Ruby", php: "PHP", node: "Node.js" };
  var state = {
    edition: "lite",
    lang: "overall",
    sortDir: -1,
    scaffold: "openhands-sdk",
    data: { lite: null, full: null },
  };

  function pct(solved, total) {
    return total ? (solved / total) * 100 : 0;
  }

  function fmtPct(solved, total) {
    return total ? Math.round((solved / total) * 100) + "%" : "—";
  }

  function loadData(key, path) {
    if (window.BIRD_CRITIC_DATA && window.BIRD_CRITIC_DATA[key]) {
      return Promise.resolve(window.BIRD_CRITIC_DATA[key]);
    }

    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load " + path + ": HTTP " + response.status);
      }
      return response.json();
    });
  }

  function rankRows(rows, lang) {
    return rows
      .slice()
      .sort(function (a, b) {
        var av = pct(a.scores[lang].solved, a.scores[lang].total);
        var bv = pct(b.scores[lang].solved, b.scores[lang].total);
        return (av - bv) * state.sortDir;
      });
  }

  function renderBoard() {
    var rows = state.data[state.edition];
    if (!rows) return;
    var tbody = document.querySelector("#board-body");
    var caption = document.querySelector("#board-caption");

    if (state.scaffold !== "openhands-sdk") {
      tbody.innerHTML =
        '<tr><td colspan="4" class="score-secondary">No results yet for this scaffold — openhands-sdk is the only harness with published runs right now.</td></tr>';
      caption.textContent = "0 systems · " + state.scaffold + " · not yet run";
      return;
    }

    var ranked = rankRows(rows, state.lang);

    tbody.innerHTML = ranked
      .map(function (row, i) {
        var s = row.scores[state.lang];
        var isTop = i === 0 && state.sortDir === -1;
        var rankCell = isTop
          ? '<span class="rank-badge">1</span>'
          : '<span class="rank-cell">' + String(i + 1).padStart(2, "0") + "</span>";
        return (
          '<tr>' +
          '<td>' + rankCell + '</td>' +
          '<td class="model-cell"><strong>' + row.model + '</strong><span>' + row.agent + '</span></td>' +
          '<td class="' + (isTop ? "score-primary" : "score-secondary") + '">' + fmtPct(s.solved, s.total) + '</td>' +
          '<td class="score-secondary">' + s.solved + ' / ' + s.total + '</td>' +
          '</tr>'
        );
      })
      .join("");

    caption.textContent =
      ranked.length + " systems · " + (state.edition === "lite" ? "Lite 100" : "Full 300") +
      " · ranked by " + LANG_LABEL[state.lang].toLowerCase();

    document.querySelectorAll("[data-edition]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-edition") === state.edition);
    });
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === state.lang);
    });
    document.querySelector("#col-score").classList.toggle("active", true);
  }

  function initBoard() {
    Promise.all([
      loadData("lite", "data/lite-results.json"),
      loadData("full", "data/full-results.json"),
    ])
      .then(function (results) {
        state.data.lite = results[0];
        state.data.full = results[1];
        renderBoard();
      })
      .catch(function (err) {
        console.error("Failed to load leaderboard data", err);
        document.querySelector("#board-body").innerHTML =
          '<tr><td colspan="4">Leaderboard data failed to load.</td></tr>';
      });

    document.querySelectorAll("[data-edition]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.edition = btn.getAttribute("data-edition");
        renderBoard();
      });
    });

    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.lang = btn.getAttribute("data-lang");
        renderBoard();
      });
    });

    var sortHeader = document.querySelector("#col-score");
    if (sortHeader) {
      sortHeader.addEventListener("click", function () {
        state.sortDir = state.sortDir === -1 ? 1 : -1;
        renderBoard();
      });
    }

    var scaffoldSelect = document.querySelector("#scaffold-select");
    if (scaffoldSelect) {
      scaffoldSelect.addEventListener("change", function () {
        state.scaffold = scaffoldSelect.value;
        renderBoard();
      });
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function diffToHtml(diff) {
    return diff
      .split("\n")
      .map(function (line) {
        if (line.charAt(0) === "+") return '<span class="add">' + escapeHtml(line) + "</span>";
        if (line.charAt(0) === "-") return '<span class="del">' + escapeHtml(line) + "</span>";
        return escapeHtml(line);
      })
      .join("\n");
  }

  function initExamples() {
    loadData("cases", "data/case-files.json")
      .then(function (cases) {
        var mount = document.querySelector("#examples-mount");
        if (!mount) return;
        var order = ["python", "node", "php", "ruby"];
        mount.innerHTML = order
          .map(function (key) {
            var c = cases[key];
            if (!c) return "";
            var verdictOpen = c.solved_count === 0;
            var chips = c.failed_by
              .map(function (m) { return '<span class="model-chip fail">' + m + "</span>"; })
              .concat(
                c.solved_by.map(function (m) { return '<span class="model-chip pass">' + m + "</span>"; })
              )
              .join("");
            return (
              '<details class="example"' + (verdictOpen ? " open" : "") + '>' +
              '<summary>' +
              '<span class="example-tag">' + c.code + '</span>' +
              '<span class="example-head-text">' +
              '<span class="example-title">' + escapeHtml(c.title) + '</span>' +
              '<span class="example-repo">' + c.repo + " " + c.pr + '</span>' +
              '</span>' +
              '<span class="verdict-tag ' + (c.solved_count === 0 ? "fail" : "pass") + '">' +
              c.solved_count + " / " + c.total_count + " solved</span>" +
              '<span class="disclosure" aria-hidden="true"></span>' +
              '</summary>' +
              '<div class="example-body">' +
              '<div class="example-instruction">' + c.instruction_html + '</div>' +
              '<pre>' + diffToHtml(c.diff) + '</pre>' +
              '<p class="example-fix">' + escapeHtml(c.fix_summary) + '</p>' +
              '<div class="example-verdicts">' + chips + '</div>' +
              '</div>' +
              '</details>'
            );
          })
          .join("");
      })
      .catch(function (err) {
        console.error("Failed to load case files", err);
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initBoard();
    initExamples();
  });
})();
