import serial
import json

ser = serial.Serial('COM3')
ser.baudrate = 9600
ser.flushInput()

def main():
    print("Listening for serial data...")
    test = True
    while 1:
        try:
            rawBytes = ser.readline()
            rawData = rawBytes[0:len(rawBytes) - 2].decode("utf-8")
            print(rawData)
        except Exception as e:
            print("Error:", e)


if __name__ == "__main__":
    main()
