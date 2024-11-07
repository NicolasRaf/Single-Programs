# Multithreads test (Nicolas Rafael) #

import threading;
import time;
import random;
import os;

# Print random jokes of database
def jokeGenerator(stopEvent):
    
    # Database of jokes
    jokesBase = [
        "Por que o computador foi ao médico? Porque estava com vírus! ",
        "Como o programador faz café? Compila a água e debugua o açúcar! ",
        "O que o servidor disse para o outro servidor? Nosso relacionamento não está mais sincronizado... ",
        "Por que o programador odiava o mar? Porque sempre que ele ia até a praia, ele encontrava bugs na areia! ",
        "O que um disco rígido disse ao outro? Você não tem partições na vida! ",
        "Por que o JavaScript não consegue contar até 10? Porque ele faz tudo de forma assíncrona! ",
        "Qual é o cúmulo do programador? Desistir de usar o botão 'Start' do Windows! ",
        "O que é um programador sem seu computador? Nada... literalmente! ",
        "Por que o programador levou uma lâmpada para o trabalho? Porque ele ouviu que precisava iluminar a ideia! ",
        "Quantos programadores são necessários para trocar uma lâmpada? Nenhum, é um problema de hardware! ",
        "Como os desenvolvedores comemoram o Natal? Eles fazem um merge no repositório e dão pull requests! "
    ];
    
    while not stopEvent.is_set():  # Verify if the event is set
        
        # Print the joke based on the index
        jokeIndex = random.randint(0, 9);
        print(jokesBase[jokeIndex]);
        
        time.sleep(3); 
    
    print("Thread de piadas finalizada.");
    return;

# Print the time remaing of progam execute
def finisheProgam(stopEvent):
    os.system('cls' if os.name == 'nt' else 'clear'); # Clear terminal in the first entring
    seconds = 60;

    while seconds > 0:
        print(f"O programa será finalizado em {seconds} segundos.");
        print("=" * 60);
        
        # Incress the seconds
        seconds -= 15;
        time.sleep(15);
        
        os.system('cls' if os.name == 'nt' else 'clear'); # Clear terminal
    
    stopEvent.set()  # Define the stop event and stop the others threads     
    print("Thread de finalização de tempo finalizada.");
    return;


# Generates 2 numbers and prints the result of their sum every 3 seconds
def sumValues(stopEvent):
    
    while not stopEvent.is_set():  # Enquanto a flag de parada não for ativada
        num1 = random.randint(1, 6);
        num2 = random.randint(1, 6);
        print(f"Soma dos números {num1} e {num2} --> {num1 + num2}");
        print("=" * 60);
        time.sleep(3.1); # Espera 3 segundos antes de imprimir a próxima soma
    
    print("Thread de soma finalizada.");
    time.sleep(1);
    return;
    
def main():
    stopEvent = threading.Event();
    
    # Creat threads and set the functions and your parameters
    jokeThread = threading.Thread(target=jokeGenerator, args=(stopEvent,));
    finisheThread = threading.Thread(target=finisheProgam, args=(stopEvent,));
    sumThread = threading.Thread(target=sumValues, args=(stopEvent,));
    
    # Start Threads
    jokeThread.start();
    finisheThread.start();
    sumThread.start();
    time.sleep(60);  
    
    # Set the flag to stop the threads
    stopEvent.set(); 

    # Wait the threads is finished
    jokeThread.join();   
    finisheThread.join();
    sumThread.join();  

    print("Programa finalizado.");

# Inicia o programa
if __name__ == "__main__":
    main();
