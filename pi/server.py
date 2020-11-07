import serial
import json
import aiohttp
import asyncio

# Prepare the http post sending async routine
async def main(data):
  async with aiohttp.ClientSession() as session:
    async with session.post('http://192.168.86.135:9876/add', json=data) as resp:
        print(resp.status)
        print(await resp.text())

httploop = asyncio.get_event_loop()

# Open the port
ser = serial.Serial('/dev/ttyUSB0', 115200)

# Read loop
while True:
  # Try to catch keyboard interrupts
  try:
    line = ser.readline()
    # print(line)
    # Try to catch invalid json
    try:
      data = json.loads(line)
      print(data)
      if "info" in data:
        if(data["info"] == "Weather station data"):
          httploop.run_until_complete(main(data))

    except:
      # print("not valid json")
      pass

  except:
    print("Keyboard interrupt")
    break

