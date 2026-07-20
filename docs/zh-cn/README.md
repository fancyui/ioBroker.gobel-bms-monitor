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
此适配器在后台运行一个轻量级的 Python 3 守护进程来与电池 BMS 通信。系统需要安装 **Python（3.8 或更高版本）** 以及 **pyserial** 依赖库。

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

## BMS 功能与遥测数据支持矩阵

可用的遥测数据和配置参数取决于你的电池硬件所支持的 BMS 型号与协议：

| 遥测数据 / 参数名称 | Pace BMS (RS232/RS485/WiFi) | JK BMS (55AA 协议) | TDT BMS (RS232) |
| :--- | :---: | :---: | :---: |
| 电压、电流、功率、SoC、SoH | ✅ | ✅ | ✅ |
| 剩余容量 / 满容量 / 设计容量 | ✅ | ✅ | ✅ |
| 循环次数 | ✅ | ✅ | ✅ |
| 各单体电池电压及极值/极差 | ✅ | ✅ | ✅ |
| 温度传感器 (单体 / 环境) | ✅ | ✅ | ✅ |
| MOSFET 板温传感器 | ✅ | ✅ | ✅ |
| 充/放电 MOS 控制开关状态 | ✅ | ✅ | ❌ |
| 主动均衡电流与触发设置 | ❌ | ✅ | ❌ |
| 累积充放电能量 (Wh) | ✅ | ❌ | ✅ |
| 电池单体内阻 (mΩ) | ❌ | ✅ | ❌ |
| 完整告警状态 (过压/欠压/过温/低温/过流) | ✅ | ✅ | ✅ |

## 遥测与传感器字段含义对照表

以下是关键传感器状态的参考列表，标注了其所归属的 BMS 协议、具体物理含义及单位：

| 状态 Key / 字段名 | 友好名称 (Friendly Name) | 单位 / 类型 | 所属 BMS 协议 | 物理含义与区别说明 |
| :--- | :--- | :---: | :---: | :--- |
| `view_voltage` | Voltage | V (伏特) | 全部 (Pace / JK / TDT) | **遥测数据**：电池包总电压。 |
| `view_current` | Current | A (安培) | 全部 (Pace / JK / TDT) | **遥测数据**：电池包总电流（正值：充电，负值：放电）。 |
| `view_power` | Power | kW (千瓦) | 全部 (Pace / JK / TDT) | **遥测数据**：实时总功率。 |
| `view_SOC` | State of Charge (SOC) | % | 全部 (Pace / JK / TDT) | **遥测数据**：电池剩余电量百分比 (0-100%)。 |
| `view_SOH` | State of Health (SOH) | % | 全部 (Pace / JK / TDT) | **遥测数据**：电池健康度百分比 (0-100%)。 |
| `view_remain_capacity` | Remaining Capacity | Ah (安时) | 全部 (Pace / JK / TDT) | **遥测数据**：电池当前剩余容量。 |
| `view_full_capacity` | Full Charge Capacity | Ah (安时) | 全部 (Pace / JK / TDT) | **遥测数据**：电池满充容量。 |
| `view_design_capacity` | Design Capacity | Ah (安时) | 全部 (Pace / JK / TDT) | **遥测数据**：出厂标称设计容量。 |
| `view_cycle_number` | Cycle Count | 次 | 全部 (Pace / JK / TDT) | **统计数据**：累计充放电循环次数。 |
| `cell_voltages` | Cell Voltages | mV (毫伏) | 全部 (Pace / JK / TDT) | **遥测数据**：各单体电池电压（自动展开为 `cells.cell_XX`）。 |
| `temperatures` | Temperatures | °C | 全部 (Pace / JK / TDT) | **遥测数据**：各温度传感器数值（自动展开为 `temperatures.temp_XX`）。 |
| `view_energy_charged` | Interval Charged Energy | Wh (瓦时) | Pace / TDT | **轮询增量**：单次轮询间隔内（如 5 秒内）计算出的充电能量。 |
| `view_energy_discharged` | Interval Discharged Energy | Wh (瓦时) | Pace / TDT | **轮询增量**：单次轮询间隔内（如 5 秒内）计算出的放电能量。 |
| `charge_mos_state` | Charge MOSFET Control State | 布尔值 | Pace / JK | **硬件控制**：充电 MOS 开关导通状态 (True: 开启 / False: 关闭)。 |
| `discharge_mos_state` | Discharge MOSFET Control State | 布尔值 | Pace / JK | **硬件控制**：放电 MOS 开关导通状态 (True: 开启 / False: 关闭)。 |
| `view_bat_charge_en` | Battery Charge Enable Setting | 0 / 1 | JK BMS | **BMS 内部设置**：逻辑上是否允许充电 (1: 允许 / 0: 禁止)。 |
| `view_bat_discharge_en` | Battery Discharge Enable Setting | 0 / 1 | JK BMS | **BMS 内部设置**：逻辑上是否允许放电 (1: 允许 / 0: 禁止)。 |
| `view_charger_plugged` | Charger Connection Status | 0 / 1 | JK BMS | **物理检测**：是否物理检测到充电插头接入 (1: 已插入 / 0: 未插入)。 |
| `view_vol_charge_cur` | Charge Current Sensor Voltage | mV (毫伏) | JK BMS | **传感器 AD 电压**：充电电流传感器的原始采样电压。 |
| `view_vol_discharge_cur` | Discharge Current Sensor Voltage | mV (毫伏) | JK BMS | **传感器 AD 电压**：放电电流传感器的原始采样电压。 |
| `view_balan_en` | Active Balance Enable Setting | 0 / 1 | JK BMS | **BMS 内部设置**：主动均衡功能使能开关 (1: 开启 / 0: 关闭)。 |
| `view_cur_balan_max` | Max Active Balance Current | A (安培) | JK BMS | **均衡参数**：均衡器最大均衡电流。 |
| `view_vol_start_balan` | Balance Trigger Voltage Threshold | V (伏特) | JK BMS | **均衡阈值**：触发主动均衡的起始单体电压。 |
| `cell_resistances` | Cell Resistances | mΩ (毫欧) | JK BMS | **内部电阻**：各单体电池内阻（自动展开为 `cell_resistances.cell_res_XX`）。 |
| `view_temp_mos` | MOSFET Temperature | °C | 全部 (Pace / JK / TDT) | **遥测数据**：MOS 功率管表面温度。 |
| `view_heating_state` | Heating Control State | 0 / 1 | JK BMS | **控制状态**：加热膜是否正在加热 (1: 加热中 / 0: 关闭)。 |
| `view_heat_current` | Heating Current | A (安培) | JK BMS | **遥测数据**：加热膜工作电流。 |
| `define_number_p` | Parallel Pack Count Definition | 数字 | Pace BMS | **BMS 配置**：硬件设定的并联电池包数量。 |

### `view_energy_charged` 与 `view_energy_discharged` 到底是什么？

**核心概念定义**：绝大部分 BMS 硬件与通讯协议**本身并不存储硬件级别的永久累计电能表（kWh）**。因此，`view_energy_charged` 与 `view_energy_discharged` **绝对不是电池出厂至今的硬件总累计电量**。

它们是适配器软件**根据当前轮询时间间隔（如 5 秒内）按瞬时功率计算出的单次电量增量**：

$$\Delta E = |P| \times \Delta t \times \frac{1000}{3600} \text{ (Wh)}$$

- **这两个值的真正含义**：适配器每次向 BMS 轮询数据时，根据当前读到的实时功率 $P$（kW）与距离上次轮询的时间差 $\Delta t$（秒，如 5s），计算出**这 5 秒内充入或放出的微小电量增量（单位：瓦时 Wh）**（或在部分驱动中为软件运行期间的临时内存累积）。
- **用户必须自行累加总电量**：因为这两个值仅代表单次轮询间隔（如 5 秒）的短时电量增量（且适配器重启后内存计数会重置），**如果用户需要获得电池每日、每月或累计总充放电量（kWh），必须由用户在智能家居平台端自行将该增量进行持久化累加**：
  - **在 Home Assistant 中**：建议使用官方 **`utility_meter`**（实用程序仪表）或 **`integration`**（黎曼积分）传感器，将功率/增量电量传感器累加生成永久的日/月/总电量 kWh 实体。
  - **在 ioBroker 中**：建议使用 **Statistics**（统计）、**History**（历史记录）或 **SQL 数据库**适配器对该增量值进行持久化求和与累加存储。

## 实用技巧：在 ioBroker 中处理并转发数组型传感器至 Home Assistant

虽然适配器已自动将 `cell_voltages`（电压）、`temperatures`（温度）和 `cell_resistances`（内阻）展开为独立的单体对象（如 `cell_res_01`, `cell_res_02`），但如果你想在通过 MQTT 转发到 Home Assistant 之前对数组数据进行自定义映射，亦可在 ioBroker 中创建 **Alias（别名）**。

创建数组索引 0 (`val[0]`) 的别名步骤：
1. 在 ioBroker 管理后台中，打开**对象 (Objects)**标签页。
2. 在 `alias.0` 下新建一个状态对象（例如 `alias.0.gobel-bms-monitor.0.pack_00.cell_res_01`）。
3. 将该对象的 JSON 定义配置如下：

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

## 许可证
Apache License 2.0 (Copyright 2026 fancyui)
