(() => {
  "use strict";

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const outcomeMeta = {
    valid_positive: { label: "Valid positive", badge: "status-positive" },
    valid_partial: { label: "Valid partial", badge: "status-partial" },
    valid_semantic_failure: { label: "Semantic failure", badge: "status-failure" },
  };

  const artifactHref = (base, path) => `${base}${path.split("/").map(encodeURIComponent).join("/")}`;

  const renderMatrix = (pilots) => pilots.map((pilot) => {
    const percent = pilot.dbb_total ? (100 * pilot.dbb_passed / pilot.dbb_total) : 0;
    const rewardClass = pilot.reward === 1 ? "reward-one" : "reward-zero";
    return `<tr>
      <td><a href="#case-${esc(pilot.id.toLowerCase())}"><strong>${esc(pilot.id)}</strong></a><small>${esc(pilot.instance)}</small></td>
      <td>${esc(pilot.language)}<small>${esc(pilot.ecosystem)}</small></td>
      <td>${esc(pilot.surface)}</td>
      <td><span class="ratio-block"><b style="--pass:${percent.toFixed(2)}%">${esc(pilot.dbb_passed)} / ${esc(pilot.dbb_total)}</b><small>passed</small></span></td>
      <td><span class="reward ${rewardClass}">${pilot.reward.toFixed(1)}</span></td>
      <td>${esc(pilot.diagnosis)}</td>
    </tr>`;
  }).join("");

  const renderDbbs = (dbbs) => dbbs.map((dbb) => {
    const klass = dbb.result === "PASS" ? "pass" : "fail";
    return `<li><span class="dbb-id">${esc(dbb.id)}</span><span>${esc(dbb.label)}</span><b class="dbb-result ${klass}">${esc(dbb.result)}</b></li>`;
  }).join("");

  const renderCases = (base, pilots) => pilots.map((pilot, index) => {
    const meta = outcomeMeta[pilot.outcome] || outcomeMeta.valid_partial;
    const number = String(index + 1).padStart(2, "0");
    const open = index === 0 ? " open" : "";
    return `<details class="case-card compact-case" id="case-${esc(pilot.id.toLowerCase())}"${open}>
      <summary class="case-card-head compact-case-summary">
        <div><span class="case-number">${number} / 12</span><span class="status-badge ${meta.badge}">${meta.label}</span></div>
        <div><span class="kicker">${esc(pilot.language)} / ${esc(pilot.ecosystem)}</span><h3>${esc(pilot.id)} · ${esc(pilot.surface)}</h3><span class="agent-model-tag">GLM-5.3 · mini-swe-agent 2.4.5 · ${esc(pilot.joint_label)}</span></div>
        <div class="case-score"><strong>${esc(pilot.dbb_passed)} / ${esc(pilot.dbb_total)}</strong><span>DB behaviors passed</span></div>
      </summary>
      <section class="issue-description"><div class="issue-description-head"><span>Audited issue description</span><b>${esc(pilot.instance)}</b></div><p>${esc(pilot.issue)}</p><small>Full-300 selected pilot · ${esc(pilot.id)}</small></section>
      <div class="case-card-body full-pilot-case-body">
        <section><h4>Per-DBB outcome</h4><ul class="dbb-list">${renderDbbs(pilot.dbbs)}</ul></section>
        <section class="case-summary">
          <div><h4>Agent patch summary</h4><p>${esc(pilot.patch_summary)}</p></div>
          <div><h4>Grounded database diagnosis</h4><p>${esc(pilot.diagnosis)}</p></div>
          <div class="trajectory-summary"><h4>Trajectory signal</h4><p>${esc(pilot.trajectory_signal)}</p></div>
        </section>
      </div>
      <footer class="case-card-links">
        <a href="${artifactHref(base, pilot.audit)}" target="_blank" rel="noreferrer">DB audit ↗</a>
        <a href="${artifactHref(base, pilot.case_cards)}" target="_blank" rel="noreferrer">Full case cards ↗</a>
        <a href="${artifactHref(base, pilot.trajectory)}" target="_blank" rel="noreferrer">Trajectory analysis ↗</a>
      </footer>
    </details>`;
  }).join("");

  const verifyData = (data) => {
    if (!data || !Array.isArray(data.pilots) || data.pilots.length !== 12) {
      throw new Error("Expected exactly 12 pilot records");
    }
    const ids = new Set(data.pilots.map((pilot) => pilot.id));
    const total = data.pilots.reduce((sum, pilot) => sum + pilot.dbb_total, 0);
    const passed = data.pilots.reduce((sum, pilot) => sum + pilot.dbb_passed, 0);
    if (ids.size !== 12 || total !== 60 || passed !== 38) {
      throw new Error("Pilot IDs or DBB aggregate does not match the published binding");
    }
  };

  const init = async () => {
    const source = document.body.dataset.auditResults;
    const matrix = document.getElementById("full-dbb-outcomes");
    const cases = document.getElementById("full-dbb-cases");
    if (!source || !matrix || !cases) return;
    try {
      const response = await fetch(source, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      verifyData(data);
      matrix.innerHTML = renderMatrix(data.pilots);
      cases.innerHTML = renderCases(data.repository_artifact_base, data.pilots);
    } catch (error) {
      const message = `Audit data could not be loaded: ${error.message}`;
      matrix.innerHTML = `<tr class="empty-row"><td colspan="6">${esc(message)}</td></tr>`;
      cases.innerHTML = `<p class="audit-data-error">${esc(message)}</p>`;
    }
  };

  init();
})();
