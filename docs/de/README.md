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

## BMS Funktions- & Telemetrie-Verfügbarkeitsmatrix

Die verfügbaren Telemetriedaten und Konfigurationsparameter hängen vom BMS-Modell und dem von Ihrer Batterie-Hardware unterstützten Protokoll ab:

| Telemetrie / Parameter | Pace BMS (RS232/RS485/WiFi) | JK BMS (55AA-Protokoll) | TDT BMS (RS232) |
| :--- | :---: | :---: | :---: |
| Spannung, Strom, Leistung, SoC, SoH | ✅ | ✅ | ✅ |
| Verbleibende / Volle / Design-Kapazität | ✅ | ✅ | ✅ |
| Zykluszahl | ✅ | ✅ | ✅ |
| Einzelne Zellspannungen & Min/Max/Diff | ✅ | ✅ | ✅ |
| Temperatursensoren (Zellen / Umgebung) | ✅ | ✅ | ✅ |
| MOSFET-Temperatursensor | ✅ | ✅ | ✅ |
| Lade- / Entlade-MOSFET-Steuerungszustände | ✅ | ✅ | ❌ |
| Aktiver Balancer-Strom & Auslöse-Einstellungen | ❌ | ✅ | ❌ |
| Kumulierte geladene / entladene Energie (Wh) | ✅ | ❌ | ✅ |
| Zell-Innenwiderstände (mΩ) | ❌ | ✅ | ❌ |
| Umfassende Alarme (OVP, UVP, OTP, UTP, OCP) | ✅ | ✅ | ✅ |

## Glossar der Telemetrie- & Sensor-Definitionen

Nachfolgend finden Sie eine Übersicht der wichtigsten Sensorzustände, ihre genaue physikalische Bedeutung, Einheiten und BMS-Zuordnungen:

| Zustandsschlüssel / Feldname | Name (Friendly Name) | Einheit / Typ | Unterstütztes BMS | Beschreibung / Klarstellung |
| :--- | :--- | :---: | :---: | :--- |
| `view_voltage` | Voltage | V | Alle (Pace / JK / TDT) | **Telemetrie**: Gesamte Batteriepack-Spannung. |
| `view_current` | Current | A | Alle (Pace / JK / TDT) | **Telemetrie**: Gesamter Batteriepack-Strom (Positiv: Laden, Negativ: Entladen). |
| `view_power` | Power | kW | Alle (Pace / JK / TDT) | **Telemetrie**: Berechnete Echtzeit-Batterieleistung. |
| `view_SOC` | State of Charge (SOC) | % | Alle (Pace / JK / TDT) | **Telemetrie**: Ladezustand der Batterie in Prozent (0-100%). |
| `view_SOH` | State of Health (SOH) | % | Alle (Pace / JK / TDT) | **Telemetrie**: Alterungszustand/Gesundheit der Batterie in Prozent (0-100%). |
| `view_remain_capacity` | Remaining Capacity | Ah | Alle (Pace / JK / TDT) | **Telemetrie**: Verbleibende Batteriekapazität in Ampere-Stunden. |
| `view_full_capacity` | Full Charge Capacity | Ah | Alle (Pace / JK / TDT) | **Telemetrie**: Volle Ladekapazität in Ampere-Stunden. |
| `view_design_capacity` | Design Capacity | Ah | Alle (Pace / JK / TDT) | **Telemetrie**: Werkseitig angegebene Nennkapazität in Ampere-Stunden. |
| `view_cycle_number` | Cycle Count | Zyklen | Alle (Pace / JK / TDT) | **Statistik**: Gesamtzahl der Lade-/Entladezyklen. |
| `cell_voltages` | Cell Voltages | mV | Alle (Pace / JK / TDT) | **Telemetrie**: Einzelne Zellspannungen (automatisch aufgeteilt unter `cells.cell_XX`). |
| `temperatures` | Temperatures | °C | Alle (Pace / JK / TDT) | **Telemetrie**: Einzelne Temperatursensoren (automatisch aufgeteilt unter `temperatures.temp_XX`). |
| `view_energy_charged` | Interval Charged Energy | Wh | Pace / TDT | **Intervall-Energie**: Im Abfrageintervall (z. B. 5 Sekunden) berechnete geladene Energie. |
| `view_energy_discharged` | Interval Discharged Energy | Wh | Pace / TDT | **Intervall-Energie**: Im Abfrageintervall (z. B. 5 Sekunden) berechnete entladene Energie. |
| `charge_mos_state` | Charge MOSFET Control State | Boolean | Pace / JK | **Hardware-Steuerung**: Schaltzustand des Lade-MOSFETs (True: EIN / False: AUS). |
| `discharge_mos_state` | Discharge MOSFET Control State | Boolean | Pace / JK | **Hardware-Steuerung**: Schaltzustand des Entlade-MOSFETs (True: EIN / False: AUS). |
| `view_bat_charge_en` | Battery Charge Enable Setting | 0 / 1 | JK BMS | **BMS-Einstellung**: Zeigt an, ob das Laden in der BMS-Logik aktiviert ist (1: Aktiviert / 0: Deaktiviert). |
| `view_bat_discharge_en` | Battery Discharge Enable Setting | 0 / 1 | JK BMS | **BMS-Einstellung**: Zeigt an, ob das Entladen in der BMS-Logik aktiviert ist (1: Aktiviert / 0: Deaktiviert). |
| `view_charger_plugged` | Charger Connection Status | 0 / 1 | JK BMS | **Physische Erkennung**: Zeigt an, ob ein Ladestecker physisch erkannt wurde (1: Eingesteckt / 0: Nicht eingesteckt). |
| `view_vol_charge_cur` | Charge Current Sensor Voltage | mV | JK BMS | **Sensor-AD-Spannung**: Rohe Abtastspannung des Ladestromsensors (Millivolt). |
| `view_vol_discharge_cur` | Discharge Current Sensor Voltage | mV | JK BMS | **Sensor-AD-Spannung**: Rohe Abtastspannung des Entladestromsensors (Millivolt). |
| `view_balan_en` | Active Balance Enable Setting | 0 / 1 | JK BMS | **BMS-Einstellung**: Zeigt an, ob das aktive Ausgleichen (Balancing) aktiviert ist (1: Aktiviert / 0: Deaktiviert). |
| `view_cur_balan_max` | Max Active Balance Current | A | JK BMS | **Equalizer-Spezifikation**: Maximaler Balancer-Strom des Ausgleichers. |
| `view_vol_start_balan` | Balance Trigger Voltage Threshold | V | JK BMS | **Auslöseschwelle**: Mindestzellspannung zum Aktivieren des Ausgleichs. |
| `cell_resistances` | Cell Resistances | mΩ | JK BMS | **Innenwiderstand**: Array der Zell-Innenwiderstände (automatisch aufgeteilt unter `cell_resistances.cell_res_XX`). |
| `view_temp_mos` | MOSFET Temperature | °C | Alle (Pace / JK / TDT) | **Telemetrie**: Temperatursensor der MOSFET-Leistungsstufe. |
| `view_heating_state` | Heating Control State | 0 / 1 | JK BMS | **Steuerstatus**: Zeigt an, ob die Heizfolie aktiv ist (1: Heizt / 0: Inaktiv). |
| `view_heat_current` | Heating Current | A | JK BMS | **Telemetrie**: Stromverbrauch der Batterieheizung. |
| `define_number_p` | Parallel Pack Count Definition | Zahl | Pace BMS | **BMS-Konfiguration**: Hardwareseitig definierte Anzahl paralleler Packs. |

### Was bedeuten `view_energy_charged` und `view_energy_discharged`?

**Wichtige Definition**: Die meisten BMS-Protokolle **speichern keinen integrierten Hardware-Energieverbrauchszähler (kWh)**. Daher sind `view_energy_charged` und `view_energy_discharged` **KEINE Gesamtzählerstände der Batterie seit der Herstellung**.

Stattdessen stellen sie **per Software berechnete Energie-Zuwächse für das aktuelle Abfrageintervall** (z. B. über 5 Sekunden) dar:

$$\Delta E = |P| \times \Delta t \times \frac{1000}{3600} \text{ (Wh)}$$

- **Bedeutung der Werte**: Bei jeder Abfrage berechnet der Adapter die geladene oder entladene Energie $\Delta E$ (in Wattstunden) für genau dieses Abfragefenster ($\Delta t$, z. B. 5s) basierend auf der Momentanleistung $P$ (kW).
- **Eigenständige Summation erforderlich**: Da diese Werte kurzzeitige Intervalldeltas darstellen (oder flüchtige Speicherakkumulatoren während der Laufzeit), **müssen Benutzer, die eine dauerhafte Gesamt-Energiemessung (täglich, monatlich oder gesamt kWh) wünschen, diese Werte im Smart-Home-System selbst aufsummieren**:
  - **In Home Assistant**: Nutzen Sie den Helfer **`utility_meter`** oder den **`integration`**-Sensor (Riemann-Summe), um dauerhafte Tages-/Gesamt-kWh-Entitäten zu erzeugen.
  - **In ioBroker**: Nutzen Sie die Adapter **Statistics**, **History** oder **SQL-Datenbank**, um die Intervalldaten aufzusummieren und dauerhaft zu speichern.

## Tipps & Tricks: Verarbeitung & Weiterleitung von Array-Sensoren an Home Assistant

Während der Adapter `cell_voltages`, `temperatures` und `cell_resistances` automatisch in einzelne Zustandsobjekte (z. B. `cell_res_01`, `cell_res_02`) aufteilt, können Sie auch benutzerdefinierte ioBroker **Aliase** erstellen, um Werte vor dem Senden über MQTT an Home Assistant neu zuzuordnen.

So erstellen Sie einen Alias für den Index 0 (`val[0]`):
1. Öffnen Sie im ioBroker-Admin die Registerkarte **Objekte**.
2. Erstellen Sie ein neues Zustandsobjekt unter `alias.0` (z. B. `alias.0.gobel-bms-monitor.0.pack_00.cell_res_01`).
3. Konfigurieren Sie die Objekt-JSON wie folgt:

```json
{
  "_id": "alias.0.gobel-bms-monitor.0.pack_00.cell_res_01",
  "type": "state",
  "common": {
    "name": "Cell Resistance 01",
    "type": "number",
    "unit": "mΩ",
    "alias": {
      "id": "gobel-bms-monitor.0.pack_00.cell_resistances",
      "read": "val[0]"
    },
    "role": "value",
    "read": true,
    "write": false,
    "custom": {
      "mqtt-client.0": {
        "enabled": true,
        "publish": true,
        "pubChangesOnly": false,
        "pubAsObject": false,
        "qos": false,
        "retain": false
      }
    }
  },
  "native": {}
}
```

## Lizenz
Apache-Lizenz 2.0 (Copyright 2026 fancyui)
