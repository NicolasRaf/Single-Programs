# LuGrafic 0.3.1

## Download e atualização

- **Windows x64:** baixe o arquivo `.exe` (instalador recomendado) ou `.msi` na seção de arquivos da release. Use apenas um dos instaladores.
- Não é necessário instalar Node.js ou Rust para usar o aplicativo.
- Requer Microsoft Edge WebView2; o setup pode precisar de internet para instalar esse componente.
- Atualização manual pelo novo instalador. Não há atualização automática configurada.
- Os instaladores não possuem assinatura digital comercial; o Windows pode informar editor desconhecido.

## Novidades

- Fix: Unificação e atualização dos ícones da aplicação em todas as resoluções e janelas (v0.3.1).
- Área de Termodinâmica redesenhada e integrada ao padrão visual dos gráficos.
- Entradas por pressão e entalpia, pressão e entropia e pressão e volume específico.
- Diagrama T–s interativo com indicação visual do estado e da fase.
- Derivada simbólica e integral definida disponíveis nos gráficos cartesianos 2D.
- Fórmulas explícitas com sinal de igualdade, como `y = x^2`, `f(x) = sin(x)` e `z = sin(x)*cos(y)`.
- Histórico de gráficos persistente entre sessões, com restauração por mouse ou teclado.
- Script local `npm run setup:windows` para testar, gerar instaladores novos e excluir versões antigas após sucesso.
- Workflow do GitHub Actions para publicar automaticamente os instaladores Windows em tags `lugrafic-v*`.

## Correções e melhorias

- Melhor validação de coordenadas, fórmulas, limites dos eixos e entradas físicas.
- Resultados termodinâmicos antigos são removidos ao alterar as entradas.
- Plotagens consecutivas são serializadas para evitar atualizações fora de ordem.
- Mais contraste, tipografia maior, responsividade e acessibilidade nos controles.
- Exportações CSV preservam os dados efetivamente plotados.
- TypeScript em modo estrito e CSP configurada para a aplicação desktop.

## Limitações conhecidas

- A termodinâmica usa modelos aproximados para fins didáticos, não uma implementação certificada da IAPWS-IF97.
- Integral e derivada são suportadas apenas em funções cartesianas 2D.
- Equações implícitas gerais, como `x^2 + y^2 = 1`, ainda não são suportadas.
- O bundle inicial permanece grande devido ao Plotly e ao math.js.

## Validação

- 20 testes automatizados aprovados.
- Build TypeScript/Vite em modo estrito aprovado.
- Verificação Rust/Tauri aprovada.
- Auditoria npm sem vulnerabilidades conhecidas.
- Fluxos principais validados no navegador.
