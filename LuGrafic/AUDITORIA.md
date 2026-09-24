# Auditoria do LuGrafic

Data: 24/09/2026. Referência: commit `d557235`.

O projeto compila, mas há falhas reproduzíveis que comprometem resultados matemáticos, propriedades termodinâmicas, integridade das coordenadas e exportações. A prioridade recomendada é corrigir essas falhas antes de ampliar as funcionalidades.

P1 significa alta prioridade por resultado incorreto, corrupção de dados ou execução de conteúdo; P2 significa falha funcional ou de robustez relevante. A classificação considera o uso local e acadêmico observado, sem presumir exposição pública ou acesso irrestrito ao sistema operacional.

> **Situação após a auditoria:** foram aplicadas correções e adicionados testes para fórmulas, parsing de coordenadas e termodinâmica. Este documento registra os achados originais, não certifica a resolução integral de todos eles. A termodinâmica continua baseada em aproximações; detecção de pontos notáveis e integração numérica têm limitações em descontinuidades. Bundle, isolamento em Worker, divisão arquitetural e revalidação dos demais fluxos continuam pendentes.

## Verificações realizadas

| Verificação | Resultado |
| --- | --- |
| `npm run build` | Aprovado; avisos de tamanho e importação dinâmica ineficaz |
| `node node_modules/typescript/bin/tsc --strict --noEmit` | Aprovado |
| `npm audit --json` | Zero vulnerabilidades reportadas nas dependências JavaScript consultadas |
| `cargo check --locked --offline --manifest-path src-tauri/Cargo.toml` | Aprovado |
| Motores matemático e termodinâmico e parser | Reproduções executadas diretamente nos módulos, por Node/transpilação em memória |
| Renderizador | Chamada ao Plotly instrumentada para verificar a regressão |
| Interface web local | Confirmados o defeito de `abs(x)`, a restauração incorreta do histórico e a injeção na tabela |

Não foram localizados testes próprios, scripts de testes/lint ou configuração de CI entre os arquivos versionados. O resultado do `npm audit` não cobre dependências Rust nem erros de lógica próprios. O `cargo check` não substitui validar instaladores MSI/NSIS e comportamento da aplicação desktop; esses testes não foram realizados. A revisão de acessibilidade foi estrutural, sem certificação ou avaliação completa com leitor de tela. Não foram executados testes de exaustão de memória.

## Achados de alta prioridade

### A01 — P1 — Modos termodinâmicos incompatíveis para o mesmo estado

**Local:** `src/thermoEngine.ts:130–148`, `158–174`.

Os modos PV e TV usam a equação do gás ideal também para água líquida e misturas. A classificação de fase posterior não corrige o cálculo anterior.

Reprodução com água e massa de 1 kg:

1. PT com 101,325 kPa e 25 °C produz volume de 0,001 m³.
2. PV com essa mesma pressão e volume retorna **−272,930 °C**, classificado como líquido.
3. TV com 100 °C e 0,1 m³ retorna **1722,087 kPa e líquido**. Esse volume específico está entre os volumes de líquido e vapor saturados a 100 °C; corresponde a mistura a aproximadamente 101,42 kPa. [Referência NIST](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=906704).

**Melhoria:** adotar um modelo por regiões para água/vapor e resolver os pares de propriedades de modo consistente. A [formulação IAPWS-IF97](https://iapws.org/technical-guidance/release/IF97-Rev) é uma base apropriada. Até haver suporte, rejeitar explicitamente os estados que o modelo não resolve. Criar testes de ida e volta PT → PV/TV e comparação com referências.

### A02 — P1 — Entalpia e entropia de vaporização são usadas como propriedades do estado

**Local:** `src/thermoEngine.ts:112–120`, `147–148`, `173–174`.

Na entrada padrão de 101,325 kPa e 100 °C, o aplicativo retorna `h = 2257 kJ/kg` e `s = 6,049 kJ/(kg·K)`. As constantes utilizadas representam diferenças entre líquido e vapor (`hfg`/`sfg`), mas a UI apresenta propriedades do estado (`h`/`s`).

Como comparação, a tabela NIST a 100 °C fornece entalpia do vapor saturado próxima de 2675,6 kJ/kg e entropia de 7,3541 kJ/(kg·K). O ramo líquido utiliza outra referência, de modo que as fases são internamente inconsistentes. Na saturação, P e T também não determinam o título da mistura nem um único volume, h ou s. [Tabelas NIST](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=906704).

Outra reprodução: vapor a 200 °C recebe a mesma entropia em 100 kPa e 10 kPa; o ramo de vapor omite a dependência da pressão.

**Melhoria:** usar referência termodinâmica consistente, representar estados bifásicos e exigir título ou outra propriedade independente quando necessário. Não apresentar uma propriedade indeterminada como valor único.

### A03 — P1 — Integrais inválidas retornam números aparentemente válidos

**Local:** `src/mathEngine.ts:103–109`.

O integrador substitui resultados complexos, não finitos e exceções por zero. Reproduções:

| Expressão e intervalo | Resultado atual | Problema |
| --- | --- | --- |
| `sqrt(-1)`, de −1 a 1 | 0 | A expressão não é real em todo o intervalo |
| `unknown(x)`, de −1 a 1 | 0 | Função inexistente é tratada como contribuição nula |
| `1/x^2`, de −1 a 1 | 1917,0897446562583 | A integral imprópria diverge |
| `1/x`, de −1 a 1 | Aproximadamente 0 | Confunde cancelamento simétrico com integral imprópria convergente |

**Melhoria:** propagar erros de domínio, identificar intervalos não suportados, estimar erro e verificar convergência. Uma avaliação inválida não deve virar zero. O código usa Simpson 1/3; atualizar também o contexto que descreve soma de Riemann.

### A04 — P1 — Funções matemáticas válidas são sobrescritas por parâmetros

**Local:** `src/mathEngine.ts:55–82`; `src/main.ts:307–313`.

`extractParameters(['abs(x)'])` retorna `['abs']`. A UI cria o parâmetro `abs = 1`, que sobrescreve a função no escopo. O gráfico fica vazio porque as exceções de avaliação viram `NaN`. Também ocorre com `asin`, `log10`, `max` e `cosh`.

**Evidência:** reproduzido no motor e na interface; `abs(x)` gerou um slider chamado `abs`.

**Melhoria:** distinguir chamadas de função e variáveis no AST, reconhecer os símbolos nativos do math.js e informar quando nenhuma amostra real válida foi produzida.

### A05 — P1 — Importação e tabela podem inventar ou perder coordenadas

**Local:** `src/coordinateParser.ts:113–145`; `src/main.ts:1043–1045`, `1055–1056`.

O parser remove células vazias ou inválidas individualmente e desloca as restantes. A tabela filtra X, Y e Z separadamente, quebrando a associação entre valores da mesma linha.

Reproduções:

- `1;;3\n4;;6` vira 2D: `(1,3)` e `(4,6)`.
- `1;2\n3;4;5` perde o primeiro ponto sem aviso.
- Na tabela, `(1,bad,10)`, `(2,20,bad)`, `(3,30,30)` produzem `x=[1,2,3]`, `y=[20,30]`, `z=[10,30]`.
- `12foo;34\n5;6` aceita `12foo` como 12; `1e309;2\n3;4` aceita infinito.

**Melhoria:** validar cada linha integralmente, exigir dimensão consistente e números finitos, e mostrar a posição do erro. Manter pontos como objetos/tuplas até a etapa final de renderização.

### A06 — P1 — Exportações duplicadas e incompatíveis com o gráfico exibido

**Local:** `src/main.ts:93`, `108`, `185–199`, `1221`, `1235–1270`.

PNG e CSV possuem dois handlers para o mesmo clique. No CSV, as rotas implementam regras diferentes:

- A segunda rota escreve os caracteres literais `\\r\\n`, sem criar quebras de linha.
- Ignora os parâmetros atuais e sempre avalia as expressões como cartesianas.
- Pode exportar equações quando o modo ativo é coordenadas.
- A primeira rota de coordenadas lê apenas a tabela, mesmo quando o gráfico foi gerado pelo texto colado; pode exportar dados antigos ou informar ausência de dados.
- Cabeçalhos com expressões contendo vírgulas não são escapados, alterando a estrutura das colunas.

**Melhoria:** manter um único handler por ação e exportar o conjunto normalizado da última plotagem concluída. Escapar campos CSV e declarar claramente quais tipos de gráfico são suportados. Revogar URLs de Blob depois de utilizadas.

### A07 — P1 — Conteúdo de célula é interpretado como HTML executável

**Local:** `src/main.ts:675–685`, `740–753`; `src-tauri/tauri.conf.json:23`.

`createTableRow()` interpola o valor bruto de uma célula dentro de `innerHTML`. Ao reconstruir a tabela na troca 2D/3D, uma aspa pode encerrar o atributo e injetar elementos e eventos.

**Evidência:** numa aba local temporária, foi inserido um elemento de imagem com evento que apenas definia seu próprio texto alternativo como `AUDIT_EXECUTED`. Após trocar para 3D, o elemento existia no DOM e o marcador estava presente: execução JavaScript confirmada. Nenhum dado foi transmitido. O caminho comprovado exige inserir conteúdo na tabela; não foi demonstrada exploração remota ou acesso ao sistema operacional.

**Melhoria:** criar os inputs com APIs DOM e atribuir os valores por `.value`. Ativar uma CSP restritiva e compatível com o aplicativo como defesa adicional; atualmente está `null`. O Tauri documenta que essa proteção só é habilitada quando configurada. [CSP no Tauri](https://v2.tauri.app/security/csp/).

## Falhas funcionais e de robustez

### A08 — P2 — Falta validação física e numérica das entradas

**Local:** `src/main.ts:598–601`, `928–935`; `src/thermoEngine.ts:49`, `73`, `86–96`, `153–163`.

Pressão ou volume zero produzem infinito; massa negativa produz volume negativo; massa zero vira 1 kg silenciosamente. Temperatura de −300 °C no gás ideal produz volume negativo e entropia `NaN`. Água a 400 °C cai no ramo “saturado” porque `NaN` falha nas duas comparações de pressão.

Nos eixos, `parseFloat(valor) || padrão` troca zero por −10 ou 10. Assim, um domínio solicitado `[0,10]` é calculado como `[-10,10]`. Os limites HTML de passos não substituem validação no código.

**Melhoria:** distinguir campo vazio, número inválido e zero; exigir números finitos, condições físicas e domínio suportado. Validar limites e quantidade de amostras. Ocultar ou invalidar resultados anteriores quando um novo cálculo falhar.

### A09 — P2 — Paramétricas têm parsing inconsistente

**Local:** `src/mathEngine.ts:61–71`, `224–225`, `244`.

`(a*cos(t), b*sin(t))` não gera os parâmetros `a` e `b`, porque a extração tenta interpretar a tupla antes de convertê-la. `(log(x, 10))` é classificada como paramétrica pela vírgula interna. Espaços externos em ` (cos(t), sin(t)) ` também causam erro porque classificação e avaliação normalizam a entrada de formas diferentes.

**Melhoria:** normalizar e interpretar a expressão uma única vez; separar componentes por vírgulas de nível superior e reutilizar a representação em todos os recursos.

### A10 — P2 — Análise detecta pontos e interseções inexistentes

**Local:** `src/mathEngine.ts:318–344`, `395–417`; `src/main.ts:1003–1004`.

No domínio padrão, `0.01/x` recebe raiz e extremos falsos junto à assíntota; `1/x` e `0` recebem uma interseção perto de `(0,0)`. O limiar absoluto de salto 100 não verifica continuidade.

Além disso, todas as curvas são enviadas para um algoritmo que presume a mesma grade X. As paramétricas `(t,0)` e `(2*t,t-1)` produzem interseção `(1,0)`, embora a interseção geométrica seja `(2,0)`.

**Melhoria:** refinar e validar candidatos contra as expressões e descontinuidades. Restringir o algoritmo atual a cartesianas com grades iguais e tratar os demais tipos com algoritmo geométrico próprio.

### A11 — P2 — Regressão calculada não aparece no gráfico

**Local:** `src/plotRenderer.ts:241–252`, `282`; `src/mathEngine.ts:365–369`.

O renderizador monta `traces` com os pontos e a regressão, mas passa apenas `[trace]` ao Plotly. A reprodução instrumentada forneceu uma regressão perfeita e confirmou somente um trace recebido.

O cálculo também sofre cancelamento numérico: X `[1000000000,1000000001,1000000002]` e Y `[1,2,3]` retornam `null`, apesar de definirem uma reta perfeita.

**Melhoria:** renderizar a lista completa e calcular variância/covariância com dados centralizados e tolerância relativa.

### A12 — P2 — Histórico não restaura sessões corretamente

**Local:** `src/main.ts:879–912`, `1020`, `1080`, `1139`.

Múltiplas equações são salvas como texto concatenado por vírgulas e restauradas como uma única expressão. Pela interface, plotar `x` e `x^2` e restaurar o histórico gerou `Unexpected operator , (char 2)`.

Coordenadas são salvas apenas como um rótulo, por exemplo `[5 pontos 2D]`, que depois é restaurado como função. Parâmetros, domínio, cores e dados não são armazenados; o histórico existe apenas em memória.

**Melhoria:** armazenar entradas tipadas por modo, com arrays de equações/pontos e configuração necessária para reproduzir a plotagem. Persistência local e arquivo de projeto podem vir depois de corrigir o formato.

### A13 — P2 — Estado mantido no DOM causa perda de dados e edição incorreta

**Local:** `src/main.ts:387–413`, `509–536`, `740–774`, `1199–1211`.

Trocar 3D → 2D → 3D remove os valores Z, porque só os campos atualmente presentes são lidos. A barra matemática localiza a equação pelo texto anterior, não pelo ID: duas equações iguais ou vazias podem atualizar a primeira enquanto o usuário edita a segunda. Ao reconstruir a lista, `activeEquationInput` pode continuar apontando para um elemento removido.

**Melhoria:** manter dados e seleção num estado explícito com IDs estáveis; usar o DOM apenas para exibir/editar esse estado. Preservar Z ao alternar a visualização.

### A14 — P2 — Parte dos controles não corresponde ao comportamento disponível

**Local:** `index.html:403–405`; `src/main.ts:551–570`, `928–935`, `963`, `1150–1157`.

Os campos Z mínimo/máximo nunca são lidos. Os controles log X/Y permanecem visíveis no 3D, mas não são aplicados ao renderizador 3D. O limite Y não é enviado como intervalo de visualização no modo função 2D.

No modo termodinâmico, o botão global “Plotar Gráfico” continua disponível e cai no fluxo de coordenadas. São comportamentos confirmados por inspeção do fluxo de dados.

**Melhoria:** distinguir domínio de amostragem e limites visuais, aplicar os valores ou ocultar recursos incompatíveis. Fazer o despacho de ações cobrir explicitamente os três modos.

### A15 — P2 — Convenções numéricas PT-BR são inconsistentes

**Local:** `src/coordinateParser.ts:39–45`, `68–75`; `src/main.ts:1043–1056`.

`1,5;2,5` funciona na colagem, mas `1,5` na tabela vira 1. A entrada `1,5 2,5\n3,5 4,5` é interpretada como coordenadas 3D, e `1.234,56;2.345,67` vira `(1.234,2.345)`.

**Melhoria:** usar o mesmo parser numérico na tabela e na colagem, com convenções explícitas para decimal e milhar. Oferecer seleção de delimitador/localidade quando a detecção for ambígua e mostrar uma prévia antes da importação.

## Melhorias de desempenho e manutenção

- **CSV quadrático:** `src/main.ts:224–230` recalcula uma malha inteira para cada linha. Com 200 passos foram observadas 200 chamadas ao avaliador, equivalentes a 40 mil avaliações por equação; com mil passos, seriam um milhão. Reutilizar dados já calculados reduz o trabalho e mantém a exportação fiel ao gráfico.
- **Bundle inicial:** o build gerou JS de 4749,57 kB, ou 1438,64 kB gzip. O import dinâmico de Plotly é ineficaz porque o mesmo módulo já é importado estaticamente. Avaliar carregamento por recurso e distribuição Plotly contendo apenas os tipos necessários, medindo a melhora antes de adicionar complexidade.
- **Responsividade durante cálculo:** avaliações são síncronas, sem cancelamento ou limite de complexidade das expressões. A documentação do math.js recomenda isolar avaliações pesadas em Worker e interrompê-las quando necessário. Aplicar também limites de amostras e quantidade de curvas. [Segurança e estabilidade do math.js](https://mathjs.org/docs/expressions/security.html).
- **Atualização do gráfico:** alterações de parâmetros/estilo recriam o gráfico com `newPlot`. Avaliar atualização incremental e preservação de zoom/câmera. O slider também é reconstruído durante seu próprio evento; preservar controles estáveis e agrupar atualizações por frame.
- **Organização:** separar de `main.ts` o estado, histórico, exportação e controladores de cada modo. O arquivo tem 1320 linhas e já acumula handlers duplicados de download e análise. A separação atual dos motores é uma boa base; não é necessário trocar de framework para resolver isso.
- **Tipagem:** `strict` não está habilitado no `tsconfig.json`, embora a verificação adicional com essa opção tenha passado. Ativá-lo como proteção contínua e substituir `any`/supressões conforme os módulos forem revisados.
- **Acessibilidade:** accordions são `div` com clique, sem interação equivalente por teclado ou `aria-expanded`; inputs e toggles têm rótulos visuais sem associação programática; erros não usam região de anúncio. Usar elementos semânticos, nomes acessíveis e testes de teclado. Rever também o espaço para a aba Termodinâmica, que apareceu cortada na captura da interface.
- **Reprodutibilidade e documentação:** README exige Node 16, mas o Vite instalado declara `^20.19.0 || >=22.12.0`. Definir versão/`engines`, usar `npm ci` em CI e documentar Rust e C++ Build Tools. Alinhar versão npm `0.0.0` com Tauri/Cargo `0.1.0`, corrigir favicon `/vite.svg` e metadados genéricos do Cargo. Hospedar fontes localmente melhora a experiência offline.

## Ordem de implementação recomendada

1. Corrigir A07 e a integridade de importação/exportação (A05/A06), protegendo dados e eliminando a execução de HTML.
2. Corrigir ou restringir termodinâmica, integrais e extração de parâmetros (A01–A04/A08), com testes de referência numérica.
3. Corrigir regressão, análise, histórico e estado da interface (A09–A15), com testes de fluxo reproduzindo os casos acima.
4. Consolidar arquitetura e validações, adicionar CI e reduzir custo de atualização/bundle com medições.

Critérios úteis para a primeira suíte: nenhum valor inválido deve virar zero silenciosamente; importar/exportar deve preservar pontos e parâmetros; um clique deve provocar uma única exportação; histórico deve restaurar a mesma sessão; conteúdo de célula deve permanecer texto; resultados termodinâmicos devem respeitar domínio e referências publicadas.
