# ioBroker Gobel BMS Monitor 电池监控适配器 (支持 PACE, JK, TDT BMS)

[English](../../README.md) | [Deutsch](../de/README.md)

> **注意**：寻找 Home Assistant Add-on 版本？请访问 [Gobel Power 电池 Home Assistant Add-on](https://github.com/fancyui/Gobel-Battery-HA-Addon)。

此适配器由 Gobel Power 开发。它将兼容的电池 BMS（包括 PACE BMS、JK BMS 和 TDT BMS）集成到 ioBroker 中，允许实时监控电池健康状况、单体电池电压、充电状态 (SoC) 以及警报信息。它既适用于 Gobel Power 电池，也适用于任何其他使用这些 BMS 协议的电池。

## 功能特点
* **多 BMS 兼容性**：支持 Pace BMS、JK BMS（55AA 协议）和 TDT BMS。
* **灵活的接口**：支持通过串口（RS232/RS485 USB 转接线）、WiFi 或以太网转换器进行连接。
* **并联电池包自动发现**：连接到主机 BMS 时，会自动扫描并映射所有并联的从机电池包。
* **详尽的遥测数据**：
  * 单体电池电压和温度传感器数据。
  * 系统参数：电压、电流、功率、SoC、SoH、容量、循环次数、充放电电量等。
  * 告警状态：单体过压、欠压、高低温告警、短路以及充放电 MOSFET 状态。

## 前提条件
此适配器在后台运行一个轻量级的 Python 3 守护进程来与电池 BMS 通信。系统需要安装 **Python（3.8 或更高版本）**。

### 自动设置 (Windows)
* 如果你的 Windows 电脑连接了互联网，**适配器将在启动时自动下载并配置带有 `pyserial` 的便携式 Python 3.11 环境**。你不需要手动安装任何内容！
* 下载的环境将持久缓存在 `iobroker-data/gobel-bms-monitor-python/` 目录下，且在适配器升级时不会丢失。

### 手动设置 (Linux / Docker / Windows 离线环境)
* **Linux (Debian/Ubuntu/Raspberry Pi OS)**：
  通过 SSH 连接并运行以下命令：
  ```bash
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-serial
  ```
* **Docker 容器 (ioBroker 官方镜像)**：
  编辑容器设置，在 `PACKAGES` 环境变量中添加 `python3 python3-pip python3-serial`。容器启动时会自动安装它们。
  示例 (Docker Compose)：
  ```yaml
  environment:
    - PACKAGES=python3 python3-pip python3-serial
  ```
* **Windows (离线/手动安装)**：
  从 [python.org](https://www.python.org/) 下载并安装 Python (3.8+)。请务必在安装过程中勾选 **"Add Python to PATH"**（将 Python 添加到系统环境变量）。安装完成后，打开命令提示符（CMD）并运行 `pip install pyserial`。

## 如何安装适配器
在开发或首发阶段，你可以直接从 GitHub 或本地目录安装：
* 在你的 ioBroker 根目录下（例如 Linux 上的 `/opt/iobroker`）：
  ```bash
  npm install https://github.com/fancyui/ioBroker.gobel-bms-monitor
  ```
* 或者通过 ioBroker 管理面板（点击 GitHub 图标/输入自定义 URL）进行安装。

## 配置项
在适配器管理面板中配置以下选项：
1. **连接类型 (Connection Type)**：选择 `Serial (USB)`、`WiFi` 或 `Ethernet`。
2. **BMS 类型 (BMS Type)**：选择 `PACE_LV`、`JK_PB`, `TDT` 或 `PACE_LV_WIFI`。（注意：`PACE_LV_WIFI` 仅用于 Gobel Power 自带 WIFI 接口的电池）。
3. **BMS 接口类型 (BMS Interface Port)**：选择 `RS232` 或 `RS485`。
4. **串口路径 (Serial Port Path)**（仅限串口）：Linux 上为 `/dev/ttyUSB0`，Windows 上为 `COM3`。
5. **波特率 (Baud Rate)**：通常为 `115200`（Pace/JK）或 `9600`。
6. **IP 地址与端口 (IP Address & Port)**（仅限 WiFi/以太网）：指定你的 RS232/RS485 转 WiFi/以太网服务器的 IP 和端口（默认 `8899`）。
7. **数据刷新间隔 (Refresh Interval)**：查询 BMS 的频率（默认 `5` 秒）。
8. **最大并联数 (Max Parallel Packs)**：扫描并联电池的最大限制（最大支持 `63` 个）。

## 接线与硬件指南

### 连接方式与模块说明
* **串口连接 (Serial)**：如果选择 `Serial`，需要使用 **USB-RS232** 或 **USB-RS485** 转接线将 BMS 连接到运行 ioBroker 的主机。
* **WiFi / 以太网连接**：如果选择 `WiFi` 或 `Ethernet`，需要使用 **RS232-WIFI/Ethernet** 或 **RS485-WIFI/Ethernet** 模块（例如**微雪 Waveshare**模块）。
  * *重要配置*：请在网络模块的管理界面中，将模块的工作模式设置为 **TCP Server**，且适配器会作为 TCP Client 去连接它。

### RS485 接口针脚定义 (适用于 JK BMS)
进行 JK BMS RS485 通信时，请参考以下针脚定义：

![RS485 针脚定义](../../images/rs485a-can-pin.jpg)

| 针脚 (Pin) | 信号 (Signal) |
| :---: | :---: |
| 1 | B |
| 2 | A |
| 3 | GND |
| 4 | NC (空脚) |
| 5 | NC (空脚) |
| 6 | GND |
| 7 | A |
| 8 | B |

### RS232 接口针脚定义 (适用于 Pace BMS / TDT BMS)
进行 Pace BMS 或 TDT BMS RS232 通信时，请参考以下针脚定义：

![RS232 针脚定义](../../images/rs232-pin.jpg)

| 针脚 (Pin) | 信号 (Signal) |
| :---: | :---: |
| 1 | NC (空脚) |
| 2 | NC (空脚) |
| 3 | TXD |
| 4 | RXD |
| 5 | GND |
| 6 | NC (空脚) |

### BMS 拨码开关设置
* **Pace BMS**：连接到 **RS232** 接口或通过 WiFi 转换器连接。将主机 BMS 的拨码开关（DIP switches）设置为 `1000`。
* **JK BMS**：连接到 **RS485B** 或 **RS485C** 接口。将主机 BMS 的拨码开关设置为 `0000`。
* **TDT BMS**：连接到 **RS232** 接口。

## 如何将数据传输到 Home Assistant
如果你想将电池数据从 ioBroker 传输到已有的 Home Assistant 实例，可以通过 MQTT 协议轻松实现：

1. **在 ioBroker 中安装 MQTT 客户端适配器**：
   * 在 ioBroker 管理后台中，搜索并安装 **mqtt-client** 适配器。
   * 配置该适配器连接到你已有的 Home Assistant MQTT 代理（broker）。
2. **启用 BMS 数据对象的 MQTT 发布**：
   * 导航至 ioBroker 管理后台的**对象 (Objects)**标签页。
   * 展开 `gobel-bms-monitor.<实例>` 文件夹结构，找到你想发布的对应状态 data。
   * 点击该状态数据行最右侧的**自定义设置（齿轮图标）**。
   * 启用 **mqtt-client** 设置，勾选**启用**，并确保 **发布 (Publish)** 选项已激活。
   * 保存设置。此时 ioBroker 将自动把这些电池状态发布到你的 Home Assistant MQTT 服务器中。

## 许可证
Apache License 2.0 (Copyright 2026 fancyui)
