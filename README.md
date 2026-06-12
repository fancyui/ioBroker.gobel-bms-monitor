---
description: 
---

# ioBroker Battery BMS Monitor Adapter (PACE, JK, TDT BMS)

[Deutsch](docs/de/README.md) | [简体中文](docs/zh-cn/README.md)

<!--
[![NPM version](http://img.shields.io/npm/v/iobroker.battery-bms-monitor.svg)](https://www.npmjs.com/package/iobroker.battery-bms-monitor)
[![Downloads](https://img.shields.io/npm/dm/iobroker.battery-bms-monitor.svg)](https://www.npmjs.com/package/iobroker.battery-bms-monitor)
![Number of Installations](http://iobroker.live/badges/battery-bms-monitor-stable.svg)
[![Dependency Status](https://img.shields.io/david/fancyui/ioBroker.battery-bms-monitor.svg)](https://david-dm.org/fancyui/ioBroker.battery-bms-monitor)

[![NPM](https://nodei.co/npm/iobroker.battery-bms-monitor.png?downloads=true)](https://nodei.co/npm/iobroker.battery-bms-monitor/)
-->

This adapter is developed by Gobel Power. It integrates compatible Battery BMS (PACE BMS, JK BMS, and TDT BMS) into ioBroker, allowing real-time monitoring of battery health, individual cell voltages, state of charge (SoC), and warning alarms. It can be used for Gobel Power batteries as well as any other batteries using these BMS protocols.

## Features
* **Multi-BMS Compatibility**: Supports Pace BMS, JK BMS (55AA protocol), and TDT BMS.
* **Flexible Interfaces**: Connect via Serial (RS232/RS485 USB adapter), WiFi, or Ethernet converters.
* **Auto-Discovery of Parallel Packs**: Connecting to the Master BMS automatically scans and maps all parallel slave battery packs.
* **Comprehensive Telemetry**:
  * Cell voltages and temperature sensors.
  * System values: Voltage, current, power, SoC, SoH, capacity, cycle count, charged/discharged energy.
  * Alarm status: Cell overvoltage, undervoltage, high/low temperature warnings, short circuit, and charge/discharge MOSFET states.

## Prerequisites
This adapter runs a lightweight Python 3 daemon in the background to interface with the battery BMS. It requires **Python (version 3.8 or higher)**.

### Automatic Setup (Windows)
* If your Windows machine is connected to the internet, **the adapter will automatically download and set up a portable Python 3.11 environment with `pyserial` on startup**. You do not need to install anything manually!
* The downloaded environment is cached persistently under `iobroker-data/battery-bms-monitor-python/` and survives adapter updates.

### Manual Setup (Linux / Docker / Windows Offline)
* **Linux (Debian/Ubuntu/Raspberry Pi OS)**:
  Connect via SSH and run:
  ```bash
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv
  ```
* **Docker Container (ioBroker official image)**:
  Edit the container settings and add `python3` to the `PACKAGES` environment variable. The container will automatically install it on startup.
* **Windows (Offline/Manual Setup)**:
  Download and install Python (3.8+) from [python.org](https://www.python.org/). Ensure you check **"Add Python to PATH"** during installation.


## How to Install the Adapter
During the initial release or development phase, install it directly from GitHub or local directory:
* Inside your ioBroker root folder (e.g., `/opt/iobroker` on Linux):
  ```bash
  npm install https://github.com/fancyui/ioBroker.battery-bms-monitor
  ```
* Or add it via the ioBroker admin panel (GitHub icon/Custom URL).

## Configuration
Configure the following options in the adapter admin panel:
1. **Connection Type**: Select `Serial (USB)`, `WiFi` or `Ethernet`.
2. **BMS Type**: Select `PACE_LV`, `JK_PB`, `TDT`, or `PACE_LV_WIFI`. (Note: `PACE_LV_WIFI` is only for Gobel Power batteries equipped with a WiFi interface).
3. **BMS Interface Port**: Choose `RS232` or `RS485`.
4. **Serial Port Path** (Serial only): `/dev/ttyUSB0` on Linux or `COM3` on Windows.
5. **Baud Rate**: Typically `115200` (Pace/JK) or `9600`.
6. **IP Address & Port** (WiFi/Ethernet only): Specify the IP and port (default `8899`) of your RS232/RS485-to-WiFi/Ethernet server.
7. **Refresh Interval**: Frequency of BMS queries (default `5` seconds).
8. **Max Parallel Packs**: Scanning limit for parallel batteries (up to `63`).

## Wiring and Hardware Guide

### Connection Types & Modules
* **Serial Connection**: If you select `Serial` in the configuration, a **USB-RS232** or **USB-RS485** cable/adapter is required to connect the BMS to your host computer.
* **WiFi / Ethernet Connection**: If you select `WiFi` or `Ethernet` in the configuration, you will need a serial-to-network module such as **RS232-to-WIFI/Ethernet** or **RS485-to-WIFI/Ethernet** (for example, **Waveshare** modules).
  * *Important*: Configure the network module to operate as a **TCP Server**. The adapter will connect to it as a TCP Client.

### RS485 Pinout Diagram (For JK BMS)
For JK BMS RS485 communication, refer to the pinout below:

![RS485 Pinout](images/rs485a-can-pin.jpg)

| Pin | Signal |
| :---: | :---: |
| 1 | B |
| 2 | A |
| 3 | GND |
| 4 | NC (Not Connected) |
| 5 | NC (Not Connected) |
| 6 | GND |
| 7 | A |
| 8 | B |

### RS232 Pinout Diagram (For Pace BMS / TDT BMS)
For Pace BMS and TDT BMS RS232 communication, refer to the pinout below:

![RS232 Pinout](images/rs232-pin.jpg)

| Pin | Signal |
| :---: | :---: |
| 1 | NC (Not Connected) |
| 2 | NC (Not Connected) |
| 3 | TXD |
| 4 | RXD |
| 5 | GND |
| 6 | NC (Not Connected) |

### BMS DIP Settings
* **Pace BMS**: Connect to the **RS232** port or via WiFi converter. Set the Master BMS DIP switches to `1000`.
* **JK BMS**: Connect to the **RS485B** or **RS485C** interface. Set the Master BMS DIP switches to `0000`.
* **TDT BMS**: Connect to the **RS232** interface.

## License
Apache License 2.0 (Copyright 2026 fancyui)