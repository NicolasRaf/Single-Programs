// Process Status - Progama para mostra status de processos. (Nicolas Rafael)

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

void winCall(int pid, char *command) {
    system("cls");

    // Exibe informações gerais do processo usando tasklist (sem status específico)
    sprintf(command, "tasklist /fi \"PID eq %d\" /fo table", pid);
    system(command);

    // Formata o comando para utilizar o PowerShell e obter o status do processo pelo PID
    sprintf(command, "powershell -Command \"Get-Process -Id %d | Format-Table -Property Name,Id,@{Name='Status';Expression={if ($_.Responding -eq $True) {'Running'} else {'Not Responding'}}}\"", pid);

    // Executa o comando PowerShell e exibe o nome, PID e status do processo
    system(command);

    printf("Legendas:\n");
    printf(" - Running: O processo está sendo executado.\n");
    printf(" - Not Responding: O processo está em espera ou travado.\n\n");

    getchar(); // Limpar Buffer

    printf("Pressione Enter para continuar...");
    getchar(); // Espera a entrada do usuário
    system("cls");
}

void unixCall(int pid, char *command) {
    system("clear");

    // Comando para verificar o status no Unix/Linux
    sprintf(command, "ps -p %d -o comm=,pid=,state= | awk '{print \"COMMAND: \" $1, \"\\nPID: \" $2, \"\\nSTATE: \" $3}'", pid);
    system(command);

    printf("\nLegendas:\n");
    printf(" - R: Running\n");
    printf(" - S: Sleeping\n");
    printf(" - D: Uninterruptible Sleep\n");
    printf(" - T: Stopped\n");
    printf(" - Z: Zombie\n");
    printf(" - I: Idle\n");
    printf(" - <: High Priority\n");
    printf(" - N: Low Priority\n\n");

    getchar(); // Limpar Buffer

    printf("Pressione Enter para continuar...");
    getchar(); // Espera a entrada do usuário
    system("clear");
}


// Visualização do menu de opções
void showMenu(int *option) {
    puts("------------- Process Status -------------");
    puts(" 1 - Processo Atual");
    puts(" 2 - Informe o PID");
    puts(" 3 - Finalizar Programa");
    puts("-----------------------------------------");

    printf(">> ");
    scanf("%d", option);
}

void callCommand(int pid, char *command) {
    #if defined _WIN32 || _WIN64
        winCall(pid, command);
    #else
        unixCall(pid, command);
    #endif
}

int main() {
    int option; // Variavel que guarda a opção escolhida pelo usuário
    int pid; // PID do processo escolhido
    char command[300]; // "String" que conterá o comando com base no sistema

    showMenu(&option);

    while (option < 3) {
        if (option == 1) {
            pid = getpid(); // Obtém o PID do processo atual
            callCommand(pid, command);
        } else {
            printf("Informe o PID do processo: ");
            scanf("%d", &pid); // Obtém o PID pela entrada do usuario

            callCommand(pid, command);
        }

        showMenu(&option);
    }

    puts("Programa Finalizado...\n");
    return 0;
}
