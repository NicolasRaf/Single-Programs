# Trabalho de Gerenciamento de Processos e Recursos - SO

Este repositório contém três implementações em C relacionadas ao gerenciamento de processos e alocação de recursos:

1. **banker.c** - Implementa o algoritmo do banqueiro para verificar se um sistema está em estado seguro.
2. **bankerWithInput.c** - Variante do algoritmo do banqueiro que permite ao usuário escolher processos para execução.
3. **round_robin.c** - Implementa o algoritmo de escalonamento de processos Round Robin.

## 1. Algoritmo do Banqueiro [**banker.c**](https://github.com/NicolasRaf/Single-Programs/blob/main/ResourceManagement-SO/src/banker.c)

Este algoritmo verifica se o sistema está em um estado seguro, garantindo que os processos possam ser executados sem risco de deadlock.

- Define processos e recursos.
- Verifica se um processo pode ser atendido com os recursos disponíveis.
- Atualiza os recursos disponíveis ao liberar os recursos dos processos finalizados.
- Se todos os processos forem atendidos, o sistema está seguro.

## 2. Algoritmo do Banqueiro com Entrada do Usuário [**bankerWithInput.c**](https://github.com/NicolasRaf/Single-Programs/blob/main/ResourceManagement-SO/src/bankerWithInput.c)

Esta variante do algoritmo do banqueiro permite que o usuário escolha qual processo será executado.

- O usuário escolhe um processo para execução.
- O algoritmo verifica se o processo pode ser atendido com os recursos disponíveis.
- Se puder ser executado, os recursos são liberados.
- Caso contrário, um aviso é exibido e o sistema pode estar em risco de deadlock.

## 3. Algoritmo de Escalonamento Round Robin [**round_robin.c**](https://github.com/NicolasRaf/Single-Programs/blob/main/ResourceManagement-SO/src/round_robin.c)

O algoritmo Round Robin gerencia a execução de processos com um quantum de tempo fixo, garantindo que todos os processos recebam tempo de CPU de maneira justa.

- Cada processo recebe um tempo de execução (quantum).
- Se o processo não terminar dentro do quantum, ele retorna para a fila e aguarda a próxima execução.
- O tempo de espera e o tempo de retorno dos processos são calculados e exibidos ao final.
- O programa aguarda entrada do usuário para continuar entre cada passo, facilitando a análise do funcionamento do algoritmo.

## Desenvolvedores

- [João Victor](https://github.com/victordev018)
- [Nicolas Rafael](https://github.com/NicolasRaf)
- [Xamã Cardoso](https://github.com/Xamacardoso)
