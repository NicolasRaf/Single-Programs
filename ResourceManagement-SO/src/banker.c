#include <stdio.h>
#include <stdbool.h>

#define PROCESSOS 3 // Número de processos
#define RECURSOS 4 // Numero de recursos

// Função para verificar se o sistema está em estado seguro
bool isSafe(int processes[], int disponiveis[], int requisitados[][4], int alocados[][4]) {
    
    bool finalizados[PROCESSOS] = {0,0,0}; // Vetor para marcar processos finalizados

    // Calcula o vetor necessarios
    int countFinalizados = 0; // Contador de processos que foram finalizados

    int sequence[PROCESSOS] = {0}; // Sequência segura

    while (countFinalizados < PROCESSOS) {
        bool found = false; // Variavel de controle que indica se um processo foi atendido
        bool canProcess = true;

        for (int i = 0; i < PROCESSOS; i++) {
            canProcess = true;
            // Se o processo ainda não foi finalizado
            if (!finalizados[i]){
                // Verifica se o processo pode ser atendido, se não puder por falta de algum recurso, ja passa pro proximo
                for (int j = 0; j < RECURSOS; j++){
                    if (requisitados[i][j] > disponiveis[j]) {
                        canProcess = false;
                        break; // Processo nao pode ser atendido
                    }
                }

            if (canProcess){
                found = true; // Processo pode ser atendido
                // Marca o processo como finalizado
                finalizados[i] = true;
                // Adiciona o processo na sequência segura
                sequence[countFinalizados++] = processes[i];

                // Atualiza os recursos disponíveis
                printf("Processo %d finalizado. Atualizando recursos disponíveis...\n", processes[i], i);
                for (int j = 0; j < RECURSOS; j++){
                    disponiveis[j] += alocados[i][j];
                    }

                printf("Recursos disponíveis: ");
                for (int i = 0; i < RECURSOS; i++){
                    printf("%d ", disponiveis[i]);
                }


                puts("");

                }
            }
        }

        if (!found) { // Se nenhum processo pode ser atendido, há risco de deadlock
            printf("O sistema não está em estado seguro!\n");
            return false;
        }
    }

    // Se chegou até aqui, o sistema está seguro
    printf("O sistema está em estado seguro.\n");
    printf("Sequência segura: ");
    for (int i = 0; i < PROCESSOS; i++)
        printf("%d ", sequence[i]);
    printf("\n");

    return true;
}

int main() {
    int processes[PROCESSOS] = {1, 2, 3};
    int disponiveis[] = {2,1,0,0}; // Recursos disponíveis
    
    // Recursos que ja foram alocados a cada processo
    int matrizAlocados[][4] = { 
        {0, 0, 1, 0},
        {2, 0, 0, 1},
        {0, 1, 2, 0}
    }; 

    // Recursos que podem ser alocados a cada processo
    int matrizRequisicao[][4] = {
        {2, 0, 0, 1},
        {1, 0, 1, 0}, 
        {2, 1, 0, 0}
    }; 

    isSafe(processes, disponiveis, matrizRequisicao, matrizAlocados);

    return 0;
}