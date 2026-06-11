const utils = require('@iobroker/adapter-core');
const { spawn } = require('child_process');
const path = require('path');

class GobelBattery extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'gobel-battery',
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
     * Spawns the python helper process to periodically poll the BMS
     */
    startPythonProcess() {
        if (this.isUnloading) return;

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

        // Determine the Python command to use: user-configured path, or platform default
        const defaultCmd = process.platform === 'win32' ? 'python' : 'python3';
        const pythonCmd = (this.config.pythonPath || defaultCmd).trim();

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
                this.log.error(`Failed to start Python child process using "${pythonCmd}": ${err.message}.`);
                
                // If it failed due to not finding the command (ENOENT) and the user didn't specify a custom path,
                // try to fall back to the alternate standard command name (e.g., python3 on Windows or python on Linux).
                if (err.code === 'ENOENT' && !this.config.pythonPath) {
                    const fallbackCmd = pythonCmd === 'python' ? 'python3' : 'python';
                    this.log.info(`Attempting automatic fallback to command: "${fallbackCmd}"...`);
                    this.attemptFallbackSpawn(fallbackCmd, args);
                } else {
                    this.log.error(`Please verify that Python 3 and pyserial are installed, or configure the correct Python Path in the adapter settings.`);
                }
            });

        } catch (err) {
            this.log.error(`Exception spawned during process initialization: ${err.message}`);
        }
    }

    /**
     * Attempts to spawn the python process with a fallback command in case the default command fails
     * @param {string} fallbackCmd 
     * @param {string[]} args 
     */
    attemptFallbackSpawn(fallbackCmd, args) {
        try {
            this.pythonProcess = spawn(fallbackCmd, args, {
                cwd: path.join(__dirname, 'lib'),
                env: process.env
            });

            let buffer = '';

            this.pythonProcess.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                        try {
                            const payload = JSON.parse(trimmed);
                            this.handleBmsData(payload);
                        } catch (err) {
                            this.log.warn(`Failed to parse JSON telemetry line: "${trimmed}". Error: ${err.message}`);
                        }
                    } else {
                        this.log.info(`[Python stdout] ${trimmed}`);
                    }
                }
            });

            this.pythonProcess.stderr.on('data', (data) => {
                const errText = data.toString().trim();
                if (errText) {
                    if (errText.includes('Traceback') || errText.includes('Error') || errText.includes('Exception')) {
                        this.log.error(`[Python stderr] ${errText}`);
                    } else {
                        this.log.info(`[Python stderr] ${errText}`);
                    }
                }
            });

            this.pythonProcess.on('exit', (code, signal) => {
                this.log.warn(`Python BMS reader exited with code ${code} (Signal: ${signal})`);
                this.pythonProcess = null;
                this.setState('info.connection', false, true);

                if (!this.isUnloading) {
                    this.log.info('Restarting Python process in 10 seconds...');
                    this.reconnectTimeout = setTimeout(() => this.startPythonProcess(), 10000);
                }
            });

            this.pythonProcess.on('error', (err) => {
                this.log.error(`Fallback Python command "${fallbackCmd}" also failed: ${err.message}.`);
                this.log.error('Please verify that Python 3 and pyserial are installed, or configure the correct Python Path in the adapter settings.');
            });

        } catch (err) {
            this.log.error(`Exception spawned during fallback process initialization: ${err.message}`);
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
            'view_num_cells': { name: 'Number of Cells', type: 'number', role: 'info.value', unit: 'cells' },
            'cell_voltage_max': { name: 'Max Cell Voltage', type: 'number', role: 'value.voltage', unit: 'mV' },
            'cell_voltage_min': { name: 'Min Cell Voltage', type: 'number', role: 'value.voltage', unit: 'mV' },
            'cell_voltage_max_index': { name: 'Max Cell Voltage Index', type: 'number', role: 'info.value' },
            'cell_voltage_min_index': { name: 'Min Cell Voltage Index', type: 'number', role: 'info.value' },
            'cell_voltage_diff': { name: 'Cell Voltage Difference', type: 'number', role: 'value.voltage', unit: 'mV' },
            'view_num_temps': { name: 'Number of Temp Sensors', type: 'number', role: 'info.value', unit: 'sensors' },
            'view_current': { name: 'Current', type: 'number', role: 'value.current', unit: 'A' },
            'view_voltage': { name: 'Voltage', type: 'number', role: 'value.voltage', unit: 'V' },
            'view_power': { name: 'Power', type: 'number', role: 'value.power', unit: 'kW' },
            'view_energy_charged': { name: 'Total Charged Energy', type: 'number', role: 'value.energy', unit: 'Wh' },
            'view_energy_discharged': { name: 'Total Discharged Energy', type: 'number', role: 'value.energy', unit: 'Wh' },
            'view_remain_capacity': { name: 'Remaining Capacity', type: 'number', role: 'value.capacity', unit: 'Ah' },
            'view_full_capacity': { name: 'Full Charge Capacity', type: 'number', role: 'value.capacity', unit: 'Ah' },
            'view_design_capacity': { name: 'Design Capacity', type: 'number', role: 'value.capacity', unit: 'Ah' },
            'view_SOC': { name: 'State of Charge', type: 'number', role: 'value.battery', unit: '%' },
            'view_SOH': { name: 'State of Health', type: 'number', role: 'value.battery', unit: '%' },
            'view_cycle_number': { name: 'Cycle Count', type: 'number', role: 'value.history', unit: 'cycles' },
            'define_number_p': { name: 'Define Number P', type: 'number', role: 'info.value' },
            'hardware_version': { name: 'Hardware Version', type: 'string', role: 'info.hardware' },
            'software_version': { name: 'Software Version', type: 'string', role: 'info.software' }
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
                // Flat warning strings (e.g., warn_charge_current, warn_total_voltage)
                const folderId = `${packId}.warnings`;
                await this.setObjectNotExistsAsync(folderId, {
                    type: 'folder',
                    common: { name: 'Warnings' },
                    native: {}
                });

                const stateId = `${folderId}.${key}`;
                await this.setObjectNotExistsAsync(stateId, {
                    type: 'state',
                    common: {
                        name: key.replace(/_/g, ' '),
                        type: 'string',
                        role: 'info.status',
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
    module.exports = (options) => new GobelBattery(options);
} else {
    // otherwise start the instance directly
    new GobelBattery();
}
