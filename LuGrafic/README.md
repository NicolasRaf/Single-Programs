# LuGrafic

LuGrafic é um visualizador matemático multiplataforma projetado para uso acadêmico e profissional, permitindo o estudo e a representação de funções e pontos de coordenadas em ambientes 2D e 3D. 

O projeto foi construído utilizando tecnologias web modernas para entregar uma interface fluida, responsiva e ferramentas focadas em produtividade.

## Recursos Principais

- **Visualização Bidimensional e Tridimensional**: Renderização em tempo real de curvas f(x) e superfícies f(x,y).
- **Múltiplas Funções Simultâneas**: Capacidade de inserir diversas equações simultaneamente com paleta de cores automática para identificação visual.
- **Notação Flexível**: Aceita expressões diretas e fórmulas com igualdade, como `y = sin(x)`, `f(x) = x^2`, `r = 2 + sin(theta)` e `z = sin(x) * cos(y)`.
- **Teclado Matemático (Toolbar)**: Botões de atalho para inserção rápida de funções trigonométricas, exponenciais, raízes e constantes matemáticas no campo de edição.
- **Estilos de Gráfico Múltiplos**:
  - Para 2D: Linha contínua, nuvem de pontos, linha com pontos e área preenchida.
  - Para 3D: Superfície sólida, superfície com grade (wireframe) e nuvem de pontos.
- **Tabela de Coordenadas Iterativa**: Ambiente dedicado para plotagem de pontos absolutos (com suporte para importar dados via colar texto).
- **Exportação de Dados e Imagens**:
  - Download rápido de gráficos renderizados em imagens PNG de alta resolução.
  - Exportação das coordenadas avaliadas das funções 2D para arquivos CSV, permitindo análises aprofundadas em outros softwares.
- **Histórico e Interface Flexível**: Registro das últimas expressões plotadas para acesso rápido, atalhos de teclado implementados, modo noturno adaptado e layout que se ajusta a diferentes formatos de tela.

## Tecnologias Utilizadas

- **Frontend Core**: Vanilla TypeScript (TS) e HTML5.
- **Empacotador e Servidor**: Vite, para um ambiente de desenvolvimento rápido e construção otimizada.
- **Mecanismo de Renderização Matemática**: mathjs para análise e avaliação precisa e segura das equações matemáticas submetidas pelos usuários.
- **Mecanismo de Gráficos (Plotagem)**: Plotly.js, provendo o canvas interativo (pan, zoom contínuo) de alto desempenho em WebGL e SVG.
- **Design de Interface**: CSS Vanilla com sistema de variáveis, explorando uma estética escura com tons proeminentes de vermelho, roxo e azul, e elementos translúcidos (glassmorphism).

## Requisitos de Sistema

- Node.js 22.12 ou superior (para desenvolvimento e testes)
- Navegador Web moderno

## Instalação e Execução Local

Siga os passos abaixo para configurar e rodar a aplicação em seu ambiente local de desenvolvimento.

1. Clone o repositório ou baixe o código fonte:
   ```bash
   git clone https://github.com/NicolasRaf/Single-Programs.git
   cd Single-Programs/LuGrafic
   ```

2. Instale as dependências do projeto através do Node Package Manager:
   ```bash
   npm ci
   ```

3. Inicie o servidor local de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse a aplicação no endereço indicado pelo terminal (geralmente `http://localhost:5173`).

## Construção para Produção

Para gerar o pacote otimizado e estático para distribuição e publicação em ambientes de produção, execute:

```bash
npm run build
```

Para executar os testes dos motores matemático, de coordenadas e termodinâmico:

```bash
npm test
```

Os arquivos resultantes serão depositados no diretório `dist`, prontos para serem servidos por qualquer servidor HTTP estático.

## Instalador Windows

Baixe o setup `.exe` (NSIS) ou o pacote `.msi` em [Releases](https://github.com/NicolasRaf/Single-Programs/releases). Instale apenas um deles. O usuário final não precisa de Node.js ou Rust; o aplicativo utiliza o WebView2, cuja instalação pode exigir internet quando não estiver presente. Os pacotes não possuem assinatura digital comercial e podem exibir aviso de editor desconhecido no Windows.

Para gerar os instaladores localmente no Windows x64, instale Rust (toolchain MSVC), Visual Studio Build Tools com desenvolvimento C++ para desktop e WebView2. Execute:

```bash
npm ci
npm test
npm run tauri -- build
```

Saídas: `src-tauri/target/release/bundle/nsis/` e `src-tauri/target/release/bundle/msi/`. Mantenha as versões de `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json` alinhadas. A atualização nesta versão é manual, baixando e executando o novo instalador; não há atualizador automático configurado.

## Integral e derivada

Em funções cartesianas **2D**, use **∫** para integrar numericamente entre `a` e `b`, com área sombreada, e **f′** para exibir a derivada simbólica em relação a `x`, como curva tracejada. Os dois recursos podem ficar ativos simultaneamente. A expressão da derivada aparece abaixo da fórmula e seus pontos são incluídos na exportação CSV. Parâmetros, como `a` em `y = a*x^2`, são tratados como constantes na derivação.

Não são oferecidos para curvas polares, paramétricas ou superfícies 3D. A derivação depende das funções suportadas pelo mathjs e informa erro quando não for possível. A integral é uma aproximação numérica (não uma primitiva simbólica); não utilize para integrais impróprias ou intervalos com singularidades. A notação `=` aceita definições explícitas (`y = ...`, `f(x) = ...`, `r = ...`, `z = ...`), não equações implícitas gerais como `x^2 + y^2 = 1`.

## Licença

Este software é provido com restrições e diretrizes estabelecidas pelos seus criadores. Verifique o arquivo correspondente no diretório, se aplicável, para orientações formais de uso e modificação.
