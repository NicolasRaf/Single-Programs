import tkinter as tk
from tkinter import messagebox
import threading
import sys
import subprocess

# Tenta importar pynput, se não conseguir, instala automaticamente
try:
    from pynput import keyboard
except ImportError:
    print("Instalando a biblioteca pynput necessária...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pynput"])
    from pynput import keyboard

class KeyboardLockerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Bloqueador de Teclado")
        self.root.geometry("350x200")
        self.root.configure(bg="#2c3e50")
        self.root.resizable(False, False)
        
        # Mantém a janela sempre no topo (opcional, mas útil)
        self.root.attributes("-topmost", True)
        
        self.is_locked = False
        self.listener = None
        
        self.status_label = tk.Label(
            root, 
            text="Teclado: DESBLOQUEADO", 
            fg="#2ecc71", 
            bg="#2c3e50", 
            font=("Segoe UI", 14, "bold")
        )
        self.status_label.pack(pady=25)
        
        self.toggle_button = tk.Button(
            root, 
            text="Bloquear Teclado", 
            command=self.toggle_lock, 
            bg="#e74c3c", 
            fg="white", 
            font=("Segoe UI", 14, "bold"), 
            width=18, 
            height=2,
            relief=tk.FLAT,
            cursor="hand2"
        )
        self.toggle_button.pack(pady=10)
        
        # Garante que ao fechar a janela, o teclado seja desbloqueado
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def toggle_lock(self):
        if not self.is_locked:
            # Bloquear
            self.start_listener()
            self.is_locked = True
            self.status_label.config(text="Teclado: BLOQUEADO", fg="#e74c3c")
            self.toggle_button.config(text="Desbloquear Teclado", bg="#2ecc71")
        else:
            # Desbloquear
            self.stop_listener()
            self.is_locked = False
            self.status_label.config(text="Teclado: DESBLOQUEADO", fg="#2ecc71")
            self.toggle_button.config(text="Bloquear Teclado", bg="#e74c3c")

    def start_listener(self):
        # Cria um listener que suprime (bloqueia) todos os eventos de teclado
        def on_press(key):
            pass # Não faz nada, apenas ignora
            
        def on_release(key):
            pass # Não faz nada, apenas ignora
            
        self.listener = keyboard.Listener(on_press=on_press, on_release=on_release, suppress=True)
        self.listener.start()

    def stop_listener(self):
        if self.listener is not None:
            self.listener.stop()
            self.listener = None

    def on_closing(self):
        # Desbloqueia o teclado caso a janela seja fechada com ele bloqueado
        self.stop_listener()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = KeyboardLockerApp(root)
    root.mainloop()
