const utils = require('@iobroker/adapter-core');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

class GobelBmsMonitor extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'gobel-bms-monitor',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
        
        this.pythonProcess = null;
        this.reconnectTimeout = null;
        this.isUnloading = false;
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Reset connection status on startup
        await this.setStateAsync('info.connection', false, true);

        // Start the Python reader subprocess
        this.startPythonProcess();
    }

    /**
     * Gets the persistent directory for the portable Python environment.
     * @returns {string}
     */
    getPersistentPythonDir() {
        const parentDir = path.dirname(__dirname); // e.g. <ioBroker-root>/node_modules
        const grandParentDir = path.dirname(parentDir); // e.g. <ioBroker-root>
        const ioBrokerDataDir = path.join(grandParentDir, 'iobroker-data');
        if (fs.existsSync(ioBrokerDataDir)) {
            return path.join(ioBrokerDataDir, 'gobel-bms-monitor-python');
        }
        return path.join(__dirname, 'python-embed');
    }

    /**
     * Resolves the python executable path using platform defaults, Registry checks, and folder scans.
     * @returns {Promise<string>}
     */
    async resolvePythonPath() {
        if (this.config.pythonPath && this.config.pythonPath.trim()) {
            return this.config.pythonPath.trim();
        }

        const defaultCmd = process.platform === 'win32' ? 'python' : 'python3';

        // Check if defaultCmd is directly executable in the current environment
        const isDefaultAvailable = await this.checkCommandAvailable(defaultCmd);
        if (isDefaultAvailable) {
            return defaultCmd;
        }

        // Alternate check (python3 on Windows or python on Linux)
        const altCmd = defaultCmd === 'python' ? 'python3' : 'python';
        const isAltAvailable = await this.checkCommandAvailable(altCmd);
        if (isAltAvailable) {
            return altCmd;
        }

        // If on Windows, check registry, common folders, or downloaded embeddable Python
        if (process.platform === 'win32') {
            // First check if already downloaded in the persistent directory
            const persistentPythonDir = this.getPersistentPythonDir();
            const embedExe = path.join(persistentPythonDir, 'python.exe');
            if (fs.existsSync(embedExe)) {
                return embedExe;
            }

            this.log.info('Python command not in system PATH. Scanning Windows Registry & directories...');
            try {
                const registryPath = await this.findPythonInRegistry();
                if (registryPath && await this.checkCommandAvailable(registryPath)) {
                    this.log.info(`Found functional Python in Windows Registry: "${registryPath}"`);
                    return registryPath;
                }
            } catch (err) {
                this.log.debug(`Registry scan error: ${err.message}`);
            }

            try {
                const directoryPath = await this.findPythonInCommonDirectories();
                if (directoryPath && await this.checkCommandAvailable(directoryPath)) {
                    this.log.info(`Found functional Python in common directory: "${directoryPath}"`);
                    return directoryPath;
                }
            } catch (err) {
                this.log.debug(`Directory scan error: ${err.message}`);
            }

            // If still not found, try to download portable Python automatically
            try {
                const downloadedExe = await this.setupPortablePython();
                return downloadedExe;
            } catch (err) {
                this.log.error(`Auto-download of portable Python failed: ${err.message}. System is offline or server unreachable.`);
            }
        }

        return defaultCmd; // Fallback to default
    }

    /**
     * Downloads a file from a URL to a local path, handling redirects.
     * @param {string} url 
     * @param {string} destPath 
     * @returns {Promise<void>}
     */
    downloadFile(url, destPath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destPath);
            const request = https.get(url, (response) => {
                // Handle HTTP redirects (301, 302, 303, 307, 308)
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    file.close();
                    fs.unlink(destPath, () => {});
                    this.downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
                    return;
                }
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(destPath, () => {});
                    reject(new Error(`Failed to download from ${url}: Status Code ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            });
            request.on('error', (err) => {
                file.close();
                fs.unlink(destPath, () => {});
                reject(err);
            });
            // Set timeout of 30 seconds
            request.setTimeout(30000, () => {
                request.destroy();
                file.close();
                fs.unlink(destPath, () => {});
                reject(new Error(`Timeout downloading from ${url}`));
            });
        });
    }

    /**
     * Extracts a zip archive on Windows using PowerShell.
     * @param {string} zipPath 
     * @param {string} destDir 
     * @returns {Promise<void>}
     */
    unzipFile(zipPath, destDir) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            // Double escape single quotes for PowerShell
            const escapedZipPath = zipPath.replace(/'/g, "''");
            const escapedDestDir = destDir.replace(/'/g, "''");
            const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${escapedZipPath}' -DestinationPath '${escapedDestDir}' -Force"`;
            
            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    reject(new Error(`PowerShell Expand-Archive failed: ${stderr || err.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Gets the latest pyserial wheel URL from PyPI JSON API.
     * @returns {Promise<string>}
     */
    getPyserialUrl() {
        return new Promise((resolve, reject) => {
            https.get('https://pypi.org/pypi/pyserial/json', (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`PyPI API returned status code ${res.statusCode}`));
                    return;
                }
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const wheel = json.urls.find(item => item.filename && item.filename.endsWith('.whl'));
                        if (wheel && wheel.url) {
                            resolve(wheel.url);
                        } else {
                            reject(new Error('Could not find pyserial wheel file in PyPI response'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Downloads and sets up the portable Python environment and pyserial.
     * @returns {Promise<string>} Path to the downloaded python.exe
     */
    async setupPortablePython() {
        const pythonDir = this.getPersistentPythonDir();
        const pythonExe = path.join(pythonDir, 'python.exe');
        
        if (fs.existsSync(pythonExe)) {
            return pythonExe;
        }

        this.log.info('--- Portable Python Setup Started ---');
        this.log.info('No Python installation (>= 3.8) was found on this Windows system.');
        this.log.info('The adapter will now automatically download and set up a portable Python 3.11 environment...');

        const arch = process.arch === 'x64' ? 'amd64' : 'win32';
        const pythonUrl = `https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-${arch}.zip`;
        
        let pyserialUrl = '';
        try {
            this.log.info('Fetching latest pyserial release URL from PyPI...');
            pyserialUrl = await this.getPyserialUrl();
        } catch (e) {
            this.log.warn(`Failed to fetch pyserial URL from PyPI API: ${e.message}. Falling back to default URL.`);
            pyserialUrl = 'https://files.pythonhosted.org/packages/07/bc/587a445451b253b285629263eb51c2d8e9bcea4fc97826266d186f96f558/pyserial-3.5-py2.py3-none-any.whl';
        }

        const tempDir = path.join(__dirname, 'python-temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const pythonZip = path.join(tempDir, 'python-embed.zip');
        const pyserialZip = path.join(tempDir, 'pyserial.zip');

        try {
            // 1. Download Python embeddable zip
            this.log.info(`Downloading portable Python 3.11.9 (${arch}) from Python.org...`);
            await this.downloadFile(pythonUrl, pythonZip);
            this.log.info('Python zip downloaded successfully. Extracting to adapter folder...');

            // 2. Extract Python zip
            await this.unzipFile(pythonZip, pythonDir);
            this.log.info('Python extracted successfully.');

            // 3. Download pyserial wheel
            this.log.info(`Downloading pyserial library from PyPI: ${pyserialUrl}`);
            await this.downloadFile(pyserialUrl, pyserialZip);
            this.log.info('Pyserial downloaded successfully. Extracting to local libraries...');

            // 4. Extract pyserial wheel (which is a zip)
            const pyserialExtractDir = path.join(tempDir, 'pyserial-extract');
            await this.unzipFile(pyserialZip, pyserialExtractDir);

            // 5. Copy the serial folder to pythonDir/serial
            const serialSrc = path.join(pyserialExtractDir, 'serial');
            const serialDest = path.join(pythonDir, 'serial');
            if (fs.existsSync(serialSrc)) {
                if (fs.existsSync(serialDest)) {
                    fs.rmSync(serialDest, { recursive: true, force: true });
                }
                fs.renameSync(serialSrc, serialDest);
                this.log.info('Pyserial library integrated into adapter library path.');
            } else {
                throw new Error('Could not find serial folder inside downloaded pyserial wheel');
            }

            this.log.info('--- Portable Python Setup Completed Successfully ---');
            return pythonExe;
        } catch (err) {
            this.log.error(`Failed to set up portable Python environment automatically: ${err.message}`);
            this.log.error('Please configure Python manually or refer to the settings page instructions.');
            // Clean up any partial install
            try {
                if (fs.existsSync(pythonDir)) {
                    fs.rmSync(pythonDir, { recursive: true, force: true });
                }
            } catch (e) {}
            throw err;
        } finally {
            // Clean up temporary files
            try {
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
            } catch (e) {}
        }
    }

    /**
     * Checks if a command can be executed without error (not throwing ENOENT) and has pyserial available
     * @param {string} cmd 
     * @returns {Promise<boolean>}
     */
    checkCommandAvailable(cmd) {
        return new Promise((resolve) => {
            try {
                const libPath = path.join(__dirname, 'lib').replace(/\\/g, '/').replace(/'/g, "\\'");
                const checkScript = `import sys; sys.path.insert(0, '${libPath}'); import serial`;
                const p = spawn(cmd, ['-c', checkScript]);
                p.on('error', () => {
                    resolve(false);
                });
                p.stdout.on('data', () => {});
                p.stderr.on('data', () => {});
                p.on('close', (code) => {
                    resolve(code === 0 || code === null);
                });
                // Force timeout in case it hangs
                const timeout = setTimeout(() => {
                    try { p.kill(); } catch (e) {}
                    resolve(false);
                }, 2000);
                p.on('exit', () => clearTimeout(timeout));
            } catch (e) {
                resolve(false);
            }
        });
    }

    /**
     * Queries Windows Registry to find Python installations
     * @returns {Promise<string|null>}
     */
    findPythonInRegistry() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            const queries = [
                'reg query HKCU\\Software\\Python\\PythonCore /s /ve',
                'reg query HKLM\\Software\\Python\\PythonCore /s /ve'
            ];

            let pending = queries.length;
            const foundPaths = [];

            queries.forEach(cmd => {
                exec(cmd, (err, stdout) => {
                    if (!err && stdout) {
                        const lines = stdout.split('\r\n');
                        let isInstallPathSection = false;
                        for (let line of lines) {
                            line = line.trim();
                            if (line.startsWith('HKEY_') && line.endsWith('\\InstallPath')) {
                                isInstallPathSection = true;
                            } else if (line.startsWith('HKEY_')) {
                                isInstallPathSection = false;
                            } else if (isInstallPathSection && line.includes('REG_SZ')) {
                                const parts = line.split('REG_SZ');
                                if (parts.length > 1) {
                                    const dir = parts[1].trim();
                                    if (dir) {
                                        const exe = path.join(dir, 'python.exe');
                                        if (fs.existsSync(exe)) {
                                            foundPaths.push(exe);
                                        }
                                    }
                                }
                                isInstallPathSection = false;
                            }
                        }
                    }
                    pending--;
                    if (pending === 0) {
                        resolve(foundPaths.length > 0 ? foundPaths[0] : null);
                    }
                });
            });
        });
    }

    /**
     * Checks common AppData and Program Files directories for Python installation
     * @returns {Promise<string|null>}
     */
    async findPythonInCommonDirectories() {
        const userProfile = process.env.USERPROFILE;
        const searchRoots = [];
        
        if (userProfile) {
            searchRoots.push(path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python'));
            searchRoots.push(path.join(userProfile, 'AppData', 'Local', 'Python'));
        }
        searchRoots.push('C:\\Program Files\\Python');
        searchRoots.push('C:\\Program Files (x86)\\Python');
        searchRoots.push('C:\\Python');

        for (const root of searchRoots) {
            if (!fs.existsSync(root)) continue;
            try {
                const subdirs = fs.readdirSync(root);
                for (const subdir of subdirs) {
                    const fullSubdirPath = path.join(root, subdir);
                    if (fs.statSync(fullSubdirPath).isDirectory()) {
                        const exePath = path.join(fullSubdirPath, 'python.exe');
                        if (fs.existsSync(exePath)) {
                            return exePath;
                        }
                        const binExePath = path.join(fullSubdirPath, 'bin', 'python.exe');
                        if (fs.existsSync(binExePath)) {
                            return binExePath;
                        }
                    }
                }
            } catch (e) {
                // Ignore folder read errors
            }
        }

        return null;
    }

    /**
     * Spawns the python helper process to periodically poll the BMS
     */
    async startPythonProcess() {
        if (this.isUnloading) return;

        this.log.info('Resolving Python environment path...');
        const pythonCmd = await this.resolvePythonPath();

        this.log.info('Starting Gobel BMS Reader Python process...');

        const scriptPath = path.join(__dirname, 'lib', 'gobel_reader.py');

        // Build CLI arguments matching standard gobel_reader.py Options
        const args = [
            scriptPath,
            '--interface', this.config.connectionType || 'serial',
            '--port', this.config.batteryPort || 'rs232',
            '--bms_type', this.config.bmsType || 'PACE_LV',
            '--refresh', String(this.config.refreshInterval || 5),
            '--max_parallel', String(this.config.maxParallel || 16),
            '--jk_start', this.config.jkDisplayIndexStart || '01',
        ];

        if (this.config.connectionType === 'serial') {
            args.push('--serial_port', this.config.serialPort || '/dev/ttyUSB0');
            args.push('--baud_rate', String(this.config.baudRate || 115200));
        } else {
            args.push('--ip_address', this.config.ipAddress || '');
            args.push('--ip_port', String(this.config.ipPort || 8899));
        }

        if (this.config.debug) {
            args.push('--debug');
        }

        this.log.info(`Spawning Python process: "${pythonCmd}" with args: ${args.join(' ')}`);

        try {
            this.pythonProcess = spawn(pythonCmd, args, {
                cwd: path.join(__dirname, 'lib'),
                env: process.env
            });

            let buffer = '';

            // Handle standard output (telemetry JSON stream)
            this.pythonProcess.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                
                // Keep unfinished last line in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    // If it is a JSON line, parse it
                    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                        try {
                            const payload = JSON.parse(trimmed);
                            this.handleBmsData(payload);
                        } catch (err) {
                            this.log.warn(`Failed to parse JSON telemetry line: "${trimmed}". Error: ${err.message}`);
                        }
                    } else {
                        // Regular print statements (logs) from python script
                        this.log.info(`[Python stdout] ${trimmed}`);
                    }
                }
            });

            // Handle errors written to stderr
            this.pythonProcess.stderr.on('data', (data) => {
                const errText = data.toString().trim();
                if (errText) {
                    // Python basic logs printed to stderr go into info log, traceback goes to error log
                    if (errText.includes('Traceback') || errText.includes('Error') || errText.includes('Exception')) {
                        this.log.error(`[Python stderr] ${errText}`);
                    } else {
                        this.log.info(`[Python stderr] ${errText}`);
                    }
                }
            });

            // Handle process exits
            this.pythonProcess.on('exit', (code, signal) => {
                this.log.warn(`Python BMS reader exited with code ${code} (Signal: ${signal})`);
                this.pythonProcess = null;
                this.setState('info.connection', false, true);

                if (!this.isUnloading) {
                    this.log.info('Restarting Python process in 10 seconds...');
                    this.reconnectTimeout = setTimeout(() => this.startPythonProcess(), 10000);
                }
            });

            // Handle spawn errors (e.g. command not found)
            this.pythonProcess.on('error', (err) => {
                this.log.error(`=============================================================================`);
                this.log.error(`FAILED TO START PYTHON CHILD PROCESS ("${pythonCmd}"): ${err.message}`);
                this.log.error(`This adapter requires Python (version 3.8 or higher) and pyserial.`);
                this.log.error(`-----------------------------------------------------------------------------`);
                this.log.error(`[INSTALLATION INSTRUCTIONS / 安装与启用指南]`);
                this.log.error(`-----------------------------------------------------------------------------`);
                this.log.error(`1. Linux / Raspberry Pi OS (树莓派 / 传统 Linux 系统):`);
                this.log.error(`   Please run the following commands via SSH / 请连接 SSH 执行以下命令:`);
                this.log.error(`   sudo apt-get update`);
                this.log.error(`   sudo apt-get install -y python3 python3-venv python3-serial`);
                this.log.error(`-----------------------------------------------------------------------------`);
                this.log.error(`2. Docker Container (Docker 容器环境, 如群晖 Synology / 威联通 QNAP / 树莓派 Docker):`);
                this.log.error(`   In your container settings (Portainer / Docker Compose / Synology UI),`);
                this.log.error(`   add "python3 python3-pip python3-serial" to the "PACKAGES" environment variable.`);
                this.log.error(`   在容器环境变量(Environment)中添加/修改: PACKAGES = python3 python3-pip python3-serial (容器会自动在启动时安装)`);
                this.log.error(`-----------------------------------------------------------------------------`);
                this.log.error(`3. Windows (Windows 系统手动安装):`);
                this.log.error(`   - Download Python (3.8+) from https://www.python.org/downloads/`);
                this.log.error(`   - Run the installer and CRITICALLY check the box: "Add Python to PATH"`);
                this.log.error(`   - After installation, run in CMD: "pip install pyserial"`);
                this.log.error(`   - 访问 Python 官网下载并运行安装包，请务必勾选 "Add Python to PATH" 选项！安装后在 CMD 运行: pip install pyserial`);
                this.log.error(`   - Or manually configure the exact "Python Path / Command" in adapter settings.`);
                this.log.error(`=============================================================================`);
            });

        } catch (err) {
            this.log.error(`Exception spawned during process initialization: ${err.message}`);
        }
    }

    /**
     * Parses payload received from standard output of python process
     * @param {object} payload 
     */
    async handleBmsData(payload) {
        if (!payload || !payload.type || !payload.data) return;

        this.log.debug(`BMS payload received: type=${payload.type}`);

        // Update connection state to true
        await this.setStateAsync('info.connection', true, true);

        if (payload.type === 'status') {
            this.log.info(`BMS status update: ${payload.data}`);
            return;
        }

        const data = payload.data;
        const packs = Array.isArray(data) ? data : [data];

        for (let i = 0; i < packs.length; i++) {
            const pack = packs[i];
            
            // Resolve pack index / number. JKBMS uses pack_id inside the dict.
            // PACE RS485 and TDT use 'pack_index' injected by gobel_reader.py.
            // Default to i + 1 if unspecified.
            let packIdx = i + 1;
            if (pack.pack_index !== undefined) {
                packIdx = pack.pack_index;
            } else if (pack.pack_id !== undefined) {
                // If it is a string like "pack_0" or number
                if (typeof pack.pack_id === 'string' && pack.pack_id.includes('_')) {
                    const parts = pack.pack_id.split('_');
                    packIdx = parseInt(parts[parts.length - 1], 10);
                } else {
                    packIdx = parseInt(pack.pack_id, 10);
                }
            }

            // Convert JKBMS 0-based pack index to match user-configured index offset if needed
            // Actually gobel_reader.py already passes the pack_index_start to JKBMS485,
            // which makes pack.pack_id contain the offset.

            const packId = `pack_${String(packIdx).padStart(2, '0')}`;

            if (payload.type === 'analog') {
                await this.updatePackAnalog(packId, pack);
            } else if (payload.type === 'warning') {
                await this.updatePackWarning(packId, pack);
            }
        }
    }

    /**
     * Dynamically creates states and updates analog telemetry values
     */
    async updatePackAnalog(packId, pack) {
        // Ensure the Pack channel exists
        await this.setObjectNotExistsAsync(packId, {
            type: 'channel',
            common: { name: `Battery Pack ${packId.replace('pack_', '')}` },
            native: {}
        });

        // Field configurations mapping python dict key to state config
        const fieldDefinitions = {
            // General Telemetry
            'view_num_cells': { name: 'Number of Cells', type: 'number', role: 'info.value', unit: 'cells' },
            'cell_voltage_max': { name: 'Max Cell Voltage', type: 'number', role: 'value.voltage', unit: 'mV' },
            'cell_voltage_min': { name: 'Min Cell Voltage', type: 'number', role: 'value.voltage', unit: 'mV' },
            'cell_voltage_max_index': { name: 'Max Cell Voltage Index', type: 'number', role: 'info.value' },
            'cell_voltage_min_index': { name: 'Min Cell Voltage Index', type: 'number', role: 'info.value' },
            'cell_voltage_diff': { name: 'Cell Voltage Difference', type: 'number', role: 'value.voltage', unit: 'mV' },
            'cell_voltage_avg': { name: 'Average Cell Voltage', type: 'number', role: 'value.voltage', unit: 'mV' },
            'view_num_temps': { name: 'Number of Temp Sensors', type: 'number', role: 'info.value', unit: 'sensors' },
            'view_current': { name: 'Current', type: 'number', role: 'value.current', unit: 'A' },
            'view_voltage': { name: 'Voltage', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_power': { name: 'Power', type: 'number', role: 'value.power', unit: 'kW' },
            'view_energy_charged': { name: 'Interval Charged Energy', type: 'number', role: 'value.energy', unit: 'Wh' },
            'view_energy_discharged': { name: 'Interval Discharged Energy', type: 'number', role: 'value.energy', unit: 'Wh' },
            'view_remain_capacity': { name: 'Remaining Capacity', type: 'number', role: 'value.capacity', unit: 'Ah' },
            'view_full_capacity': { name: 'Full Charge Capacity', type: 'number', role: 'value.capacity', unit: 'Ah' },
            'view_design_capacity': { name: 'Design Capacity', type: 'number', role: 'value.capacity', unit: 'Ah' },
            'view_SOC': { name: 'State of Charge (SOC)', type: 'number', role: 'value.battery', unit: '%' },
            'view_SOH': { name: 'State of Health (SOH)', type: 'number', role: 'value.battery', unit: '%' },
            'view_cycle_number': { name: 'Cycle Count', type: 'number', role: 'value.history', unit: 'cycles' },
            'define_number_p': { name: 'Parallel Pack Count Definition', type: 'number', role: 'info.value' },
            'hardware_version': { name: 'Hardware Version', type: 'string', role: 'info.hardware' },
            'software_version': { name: 'Software Version', type: 'string', role: 'info.software' },

            // MOS & Physical Controls / Statuses
            'charge_mos_state': { name: 'Charge MOSFET Control State', type: 'boolean', role: 'indicator.status' },
            'discharge_mos_state': { name: 'Discharge MOSFET Control State', type: 'boolean', role: 'indicator.status' },
            'view_bat_charge_en': { name: 'Battery Charge Enable Setting', type: 'number', role: 'info.status' },
            'view_bat_discharge_en': { name: 'Battery Discharge Enable Setting', type: 'number', role: 'info.status' },
            'view_charger_plugged': { name: 'Charger Connection Status', type: 'number', role: 'indicator.connected' },
            'view_vol_charge_cur': { name: 'Charge Current Sensor Voltage', type: 'number', role: 'value.voltage', unit: 'mV' },
            'view_vol_discharge_cur': { name: 'Discharge Current Sensor Voltage', type: 'number', role: 'value.voltage', unit: 'mV' },
            'view_vol_bat_cur_correct': { name: 'Battery Current Calibration Value', type: 'number', role: 'info.value' },
            'view_bat_vol_correct': { name: 'Battery Voltage Calibration Value', type: 'number', role: 'info.value' },
            'view_heating_state': { name: 'Heating Control State', type: 'number', role: 'info.status' },
            'view_heat_current': { name: 'Heating Current', type: 'number', role: 'value.current', unit: 'A' },
            'view_temp_mos': { name: 'MOSFET Temperature', type: 'number', role: 'value.temperature', unit: '°C' },

            // Balance Settings & Statuses
            'view_balan_en': { name: 'Active Balance Enable Setting', type: 'number', role: 'info.status' },
            'view_cur_balan_max': { name: 'Max Active Balance Current', type: 'number', role: 'value.current', unit: 'A' },
            'view_vol_start_balan': { name: 'Balance Trigger Voltage Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_balan_trig': { name: 'Balance Trigger Voltage Delta', type: 'number', role: 'value.voltage', unit: 'mV' },

            // Protection Voltage & Capacity Settings
            'view_vol_cell_ovp': { name: 'Cell Overvoltage Protection Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_cell_ovpr': { name: 'Cell Overvoltage Protection Recovery', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_cell_uvp': { name: 'Cell Undervoltage Protection Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_cell_uvpr': { name: 'Cell Undervoltage Protection Recovery', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_bat_ovp': { name: 'Pack Overvoltage Protection Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_bat_uvp': { name: 'Pack Undervoltage Protection Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_sys_pwr_off': { name: 'System Power Off Voltage Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_smart_sleep': { name: 'Smart Sleep Voltage Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_soc_100': { name: '100% SOC Voltage Threshold', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_vol_soc_0': { name: '0% SOC Voltage Threshold', type: 'number', role: 'value.voltage', unit: 'V' },

            // Protection Current & Delay Settings
            'view_cur_bat_c_oc': { name: 'Charge Overcurrent Protection Threshold', type: 'number', role: 'value.current', unit: 'A' },
            'view_tim_bat_c_ocp_dly': { name: 'Charge Overcurrent Protection Delay', type: 'number', role: 'value.interval', unit: 's' },
            'view_tim_bat_c_ocpr_dly': { name: 'Charge Overcurrent Recovery Delay', type: 'number', role: 'value.interval', unit: 's' },
            'view_cur_bat_dc_oc': { name: 'Discharge Overcurrent Protection Threshold', type: 'number', role: 'value.current', unit: 'A' },
            'view_tim_bat_dc_ocp_dly': { name: 'Discharge Overcurrent Protection Delay', type: 'number', role: 'value.interval', unit: 's' },
            'view_tim_bat_dc_ocpr_dly': { name: 'Discharge Overcurrent Recovery Delay', type: 'number', role: 'value.interval', unit: 's' },
            'view_scp_delay': { name: 'Short Circuit Protection Delay', type: 'number', role: 'value.interval', unit: 'us' },
            'view_tim_bat_scpr_dly': { name: 'Short Circuit Protection Recovery Delay', type: 'number', role: 'value.interval', unit: 's' },

            // Protection Temperature Settings
            'view_tmp_bat_cot': { name: 'Charge Overtemperature Protection Threshold', type: 'number', role: 'value.temperature', unit: '°C' },
            'view_tmp_bat_cotpr': { name: 'Charge Overtemperature Recovery Threshold', type: 'number', role: 'value.temperature', unit: '°C' },
            'view_tmp_bat_dot': { name: 'Discharge Overtemperature Protection Threshold', type: 'number', role: 'value.temperature', unit: '°C' },
            'view_tmp_bat_dotpr': { name: 'Discharge Overtemperature Recovery Threshold', type: 'number', role: 'value.temperature', unit: '°C' },
            'view_tmp_bat_cut': { name: 'Charge Undertemperature Protection Threshold', type: 'number', role: 'value.temperature', unit: '°C' },
            'view_tmp_bat_cutpr': { name: 'Charge Undertemperature Recovery Threshold', type: 'number', role: 'value.temperature', unit: '°C' },
            'view_tmp_mos_otp': { name: 'MOSFET Overtemperature Protection Threshold', type: 'number', role: 'value.temperature', unit: '°C' },
            'view_tmp_mos_otpr': { name: 'MOSFET Overtemperature Recovery Threshold', type: 'number', role: 'value.temperature', unit: '°C' },

            // Setup / Configuration info
            'view_setup_cell_count': { name: 'Configured Cell Count', type: 'number', role: 'info.value', unit: 'cells' },
            'view_cap_bat_cell': { name: 'Configured Battery Cell Capacity', type: 'number', role: 'value.capacity', unit: 'Ah' },
            'view_dev_addr': { name: 'Device Communication Address', type: 'number', role: 'info.address' },
            'view_tim_precharge': { name: 'Precharge Time Duration', type: 'number', role: 'value.interval', unit: 'ms' },
            'view_tim_smart_sleep': { name: 'Smart Sleep Time Delay', type: 'number', role: 'value.interval', unit: 'h' },
            'view_func_bit_field': { name: 'Function Bit Field Configuration', type: 'number', role: 'info.status' }
        };

        for (const [key, val] of Object.entries(pack)) {
            if (key === 'pack_index' || key === 'pack_id') {
                continue;
            }

            if (key === 'cell_voltages') {
                if (Array.isArray(val)) {
                    const cellsFolderId = `${packId}.cells`;
                    await this.setObjectNotExistsAsync(cellsFolderId, {
                        type: 'folder',
                        common: { name: 'Cell Voltages' },
                        native: {}
                    });

                    for (let c = 0; c < val.length; c++) {
                        const cellId = `${cellsFolderId}.cell_${String(c + 1).padStart(2, '0')}`;
                        await this.setObjectNotExistsAsync(cellId, {
                            type: 'state',
                            common: {
                                name: `Cell ${c + 1} Voltage`,
                                type: 'number',
                                role: 'value.voltage',
                                unit: 'mV',
                                read: true,
                                write: false
                            },
                            native: {}
                        });
                        await this.setStateAsync(cellId, val[c], true);
                    }
                }
            } else if (key === 'temperatures') {
                if (Array.isArray(val)) {
                    const tempsFolderId = `${packId}.temperatures`;
                    await this.setObjectNotExistsAsync(tempsFolderId, {
                        type: 'folder',
                        common: { name: 'Temperatures' },
                        native: {}
                    });

                    for (let t = 0; t < val.length; t++) {
                        const tempId = `${tempsFolderId}.temp_${String(t + 1).padStart(2, '0')}`;
                        await this.setObjectNotExistsAsync(tempId, {
                            type: 'state',
                            common: {
                                name: `Temp Sensor ${t + 1}`,
                                type: 'number',
                                role: 'value.temperature',
                                unit: '°C',
                                read: true,
                                write: false
                            },
                            native: {}
                        });
                        await this.setStateAsync(tempId, val[t], true);
                    }
                }
            } else if (key === 'cell_resistances') {
                if (Array.isArray(val)) {
                    const resFolderId = `${packId}.cell_resistances`;
                    await this.setObjectNotExistsAsync(resFolderId, {
                        type: 'folder',
                        common: { name: 'Cell Resistances' },
                        native: {}
                    });

                    for (let r = 0; r < val.length; r++) {
                        const resId = `${resFolderId}.cell_res_${String(r + 1).padStart(2, '0')}`;
                        await this.setObjectNotExistsAsync(resId, {
                            type: 'state',
                            common: {
                                name: `Cell ${r + 1} Resistance`,
                                type: 'number',
                                role: 'value',
                                unit: 'mΩ',
                                read: true,
                                write: false
                            },
                            native: {}
                        });
                        await this.setStateAsync(resId, val[r], true);
                    }
                }
            } else if (fieldDefinitions[key]) {
                const def = fieldDefinitions[key];
                const stateId = `${packId}.${key}`;
                await this.setObjectNotExistsAsync(stateId, {
                    type: 'state',
                    common: {
                        name: def.name,
                        type: def.type,
                        role: def.role,
                        unit: def.unit,
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(stateId, val, true);
            } else {
                // Dynamically capture any other key-value float/int/strings not defined in mapping
                const isNum = typeof val === 'number';
                const stateId = `${packId}.${key}`;
                await this.setObjectNotExistsAsync(stateId, {
                    type: 'state',
                    common: {
                        name: key.replace(/_/g, ' '),
                        type: isNum ? 'number' : 'string',
                        role: isNum ? 'value' : 'text',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(stateId, val, true);
            }
        }
    }

    /**
     * Dynamically creates states and updates warning / alarm statuses
     */
    async updatePackWarning(packId, pack) {
        await this.setObjectNotExistsAsync(packId, {
            type: 'channel',
            common: { name: `Battery Pack ${packId.replace('pack_', '')}` },
            native: {}
        });

        for (const [key, val] of Object.entries(pack)) {
            if (key === 'pack_index' || key === 'pack_id') {
                continue;
            }

            if (key === 'cell_voltage_warnings' || key === 'temp_sensor_warnings') {
                if (Array.isArray(val)) {
                    const subFolderName = key === 'cell_voltage_warnings' ? 'Cell Voltage Warnings' : 'Temp Sensor Warnings';
                    const prefix = key === 'cell_voltage_warnings' ? 'cell_warning' : 'temp_warning';
                    const folderId = `${packId}.warnings`;

                    await this.setObjectNotExistsAsync(folderId, {
                        type: 'folder',
                        common: { name: 'Warnings' },
                        native: {}
                    });

                    for (let idx = 0; idx < val.length; idx++) {
                        const stateId = `${folderId}.${prefix}_${String(idx + 1).padStart(2, '0')}`;
                        await this.setObjectNotExistsAsync(stateId, {
                            type: 'state',
                            common: {
                                name: `${subFolderName} ${idx + 1}`,
                                type: 'string',
                                role: 'info.status',
                                read: true,
                                write: false
                            },
                            native: {}
                        });
                        await this.setStateAsync(stateId, val[idx], true);
                    }
                }
            } else if (typeof val === 'object' && val !== null) {
                // Dictionaries of alarms (e.g. protect_state_1, fault_state, warn_state_1)
                const folderId = `${packId}.${key}`;
                await this.setObjectNotExistsAsync(folderId, {
                    type: 'folder',
                    common: { name: key.replace(/_/g, ' ') },
                    native: {}
                });

                for (const [subKey, subVal] of Object.entries(val)) {
                    const stateId = `${folderId}.${subKey}`;
                    await this.setObjectNotExistsAsync(stateId, {
                        type: 'state',
                        common: {
                            name: subKey.replace(/_/g, ' '),
                            type: 'boolean',
                            role: 'sensor.alarm',
                            read: true,
                            write: false
                        },
                        native: {}
                    });
                    await this.setStateAsync(stateId, subVal, true);
                }
            } else if (key !== 'cell_number' && key !== 'temp_sensor_number') {
                // Flat warning values (could be string like 'normal', or number like balancing_status_passive_1)
                const folderId = `${packId}.warnings`;
                await this.setObjectNotExistsAsync(folderId, {
                    type: 'folder',
                    common: { name: 'Warnings' },
                    native: {}
                });

                const valType = typeof val;
                let ioBrokerType = 'string';
                let ioBrokerRole = 'info.status';
                if (valType === 'number') {
                    ioBrokerType = 'number';
                    ioBrokerRole = 'value';
                } else if (valType === 'boolean') {
                    ioBrokerType = 'boolean';
                    ioBrokerRole = 'indicator';
                }

                const stateId = `${folderId}.${key}`;
                await this.setObjectNotExistsAsync(stateId, {
                    type: 'state',
                    common: {
                        name: key.replace(/_/g, ' '),
                        type: ioBrokerType,
                        role: ioBrokerRole,
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(stateId, val, true);
            }
        }
    }

    /**
     * Is called when adapter shuts down - cleans up timeouts and processes
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.isUnloading = true;
            this.setState('info.connection', false, true);

            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }

            if (this.pythonProcess) {
                this.log.info('Terminating Gobel BMS Reader Python process...');
                this.pythonProcess.kill('SIGINT');
                this.pythonProcess = null;
            }

            callback();
        } catch (e) {
            callback();
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new GobelBmsMonitor(options);
} else {
    // otherwise start the instance directly
    new GobelBmsMonitor();
}
