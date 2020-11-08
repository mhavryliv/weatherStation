import serial
import json
import aiohttp
import asyncio

# Prepare the http post sending async routine
async def httpSend(session, data):
  # await session.post('http://192.168.86.135:9876/add', json=data)
  await session.post('https://weatherreporting.flyingaspidistra.net/add', json=data)

async def sendWs(ws, data):
  await ws.send_str(json.dumps(data))

async def main():
  
  async with aiohttp.ClientSession() as session:
    async with session.ws_connect('ws://realtimeweather-molly1.flyingaspidistra.net:8123') as ws:
      print("Opened websocket")
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
            # print(data)
            try:
              if "info" in data:
                if(data["info"] == "Weather station data"):
                  httptask = asyncio.ensure_future(httpSend(session, data))
                  await httptask
              else:
                if data.get('isWS') is not None:
                  task = asyncio.ensure_future(sendWs(ws, data))
                  await task
            except Exception as e:
              print("Exception sending data: " + str(e))
          except Exception as e:
            print("Exception loading JSON data: " + str(e))
            pass

        except:
          print("Keyboard interrupt - exit")
          break

asyncio.run(main())