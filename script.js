const REPO = "leorruas/politicacomunicacao";
const BRANCH = "main";
const FOLDERS = [
  { path: "01 Casos", key: "case", label: "case", grid: "cases-grid", count: "cases-count" },
  { path: "02 Padrões e hipóteses", key: "pattern", label: "padrão / hipótese", grid: "patterns-grid", count: "patterns-count" }
];

let articles = [];
let activeArticle = null;
const byId = id => document.getElementById(id);
const normalize = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function titleFromPath(path) { return path.split("/").pop().replace(/\.md$/i, ""); }
function removeFrontmatter(text) { return text.replace(/^---[\s\S]*?---\s*/, ""); }
function summaryFrom(text) {
  const callout = text.match(/> \[!caso\][\s\S]*?\n>\s*(.+)/i);
  const paragraph = removeFrontmatter(text).split(/\n\s*\n/).find(part => !part.startsWith("#") && !part.startsWith(">") && part.trim());
  return (callout?.[1] || paragraph || "Abrir registro").replace(/[#*_`]/g, "").trim();
}
function dateFrom(text) { return text.match(/data-registro:\s*([^\n]+)/)?.[1]?.trim() || ""; }
function escapeHtml(value) { const e = document.createElement("span"); e.textContent = value; return e.innerHTML; }

async function listMarkdown(folder) {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não foi possível carregar ${folder}.`);
  const data = await response.json();
  if (!Array.isArray(data.tree)) throw new Error(`O índice de ${folder.path} não foi retornado pela API.`);
  return data.tree.filter(entry => entry.type === "blob" && entry.path.startsWith(`${folder.path}/`) && entry.path.endsWith(".md"));
}
async function loadArticle(entry, folder) {
  const encodedPath = entry.path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${encodedPath}`);
  if (!response.ok) throw new Error(`Não foi possível abrir ${entry.name}.`);
  const content = await response.text();
  return { title: titleFromPath(entry.path), sourcePath: entry.path, type: folder.key, label: folder.label, content, summary: summaryFrom(content), date: dateFrom(content) };
}

function card(article) {
  const item = document.createElement("a");
  item.className = "perfil-card perfil-fundamentos";
  item.href = `#${encodeURIComponent(article.sourcePath)}`;
  item.innerHTML = `<span class="perfil-card-icone" aria-hidden="true">◆</span><span class="perfil-card-conteudo"><strong>${escapeHtml(article.title)}</strong><span class="indice-resumo">${escapeHtml(article.summary)}</span></span><span class="perfil-card-meta">${article.label}${article.date ? ` <b>${article.date}</b>` : ""}</span>`;
  item.addEventListener("click", event => { event.preventDefault(); openArticle(article); });
  return item;
}
function renderCollections() {
  FOLDERS.forEach(folder => {
    const matching = articles.filter(article => article.type === folder.key);
    const grid = byId(folder.grid); grid.replaceChildren(...matching.map(card));
    byId(folder.count).textContent = `${matching.length} registros`;
  });
}
function setSearch(value) {
  byId("main-search-input").value = value;
  byId("nav-search-input").value = value;
  const term = normalize(value.trim());
  const results = term.length < 3 ? [] : articles.filter(article => normalize(`${article.title} ${article.summary} ${article.content}`).includes(term));
  byId("search-results").classList.toggle("hidden", term.length < 3);
  byId("collection-cases").classList.toggle("hidden", term.length >= 3);
  byId("collection-patterns").classList.toggle("hidden", term.length >= 3);
  if (term.length >= 3) { byId("results-grid").replaceChildren(...results.map(card)); byId("results-count").textContent = `${results.length} encontrados`; }
}
function markdownWithLinks(content) {
  const withoutMetadata = removeFrontmatter(content).replace(/^#\s+.*$/m, "");
  const wikiLinks = withoutMetadata.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, destination, label) => {
    const found = articles.find(article => article.sourcePath.replace(/\.md$/, "") === destination || article.title === destination.split("/").pop());
    return found ? `[${label || found.title}](#${encodeURIComponent(found.sourcePath)})` : (label || destination.split("/").pop());
  });
  return marked.parse(wikiLinks, { headerIds: false, mangle: false });
}
function openArticle(article, updateHash = true) {
  activeArticle = article;
  byId("reader").classList.remove("hidden");
  byId("search-results").classList.add("hidden");
  byId("collection-cases").classList.add("hidden");
  byId("collection-patterns").classList.add("hidden");
  byId("article-title").textContent = article.title;
  byId("breadcrumbs").textContent = `${article.type === "case" ? "Cases" : "Padrões e hipóteses"} / ${article.label}`;
  byId("article-body").innerHTML = markdownWithLinks(article.content);
  byId("article-body").querySelectorAll("a[href^='#']").forEach(link => link.addEventListener("click", event => {
    const path = decodeURIComponent(link.getAttribute("href").slice(1)); const found = articles.find(item => item.sourcePath === path); if (found) { event.preventDefault(); openArticle(found); }
  }));
  const headings = [...byId("article-body").querySelectorAll("h2, h3")];
  headings.forEach((heading, index) => heading.id = `section-${index}`);
  byId("reader-toc").innerHTML = headings.map(heading => `<a href="#${heading.id}">${escapeHtml(heading.textContent)}</a>`).join("");
  if (updateHash) history.pushState({ article: article.sourcePath }, "", `#${encodeURIComponent(article.sourcePath)}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function returnToCollection() {
  activeArticle = null; byId("reader").classList.add("hidden"); byId("collection-cases").classList.remove("hidden"); byId("collection-patterns").classList.remove("hidden");
  byId("main-search-input").value = ""; byId("nav-search-input").value = ""; history.pushState({}, "", "#acervo"); byId("acervo").scrollIntoView({ behavior:"smooth" });
}
function initTheme() { const saved = localStorage.getItem("tema-politica-comunicacao"); const theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"); document.documentElement.dataset.theme = theme; }

async function init() {
  initTheme();
  FOLDERS.forEach(folder => byId(folder.grid).append(byId("loading-card").content.cloneNode(true)));
  try { articles = (await Promise.all(FOLDERS.map(async folder => (await Promise.all((await listMarkdown(folder)).map(entry => loadArticle(entry, folder))))))).flat().sort((a,b) => a.title.localeCompare(b.title, "pt-BR")); renderCollections();
    const path = decodeURIComponent(location.hash.slice(1)); const initial = articles.find(article => article.sourcePath === path); if (initial) openArticle(initial, false);
  } catch (error) { const message = error?.message || String(error); document.querySelectorAll(".pastas-container").forEach(grid => grid.innerHTML = `<p class="loading">${escapeHtml(message)} Tente recarregar a página.</p>`); }
  ["main-search-input", "nav-search-input"].forEach(id => byId(id).addEventListener("input", event => setSearch(event.target.value)));
  byId("back-button").addEventListener("click", returnToCollection);
  byId("theme-toggle").addEventListener("click", () => { const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("tema-politica-comunicacao", next); });
}
window.addEventListener("popstate", () => { const path = decodeURIComponent(location.hash.slice(1)); const article = articles.find(item => item.sourcePath === path); article ? openArticle(article, false) : returnToCollection(); });
window.addEventListener("DOMContentLoaded", init);
