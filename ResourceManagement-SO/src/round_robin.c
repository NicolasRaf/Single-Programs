#include <stdio.h>

#define MAX_PROCESSES 10

void round_robin(int processes[], int burst_times[], int num_processes, int quantum) {
    int remaining_time[MAX_PROCESSES]; 
    int waiting_time[MAX_PROCESSES] = {0}; 
    int turnaround_time[MAX_PROCESSES] = {0}; 
    int time = 0;  
    int done = 0;  

    // Inicializa os tempos restantes
    for (int i = 0; i < num_processes; i++) {
        remaining_time[i] = burst_times[i];
    }

    printf("Inicializando a execução dos processos...\n");
    printf("Processos: ");
    for (int i = 0; i < num_processes; i++) {
        printf("P%d(%d) ", processes[i], burst_times[i]);
    }
    printf("\n\n");

    // Executa enquanto houver processos inacabados
    while (done < num_processes) {
        printf("+------------------------+\n");
        printf("| Tempo Atual: %2d       |\n", time);
        printf("+------------------------+\n");

        for (int i = 0; i < num_processes; i++) {
            if (remaining_time[i] > 0) { 
                printf("Tempo %d: Processo %d com %d unidades restantes\n", time, processes[i], remaining_time[i]);

                int execution_time;  // Tempo que o processo realmente vai executar

                if (remaining_time[i] > quantum) {
                    execution_time = quantum;
                    printf("Processo %d executando por %d unidades de tempo\n", processes[i], execution_time);
                } else {
                    execution_time = remaining_time[i];
                    printf("Tempo %d: Processo %d finalizou com %d unidades restantes\n", time, processes[i], execution_time);
                    done++;
                    turnaround_time[i] = time + execution_time; // Tempo total de execução do processo
                    printf("Processo %d concluído.\n", processes[i]);
                }

                time += execution_time;  // Avança o tempo
                remaining_time[i] -= execution_time; 

                // Atualiza tempo de espera dos outros processos
                for (int j = 0; j < num_processes; j++) {
                    if (j != i && remaining_time[j] > 0) {
                        waiting_time[j] += execution_time;  // Agora somamos o tempo real de execução
                    }
                }

                // Exibe status dos processos em forma de tabela
                printf("\nEstado Atual dos Processos:\n");
                printf("+------------+----------------+----------------+\n");
                printf("| Processo   | Tempo Restante | Tempo Espera   |\n");
                printf("+------------+----------------+----------------+\n");
                for (int k = 0; k < num_processes; k++) {
                    printf("| P%-10d| %-14d | %-14d |\n", processes[k], remaining_time[k], waiting_time[k]);
                }
                printf("+------------+----------------+----------------+\n\n");

                // Espera pela entrada do usuário para continuar o próximo ciclo
                printf("Pressione Enter para continuar...\n");
                getchar();
            }
        }
    }

    // Exibir tempos finais
    printf("\n\nResumo Final:\n");
    printf("+------------+----------------+----------------+\n");
    printf("| Processo   |   Tempo Total  | Tempo Espera   |\n");
    printf("+------------+----------------+----------------+\n");
    for (int i = 0; i < num_processes; i++) {
        printf("| P%-10d| %-14d | %-14d |\n", processes[i], turnaround_time[i], waiting_time[i]);
    }
    printf("+------------+----------------+----------------+\n");

    printf("\nTodos os processos foram finalizados!\n");
}

int main() {
    int processes[] = {1, 2, 3, 4};
    int burst_times[] = {10, 5, 8, 12};
    int num_processes = sizeof(processes) / sizeof(processes[0]); 
    int quantum = 4;

    round_robin(processes, burst_times, num_processes, quantum);

    return 0;
}
