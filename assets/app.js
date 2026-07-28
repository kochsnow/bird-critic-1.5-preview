const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".site-nav");

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", () => {
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
}

const progress = document.querySelector(".scroll-progress");
if (progress) {
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".reveal").forEach((node) => revealObserver.observe(node));

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copyTarget);
    if (!target) return;
    await navigator.clipboard.writeText(target.textContent.trim());
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = original; }, 1400);
  });
});

const resultsBody = document.querySelector("#results-body");
if (resultsBody) {
  let results = [];
  let activeView = document.body.dataset.resultView || "overall";
  const resultButtons = [...document.querySelectorAll("[data-result-filter]")];
  resultButtons.forEach((item) => item.classList.toggle("active", item.dataset.resultFilter === activeView));

  const renderResults = () => {
    const rows = results
      .map((item) => {
        const metric = item.scores?.[activeView];
        if (!metric || typeof metric.solved !== "number" || typeof metric.total !== "number") return null;
        return { ...item, metric, rate: (metric.solved / metric.total) * 100 };
      })
      .filter(Boolean)
      .sort((a, b) => b.rate - a.rate);

    if (!rows.length) {
      resultsBody.innerHTML = `<tr class="empty-row"><td colspan="5">Waiting for official model result data.</td></tr>`;
      return;
    }

    resultsBody.innerHTML = rows.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${item.model}</strong>${item.agent ? `<br><small>${item.agent}</small>` : ""}</td>
        <td class="score">${item.rate.toFixed(1)}% <span class="score-bar"><i style="width:${item.rate}%"></i></span></td>
        <td>${item.metric.solved} / ${item.metric.total}</td>
        <td>${item.date || "—"}</td>
      </tr>
    `).join("");
  };

  fetch(document.body.dataset.results || "../data/lite-results.json")
    .then((response) => {
      if (!response.ok) throw new Error("Unable to load results");
      return response.json();
    })
    .then((data) => {
      results = Array.isArray(data) ? data : [];
      renderResults();
    })
    .catch(renderResults);

  resultButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.resultFilter;
      resultButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderResults();
    });
  });
}

const instanceBody = document.querySelector("#instance-body");
if (instanceBody) {
  const languageFilter = document.querySelector("#language-filter");
  const repoFilter = document.querySelector("#repo-filter");
  const searchInput = document.querySelector("#instance-search");
  const count = document.querySelector("#instance-count");
  let instances = [];

  const normalizedLanguage = (name) => name === "Node.js" ? "node-js" : name.toLowerCase();

  const render = () => {
    const language = languageFilter.value;
    const repo = repoFilter.value;
    const query = searchInput.value.trim().toLowerCase();
    const filtered = instances.filter((item) => {
      return (!language || item.language === language)
        && (!repo || item.repository === repo)
        && (!query || item.instance.toLowerCase().includes(query) || item.repository.toLowerCase().includes(query));
    });

    instanceBody.innerHTML = filtered.map((item, index) => `
      <tr>
        <td>${String(index + 1).padStart(3, "0")}</td>
        <td><span class="language-pill ${normalizedLanguage(item.language)}">${item.language}</span></td>
        <td>${item.repository}</td>
        <td>${item.pull_request}</td>
      </tr>
    `).join("");
    count.textContent = `${filtered.length} / ${instances.length} instances`;
  };

  fetch(document.body.dataset.instances || "../data/lite-instances.json")
    .then((response) => {
      if (!response.ok) throw new Error("Unable to load instance data");
      return response.json();
    })
    .then((data) => {
      instances = data;
      const repositorySource = document.body.dataset.language
        ? data.filter((item) => item.language === document.body.dataset.language)
        : data;
      [...new Set(repositorySource.map((item) => item.repository))].sort().forEach((repo) => {
        const option = document.createElement("option");
        option.value = repo;
        option.textContent = repo;
        repoFilter.append(option);
      });
      if (document.body.dataset.language) {
        languageFilter.value = document.body.dataset.language;
      }
      render();
    })
    .catch(() => {
      instanceBody.innerHTML = `<tr class="empty-row"><td colspan="4">Instance data could not be loaded.</td></tr>`;
    });

  [languageFilter, repoFilter, searchInput].forEach((control) => {
    control.addEventListener(control === searchInput ? "input" : "change", render);
  });
}
