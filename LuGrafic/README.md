# LuGrafic

LuGrafic é um visualizador matemático multiplataforma projetado para uso acadêmico e profissional, permitindo o estudo e a representação de funções e pontos de coordenadas em ambientes 2D e 3D. 

O projeto foi construído utilizando tecnologias web modernas para entregar uma interface fluida, responsiva e ferramentas focadas em produtividade.

## Recursos Principais

- **Visualização Bidimensional e Tridimensional**: Renderização em tempo real de curvas f(x) e superfícies f(x,y).
- **Múltiplas Funções Simultâneas**: Capacidade de inserir diversas equações simultaneamente com paleta de cores automática para identificação visual.
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

- Node.js (versão 16 ou superior)
- Navegador Web moderno

## Instalação e Execução Local

Siga os passos abaixo para configurar e rodar a aplicação em seu ambiente local de desenvolvimento.

1. Clone o repositório ou baixe o código fonte:
   ```bash
   git clone <url-do-repositorio>
   cd LuGrafic
   ```

2. Instale as dependências do projeto através do Node Package Manager:
   ```bash
   npm install
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

Os arquivos resultantes serão depositados no diretório `dist`, prontos para serem servidos por qualquer servidor HTTP estático.

## Licença

Este software é provido com restrições e diretrizes estabelecidas pelos seus criadores. Verifique o arquivo correspondente no diretório, se aplicável, para orientações formais de uso e modificação.
