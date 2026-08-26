const reportContainer = document.querySelector("#report-content");
const reportToc = document.querySelector("#report-toc");

if (reportContainer && reportToc) {
  const escapeHtml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const safeLink = (target) => {
    const cleaned = target.trim();
    if (/^(?:https?:|mailto:|#)/i.test(cleaned)) return cleaned;
    if (/^(?:javascript|data):/i.test(cleaned)) return "#";
    return `../${cleaned.replace(/^\.\//, "")}`;
  };

  const safeImageSource = (target) => {
    const cleaned = target.trim();
    if (!cleaned || /[\u0000-\u001f\u007f]/.test(cleaned)) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(cleaned)) return "";

    const relative = cleaned.replace(/^\.\//, "");
    if (relative.split("/").includes("..")) return "";
    return `../${relative}`;
  };

  const inline = (value) => {
    const code = [];
    let rendered = value.replace(/`([^`]+)`/g, (_, content) => {
      const index = code.push(`<code>${escapeHtml(content)}</code>`) - 1;
      return `%%CODE${index}%%`;
    });
    rendered = escapeHtml(rendered)
      .replace(/&lt;sup&gt;([\s\S]*?)&lt;\/sup&gt;/g, "<sup>$1</sup>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, target) => `<a href="${escapeHtml(safeLink(target))}">${label}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/%%CODE(\d+)%%/g, (_, index) => code[Number(index)]);
    return rendered;
  };

  const slugCounts = new Map();
  const slugify = (value) => {
    const base = value.toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section";
    const count = slugCounts.get(base) || 0;
    slugCounts.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };

  const tableCells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  const isTableDivider = (line) => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

  const renderMarkdown = (markdown) => {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    const toc = [];
    let paragraph = [];
    let listType = "";
    let inCode = false;
    let codeLanguage = "";
    let codeLines = [];
    let inComment = false;
    let inEquation = false;
    let equationLines = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      output.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    };
    const closeList = () => {
      if (!listType) return;
      output.push(`</${listType}>`);
      listType = "";
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (inComment) {
        if (line.includes("-->")) inComment = false;
        continue;
      }
      if (line.trim().startsWith("<!--")) {
        flushParagraph();
        closeList();
        if (!line.includes("-->")) inComment = true;
        continue;
      }

      if (inCode) {
        if (line.trim().startsWith("```")) {
          output.push(`<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
          inCode = false;
          codeLanguage = "";
          codeLines = [];
        } else {
          codeLines.push(line);
        }
        continue;
      }
      if (line.trim().startsWith("```")) {
        flushParagraph();
        closeList();
        inCode = true;
        codeLanguage = line.trim().slice(3).trim();
        continue;
      }

      if (inEquation) {
        if (line.trim() === "\\]") {
          output.push(`<div class="report-equation">${escapeHtml(equationLines.join(" "))}</div>`);
          inEquation = false;
          equationLines = [];
        } else {
          equationLines.push(line.trim());
        }
        continue;
      }
      if (line.trim() === "\\[") {
        flushParagraph();
        closeList();
        inEquation = true;
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length;
        const label = heading[2].trim();
        const id = slugify(label);
        output.push(`<h${level} id="${id}">${inline(label)}${level > 1 ? ` <a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a>` : ""}</h${level}>`);
        if (level === 2 || level === 3) toc.push({ level, label, id });
        continue;
      }

      const image = line.match(/^!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)\s*$/);
      if (image) {
        flushParagraph();
        closeList();
        const alt = image[1].trim();
        const source = safeImageSource(image[2] || image[3]);
        if (!source) {
          output.push(`<p>${escapeHtml(line)}</p>`);
          continue;
        }

        let caption = "";
        const captionIndex = lines[index + 1]?.trim() ? index + 1 : index + 2;
        const captionMatch = lines[captionIndex]?.match(/^\*\*(Figure\s+\d+\.)\*\*\s+(.+)$/i);
        if (captionMatch) {
          caption = `<figcaption><strong>${escapeHtml(captionMatch[1])}</strong> ${inline(captionMatch[2])}</figcaption>`;
          index = captionIndex;
        }

        output.push(`<figure class="report-figure"><img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">${caption}</figure>`);
        continue;
      }

      if (line.includes("|") && isTableDivider(lines[index + 1] || "")) {
        flushParagraph();
        closeList();
        const headers = tableCells(line);
        const rows = [];
        index += 2;
        while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
          rows.push(tableCells(lines[index]));
          index += 1;
        }
        index -= 1;
        output.push(`<div class="report-table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }

      const unordered = line.match(/^\s*[-*]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = ordered ? "ol" : "ul";
        if (listType && listType !== nextType) closeList();
        if (!listType) {
          listType = nextType;
          output.push(`<${listType}>`);
        }
        output.push(`<li>${inline((unordered || ordered)[1])}</li>`);
        continue;
      }

      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        closeList();
        output.push(`<blockquote>${inline(quote[1])}</blockquote>`);
        continue;
      }

      if (/^\s*---+\s*$/.test(line)) {
        flushParagraph();
        closeList();
        output.push("<hr>");
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      closeList();
      paragraph.push(line.trim());
    }

    flushParagraph();
    closeList();
    if (inCode) output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);

    return { html: output.join("\n"), toc };
  };

  fetch(document.body.dataset.reportSource, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Unable to load report");
      return response.text();
    })
    .then((markdown) => {
      const rendered = renderMarkdown(markdown);
      reportContainer.innerHTML = rendered.html;
      reportToc.innerHTML = rendered.toc.map((item) => `
        <a class="toc-level-${item.level}" href="#${item.id}">${inline(item.label)}</a>
      `).join("");
    })
    .catch(() => {
      reportContainer.innerHTML = `
        <div class="report-error">
          <h2>Report unavailable</h2>
          <p>The formatted report could not be loaded. <a href="../BIRDCRITIC_1_5_TECHNICAL_REPORT_DRAFT_V1.md">Open the raw Markdown instead.</a></p>
        </div>
      `;
      reportToc.innerHTML = "<span>Contents unavailable.</span>";
    });
}
