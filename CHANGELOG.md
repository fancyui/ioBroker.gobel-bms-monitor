# Changelog

## 1.0.6 (2026-06-13)
* (fancyui) Expose active balancing status (`balance_state_1` and `balance_state_2`) warning sensors for PACE (RS232, RS485, WiFi) and TDT BMS protocols.
* (fancyui) Standardize debug logging format for parsed analog and warning telemetry across JK, PACE, and TDT BMS drivers.
* (fancyui) Fix cell temperature unit (from '℃' to standard '°C') for PACE RS485.

## 1.0.5 (2026-06-12)
* (fancyui) Move portable Python environment to persistent `iobroker-data/gobel-bms-monitor-python` directory.
* (fancyui) Support auto-download and setup of portable Python 3.11 environment with `pyserial` on Windows.

## 1.0.4 (2026-06-11)
* (fancyui) Add `gobel_reader.py` script for BMS data polling.
* (fancyui) Validate python installations for `pyserial` presence and fetch the latest `pyserial` wheel via PyPI API.

## 1.0.1 (2026-06-09)
* (fancyui) Implement modular Python-based BMS reader and JSONConfig settings panel.
* (fancyui) Support dynamic state creation in ioBroker for warning and alarm values.
