# Regras do repositório

## Finalidade e postura de trabalho

O acervo reúne e organiza casos para ampliar a pesquisa que pode subsidiar a construção da Política de Comunicação do IFMG. Ele serve à observação, documentação e formulação de perguntas; não representa decisão, aprovação nem imposição de regras.

Ao criar, editar ou resumir conteúdo:

- registre fatos e evidências antes de apresentar conclusões;
- trate interpretações como hipóteses verificáveis;
- evite personalizar problemas sistêmicos ou atribuir culpa a indivíduos;
- use os casos para orientar escuta e desenho de processos, não para fiscalizar pessoas;
- deixe claro que uma futura política deve ser construída com participação e governança apropriadas.

Conexões com outras frentes de pesquisa — por exemplo, encontrabilidade, jornada de informação ou dados de acesso do projeto do novo portal — são investigações possíveis, não conclusões prontas.

## Registro de casos e padrões

- Ao receber a descrição de um novo caso, registre-o automaticamente usando `01 Casos/Modelo de registro de caso.md` como estrutura. Preserve o problema relatado, a leitura de governança e os princípios ou propostas surgidos da análise, sempre distinguindo fatos, evidências e hipóteses.
- Após registrar um caso, audite sua relação com os padrões existentes. Atualize as ligações quando houver conexão substantiva; crie um novo padrão somente quando houver recorrência sustentada por dois ou mais casos independentes, usando `02 Padrões e hipóteses/Modelo de padrão ou hipótese transversal.md`.
- Modelos são guias de escrita, não casos nem evidências. Não os inclua no `manifest.json` ou na lista pública do acervo.

## Escopo público

Este repositório alimenta uma página pública no GitHub Pages. Devem permanecer públicos somente:

- os arquivos do site: `index.html`, `style.css`, `script.js` e `manifest.json`;
- as páginas de `01 Casos/`;
- as páginas de `02 Padrões e hipóteses/`;
- os dois anexos visuais explicitamente permitidos em `04 Dados e evidências/Anexos/`.

Os modelos públicos de `01 Casos/` e `02 Padrões e hipóteses/` são a exceção funcional: podem permanecer versionados para orientar a escrita no GitHub, mas não devem ser exibidos como registros no acervo.

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
