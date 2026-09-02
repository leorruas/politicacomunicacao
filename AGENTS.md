# Regras do repositório

## Escopo público

Este repositório alimenta uma página pública no GitHub Pages. Devem permanecer públicos somente:

- os arquivos do site: `index.html`, `style.css`, `script.js` e `manifest.json`;
- as páginas de `01 Casos/`;
- as páginas de `02 Padrões e hipóteses/`;
- os dois anexos visuais explicitamente permitidos em `04 Dados e evidências/Anexos/`.

Não publique, readicione ao Git ou inclua no manifesto conteúdos de trabalho de `00 Início/`, `03 Referências IFMG/`, `05 Para a consultoria/`, `99 Arquivo/`, `me.md` ou configurações de `.obsidian/`. Esses materiais ficam somente no vault local.

## Referências e anexos

- Links entre páginas de `01 Casos/` e `02 Padrões e hipóteses/` devem funcionar no GitHub Pages.
- Referências externas, arquivos privados e páginas fora do escopo público devem aparecer apenas como menção não navegável na interface pública.
- Não exponha URLs, dados pessoais, nomes de pessoas ou documentos internos por meio de links, anexos, nomes de arquivo ou metadados.
- Somente os dois PNGs já permitidos podem ser exibidos nos artigos públicos. Antes de publicar outro anexo, peça autorização explícita.

## Alterações e publicação

- Preserve os arquivos locais ignorados pelo Git; não os exclua do vault ao removê-los da versão pública.
- Ao mudar o site, valide `node --check script.js` e `git diff --check`.
- Revise o que será enviado para confirmar que não há arquivos fora do escopo público.
- Faça commits descritivos e envie a alteração para `main`, que é a origem do GitHub Pages.
