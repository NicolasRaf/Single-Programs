#include <stdio.h>
#include <stdbool.h>

#define PROCESSOS 3 // Número de processos
#define RECURSOS 4 // Numero de recursos

// Função para verificar se o sistema está em estado seguro
bool isSafe(int processes[], int disponiveis[], int requisitados[][4], int alocados[][4], int processoEscolhido) {
            
            for (int j = 0; j < RECURSOS; j++){
                if (requisitados[processoEscolhido][j] > disponiveis[j]) {
                    return false; // Processo nao pode ser atendido
                }
            }

        

            printf("Processo %d finalizado. Atualizando recursos disponíveis...\n", processes[processoEscolhido]);
            for (int j = 0; j < RECURSOS; j++){
                disponiveis[j] += alocados[processoEscolhido][j];
            }

            printf("Recursos disponíveis: ");
            for (int i = 0; i < RECURSOS; i++){
                printf("%d ", disponiveis[i]);
            }
            puts("");

            

    // Se chegou até aqui, o sistema está seguro
    printf("O sistema está em estado seguro.\n");
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

    int processoEscolhido;

    for (int i = 0; i < PROCESSOS; i++) {
        printf("Qual processo deseja executar? ");
        scanf("%d", &processoEscolhido);

        if (!isSafe(processes, disponiveis, matrizRequisicao, matrizAlocados, processoEscolhido-1)) {
            printf("O processo escolhido não pode ser executado! O sistema não está em estado seguro!\n");
            break;
        }
    }


    return 0;
}