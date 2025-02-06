#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_PROCESSOS 100  // Define um valor fixo para o número máximo de processos

typedef struct {
    char nome[10];
    int ingresso;
    int duracao;
    int tempo_restante;
    int tempo_finalizacao;
    int tempo_espera;
    int tempo_executado;
} Processo;

int comparar_ingresso(const void *a, const void *b) {
    return ((Processo *)a)->ingresso - ((Processo *)b)->ingresso;
}

void round_robin(Processo processos[], int n, int quantum, int troca_contexto) {
    int tempo_atual = 0, completados = 0;
    int tempos_vida[n], tempos_espera[n];
    Processo *fila[MAX_PROCESSOS];
    int frente = 0, tras = 0;

    qsort(processos, n, sizeof(Processo), comparar_ingresso);

    for (int i = 0; i < n; i++) {
        processos[i].tempo_restante = processos[i].duracao;
        processos[i].tempo_executado = 0;
    }

    int indice_prox = 0;
    while (completados < n) {
        while (indice_prox < n && processos[indice_prox].ingresso <= tempo_atual) {
            fila[tras++] = &processos[indice_prox++];
        }

        if (frente < tras) {
            Processo *proc = fila[frente++];
            int exec_time = (proc->tempo_restante < quantum) ? proc->tempo_restante : quantum;
            proc->tempo_restante -= exec_time;
            proc->tempo_executado += exec_time;
            tempo_atual += exec_time;

            while (indice_prox < n && processos[indice_prox].ingresso <= tempo_atual) {
                fila[tras++] = &processos[indice_prox++];
            }

            if (proc->tempo_restante > 0) {
                fila[tras++] = proc;
            } else {
                proc->tempo_finalizacao = tempo_atual;
                tempos_vida[completados] = proc->tempo_finalizacao - proc->ingresso;
                tempos_espera[completados] = tempos_vida[completados] - proc->duracao;
                completados++;
            }

            tempo_atual += troca_contexto;
        } else {
            tempo_atual++;
        }
    }

    double tm_vida = 0, tm_espera = 0;
    for (int i = 0; i < n; i++) {
        tm_vida += tempos_vida[i];
        tm_espera += tempos_espera[i];
    }
    tm_vida /= n;
    tm_espera /= n;

    // Exibe os resultados
    printf("Resumo Final:\n");
    printf("+------------+----------------+----------------+\n");
    printf("| Processo   |   Tempo Total  | Tempo Espera   |\n");
    printf("+------------+----------------+----------------+\n");
    for (int i = 0; i < n; i++) {
        printf("| %-10s| %-14d | %-14d |\n", processos[i].nome, tempos_vida[i], tempos_espera[i]);
    }
    printf("+------------+----------------+----------------+\n");

    printf("\nTempo médio de vida: %.2f\n", tm_vida);
    printf("Tempo médio de espera: %.2f\n", tm_espera);
}

int main() {
    Processo processos[] = {
        {"T1", 5, 10, 0, 0, 0, 0},
        {"T2", 15, 30, 0, 0, 0, 0},
        {"T3", 10, 20, 0, 0, 0, 0},
        {"T4",  0, 40, 0, 0, 0, 0}
    };

    int n = sizeof(processos) / sizeof(processos[0]);
    int quantum = 15, troca_contexto = 4;

    round_robin(processos, n, quantum, troca_contexto);
    return 0;
}
