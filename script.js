// Função para buscar automaticamente todos os arquivos .md do seu GitHub
async function obterListaDeArquivos() {
    try {
        const resposta = await fetch("https://api.github.com/repos/leorruas/politicacomunicacao/git/trees/main?recursive=1");
        if (!resposta.ok) throw new Error("Erro na API do GitHub");

        const dados = await resposta.json();

        // Considera estritamente as pastas solicitadas: 01 Casos e 02 Padrões e hipóteses
        return dados.tree
            .filter(item => {
                if (item.type !== "blob" || !item.path.endsWith(".md")) return false;
                const p = item.path;
                return p.startsWith("01 Casos/") || p.startsWith("02 Padrões e hipóteses/") || p.startsWith("02 Padroes e hipoteses/");
            })
            .map(item => {
                const nomeSemExtensao = item.path.split("/").pop().replace(".md", "");
                const partes = item.path.split("/");
                let categoria = "Outros";
                if (partes[0].startsWith("01")) categoria = "Cases";
                else if (partes[0].startsWith("02")) categoria = "Padrões e hipóteses";

                return {
                    titulo: nomeSemExtensao,
                    path: encodeURI(`https://raw.githubusercontent.com/leorruas/politicacomunicacao/main/${item.path}`),
                    sourcePath: item.path,
                    categoria: categoria
                };
            });
    } catch (erro) {
        console.warn("Não foi possível carregar o índice da política de comunicação:", erro);
        return [];
    }
}

// Variáveis globais
let todosOsArtigos = [];
let todasAsPastas = {};
let artigoAtual = null;

const campoTexto = document.getElementById("main-search-input");
const campoTextoNav = document.getElementById("nav-search-input");
const btnPesquisar = document.getElementById("btn-pesquisar");
const containerResultados = document.querySelector(".cards-container");
const divResultados = document.querySelector(".resultados");
const leitorDeArtigo = document.getElementById("leitor-artigo");
const leitorDePerfil = document.getElementById("perfil-leitor");
const perfilCabecalho = document.getElementById("perfil-cabecalho");
const perfilAcoes = document.getElementById("perfil-acoes");
const artigoTitulo = document.getElementById("artigo-titulo");
const artigoCorpo = document.getElementById("artigo-corpo");
const btnVoltar = document.getElementById("btn-voltar");
const btnVoltarPerfil = document.getElementById("btn-voltar-perfil");
const retornoArtigoTexto = document.getElementById("retorno-artigo-texto");
const btnTema = document.getElementById("theme-toggle");

function aplicarTema(tema, persistir = true) {
    document.documentElement.dataset.theme = tema;
    if (persistir) localStorage.setItem("tema-politica-comunicacao", tema);
    if (btnTema) {
        const proximoTema = tema === "dark" ? "claro" : "escuro";
        btnTema.textContent = `modo ${proximoTema}`;
        btnTema.setAttribute("aria-label", `Alternar para modo ${proximoTema}`);
    }
}

function inicializarTema() {
    const temaSalvo = localStorage.getItem("tema-politica-comunicacao");
    const temaDoSistema = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    aplicarTema(temaSalvo || temaDoSistema, false);
}

const informacoesCategorias = {
    "Cases": { icone: "book", descricao: "Situações concretas, evidências e perguntas para a política." },
    "Padrões e hipóteses": { icone: "sliders", descricao: "Leituras provisórias e generalizações que atravessam mais de um caso." }
};

const resumosDoIndice = {
    "Cases": "situações concretas, evidências e perguntas para a política",
    "Padrões e hipóteses": "leituras provisórias que atravessam mais de um caso"
};

const ordemCategorias = [
    "Cases",
    "Padrões e hipóteses"
];

function ordenarCategorias(categorias) {
    return categorias.sort((a, b) => {
        const indiceA = ordemCategorias.indexOf(a);
        const indiceB = ordemCategorias.indexOf(b);
        return (indiceA === -1 ? ordemCategorias.length : indiceA) - (indiceB === -1 ? ordemCategorias.length : indiceB)
            || a.localeCompare(b, "pt-BR");
    });
}

function tituloDoPerfil(categoria) {
    return categoria.toLowerCase();
}

function tituloDoIndice(categoria) {
    return categoria.toLowerCase();
}

function tituloDaAcao(titulo) {
    return titulo.replace(/^\d+\s*-\s*/, "");
}

function classeDoPerfil(categoria) {
    const classes = {
        "Cases": "perfil-fundamentos",
        "Padrões e hipóteses": "perfil-administrador"
    };
    return classes[categoria] || "perfil-fundamentos";
}

function iconeNeutro(nome) {
    const caminhos = {
        compass: '<circle cx="12" cy="12" r="8"></circle><path d="m14.8 9.2-2.1 4.3-4.3 2.1 2.1-4.3z"></path>',
        sliders: '<path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3"></path><path d="M2 14h4M10 8h4m4 8h4"></path>',
        check: '<path d="m5 12 4.5 4.5L19 7"></path><circle cx="12" cy="12" r="9"></circle>',
        pencil: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>',
        user: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5 21c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5"></path>',
        book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path><path d="M4 5.5v16"></path>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${caminhos[nome] || caminhos.book}</svg>`;
}

function extrairResumoCard(conteudo) {
    const callout = conteudo.match(/> \[!(?:caso|note|summary|info)\][\s\S]*?\n>\s*(.+)/i);
    if (callout && callout[1]) {
        return callout[1].replace(/[#*_`\[\]]/g, "").trim();
    }
    const limpo = removerFrontmatter(conteudo).split(/\n\s*\n/).find(part => !part.startsWith("#") && !part.startsWith(">") && part.trim());
    return (limpo || "Abrir registro").replace(/[#*_`\[\]]/g, "").trim();
}

function extrairDataRegistro(conteudo) {
    return conteudo.match(/data-registro:\s*([^\n]+)/)?.[1]?.trim() || "";
}

async function carregarTodosOsArtigos() {
    const lista = await obterListaDeArquivos();

    const promessas = lista.map(async (item) => {
        try {
            const res = await fetch(item.path);
            if (!res.ok) return null;
            const texto = await res.text();

            return {
                titulo: item.titulo,
                path: item.path,
                sourcePath: item.sourcePath,
                categoria: item.categoria,
                conteudo: texto,
                resumo: extrairResumoCard(texto),
                data: extrairDataRegistro(texto)
            };
        } catch (e) {
            console.error(`Erro ao carregar ${item.path}:`, e);
            return null;
        }
    });

    const resultados = await Promise.all(promessas);
    todosOsArtigos = resultados.filter(artigo => artigo !== null);

    todasAsPastas = {};
    todosOsArtigos.forEach(artigo => {
        if (!todasAsPastas[artigo.categoria]) {
            todasAsPastas[artigo.categoria] = [];
        }
        todasAsPastas[artigo.categoria].push(artigo);
    });

    Object.values(todasAsPastas).forEach(artigos => {
        artigos.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR", {
            numeric: true,
            sensitivity: "base"
        }));
    });

    renderizarPastas();
    tratarRotaDaUrl();
}

function filtrarArtigos(termoBusca) {
    if (leitorDePerfil) leitorDePerfil.classList.add("escondido");
    if (!termoBusca || termoBusca.trim() === "") {
        if (containerResultados) containerResultados.innerHTML = "";
        if (divResultados) divResultados.classList.add("escondido");
        const pastasContainer = document.getElementById("pastas-container");
        if (pastasContainer) pastasContainer.classList.remove("escondido");
        document.getElementById("explorar-perfis")?.classList.remove("escondido");
        return;
    }

    const termo = termoBusca.toLowerCase().trim();
    
    const pastasContainer = document.getElementById("pastas-container");
    if (pastasContainer) pastasContainer.classList.add("escondido");
    document.getElementById("explorar-perfis")?.classList.add("escondido");

    if (termo.length < 3) {
        if (containerResultados) {
            containerResultados.innerHTML = `<p class="mensagem-busca">Digite ao menos <strong>três letras</strong> para pesquisar no acervo.</p>`;
        }
        if (divResultados) divResultados.classList.remove("escondido");
        return;
    }

    const filtrados = todosOsArtigos
        .filter(artigo => artigo.titulo.toLowerCase().includes(termo) || artigo.conteudo.toLowerCase().includes(termo) || artigo.resumo.toLowerCase().includes(termo))
        .sort((a, b) => {
            const prioridadeA = a.titulo.toLowerCase().includes(termo) ? 0 : 1;
            const prioridadeB = b.titulo.toLowerCase().includes(termo) ? 0 : 1;
            return prioridadeA - prioridadeB || a.titulo.localeCompare(b.titulo, "pt-BR", { numeric: true });
        });

    exibirResultados(filtrados, termo);
}

function destacarTexto(texto, termo) {
    if (!termo) return texto;
    const regex = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return texto.replace(regex, '<mark class="highlight">$1</mark>');
}

function escaparHtml(texto) {
    const elemento = document.createElement("span");
    elemento.textContent = texto;
    return elemento.innerHTML;
}

function removerFrontmatter(markdown) {
    if (!markdown) return "";
    return markdown.replace(/^---[\s\S]*?---\s*/, "");
}

function extrairTrechoRelevante(conteudo, termo) {
    const conteudoSemFrontmatter = removerFrontmatter(conteudo);
    const textoLimpo = conteudoSemFrontmatter.replace(/==/g, '').replace(/[#*`_~\[\]]/g, ' ');
    const pos = textoLimpo.toLowerCase().indexOf(termo.toLowerCase());
    
    if (pos === -1) {
        return textoLimpo.substring(0, 150) + "...";
    }

    const inicio = Math.max(0, pos - 40);
    const fim = Math.min(textoLimpo.length, pos + 110);
    let trecho = textoLimpo.substring(inicio, fim);
    
    if (inicio > 0) trecho = "..." + trecho;
    if (fim < textoLimpo.length) trecho = trecho + "...";
    
    return trecho;
}

function exibirResultados(artigos, termo = "") {
    containerResultados.innerHTML = "";
    if (leitorDeArtigo) leitorDeArtigo.classList.add("escondido");
    divResultados.classList.remove("escondido");

    if (artigos.length === 0) {
        containerResultados.innerHTML = `<p class="mensagem-busca">Nenhum registro encontrado para <strong>“${escaparHtml(termo)}”</strong>.</p>`;
        return;
    }

    const resumoBusca = document.createElement("p");
    resumoBusca.className = "resumo-busca";
    resumoBusca.textContent = `${artigos.length} ${artigos.length === 1 ? "registro encontrado" : "registros encontrados"} para “${termo}”`;
    containerResultados.appendChild(resumoBusca);

    const grupos = {};
    artigos.forEach(artigo => {
        if (!grupos[artigo.categoria]) grupos[artigo.categoria] = [];
        grupos[artigo.categoria].push(artigo);
    });

    ordenarCategorias(Object.keys(grupos))
        .sort((a, b) => {
            const tituloEmA = grupos[a].some(artigo => artigo.titulo.toLowerCase().includes(termo));
            const tituloEmB = grupos[b].some(artigo => artigo.titulo.toLowerCase().includes(termo));
            return Number(tituloEmB) - Number(tituloEmA);
        })
        .forEach(categoria => {
            const grupoDiv = document.createElement("div");
            grupoDiv.className = "busca-grupo-assunto";

            const tituloGrupo = document.createElement("h3");
            tituloGrupo.className = "busca-grupo-titulo";
            tituloGrupo.innerHTML = `<span>${escaparHtml(categoria)}</span><small>${grupos[categoria].length} ${grupos[categoria].length === 1 ? 'item' : 'itens'}</small>`;
            grupoDiv.appendChild(tituloGrupo);

            const gridResultados = document.createElement("div");
            gridResultados.className = "pastas-container";

            grupos[categoria].forEach(artigo => {
                const card = document.createElement("a");
                card.className = `perfil-card ${classeDoPerfil(artigo.categoria)}`;
                card.href = `#/${rotaDoArtigo(artigo).split("/").map(encodeURIComponent).join("/")}`;
                
                const trecho = extrairTrechoRelevante(artigo.conteudo, termo);
                card.innerHTML = `
                    <span class="indice-numero">•</span>
                    <span class="perfil-card-conteudo">
                        <strong>${destacarTexto(escaparHtml(artigo.titulo), termo)}</strong>
                        <span class="indice-resumo">${destacarTexto(escaparHtml(trecho), termo)}</span>
                    </span>
                    <span class="perfil-card-meta">${escaparHtml(artigo.categoria)}</span>
                `;

                card.addEventListener("click", (e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                    e.preventDefault();
                    abrirArtigo(artigo.titulo, artigo.conteudo);
                });

                gridResultados.appendChild(card);
            });

            grupoDiv.appendChild(gridResultados);
            containerResultados.appendChild(grupoDiv);
        });
}

function rotaDoArtigo(artigo) {
    if (!artigo) return "";
    return artigo.sourcePath.replace(/\.md$/i, "");
}

function rotaDoPerfil(categoria) {
    const slug = categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
    return `#/pasta/${encodeURIComponent(slug)}`;
}

function voltarParaHome(atualizarRota = true) {
    if (leitorDeArtigo) leitorDeArtigo.classList.add("escondido");
    if (leitorDePerfil) leitorDePerfil.classList.add("escondido");
    if (divResultados) divResultados.classList.add("escondido");
    const pastasContainer = document.getElementById("pastas-container");
    if (pastasContainer) pastasContainer.classList.remove("escondido");
    document.getElementById("explorar-perfis")?.classList.remove("escondido");
    artigoAtual = null;

    if (campoTexto) campoTexto.value = "";
    if (campoTextoNav) campoTextoNav.value = "";

    if (atualizarRota) {
        if (window.location.hash && window.location.hash !== "#" && window.location.hash !== "#/") {
            history.pushState(null, "", window.location.pathname + window.location.search);
        }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirPerfil(categoria, atualizarRota = true) {
    const artigos = todasAsPastas[categoria] || [];
    const informacao = informacoesCategorias[categoria];
    if (!informacao || artigos.length === 0) return;

    if (leitorDeArtigo) leitorDeArtigo.classList.add("escondido");
    if (divResultados) divResultados.classList.add("escondido");
    document.getElementById("pastas-container")?.classList.add("escondido");
    document.getElementById("explorar-perfis")?.classList.add("escondido");
    artigoAtual = null;

    if (atualizarRota && window.location.hash !== rotaDoPerfil(categoria)) {
        history.pushState({ perfil: categoria }, "", rotaDoPerfil(categoria));
    }

    const breadcrumbs = document.getElementById("perfil-breadcrumbs");
    breadcrumbs.innerHTML = "";
    const inicio = document.createElement("button");
    inicio.type = "button";
    inicio.className = "breadcrumb-link";
    inicio.textContent = "início";
    inicio.addEventListener("click", () => voltarParaHome(true));
    const separador = document.createElement("span");
    separador.className = "breadcrumb-separator";
    separador.textContent = "/";
    const atual = document.createElement("span");
    atual.textContent = categoria.toLowerCase();
    breadcrumbs.append(inicio, separador, atual);

    perfilCabecalho.className = `perfil-cabecalho ${classeDoPerfil(categoria)}`;
    perfilCabecalho.innerHTML = `<p class="perfil-rotulo">pasta</p><h2>${tituloDoIndice(categoria)}</h2>`;
    perfilAcoes.className = `perfil-acoes ${classeDoPerfil(categoria)}`;
    perfilAcoes.innerHTML = "";
    artigos.forEach((artigo, idx) => {
        const acao = document.createElement("a");
        acao.className = "perfil-acao";
        acao.href = `#/${rotaDoArtigo(artigo).split("/").map(encodeURIComponent).join("/")}`;
        acao.setAttribute("aria-label", tituloDaAcao(artigo.titulo));
        const num = String(idx + 1).padStart(2, "0");
        acao.innerHTML = `<span class="perfil-acao-numero">${num}</span><span class="perfil-acao-conteudo"><strong>${escaparHtml(tituloDaAcao(artigo.titulo))}</strong></span>`;
        acao.addEventListener("click", (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
            event.preventDefault();
            abrirArtigo(artigo.titulo, artigo.conteudo);
        });
        perfilAcoes.appendChild(acao);
    });

    leitorDePerfil.classList.remove("escondido");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirArtigo(titulo, conteudoMarkdown, atualizarRota = true) {
    if (divResultados) divResultados.classList.add("escondido");
    if (leitorDePerfil) leitorDePerfil.classList.add("escondido");
    const pastasContainer = document.getElementById("pastas-container");
    if (pastasContainer) pastasContainer.classList.add("escondido");
    document.getElementById("explorar-perfis")?.classList.add("escondido");

    artigoAtual = todosOsArtigos.find(artigo =>
        artigo.titulo === titulo && artigo.conteudo === conteudoMarkdown
    ) || todosOsArtigos.find(artigo => artigo.titulo === titulo) || null;
    artigoTitulo.textContent = tituloDaAcao(artigoAtual?.titulo || titulo);

    if (artigoAtual && atualizarRota) {
        const hash = `#/${rotaDoArtigo(artigoAtual).split("/").map(encodeURIComponent).join("/")}`;
        if (window.location.hash !== hash) {
            history.pushState({ rota: rotaDoArtigo(artigoAtual) }, "", hash);
        }
    }

    if (artigoAtual) {
        renderizarBreadcrumbs(artigoAtual);
        renderizarNavegacaoSequencial(artigoAtual);
        renderizarContextoDoArtigo(artigoAtual);
        btnVoltar.textContent = `← ver outros registros em ${artigoAtual.categoria.toLowerCase()}`;
        btnVoltar.setAttribute("aria-label", `Voltar para ${artigoAtual.categoria}`);
        if (retornoArtigoTexto) retornoArtigoTexto.innerHTML = `Terminou este registro? <strong>Continue explorando ${artigoAtual.categoria.toLowerCase()}.</strong>`;
    } else {
        btnVoltar.textContent = "← voltar para o acervo";
        btnVoltar.setAttribute("aria-label", "Voltar para o acervo");
        if (retornoArtigoTexto) retornoArtigoTexto.textContent = "Quer continuar explorando?";
    }
    
    const markdownLimpo = removerFrontmatter(conteudoMarkdown);
    const markdownComImagens = converterImagensObsidian(markdownLimpo);
    const markdownComHighlight = markdownComImagens.replace(/==([^=]+)==/g, '<mark class="obsidian-highlight">$1</mark>');

    if (typeof marked !== 'undefined') {
        artigoCorpo.innerHTML = marked.parse(markdownComHighlight);
    } else {
        artigoCorpo.innerText = markdownComHighlight;
    }

    processarCalloutsObsidian();
    processarLinksObsidian();
    aprimorarImagensDoArtigo();
    aprimorarBlocosDePrompt();

    artigoCorpo.querySelectorAll('li input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = false;
        const li = checkbox.parentElement;
        if (li) {
            li.classList.add('task-list-item');
            const textNodes = Array.from(li.childNodes).filter(node => node !== checkbox);
            const wrapper = document.createElement('span');
            wrapper.className = 'task-item-content';
            textNodes.forEach(node => wrapper.appendChild(node));
            li.appendChild(wrapper);
            li.addEventListener('click', (event) => {
                if (event.target === checkbox || event.target.closest('a, button, input')) return;
                checkbox.click();
            });
        }
    });

    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            fontFamily: 'Archivo, sans-serif',
            themeVariables: {
                fontFamily: 'Archivo, sans-serif',
                darkMode: true,
                background: '#0d0d0d',
                primaryColor: '#007aff',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#007aff',
                lineColor: '#007aff',
                secondaryColor: '#1a1a1a',
                tertiaryColor: '#222222'
            }
        });
        const blocosMermaid = artigoCorpo.querySelectorAll('pre code.language-mermaid, pre.language-mermaid');
        blocosMermaid.forEach((bloco) => {
            const containerPre = bloco.tagName.toLowerCase() === 'pre' ? bloco : bloco.parentElement;
            const codigoMermaid = bloco.textContent;
            const divMermaid = document.createElement('div');
            divMermaid.className = 'mermaid';
            divMermaid.textContent = codigoMermaid;
            containerPre.replaceWith(divMermaid);
        });
        setTimeout(() => {
            try {
                mermaid.run({ nodes: artigoCorpo.querySelectorAll('.mermaid') });
            } catch (err) {
                console.error("Erro ao renderizar Mermaid:", err);
            }
        }, 50);
    }

    gerarTableOfContents();
    leitorDeArtigo.classList.remove("escondido");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderizarContextoDoArtigo(artigo) {
    const contexto = document.getElementById("artigo-contexto");
    if (!contexto) return;
    const informacao = informacoesCategorias[artigo.categoria] || informacoesCategorias.Cases;
    contexto.innerHTML = `<span class="contexto-icone">${iconeNeutro(informacao.icone)}</span><p><strong>${artigo.categoria}</strong><span>${informacao.descricao}</span></p>`;
}

function aprimorarImagensDoArtigo() {
    artigoCorpo.querySelectorAll("img").forEach((imagem) => {
        if (imagem.closest("figure")) return;
        const figura = document.createElement("figure");
        figura.className = "imagem-contextual";
        const legenda = imagem.alt && !/\.(png|jpe?g|gif|webp)$/i.test(imagem.alt) ? imagem.alt : "Imagem";
        const paragrafo = imagem.parentElement?.tagName === "P" ? imagem.parentElement : null;
        if (paragrafo) {
            paragrafo.replaceWith(figura);
        } else {
            imagem.replaceWith(figura);
        }
        figura.appendChild(imagem);
        const figcaption = document.createElement("figcaption");
        figcaption.textContent = legenda;
        figura.appendChild(figcaption);
    });
}

function aprimorarBlocosDePrompt() {
    artigoCorpo.querySelectorAll("pre code.language-prompt").forEach((codigo) => {
        const pre = codigo.parentElement;
        if (!pre || pre.classList.contains("prompt-copiavel")) return;

        pre.classList.add("prompt-copiavel");

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "botao-copiar-prompt";
        botao.textContent = "Copiar prompt";
        botao.setAttribute("aria-label", "Copiar prompt para a área de transferência");

        botao.addEventListener("click", async () => {
            const texto = codigo.textContent.trim();
            try {
                await navigator.clipboard.writeText(texto);
                botao.textContent = "Prompt copiado";
                botao.classList.add("copiado");
                setTimeout(() => {
                    botao.textContent = "Copiar prompt";
                    botao.classList.remove("copiado");
                }, 2200);
            } catch (erro) {
                botao.textContent = "Não foi possível copiar";
                setTimeout(() => {
                    botao.textContent = "Copiar prompt";
                }, 2200);
            }
        });

        pre.insertBefore(botao, codigo);
    });
}

function renderizarBreadcrumbs(artigo) {
    const breadcrumbs = document.getElementById("artigo-breadcrumbs");
    if (!breadcrumbs) return;

    breadcrumbs.innerHTML = "";

    const linkInicio = document.createElement("button");
    linkInicio.type = "button";
    linkInicio.className = "breadcrumb-link";
    linkInicio.textContent = "início";
    linkInicio.addEventListener("click", () => voltarParaHome(true));

    const separador1 = document.createElement("span");
    separador1.className = "breadcrumb-separator";
    separador1.textContent = "/";

    const linkPerfil = document.createElement("button");
    linkPerfil.type = "button";
    linkPerfil.className = "breadcrumb-link";
    linkPerfil.textContent = artigo.categoria.toLowerCase();
    linkPerfil.addEventListener("click", () => abrirPerfil(artigo.categoria));

    const separador2 = document.createElement("span");
    separador2.className = "breadcrumb-separator";
    separador2.textContent = "/";

    const itemAtual = document.createElement("span");
    itemAtual.textContent = tituloDaAcao(artigo.titulo);

    breadcrumbs.appendChild(linkInicio);
    breadcrumbs.appendChild(separador1);
    breadcrumbs.appendChild(linkPerfil);
    breadcrumbs.appendChild(separador2);
    breadcrumbs.appendChild(itemAtual);
}

function renderizarNavegacaoSequencial(artigo) {
    const container = document.getElementById("artigo-nav-rodape");
    if (!container) return;

    container.innerHTML = "";
    const listaCategoria = todasAsPastas[artigo.categoria] || [];
    const indiceAtual = listaCategoria.findIndex(item => item.titulo === artigo.titulo);

    if (indiceAtual === -1 || listaCategoria.length <= 1) {
        container.classList.add("escondido");
        return;
    }

    container.classList.remove("escondido");

    const anterior = indiceAtual > 0 ? listaCategoria[indiceAtual - 1] : null;
    const proximo = indiceAtual < listaCategoria.length - 1 ? listaCategoria[indiceAtual + 1] : null;

    if (anterior) {
        const cardAnterior = document.createElement("a");
        cardAnterior.className = "artigo-nav-card nav-anterior";
        cardAnterior.href = `#/${rotaDoArtigo(anterior).split("/").map(encodeURIComponent).join("/")}`;
        cardAnterior.innerHTML = `
            <span class="nav-card-direcao">← registro anterior</span>
            <strong class="nav-card-titulo">${escaparHtml(tituloDaAcao(anterior.titulo))}</strong>
        `;
        cardAnterior.addEventListener("click", (e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            abrirArtigo(anterior.titulo, anterior.conteudo);
        });
        container.appendChild(cardAnterior);
    } else {
        const placeholder = document.createElement("div");
        container.appendChild(placeholder);
    }

    if (proximo) {
        const cardProximo = document.createElement("a");
        cardProximo.className = "artigo-nav-card nav-proximo";
        cardProximo.href = `#/${rotaDoArtigo(proximo).split("/").map(encodeURIComponent).join("/")}`;
        cardProximo.innerHTML = `
            <span class="nav-card-direcao">próximo registro →</span>
            <strong class="nav-card-titulo">${escaparHtml(tituloDaAcao(proximo.titulo))}</strong>
        `;
        cardProximo.addEventListener("click", (e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            abrirArtigo(proximo.titulo, proximo.conteudo);
        });
        container.appendChild(cardProximo);
    }
}

let scrollSpyObserver = null;

function gerarTableOfContents() {
    const tocNav = document.getElementById("toc-nav");
    const tocSidebar = document.getElementById("artigo-toc-sidebar");
    if (!tocNav || !tocSidebar) return;

    tocNav.innerHTML = "";
    const headings = Array.from(artigoCorpo.querySelectorAll("h2, h3"));

    if (headings.length === 0) {
        tocSidebar.hidden = true;
        return;
    }

    tocSidebar.hidden = false;
    const lista = document.createElement("ul");
    lista.className = "toc-list";
    const idsUsados = new Set();

    headings.forEach((heading, index) => {
        const baseId = heading.textContent
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-") || `secao-${index + 1}`;
        let id = heading.id || baseId;
        let sufixo = 2;
        while (idsUsados.has(id)) {
            id = `${baseId}-${sufixo++}`;
        }
        idsUsados.add(id);
        heading.id = id;

        const item = document.createElement("li");
        item.className = `toc-item ${heading.tagName.toLowerCase() === 'h3' ? 'toc-subitem' : ''}`;
        const link = document.createElement("a");
        link.href = rotaComSecao(artigoAtual, id);
        link.textContent = heading.textContent.trim();
        link.dataset.headingId = id;
        link.addEventListener("click", (event) => {
            event.preventDefault();
            history.pushState({ rota: rotaDoArtigo(artigoAtual), secao: id }, "", rotaComSecao(artigoAtual, id));
            const navegacao = document.getElementById("sticky-nav");
            const deslocamento = (navegacao ? navegacao.offsetHeight : 0) + 20;
            const posicao = heading.getBoundingClientRect().top + window.scrollY - deslocamento;
            window.scrollTo({ top: posicao, behavior: "smooth" });
        });
        item.appendChild(link);
        lista.appendChild(item);
    });

    tocNav.appendChild(lista);
    configurarFiltroDoSumario(lista, headings.length);
    iniciarScrollSpy(headings);
}

function rotaComSecao(artigo, secao) {
    const rota = `#/${rotaDoArtigo(artigo).split("/").map(encodeURIComponent).join("/")}`;
    return secao ? `${rota}#${encodeURIComponent(secao)}` : rota;
}

function configurarFiltroDoSumario(lista, totalDeSecoes) {
    const container = document.getElementById("toc-filter-container");
    const campo = document.getElementById("toc-filter-input");
    if (!container || !campo) return;
    container.hidden = totalDeSecoes < 4;
    campo.value = "";
    campo.oninput = () => {
        const termo = campo.value.trim().toLocaleLowerCase("pt-BR");
        lista.querySelectorAll(".toc-item").forEach((item) => {
            item.hidden = Boolean(termo) && !item.textContent.toLocaleLowerCase("pt-BR").includes(termo);
        });
    };
}

function iniciarScrollSpy(headings) {
    if (scrollSpyObserver) scrollSpyObserver.disconnect();

    scrollSpyObserver = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            document.querySelectorAll(".toc-nav a").forEach((link) => {
                link.classList.toggle("toc-active", link.dataset.headingId === entrada.target.id);
            });
        });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0.1 });

    headings.forEach((heading) => scrollSpyObserver.observe(heading));
}

function converterImagensObsidian(markdown) {
    const repositorioRaw = "https://raw.githubusercontent.com/leorruas/politicacomunicacao/main/";
    const regexEmbed = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

    return markdown.replace(regexEmbed, (match, caminho, descricao) => {
        const caminhoNormalizado = caminho.trim().replace(/\\/g, "/");
        const textoAlternativo = (descricao || caminhoNormalizado.split("/").pop()).trim();
        return `![${textoAlternativo}](${encodeURI(repositorioRaw + caminhoNormalizado)})`;
    });
}

function processarLinksObsidian() {
    const htmlAtual = artigoCorpo.innerHTML;
    const regexObsidian = /\[\[(?:([^\]\|]+)\|)?([^\]]+)\]\]/g;

    artigoCorpo.innerHTML = htmlAtual.replace(regexObsidian, (match, caminho, textoExibicao) => {
        const destino = caminho || textoExibicao;
        const rotulo = textoExibicao || destino;
        return `<a href="#" class="obsidian-link" data-destino="${destino}">${rotulo}</a>`;
    });

    artigoCorpo.querySelectorAll(".obsidian-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const destino = link.getAttribute("data-destino");
            navegarParaLinkObsidian(destino);
        });
    });
}

function processarCalloutsObsidian() {
    const blockquotes = artigoCorpo.querySelectorAll('blockquote');
    blockquotes.forEach(bq => {
        const conteudo = bq.innerHTML;
        const match = conteudo.match(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|CASO|HIPOTESE|HIPÓTESE|REGRA|CUIDADO)\](?:[ \t]+([^\n<]+))?/i);
        if (match) {
            const tipoBruto = match[1].toUpperCase();
            const tipo = tipoBruto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const tituloCustomizado = match[2] ? match[2].trim() : '';
            
            let htmlLimpo = conteudo.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|CASO|HIPOTESE|HIPÓTESE|REGRA|CUIDADO)\](?:[ \t]+[^\n<]+)?/i, '');
            htmlLimpo = htmlLimpo.replace(/<p>\s*<\/p>/g, '');

            const rotulos = {
                'NOTE': 'NOTA',
                'TIP': 'DICA',
                'IMPORTANT': 'IMPORTANTE',
                'WARNING': 'AVISO',
                'CAUTION': 'ATENÇÃO',
                'CASO': 'CASO',
                'HIPOTESE': 'HIPÓTESE',
                'REGRA': 'REGRA',
                'CUIDADO': 'CUIDADO'
            };

            const tituloExibicao = tituloCustomizado || rotulos[tipo] || tipo;

            const divCallout = document.createElement('div');
            divCallout.className = `obsidian-callout callout-${tipo.toLowerCase()}`;

            divCallout.innerHTML = `
                <div class="callout-header">
                    <span class="callout-title">${tituloExibicao}</span>
                </div>
                <div class="callout-content">
                    ${htmlLimpo}
                </div>
            `;

            bq.replaceWith(divCallout);
        }
    });
}

function navegarParaLinkObsidian(nomeOuCaminho) {
    const normalizar = (str) => str.trim().toLowerCase().replace(/:/g, " -").replace(/\s+/g, " ");
    const limpo = normalizar(nomeOuCaminho);
    
    const encontrado = todosOsArtigos.find(a => {
        const tituloMatch = normalizar(a.titulo) === limpo;
        const caminhoFonte = a.sourcePath || a.path;
        const nomeArquivo = normalizar(decodeURI(caminhoFonte).split("/").pop().replace(".md", ""));
        const caminhoSemExtensao = normalizar(decodeURI(caminhoFonte).replace("./", "").replace(/\.md$/, ""));
        return tituloMatch || nomeArquivo === limpo || caminhoSemExtensao === limpo;
    });

    if (encontrado) {
        abrirArtigo(encontrado.titulo, encontrado.conteudo);
    } else {
        console.warn("Registro não encontrado para o link Obsidian:", nomeOuCaminho);
    }
}

function tratarRotaDaUrl() {
    const hash = window.location.hash;
    if (!hash || hash === "#" || hash === "#/") {
        if (leitorDeArtigo && !leitorDeArtigo.classList.contains("escondido")) voltarParaHome(false);
        return;
    }

    const [rotaCodificada, secaoCodificada] = hash.replace(/^#\/?/, "").split("#");
    const rota = decodeURIComponent(rotaCodificada).replace(/\.md$/i, "");
    
    if (rota.startsWith("pasta/")) {
        const slug = rota.slice("pasta/".length);
        const categoria = Object.keys(todasAsPastas).find(cat => {
            const catSlug = cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
            return catSlug === slug || cat.toLowerCase() === slug;
        });
        if (categoria) abrirPerfil(categoria, false);
        return;
    }

    if (rota === "case" || rota === "cases") {
        abrirPerfil("Cases", false);
        return;
    }
    if (rota === "pattern" || rota === "padroes" || rota === "padroes-e-hipoteses") {
        abrirPerfil("Padrões e hipóteses", false);
        return;
    }

    const artigo = todosOsArtigos.find(item => rotaDoArtigo(item) === rota || item.titulo === rota || item.sourcePath.replace(/\.md$/i, "") === rota);
    if (artigo) {
        abrirArtigo(artigo.titulo, artigo.conteudo, false);
        if (secaoCodificada) {
            const secao = decodeURIComponent(secaoCodificada);
            window.setTimeout(() => document.getElementById(secao)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        }
    }
}

function renderizarPastas() {
    const pastasContainer = document.getElementById("pastas-container");
    if (!pastasContainer) return;

    pastasContainer.innerHTML = "";
    const categoriasOrdenadas = ordenarCategorias(Object.keys(todasAsPastas));
    const numerosDoIndice = {
        "Cases": "01",
        "Padrões e hipóteses": "02"
    };

    categoriasOrdenadas.forEach(categoria => {
        const total = (todasAsPastas[categoria] || []).length;
        const perfil = document.createElement("a");
        perfil.className = `perfil-card ${classeDoPerfil(categoria)}`;
        perfil.href = rotaDoPerfil(categoria);
        const resumo = resumosDoIndice[categoria] ? `<span class="indice-resumo">${resumosDoIndice[categoria]}</span>` : "";
        perfil.innerHTML = `
            <span class="indice-numero">${numerosDoIndice[categoria] || "•"}</span>
            <span class="perfil-card-conteudo">
                <strong>${tituloDoIndice(categoria)}</strong>
                ${resumo}
            </span>
            <span class="perfil-card-meta"><b>${total}</b> registros</span>
        `;
        perfil.addEventListener("click", (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
            event.preventDefault();
            abrirPerfil(categoria);
        });
        pastasContainer.appendChild(perfil);
    });
}

function executarBuscaGlobal(termo, campoDeOrigem) {
    [campoTexto, campoTextoNav].forEach(campo => {
        if (campo && campo !== campoDeOrigem) campo.value = termo;
    });
    filtrarArtigos(termo);
}

if (campoTexto) {
    campoTexto.addEventListener("input", (e) => {
        executarBuscaGlobal(e.target.value, e.currentTarget);
    });
}

if (campoTextoNav) {
    campoTextoNav.addEventListener("input", (e) => {
        executarBuscaGlobal(e.target.value, e.currentTarget);
    });
}

if (btnPesquisar) {
    btnPesquisar.addEventListener("click", () => {
        if (campoTexto) filtrarArtigos(campoTexto.value);
    });
}

if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
        if (artigoAtual?.categoria) abrirPerfil(artigoAtual.categoria);
        else voltarParaHome();
    });
}

if (btnVoltarPerfil) {
    btnVoltarPerfil.addEventListener("click", () => voltarParaHome(true));
}

if (btnTema) {
    btnTema.addEventListener("click", () => {
        aplicarTema(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
}

const headerEl = document.querySelector("header");
const stickyNav = document.getElementById("sticky-nav");

window.addEventListener("scroll", () => {
    if (!headerEl || !stickyNav) return;
    const headerHeight = headerEl.offsetHeight;
    if (window.scrollY > headerHeight) {
        stickyNav.classList.add("visible");
    } else {
        stickyNav.classList.remove("visible");
    }
});

window.addEventListener("popstate", () => {
    tratarRotaDaUrl();
});

window.addEventListener("DOMContentLoaded", () => {
    inicializarTema();
    carregarTodosOsArtigos();
});

const navLogo = document.getElementById("nav-logo");
if (navLogo) {
    navLogo.addEventListener("click", (e) => {
        e.preventDefault();
        voltarParaHome(true);
    });
}

const mainTitle = document.querySelector("header h1");
if (mainTitle) {
    mainTitle.addEventListener("click", () => {
        voltarParaHome(true);
    });
}

const navLinkPastas = document.getElementById("nav-link-pastas");
if (navLinkPastas) {
    navLinkPastas.addEventListener("click", (e) => {
        e.preventDefault();
        voltarParaHome(true);
        const pastasContainer = document.getElementById("pastas-container");
        if (pastasContainer) {
            pastasContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
}

window.addEventListener("hashchange", () => {
    tratarRotaDaUrl();
});
