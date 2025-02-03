#include <stdio.h>

#define MAX_PROCESSES 10

void round_robin(int processes[], int burst_times[], int num_processes, int quantum) {
    int remaining_time[MAX_PROCESSES]; // Vetor para armazenar tempos restantes dos processos
    int time = 0; // Tempo total do sistema
    int done = 0; // Contador de processos concluídos

    // Inicializa os tempos restantes
    for (int i = 0; i < num_processes; i++) {
        remaining_time[i] = burst_times[i];
    }

    // Executa enquanto houver processos inacabados
    while (done < num_processes) {
        for (int i = 0; i < num_processes; i++) {
            if (remaining_time[i] > 0) { 
                if (remaining_time[i] > quantum) {
                    printf("Tempo %d: Processo %d executando por %d unidades de tempo\n", time, processes[i], quantum);
                    time += quantum;
                    remaining_time[i] -= quantum; // Reduz o tempo restante
                } else {
                    printf("Tempo %d: Processo %d finalizou\n", time, processes[i]);
                    time += remaining_time[i];
                    remaining_time[i] = 0; // Marca como concluído
                    done++;
                }
            }
        }
    }
}

int main() {
    int processes[] = {1, 2, 3, 4};
    int burst_times[] = {10, 5, 8, 12};
    int num_processes = sizeof(processes) / sizeof(processes[0]); // Número de processos
    int quantum = 4;

    round_robin(processes, burst_times, num_processes, quantum);

    return 0;
}
