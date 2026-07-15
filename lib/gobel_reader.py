import argparse
import sys
import os
import json
import time
import logging

# Add the current folder to the front of the import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from bms_comm import BMSCommunication
from pacebms_rs232 import PACEBMS232
from pacebms_rs485 import PACEBMS485
from pacebms_wifi import PACEBMSWIFI
from tdtbms_rs232 import TDTBMS232
from jkbms_rs485 import JKBMS485

def parse_arguments():
    parser = argparse.ArgumentParser(description='Gobel Battery BMS Reader')
    parser.add_argument('--interface', choices=['serial', 'wifi', 'ethernet'], default='serial', help='Connection interface')
    parser.add_argument('--port', choices=['rs232', 'rs485'], default='rs232', help='Battery port protocol')
    parser.add_argument('--bms_type', choices=['PACE_LV', 'JK_PB', 'TDT', 'PACE_LV_WIFI'], default='PACE_LV', help='BMS type')
    parser.add_argument('--serial_port', default='/dev/ttyUSB0', help='Serial port path')
    parser.add_argument('--baud_rate', type=int, default=115200, help='Baud rate')
    parser.add_argument('--ip_address', default='', help='BMS IP address')
    parser.add_argument('--ip_port', type=int, default=8899, help='BMS IP port')
    parser.add_argument('--refresh', type=int, default=5, help='Refresh interval in seconds')
    parser.add_argument('--max_parallel', type=int, default=16, help='Max parallel packs allowed')
    parser.add_argument('--jk_start', choices=['00', '01'], default='01', help='JK display index start')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    return parser.parse_args()

def main():
    args = parse_arguments()
    debug_val = 1 if args.debug else 0

    # Output logs to stderr so they don't pollute the JSON stdout stream
    logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO,
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                        stream=sys.stderr)
    logger = logging.getLogger(__name__)

    logger.info("Starting Gobel BMS Reader...")
    logger.info(f"Arguments: {args}")

    buffer_size = 1024
    bms_comm = BMSCommunication(args.interface, args.serial_port, args.baud_rate, args.ip_address, args.ip_port, buffer_size, debug_val)
    
    if not bms_comm.connect():
        print(json.dumps({"type": "status", "data": "BMS connection failed"}))
        sys.stdout.flush()
        logger.error("BMS Connection failed, exiting...")
        sys.exit(1)

    print(json.dumps({"type": "status", "data": "BMS connection successful"}))
    sys.stdout.flush()

    # Instantiate the correct BMS driver
    bms = None
    pack_list = []

    try:
        if args.bms_type == 'PACE_LV':
            if args.port == 'rs232':
                bms = PACEBMS232(bms_comm, None, args.bms_type, args.refresh, debug_val, 0)
            elif args.port == 'rs485':
                bms = PACEBMS485(bms_comm, None, args.refresh, debug_val, 0)
                logger.info("Scanning for valid PACE RS485 packs...")
                for pack_number in range(0, args.max_parallel + 1):
                    result = bms.get_pack_num_data(pack_number)
                    if result == pack_number:
                        pack_list.append(pack_number)
                logger.info(f"Found packs list: {pack_list}")
                if not pack_list:
                    logger.error("No valid packs found during scan!")
        elif args.bms_type == 'PACE_LV_WIFI':
            bms = PACEBMSWIFI(bms_comm, None, args.bms_type, args.refresh, debug_val, 0)
        elif args.bms_type == 'JK_PB':
            if args.port == 'rs485':
                jk_pack_index_start = 0 if args.jk_start in ['0', '00'] else 1
                bms = JKBMS485(bms_comm, None, args.bms_type, args.refresh, debug_val, 0, None, jk_pack_index_start)
            else:
                logger.error(f"Unsupported port '{args.port}' for JK_PB BMS. Only 'rs485' is supported.")
                sys.exit(1)
        elif args.bms_type == 'TDT':
            if args.port == 'rs232':
                bms = TDTBMS232(bms_comm, None, args.refresh, debug_val, 0)
                logger.info("Detecting TDT pack quantity...")
                pack_quantity = bms.get_pack_quantity_data()
                if pack_quantity:
                    pack_list = list(range(1, pack_quantity + 1))
                logger.info(f"Found TDT packs list: {pack_list}")
            else:
                logger.error("Please use RS232 interface for TDT BMS.")
                sys.exit(1)
        
        if bms is None:
            logger.error(f"Failed to initialize BMS type '{args.bms_type}' on port '{args.port}'")
            sys.exit(1)

        consecutive_analog_failures = 0
        consecutive_warning_failures = 0
        first_analog_success = True
        first_warning_success = True

        logger.info("BMS Monitor loop started...")
        while True:
            # Query analog data
            analog_data = None
            if args.bms_type == 'PACE_LV' and args.port == 'rs485':
                analog_data = []
                for p_num in pack_list:
                    res = bms.get_analog_data(p_num)
                    if res:
                        if isinstance(res, list):
                            for p in res:
                                p['pack_index'] = p_num
                                analog_data.append(p)
                        else:
                            res['pack_index'] = p_num
                            analog_data.append(res)
            elif args.bms_type == 'TDT':
                analog_data = []
                for p_num in pack_list:
                    res = bms.get_analog_data(p_num)
                    if res:
                        if isinstance(res, list):
                            for p in res:
                                p['pack_index'] = p_num
                                analog_data.append(p)
                        else:
                            res['pack_index'] = p_num
                            analog_data.append(res)
            else:
                # PACE RS232, PACE WIFI, JKBMS
                res = bms.get_analog_data()
                if res:
                    if isinstance(res, list):
                        analog_data = res
                    else:
                        analog_data = [res]
            
            if analog_data:
                consecutive_analog_failures = 0
                if first_analog_success:
                    logger.info("Successfully received first analog data from BMS.")
                    first_analog_success = False
                print(json.dumps({"type": "analog", "data": analog_data}))
                sys.stdout.flush()
            else:
                consecutive_analog_failures += 1
                if consecutive_analog_failures >= 3:
                    logger.warning(f"No analog data received from BMS for {consecutive_analog_failures} consecutive checks.")

            time.sleep(1.0) # Small delay to avoid collision between reading warnings

            # Query warning data
            warning_data = None
            if args.bms_type == 'PACE_LV' and args.port == 'rs485':
                warning_data = []
                for p_num in pack_list:
                    res = bms.get_warning_data(p_num)
                    if res:
                        if isinstance(res, list):
                            for p in res:
                                p['pack_index'] = p_num
                                warning_data.append(p)
                        else:
                            res['pack_index'] = p_num
                            warning_data.append(res)
            elif args.bms_type == 'TDT':
                warning_data = []
                for p_num in pack_list:
                    res = bms.get_warning_data(p_num)
                    if res:
                        if isinstance(res, list):
                            for p in res:
                                p['pack_index'] = p_num
                                warning_data.append(p)
                        else:
                            res['pack_index'] = p_num
                            warning_data.append(res)
            else:
                res = bms.get_warning_data()
                if res:
                    if isinstance(res, list):
                        warning_data = res
                    else:
                        warning_data = [res]

            if warning_data:
                consecutive_warning_failures = 0
                if first_warning_success:
                    logger.info("Successfully received first warning data from BMS.")
                    first_warning_success = False
                print(json.dumps({"type": "warning", "data": warning_data}))
                sys.stdout.flush()
            else:
                consecutive_warning_failures += 1
                if consecutive_warning_failures >= 3:
                    logger.warning(f"No warning data received from BMS for {consecutive_warning_failures} consecutive checks.")

            time.sleep(max(1.0, args.refresh - 1.0))

    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt caught, stopping program...")
    except Exception as e:
        logger.exception(f"Unhandled exception in BMS loop: {e}")
    finally:
        logger.info("Cleaning up connections...")
        if bms and hasattr(bms, 'stop'):
            bms.stop()
        bms_comm.disconnect()

if __name__ == '__main__':
    main()
