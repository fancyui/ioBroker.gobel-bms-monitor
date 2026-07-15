# ioBroker Gobel BMS Monitor Adapter (PACE, JK, TDT BMS)

[English](../../README.md) | [简体中文](../zh-cn/README.md)

> **Hinweis**: Suchen Sie nach der Home Assistant Add-on-Version? Besuchen Sie das [Gobel Power Battery Home Assistant Add-on](https://github.com/fancyui/Gobel-Battery-HA-Addon).

Dieser Adapter wurde von Gobel Power entwickelt. Er integriert kompatible Batterie-BMS (PACE BMS, JK BMS und TDT BMS) in ioBroker und ermöglicht die Echtzeitüberwachung des Batteriezustands, der einzelnen Zellspannungen, des Ladezustands (SoC) und von Warnalarmen. Er kann sowohl für Gobel Power Batterien als auch für alle anderen Batterien verwendet werden, die diese BMS-Protokolle nutzen.

## Funktionen
* **Multi-BMS-Kompatibilität**: Unterstützt Pace BMS, JK BMS (55AA-Protokoll) und TDT BMS.
* **Flexible Schnittstellen**: Verbindung über Seriell (RS232/RS485 USB-Adapter), WLAN oder Ethernet-Konverter.
* **Automatische Erkennung paralleler Packs**: Die Verbindung mit dem Master-BMS scannt und ordnet automatisch alle parallelen Slave-Batteriepacks zu.
* **Umfassende Telemetrie**:
  * Zellspannungen und Temperatursensoren.
  * Systemwerte: Spannung, Strom, Leistung, SoC, SoH, Kapazität, Zykluszahl, geladene/entladene Energie.
  * Alarmstatus: Zellüberspannung, Unterspannung, Warnungen bei hoher/niedriger Temperatur, Kurzschluss und Zustand der Lade-/Entlade-MOSFETs.

## Voraussetzungen
Dieser Adapter führt im Hintergrund einen leichtgewichtigen Python 3-Daemon aus, um mit dem Batterie-BMS zu kommunizieren. Er erfordert **Python (Version 3.8 oder höher)** und die **pyserial**-Bibliothek.

### Automatische Einrichtung (Windows)
* Wenn Ihr Windows-Rechner mit dem Internet verbunden ist, **lädt der Adapter beim Start automatisch eine portable Python 3.11-Umgebung mit `pyserial` herunter und richtet sie ein**. Sie müssen nichts manuell installieren!
* Die heruntergeladene Umgebung wird dauerhaft unter `iobroker-data/gobel-bms-monitor-python/` zwischengespeichert und bleibt bei Adapter-Updates erhalten.

### Manuelle Einrichtung (Linux / Docker / Windows Offline)
* **Linux (Debian/Ubuntu/Raspberry Pi OS)**:
  Verbinden Sie sich per SSH und führen Sie Folgendes aus:
  ```bash
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-serial
  ```
* **Docker-Container (offizielles ioBroker-Image)**:
  Bearbeiten Sie die Containereinstellungen und fügen Sie `python3 python3-pip python3-serial` zur Umgebungsvariable `PACKAGES` hinzu. Der Container installiert diese beim Start automatisch.
  Beispiel (Docker Compose):
  ```yaml
  environment:
    - PACKAGES=python3 python3-pip python3-serial
  ```
* **Windows (Offline/Manuelle Einrichtung)**:
  Laden Sie Python (3.8+) von [python.org](https://www.python.org/) herunter und installieren Sie es. Stellen Sie sicher, dass Sie während der Installation die Option **"Add Python to PATH"** aktivieren. Öffnen Sie nach der Installation die Eingabeaufforderung und führen Sie `pip install pyserial` aus.

## Installation des Adapters
Installieren Sie den Adapter während der Entwicklungs- oder Erstveröffentlichungsphase direkt über GitHub oder ein lokales Verzeichnis:
* In Ihrem ioBroker-Hauptordner (z. B. `/opt/iobroker` unter Linux):
  ```bash
  npm install https://github.com/fancyui/ioBroker.gobel-bms-monitor
  ```
* Oder fügen Sie ihn über das ioBroker-Admin-Panel hinzu (GitHub-Symbol/Benutzerdefinierte URL).

## Konfiguration
Konfigurieren Sie die folgenden Optionen im Admin-Panel des Adapters:
1. **Verbindungstyp**: Wählen Sie `Serial (USB)`, `WiFi` oder `Ethernet`.
2. **BMS-Typ**: Wählen Sie `PACE_LV`, `JK_PB`, `TDT` oder `PACE_LV_WIFI`. (Hinweis: `PACE_LV_WIFI` ist nur für Gobel Power-Batterien mit WLAN-Schnittstelle gedacht).
3. **BMS-Schnittstellenanschluss**: Wählen Sie `RS232` oder `RS485`.
4. **Pfad des seriellen Anschlusses** (nur Seriell): `/dev/ttyUSB0` unter Linux oder `COM3` unter Windows.
5. **Baudrate**: Typischerweise `115200` (Pace/JK) oder `9600`.
6. **IP-Adresse & Port** (nur WiFi/Ethernet): Geben Sie die IP und den Port (Standard `8899`) Ihres RS232/RS485-zu-WiFi/Ethernet-Servers an.
7. **Aktualisierungsintervall**: Häufigkeit der BMS-Abfragen (Standard `5` Sekunden).
8. **Max. parallele Packs**: Scan-Limit für parallele Batterien (bis zu `63`).

## Verkabelungs- und Hardware-Handbuch

### Verbindungstypen & Module
* **Serielle Verbindung**: Wenn Sie in der Konfiguration `Serial` auswählen, ist ein **USB-RS232**- oder **USB-RS485**-Kabel/Adapter erforderlich, um das BMS mit Ihrem Host-Computer zu verbinden.
* **WLAN / Ethernet-Verbindung**: Wenn Sie in der Konfiguration `WiFi` oder `Ethernet` auswählen, benötigen Sie ein Seriell-zu-Netzwerk-Modul wie z. B. **RS232-zu-WIFI/Ethernet** oder **RS485-zu-WIFI/Ethernet** (z. B. Module von **Waveshare**).
  * *Wichtig*: Konfigurieren Sie das Netzwerkmodul so, dass es als **TCP-Server** arbeitet. Der Adapter verbindet sich dann als TCP-Client mit dem Modul.

### RS485 Pinbelegungsdiagramm (Für JK BMS)
Für die JK BMS RS485-Kommunikation beziehen Sie sich bitte auf die folgende Pinbelegung:

![RS485 Pinbelegung](../../images/rs485a-can-pin.jpg)

| Pin | Signal |
| :---: | :---: |
| 1 | B |
| 2 | A |
| 3 | GND |
| 4 | NC (Nicht verbunden) |
| 5 | NC (Nicht verbunden) |
| 6 | GND |
| 7 | A |
| 8 | B |

### RS232 Pinbelegungsdiagramm (Für Pace BMS / TDT BMS)
Für die Pace BMS und TDT BMS RS232-Kommunikation beziehen Sie sich bitte auf die folgende Pinbelegung:

![RS232 Pinbelegung](../../images/rs232-pin.jpg)

| Pin | Signal |
| :---: | :---: |
| 1 | NC (Nicht verbunden) |
| 2 | NC (Nicht verbunden) |
| 3 | TXD |
| 4 | RXD |
| 5 | GND |
| 6 | NC (Nicht verbunden) |

### BMS DIP-Einstellungen
* **Pace BMS**: Verbinden Sie sich mit dem **RS232**-Anschluss oder über einen WLAN-Konverter. Stellen Sie die DIP-Schalter des Master-BMS auf `1000`.
* **JK BMS**: Verbinden Sie sich mit der **RS485B**- oder **RS485C**-Schnittstelle. Stellen Sie die DIP-Schalter des Master-BMS auf `0000`.
* **TDT BMS**: Verbinden Sie sich mit der **RS232**-Schnittstelle.

## So übertragen Sie Daten an Home Assistant
Wenn Sie Batteriedaten von ioBroker an eine vorhandene Home Assistant-Instanz übertragen möchten, können Sie dies einfach über MQTT tun:

1. **Installieren Sie den MQTT-Client-Adapter in ioBroker**:
   * Suchen Sie im ioBroker-Admin nach dem Adapter **mqtt-client** und installieren Sie ihn.
   * Konfigurieren Sie ihn so, dass er eine Verbindung zu Ihrem vorhandenen Home Assistant MQTT-Broker herstellt.
2. **Aktivieren Sie das MQTT-Publishing für BMS-Zustände**:
   * Navigieren Sie im ioBroker-Admin-Panel zur Registerkarte **Objekte**.
   * Erweitern Sie die Ordnerstruktur für `gobel-bms-monitor.<Instanz>`, bis Sie die Zustände finden, die Sie veröffentlichen möchten.
   * Klicken Sie ganz rechts in der Zeile des jeweiligen Zustands auf das Symbol **Zahnrad (Benutzerdefinierte Einstellungen)**.
   * Aktivieren Sie die Einstellungen unter **mqtt-client**, setzen Sie das Häkchen bei **Aktivieren** und stellen Sie sicher, dass die Aktion **Veröffentlichen** (Publish) aktiv ist.
   * Speichern Sie die Einstellungen. ioBroker veröffentlicht diese Zustände nun automatisch auf Ihrem Home Assistant MQTT-Broker.

## Lizenz
Apache-Lizenz 2.0 (Copyright 2026 fancyui)
