# LuGrafic 0.2.0

## Download e atualização

- **Windows x64:** baixe `LuGrafic_0.2.0_x64-setup.exe` (instalador recomendado) ou `LuGrafic_0.2.0_x64_en-US.msi`. Use apenas um dos instaladores.
- Não é necessário instalar Node.js ou Rust para usar o aplicativo.
- Requer Microsoft Edge WebView2; o setup pode precisar de internet para instalar esse componente.
- Atualização manual pelo novo instalador. Não há atualização automática configurada.
- Instaladores sem assinatura digital comercial: o Windows pode informar editor desconhecido.

## Novidades e correções

- Derivada simbólica em relação a x, com botão **f′**, expressão exibida e curva tracejada. Os pontos da derivada também são exportados para CSV.
- Integral definida numérica pelo botão **∫**, com limites e área sombreada; pode ser usada simultaneamente com a derivada.
- Fórmulas explícitas com `=`, como `y = x^2`, `f(x) = sin(x)`, `r = 2` e `z = sin(x)*cos(y)`, além de normalização de símbolos matemáticos usuais.
- Correções na avaliação de curvas paramétricas, reconhecimento de parâmetros, importação de CSV/TSV, preservação de coordenadas Z ao alternar dimensões e exportação do gráfico renderizado.
- Melhorias na validação de entradas, acessibilidade, controles de fórmulas e estados termodinâmicos inválidos.
- Testes automatizados para os motores matemático, de coordenadas e termodinâmico.

## Escopo e limitações

- Integral e derivada disponíveis apenas para funções cartesianas 2D, não para polares, paramétricas ou superfícies 3D.
- `=` define funções explícitas; equações implícitas gerais, como `x^2 + y^2 = 1`, não são suportadas.
- A derivação depende das regras suportadas pelo mathjs. Integrais são aproximações numéricas, inadequadas para intervalos com singularidades ou integrais impróprias.
- Pontos notáveis e interseções são estimativas amostradas. A termodinâmica usa modelos aproximados para uso didático, não tabelas certificadas de propriedades.
- O bundle JavaScript continua grande; otimização e isolamento dos cálculos em Worker ficam para versões futuras.

## Validação

- Suíte de 17 testes, compilação TypeScript/Vite e verificação Rust.
- Verificação da interface no navegador, incluindo integral e derivada simultâneas, curva paramétrica e gráfico 3D, com a política CSP de produção.
- Geração dos pacotes NSIS e MSI para Windows x64. A instalação/atualização em uma máquina limpa não foi validada nesta rodada.
