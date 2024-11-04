using System;
using System.IO.Ports;

class Program
{
    static void Main()
    {
        string portName = "COM3"; // Porta onde você quer ler os dados
        int baudRate = 9600;

        SerialPort serialPort = new SerialPort(portName, baudRate);

        try
        {
            serialPort.Open();
            Console.WriteLine("Conectado à porta " + portName);

            while (true)
            {
                if (serialPort.BytesToRead > 0)
                {
                    string data = serialPort.ReadExisting();
                    Console.WriteLine("Dados recebidos: " + data);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Erro ao conectar: " + ex.Message);
        }
        finally
        {
            if (serialPort.IsOpen)
            {
                serialPort.Close();
                Console.WriteLine("Porta serial fechada.");
            }
        }
    }
}
