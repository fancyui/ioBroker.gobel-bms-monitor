/* eslint-disable no-unused-vars */
/* global systemDictionary */
'use strict';

systemDictionary = {
  "Connection Settings": {
    "en": "Connection Settings",
    "zh-cn": "连接设置",
    "de": "Verbindungseinstellungen"
  },
  "Connection Type": {
    "en": "Connection Type",
    "zh-cn": "连接类型",
    "de": "Verbindungstyp"
  },
  "BMS Type": {
    "en": "BMS Type",
    "zh-cn": "BMS 类型",
    "de": "BMS-Typ"
  },
  "BMS Interface Port": {
    "en": "BMS Interface Port",
    "zh-cn": "BMS 接口端口",
    "de": "Batterie-Porttyp"
  },
  "Serial Port Path": {
    "en": "Serial Port Path",
    "zh-cn": "串口路径",
    "de": "BMS USB-/Serieller Port"
  },
  "Baud Rate": {
    "en": "Baud Rate",
    "zh-cn": "波特率",
    "de": "BMS Baudrate"
  },
  "IP Address": {
    "en": "IP Address",
    "zh-cn": "IP 地址",
    "de": "BMS IP-Adresse"
  },
  "IP Port": {
    "en": "IP Port",
    "zh-cn": "IP 端口",
    "de": "BMS IP-Port"
  },
  "BMS & Scan Options": {
    "en": "BMS & Scan Options",
    "zh-cn": "BMS 与扫描选项",
    "de": "BMS & Scan-Optionen"
  },
  "Data Refresh Interval (seconds)": {
    "en": "Data Refresh Interval (seconds)",
    "zh-cn": "数据刷新间隔 (秒)",
    "de": "Datenaktualisierungsintervall (Sekunden)"
  },
  "Max Parallel Packs Scanned": {
    "en": "Max Parallel Packs Scanned",
    "zh-cn": "允许的最大并联电池组数",
    "de": "Maximale parallele Packs"
  },
  "JK BMS Display Index Start": {
    "en": "JK BMS Display Index Start",
    "zh-cn": "JK BMS 显示索引开始方式",
    "de": "JKBMS Start-Anzeigeindex"
  },
  "Enable Debug Mode": {
    "en": "Enable Debug Mode",
    "zh-cn": "启用调试模式",
    "de": "Debug-Protokolle aktivieren"
  },
  "Python Path / Command": {
    "en": "Python Path / Command",
    "zh-cn": "Python 路径 / 命令",
    "de": "Python-Pfad / Befehl"
  },
  "Custom Python path (e.g. /usr/bin/python3 or python). Leave empty for default automatic resolution.": {
    "en": "Custom Python path (e.g. /usr/bin/python3 or python). Leave empty for default automatic resolution.",
    "zh-cn": "自定义 Python 路径或命令 (例如 /usr/bin/python3 或 python)。留空以使用默认的自动检测路径。",
    "de": "Benutzerdefinierter Python-Pfad oder -Befehl (z. B. /usr/bin/python3 oder python). Leer lassen, um die automatische Erkennung zu nutzen."
  },
  "Python Setup Guide": {
    "en": "Python Setup Guide",
    "zh-cn": "Python 环境配置指南",
    "de": "Python-Einrichtungsanleitung"
  },
  "Python Environment Guide (Required: Python 3.8+ & pyserial)": {
    "en": "Python Environment Guide (Required: Python 3.8+ & pyserial)",
    "zh-cn": "Python 环境配置指南 (要求: Python 3.8+ 以及 pyserial)",
    "de": "Python-Umgebungsanleitung (Erforderlich: Python 3.8+ & pyserial)"
  },
  "This adapter requires Python 3.8 or higher with the pyserial library installed to query the BMS. Follow the instructions below for your system type.": {
    "en": "This adapter requires Python 3.8 or higher with the pyserial library installed to query the BMS. Follow the instructions below for your system type.",
    "zh-cn": "本适配器需要 Python 3.8 或更高版本以及 pyserial 依赖库来与 BMS 进行通信。请根据您的系统类型选择以下安装步骤。",
    "de": "Dieser Adapter benötigt Python 3.8 oder höher mit der installierten pyserial-Bibliothek, um das BMS abzufragen. Befolgen Sie die folgenden Anweisungen für Ihren Systemtyp."
  },
  "1. Linux / Raspberry Pi OS": {
    "en": "1. Linux / Raspberry Pi OS",
    "zh-cn": "1. Linux / 树莓派系统",
    "de": "1. Linux / Raspberry Pi OS"
  },
  "Connect to your system via SSH and run the following command to install Python 3 and its virtual environment libraries:\n\nsudo apt-get update && sudo apt-get install -y python3 python3-venv python3-serial": {
    "en": "Connect to your system via SSH and run the following command to install Python 3 and its virtual environment libraries:\n\nsudo apt-get update && sudo apt-get install -y python3 python3-venv python3-serial",
    "zh-cn": "请使用 SSH 工具连接到您的系统，并执行以下命令安装 Python 3 及其虚拟环境与串口依赖包：\n\nsudo apt-get update && sudo apt-get install -y python3 python3-venv python3-serial",
    "de": "Verbinden Sie sich per SSH mit Ihrem System und führen Sie den folgenden Befehl aus, um Python 3 und die zugehörigen Bibliotheken für virtuelle Umgebungen sowie serielle Verbindungen zu installieren:\n\nsudo apt-get update && sudo apt-get install -y python3 python3-venv python3-serial"
  },
  "2. Docker Containers (ioBroker official image)": {
    "en": "2. Docker Containers (ioBroker official image)",
    "zh-cn": "2. Docker 容器环境 (ioBroker 官方镜像)",
    "de": "2. Docker-Container (offizielles ioBroker-Image)"
  },
  "If running inside a Docker container (e.g. on Synology, Portainer, or via docker-compose), edit the container settings and add 'python3 python3-pip python3-serial' to the PACKAGES environment variable. The container will automatically install it on startup.": {
    "en": "If running inside a Docker container (e.g. on Synology, Portainer, or via docker-compose), edit the container settings and add 'python3 python3-pip python3-serial' to the PACKAGES environment variable. The container will automatically install it on startup.",
    "zh-cn": "如果您的 ioBroker 运行在 Docker 容器中（例如群晖 Synology Docker、Portainer 或 docker-compose 部署），请编辑容器的“环境变量”(Environment)，在 PACKAGES 变量中添加 python3 python3-pip python3-serial（例如：PACKAGES = python3 python3-pip python3-serial）。容器会在下次启动时自动下载并安装它们。",
    "de": "Wenn der Adapter in einem Docker-Container ausgeführt wird (z. B. auf einer Synology NAS, in Portainer oder via docker-compose), bearbeiten Sie die Container-Einstellungen und fügen Sie 'python3 python3-pip python3-serial' zur Umgebungsvariable PACKAGES hinzu. Der Container installiert dies dann automatisch beim Start."
  },
  "3. Windows System": {
    "en": "3. Windows System",
    "zh-cn": "3. Windows 系统",
    "de": "3. Windows-System"
  },
  "If your Windows machine is connected to the internet, the adapter will automatically download and set up a portable Python 3.11 environment with pyserial on startup. If offline or if auto-download fails:\n\n- Download Python (3.8+) from https://www.python.org/downloads/\n- Run the installer and CRITICALLY check the box 'Add Python to PATH'\n- Open command prompt and run: pip install pyserial\n- Or enter the absolute path to python.exe in the 'Python Path / Command' setting.": {
    "en": "If your Windows machine is connected to the internet, the adapter will automatically download and set up a portable Python 3.11 environment with pyserial on startup. If offline or if auto-download fails:\n\n- Download Python (3.8+) from https://www.python.org/downloads/\n- Run the installer and CRITICALLY check the box 'Add Python to PATH'\n- Open command prompt and run: pip install pyserial\n- Or enter the absolute path to python.exe in the 'Python Path / Command' setting.",
    "zh-cn": "如果运行本适配器的 Windows 系统已联网，适配器会在启动时自动为您下载并初始化绿色免安装版 Python 3.11 及 pyserial 依赖包。如果由于离线或网络原因自动下载失败，请：\n\n- 访问 Python 官网 https://www.python.org/downloads/ 下载并运行 Python 安装包（3.8+）\n- 安装时请务必勾选最下方的 'Add Python to PATH'（添加 Python 到 PATH 环境变量）！\n- 安装完成后，打开命令提示符（CMD）并运行命令：pip install pyserial\n- 或在“自定义 Python 路径或命令”设置项中手动输入您已安装的 python.exe 绝对路径。",
    "de": "Wenn Ihr Windows-System mit dem Internet verbunden ist, lädt der Adapter beim Start automatisch eine portable Python 3.11-Umgebung mit pyserial herunter. Wenn Sie offline sind oder der automatische Download fehlschlägt:\n\n- Laden Sie Python (3.8+) von https://www.python.org/downloads/ herunter\n- Starten Sie den Installer und aktivieren Sie unbedingt das Kontrollkästchen 'Add Python to PATH'\n- Öffnen Sie die Eingabeaufforderung und führen Sie aus: pip install pyserial\n- Oder geben Sie den absoluten Pfad zur python.exe im Feld 'Python-Pfad / Befehl' in den Einstellungen ein."
  }
};

