
import serial
import time
import random

def main():
    # Conectar à porta COM virtual (substitua 'COM4' pela porta que você configurou)
    arduino = serial.Serial('COM4', 9600)
    time.sleep(2)  # Espera a conexão estabilizar


    while True:
        # Simulando os valores que o Arduino enviaria
        slider = random.randint(-1000, 1000)  # Simula o valor do slider
        analogX = random.randint(0, 1023)      # Simula o valor do joystick X
        analogY = random.randint(0, 1023)      # Simula o valor do joystick Y
        powerButton = random.randint(0, 1)     # Simula o estado do botão de poder (0 ou 1)
        pauseButton = random.randint(0, 1)     # Simula o estado do botão de pausa (0 ou 1)
        interactButton = random.randint(0, 1)  # Simula o estado do botão de interação (0 ou 1)
        
        gravityRGB = max(0, min(255, 255 - (slider + 1000) // 8))  # Simula o valor RGB

        # Formata os dados como no seu código Arduino
        data = (f"sl:{analogX}")

        # Envia os dados pela porta serial
        arduino.write(data.encode())
        
        print(data)  # Exibe os dados simulados no console
        time.sleep(0.1)  # Aguarda 100 ms para simular o delay do Arduino

    # Fecha a conexão quando terminar (não será alcançado neste loop infinito)
    arduino.close() 

main()