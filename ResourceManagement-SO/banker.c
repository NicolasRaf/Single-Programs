#include <stdio.h>
#include <stdbool.h>

#define PROCESSOS 5 // Número de processos

// Calcula quantos recursos cada processo precisa
void calcularNecessidade(int max[], int alocados[], int necessarios[]) {
    for (int i = 0; i < PROCESSOS; i++)
        necessarios[i] = max[i] - alocados[i];

}

// Função para verificar se o sistema está em estado seguro
bool isSafe(int processes[], int available, int max[], int alocados[]) {
    int necessarios[PROCESSOS];  // Vetor que armazena os recursos necessarios de cada processo
    bool finalizados[PROCESSOS] = {0}; // Vetor para marcar processos finalizados
    int safeSequence[PROCESSOS];  // Sequência segura
    int disp = available; // Recursos disponíveis atuais (valor de simulação)

    // Calcula o vetor necessarios
    calcularNecessidade(max, alocados, necessarios);
    int countFinalizados = 0; // Contador de processos que foram finalizados

    while (countFinalizados < PROCESSOS) {
        bool found = false; // Variavel de controle que indica se um processo foi atendido

        for (int i = 0; i < PROCESSOS; i++) {
            // Se o processo ainda não foi finalizado e há recursos suficientes
            if (!finalizados[i] && necessarios[i] <= disp) {
                disp += alocados[i]; // Libera os recursos usados pelo processo
                safeSequence[countFinalizados++] = processes[i]; // Adiciona à sequência segura
                finalizados[i] = true;
                found = true;
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
        printf("%d ", safeSequence[i]);
    printf("\n");

    return true;
}

int main() {
    int processes[PROCESSOS] = {0, 1, 2, 3, 4};
    int available = 3; // Recursos disponíveis
    int max[PROCESSOS] = {7, 3, 9, 2, 4}; // Máximo de recursos que cada processo pode precisar
    int alocados[PROCESSOS] = {0, 2, 3, 2, 0}; // Recursos que ja foram alocados a cada processo

    isSafe(processes, available, max, alocados);

    return 0;
}