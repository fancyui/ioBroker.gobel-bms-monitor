# Changelog

## 1.0.8 (2026-06-16)
* (fancyui) Fix PACE RS232 protocol desync and telemetry corruption in multi-pack setups via robust structural layout validation.
* (fancyui) Fix active balancing offsets and index boundary crashes in warning status parsers across PACE RS232, RS485, and TDT RS232 drivers.

## 1.0.7 (2026-06-15)
* (fancyui) Separate Passive and Active Balancing Status into distinct warning sensors (`balancing_status_passive_1 & 2` for raw bitmasks, `balancing_status_active_1 & 2` for active cell indices 1-8/9-16).
* (fancyui) Fix TDT ValueError crash when balance state values are greater than 1.
* (fancyui) Add raw ASCII and Hexadecimal packet logging for telemetry send/receive operations under debug mode.
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
