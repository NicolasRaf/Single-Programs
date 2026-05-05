@echo off
chcp 65001 >nul
color 0A
echo ===================================================
echo   Instalador do Bloqueador de Teclado
echo ===================================================
echo.

:: Verifica se o Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O Python nao esta instalado neste computador!
    echo Por favor, peca para a pessoa instalar o Python antes.
    echo Lembre-se de avisar para marcar a opcao "Add Python to PATH" durante a instalacao.
    echo.
    pause
    exit /b
)

:: Instala a biblioteca pynput caso não tenha
echo [1/4] Instalando dependencias do teclado (pynput)...
python -m pip install pynput >nul 2>&1

:: Cria o diretorio seguro no AppData do usuario
echo [2/4] Preparando pastas do sistema...
set "APP_DIR=%LOCALAPPDATA%\BloqueadorTeclado"
if not exist "%APP_DIR%" mkdir "%APP_DIR%"

:: Copia o arquivo python principal para a nova pasta
copy /Y "bloqueador_teclado.py" "%APP_DIR%\bloqueador_teclado.py" >nul

:: Encontra o executável pythonw
for /f "delims=" %%I in ('python -c "import sys, os; p=os.path.join(os.path.dirname(sys.executable), 'pythonw.exe'); print(p if os.path.exists(p) else 'pythonw.exe')"') do set "PYTHONW_PATH=%%I"

:: Cria o atalho .bat (que vai ser usado no terminal e Win+R)
echo @echo off > "%APP_DIR%\bloqueador.bat"
echo start "" "%PYTHONW_PATH%" "%APP_DIR%\bloqueador_teclado.py" >> "%APP_DIR%\bloqueador.bat"

:: Cria o atalho no Menu Iniciar usando PowerShell
echo [3/4] Criando atalho no Menu Iniciar...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Bloqueador de Teclado.lnk'); $Shortcut.TargetPath = '%PYTHONW_PATH%'; $Shortcut.Arguments = '\"%APP_DIR%\bloqueador_teclado.py\"'; $Shortcut.WindowStyle = 1; $Shortcut.Save()"

:: Adiciona no PATH do usuário para funcionar no Terminal e registra no Win+R
echo [4/4] Configurando comandos (Win+R e Terminal)...
powershell -Command "$path = [Environment]::GetEnvironmentVariable('PATH', 'User'); $target = '%APP_DIR%'; if ($path -notmatch [regex]::Escape($target)) { [Environment]::SetEnvironmentVariable('PATH', $path + ';' + $target, 'User') }"

:: Registra especificamente para o comando Windows + R
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\bloqueador.exe" /d "%APP_DIR%\bloqueador.bat" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\bloqueador" /d "%APP_DIR%\bloqueador.bat" /f >nul 2>&1

echo.
echo ===================================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo ===================================================
echo O computador desta pessoa agora possui:
echo - O app no Menu Iniciar ("Bloqueador de Teclado")
echo - O comando "bloqueador" no Windows + R
echo - O comando "bloqueador" no CMD/PowerShell
echo.
pause
