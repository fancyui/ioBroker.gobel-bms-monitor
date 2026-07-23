---
description: 
---

# ioBroker Gobel BMS Monitor Adapter (PACE, JK, TDT BMS)

[Deutsch](docs/de/README.md) | [简体中文](docs/zh-cn/README.md)

> **Note**: Looking for the Home Assistant Add-on version? Check out the [Gobel Power Battery Home Assistant Add-on](https://github.com/fancyui/Gobel-Battery-HA-Addon).

<!--
[![NPM version](http://img.shields.io/npm/v/iobroker.gobel-bms-monitor.svg)](https://www.npmjs.com/package/iobroker.gobel-bms-monitor)
[![Downloads](https://img.shields.io/npm/dm/iobroker.gobel-bms-monitor.svg)](https://www.npmjs.com/package/iobroker.gobel-bms-monitor)
![Number of Installations](http://iobroker.live/badges/gobel-bms-monitor-stable.svg)
[![Dependency Status](https://img.shields.io/david/fancyui/ioBroker.gobel-bms-monitor.svg)](https://david-dm.org/fancyui/ioBroker.gobel-bms-monitor)

[![NPM](https://nodei.co/npm/iobroker.gobel-bms-monitor.png?downloads=true)](https://nodei.co/npm/iobroker.gobel-bms-monitor/)
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
This adapter runs a lightweight Python 3 daemon in the background to interface with the battery BMS. It requires **Python (version 3.8 or higher)** and the **pyserial** library.

### Automatic Setup (Windows)
* If your Windows machine is connected to the internet, **the adapter will automatically download and set up a portable Python 3.11 environment with `pyserial` on startup**. You do not need to install anything manually!
* The downloaded environment is cached persistently under `iobroker-data/gobel-bms-monitor-python/` and survives adapter updates.

### Manual Setup (Linux / Docker / Windows Offline)
* **Linux (Debian/Ubuntu/Raspberry Pi OS)**:
  Connect via SSH and run:
  ```bash
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-serial
  ```
* **Docker Container (ioBroker official image)**:
  Edit the container settings and add `python3 python3-pip python3-serial` to the `PACKAGES` environment variable. The container will automatically install them on startup.
  Example (Docker Compose):
  ```yaml
  environment:
    - PACKAGES=python3 python3-pip python3-serial
  ```
* **Windows (Offline/Manual Setup)**:
  Download and install Python (3.8+) from [python.org](https://www.python.org/). Ensure you check **"Add Python to PATH"** during installation. After installation, open Command Prompt and run `pip install pyserial`.


## How to Install the Adapter
During the initial release or development phase, install it directly from GitHub or local directory:
* Inside your ioBroker root folder (e.g., `/opt/iobroker` on Linux):
  ```bash
  npm install https://github.com/fancyui/ioBroker.gobel-bms-monitor
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

## BMS Feature & Telemetry Availability Matrix

The telemetry data and configuration parameters available depend on the BMS model and protocol supported by your battery hardware:

| Telemetry / Parameter | Pace BMS (RS232/RS485/WiFi) | JK BMS (55AA Protocol) | TDT BMS (RS232) |
| :--- | :---: | :---: | :---: |
| Voltage, Current, Power, SoC, SoH | ✅ | ✅ | ✅ |
| Remaining / Full / Design Capacity | ✅ | ✅ | ✅ |
| Cycle Count | ✅ | ✅ | ✅ |
| Individual Cell Voltages & Min/Max/Diff | ✅ | ✅ | ✅ |
| Temperature Sensors (Cells / Ambient) | ✅ | ✅ | ✅ |
| MOSFET Temperature Sensor | ✅ | ✅ | ✅ |
| Charge / Discharge MOSFET Control States | ✅ | ✅ | ❌ |
| Active Balance Current & Trigger Settings | ❌ | ✅ | ❌ |
| Cumulative Energy Charged / Discharged (Wh) | ✅ | ❌ | ✅ |
| Cell Internal Resistances (mΩ) | ❌ | ✅ | ❌ |
| Comprehensive Alarms (OVP, UVP, OTP, UTP, OCP) | ✅ | ✅ | ✅ |

## Telemetry & Sensor Definitions Glossary

Below is a reference of key sensor states, specifying which BMS protocol they belong to, their exact physical meanings, and units:

| State Key / Field Name | Friendly Name | Unit / Type | Supported BMS | Description / Clarification |
| :--- | :--- | :---: | :---: | :--- |
| `view_voltage` | Voltage | V | All (Pace / JK / TDT) | **Telemetry**: Total battery pack voltage. |
| `view_current` | Current | A | All (Pace / JK / TDT) | **Telemetry**: Total battery pack current (Positive: charging, Negative: discharging). |
| `view_power` | Power | kW | All (Pace / JK / TDT) | **Telemetry**: Calculated real-time battery power. |
| `view_power_charging` | Charging Power | kW | All (Pace / JK / TDT) | **Telemetry**: Real-time charging power (0 when discharging or idle). |
| `view_power_discharging` | Discharging Power | kW | All (Pace / JK / TDT) | **Telemetry**: Real-time discharging power (positive value, 0 when charging or idle). |
| `view_SOC` | State of Charge (SOC) | % | All (Pace / JK / TDT) | **Telemetry**: Battery state of charge percentage (0-100%). |
| `view_SOH` | State of Health (SOH) | % | All (Pace / JK / TDT) | **Telemetry**: Battery state of health percentage (0-100%). |
| `view_remain_capacity` | Remaining Capacity | Ah | All (Pace / JK / TDT) | **Telemetry**: Remaining battery capacity in Ampere-hours. |
| `view_full_capacity` | Full Charge Capacity | Ah | All (Pace / JK / TDT) | **Telemetry**: Full charge capacity in Ampere-hours. |
| `view_design_capacity` | Design Capacity | Ah | All (Pace / JK / TDT) | **Telemetry**: Factory design capacity in Ampere-hours. |
| `view_cycle_number` | Cycle Count | cycles | All (Pace / JK / TDT) | **Telemetry**: Total charge/discharge cycle count. |
| `cell_voltages` | Cell Voltages | mV | All (Pace / JK / TDT) | **Telemetry**: Individual cell voltages (auto-expanded under `cells.cell_XX`). |
| `temperatures` | Temperatures | °C | All (Pace / JK / TDT) | **Telemetry**: Individual temperature sensors (auto-expanded under `temperatures.temp_XX`). |
| `view_energy_charged` | Interval Charged Energy | Wh | Pace / TDT | **Interval Energy**: Incremental energy charged within the polling interval (Watt-hours). |
| `view_energy_discharged` | Interval Discharged Energy | Wh | Pace / TDT | **Interval Energy**: Incremental energy discharged within the polling interval (Watt-hours). |
| `charge_mos_state` | Charge MOSFET Control State | boolean | Pace / JK | **Hardware Control**: State of the charging MOSFET switch (True: ON / False: OFF). |
| `discharge_mos_state` | Discharge MOSFET Control State | boolean | Pace / JK | **Hardware Control**: State of the discharging MOSFET switch (True: ON / False: OFF). |
| `view_bat_charge_en` | Battery Charge Enable Setting | 0 / 1 | JK BMS | **BMS Configuration**: Indicates if charging is enabled in BMS logic (1: Enabled / 0: Disabled). |
| `view_bat_discharge_en` | Battery Discharge Enable Setting | 0 / 1 | JK BMS | **BMS Configuration**: Indicates if discharging is enabled in BMS logic (1: Enabled / 0: Disabled). |
| `view_charger_plugged` | Charger Connection Status | 0 / 1 | JK BMS | **Physical Detection**: Indicates whether charger plug is physically detected (1: Plugged / 0: Unplugged). |
| `view_vol_charge_cur` | Charge Current Sensor Voltage | mV | JK BMS | **Sensor AD Voltage**: Raw sampled voltage of the charge current sensor (millivolts). |
| `view_vol_discharge_cur` | Discharge Current Sensor Voltage | mV | JK BMS | **Sensor AD Voltage**: Raw sampled voltage of the discharge current sensor (millivolts). |
| `view_balan_en` | Active Balance Enable Setting | 0 / 1 | JK BMS | **BMS Configuration**: Indicates if active cell balancing is enabled (1: Enabled / 0: Disabled). |
| `view_cur_balan_max` | Max Active Balance Current | A | JK BMS | **Balance Specification**: Maximum balancing current capability of equalizer. |
| `view_vol_start_balan` | Balance Trigger Voltage Threshold | V | JK BMS | **Balance Threshold**: Minimum cell voltage required to activate balancing. |
| `cell_resistances` | Cell Resistances | mΩ | JK BMS | **Internal Resistance**: Array of individual cell internal resistances (auto-expanded under `cell_resistances.cell_res_XX`). |
| `view_temp_mos` | MOSFET Temperature | °C | All (Pace / JK / TDT) | **Telemetry**: Temperature sensor reading on the MOSFET power stage. |
| `view_heating_state` | Heating Control State | 0 / 1 | JK BMS | **Control Status**: Indicates whether battery heating element is active (1: Active / 0: Inactive). |
| `view_heat_current` | Heating Current | A | JK BMS | **Telemetry**: Current consumption of battery heater. |
| `define_number_p` | Parallel Pack Count Definition | number | Pace BMS | **BMS Configuration**: Hardware defined parallel battery count setting. |

### What are `view_energy_charged` and `view_energy_discharged`?

**Important Definition**: Most BMS hardware protocols **do NOT** store an onboard hardware energy meter (kWh). Therefore, `view_energy_charged` and `view_energy_discharged` are **NOT lifetime total energy readings from the battery**.

Instead, they represent **incremental energy calculated in software for the current polling interval** (e.g. over 5 seconds):

$$\Delta E = |P| \times \Delta t \times \frac{1000}{3600} \text{ (Wh)}$$

- **What these values represent**: Each time the adapter polls the BMS, it calculates the energy charged or discharged $\Delta E$ (in Watt-hours) during that specific polling window ($\Delta t$, e.g., 5s) based on instantaneous power $P$ (kW).
- **User Accumulation Required**: Because these values represent short polling interval deltas (or in-memory accumulators during adapter uptime that reset on restart), **users who want total cumulative energy (daily, monthly, or lifetime total kWh) MUST accumulate these interval values themselves in their smart home platform**:
  - **In Home Assistant**: Use the **`utility_meter`** helper or **`integration`** (Riemann sum) sensor to accumulate the power/energy sensors into permanent daily/total kWh entities.
  - **In ioBroker**: Use the **Statistics**, **History**, or **SQL Database** adapters to sum up and store cumulative energy over time.

## Tips & Tricks: Handling & Forwarding Array Sensors to Home Assistant

While the adapter automatically expands `cell_voltages`, `temperatures`, and `cell_resistances` into individual state objects (e.g. `cell_res_01`, `cell_res_02`), you can also create custom ioBroker **Aliases** for any array values if you wish to remap or transform states before sending them over MQTT to Home Assistant.

To create an Alias for array element index 0 (`val[0]`):
1. In ioBroker Admin, open the **Objects** tab.
2. Create a new state object under `alias.0` (for example, `alias.0.gobel-bms-monitor.0.pack_00.cell_res_01`).
3. Set the Object JSON definition as follows:

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

## License
Apache License 2.0 (Copyright 2026 fancyui)