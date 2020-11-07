// Developing on the Wemos Pro ESP32esp32
// Test input pin GPIO 16
// Includes for BME 280 sensor
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

// Simple moving average class
#include "movavg.h"
#include <ArduinoJson.h>

#define SEALEVELPRESSURE_HPA (1013.25)
Adafruit_BME280 bme; // I2C

//Your Domain name with URL path or IP address with path
//String serverName = "http://192.168.86.121:9876/add";
//String serverName = "https://weatherreporting.flyingaspidistra.net/add";

// Serial sending interval (msec)
const int SERIAL_INTERVAL = 60000;
int dataSetCounter = 0;
const int windSpeedInputPin = 18;
const int windDirInPin = A0;
const int waterInPin = A3;

const int WIND_DEBOUNCE_MSEC = 20;
const int WIND_FRAME_SIZE = 2000; // set this to 3 seconds to allow for very slow wind ( < 1kmh )
volatile unsigned long lastWindClick;
volatile unsigned long shortestWindClickInterval;
volatile MovAvg windSpeedAvg(5);
// Variables for sending over WS
volatile bool hadWindClick;
String lastWindDir = "N";

// The normalised values output by the wind direction vane, clockwise from North
const int WIND_DIR_LEN = 8;
const float windDirOutputVals[WIND_DIR_LEN] = {0.23, 0.53, 0.94, 0.84, 0.67, 0.38, 0.04, 0.13};
const String windDirNames[WIND_DIR_LEN] = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};

// Water
const int waterInputPin = 19;
const int WATER_DEBOUNCE_MSEC = 200;
volatile unsigned long waterClickCount = 0;
volatile unsigned long lastWaterClick = 0;
volatile bool hadWaterClick;
volatile bool waterState = false;

// Data to send over Serial
const int NUM_DATA_POINTS = SERIAL_INTERVAL / WIND_FRAME_SIZE;
double windSpeedKMh[NUM_DATA_POINTS];
double maxGust[NUM_DATA_POINTS];
String windDir[NUM_DATA_POINTS];
volatile unsigned long frameStartTime;
volatile unsigned long windClicks[(WIND_FRAME_SIZE/WIND_DEBOUNCE_MSEC) * NUM_DATA_POINTS];
volatile int windClickCount;
double temperature;
double pressure;
double humidity;
unsigned long lastBMERead;
const unsigned long bmeReadDelay = 59000;

StaticJsonDocument<600> wsdoc;  // the websocket json document, don't rebuilt it all the time

void setup() {
  Serial.begin(115200);

  // To let the serial and I2C warm up.
  delay(1000);

  // Make sure the wifi send interval is an integer multiple of the data window size
  float numDPointsF = (float)SERIAL_INTERVAL / (float)WIND_FRAME_SIZE;
  if ((float)NUM_DATA_POINTS != numDPointsF) {
    Serial.println("Warning: Wifi send interval is not a multiple of the data frame size");
  }

  // Start the BME sensor
  unsigned status;
  // default settings
  status = bme.begin();
  if (!status) {
    Serial.println("Error starting temperature sensor");
    Serial.println("Code is: " + String(status));
  }

  Serial.println("-- Weather Station Scenario --");
  Serial.println("forced mode, 1x temperature / 1x humidity / 1x pressure oversampling,");
  Serial.println("filter off");
  bme.setSampling(Adafruit_BME280::MODE_FORCED,
                  Adafruit_BME280::SAMPLING_X1, // temperature
                  Adafruit_BME280::SAMPLING_X1, // pressure
                  Adafruit_BME280::SAMPLING_X1, // humidity
                  Adafruit_BME280::FILTER_OFF   );

  pinMode(windSpeedInputPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(windSpeedInputPin), handleWindClick, FALLING);
  pinMode(waterInputPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(waterInputPin), handleWaterClick, FALLING);;


  // Setup counter for tracking when to send WIFI data
  windSpeedAvg.reset();
  dataSetCounter = 0;
  shortestWindClickInterval = WIND_FRAME_SIZE;
  waterClickCount = 0;
  windClickCount = 0;
  frameStartTime = 0;
  lastBMERead = 0;
  hadWindClick = false;
  hadWaterClick = false;
  lastWindClick = millis();
}

void loop() {

  frameStartTime = millis();  

  // Do calculations on collected data
  calculateWindSpeed();
  calculateWindDir();
  getTemperatureData();


//  delay(1000);
//  Serial.println("loop");
//  int val = analogRead(36);
//  Serial.println(val);


  // Reset data set counter if it about to rollover, and send wifi data
  // Also clear the water counter here - don't need to update it every wind frame
  if (dataSetCounter == (NUM_DATA_POINTS - 1)) {
    sendHttpReq();
    dataSetCounter = 0;
    waterClickCount = 0;
    windClickCount = 0;
  }
  else {
    dataSetCounter++;
  }

  // Clear wind click params for this cycle before sleeping
  shortestWindClickInterval = WIND_FRAME_SIZE;
  //  delay(WIND_FRAME_SIZE);
  // Instead of sleeping, let's loop so we can check for wind clicks
  const unsigned long targetTime = frameStartTime + WIND_FRAME_SIZE;
  while (millis() < targetTime) {
//    const int aval = analogRead(waterInPin);
//    if(aval == 0) {
//      handleWaterClick();
//    }
    // If the flag is true, send a websocket msg
    if (hadWindClick || hadWaterClick) {
      // Update the wind direction
      calculateWindDir();
      String msg = createJsonForWs(hadWindClick, lastWindDir, hadWaterClick, false);
      Serial.println(msg);
    }
    // reset the flags
    if(hadWindClick) {
      hadWindClick = false;
    }
    if(hadWaterClick) {
      hadWaterClick = false;
    }
    delay(1);
  }
  String msg = createJsonForWs(false, lastWindDir, false, true);
  Serial.println(msg);
}

void getTemperatureData() {
  // If it's been more than bmeReadDelay since the last temperature measurement, force a new one
  if (lastBMERead == 0 || ((millis() - lastBMERead) >= bmeReadDelay)) {
    bme.takeForcedMeasurement();
    lastBMERead = millis();
    temperature = bme.readTemperature();
    pressure = bme.readPressure() / 100.f;
    humidity = bme.readHumidity();
  }
}

void calculateWindSpeed() {
  // Calculate the max gust
  const double invertedQuickestClick = 1.0 / (shortestWindClickInterval / 1000.0);
  double curMaxGust = invertedQuickestClick * 2.4;
  if (shortestWindClickInterval == WIND_FRAME_SIZE) {
    curMaxGust = 0;
  }
  maxGust[dataSetCounter] = curMaxGust;

  // If there have been no clicks for the last window size, the speed is zero.
  double speed;
  if ((millis() - lastWindClick) > WIND_FRAME_SIZE) {
    speed = 0;
  }
  else  {
    const double windSpeedAvgVal = windSpeedAvg.getCurAvg();
    if (windSpeedAvgVal == 0.0) {
      speed = 0;
    }
    else {
      const double freq = 1.0 / (windSpeedAvg.getCurAvg() / 1000.0);
      speed = freq * 2.4;
    }
  }
  // Don't let the speed be higher than the current max gust
  // Actually, this is not a big deal. Still useful to compare the averaged and gust speeds
  //  if(speed > curMaxGust) {
  //    speed = curMaxGust;
  //  }
  windSpeedKMh[dataSetCounter] = speed;
}

void calculateWindDir() {
  int aVal = analogRead(36);
  float normalised = (float)aVal / 4095.f;

  // Find which is the closest value in the wind lookup table
  int closestIndex = 0;
  float closestDiff = 1;
  for (int i = 0; i < WIND_DIR_LEN; ++i) {
    const float diff = fabs(normalised - windDirOutputVals[i]);
    if (diff < closestDiff) {
      closestIndex = i;
      closestDiff = diff;
    }
  }
  windDir[dataSetCounter] = windDirNames[closestIndex];
  lastWindDir = windDirNames[closestIndex];
}

// Interrupt handling
void handleWindClick() {
  // If less than 20 msec has passed since last click, don't count it
  const unsigned long thisTime = millis();
  const unsigned long diff = thisTime - lastWindClick;
  if (diff < WIND_DEBOUNCE_MSEC) {
    return;
  }
  lastWindClick = thisTime;
  if (diff < shortestWindClickInterval) {
    shortestWindClickInterval = diff;
  }
  // Add it to the array
  windClicks[windClickCount] = thisTime - frameStartTime;
  windClickCount++;
  // Add the diff to our moving average
  windSpeedAvg.addVal(diff);

  // Set the wind click flag
  hadWindClick = true;
}

void handleWaterClick() {
//  const int aval = analogRead(waterInPin);
//  if(aval != 0) {
//    return;
//  }
 
  const unsigned long thisTime = millis();
  const unsigned long diff = thisTime - lastWaterClick;
  lastWaterClick = thisTime;
  if(diff < WATER_DEBOUNCE_MSEC) {
    return;
  }
  
  waterClickCount++;
  waterState = !waterState;
  hadWaterClick = true;
}

// Creates a JSON object out of required data, and returns as serialised string.
String createJsonDoc() {
  StaticJsonDocument<2000> doc;
  doc["info"] = "Weather station data";
  doc["num_data_points"] = NUM_DATA_POINTS;
  doc["interval"] = WIND_FRAME_SIZE;
  doc["water_mm"] = waterClickCount * 0.2794;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["pressure"] = pressure;
  JsonArray windSpeedArr = doc.createNestedArray("wind_speed");
  JsonArray windDirArr = doc.createNestedArray("wind_dir");
  JsonArray maxGustArr = doc.createNestedArray("max_gust");
//  JsonArray windClickTimes = doc.createNestedArray("wind_clicks");
  for (int i = 0; i < NUM_DATA_POINTS; ++i) {
  windSpeedArr.add(windSpeedKMh[i]);
    windDirArr.add(windDir[i]);
    maxGustArr.add(maxGust[i]);
  }
//  for (int i = 0; i < windClickCount; ++i) {
//  windClickTimes.add(windClicks[i]);
//  }

  return doc.as<String>();
}

String createJsonForWs(bool isWindClick, String windDir, bool isWaterClick, bool includeAtmospheric) {
  wsdoc["isWS"] = true;
  wsdoc["windclick"] = isWindClick;
  wsdoc["wdir"] = windDir;
  wsdoc["waterclick"] = isWaterClick;
  const double freq = 1.0 / (windSpeedAvg.getCurAvg() / 1000.0);
  float windspeed = (float)freq * 2.4f;
  if ((millis() - lastWindClick) > WIND_FRAME_SIZE) {
    windspeed = 0;
  }
  wsdoc["wspeed"] = windspeed;
  wsdoc["time"] = millis();
  if (includeAtmospheric)  {
    wsdoc["temp"] = temperature;
    wsdoc["humidity"] = humidity;
    wsdoc["pressure"] = pressure;
  }
  return wsdoc.as<String>();
}

float rnd(float val, int numDecimalPoints) {
  float mult = pow(10.f, numDecimalPoints);
  int intRes = (int)(val * mult);
  float ret = ((float)intRes / mult);
  return ret;
}

void sendHttpReq() {
  String dataAsString = createJsonDoc();
  Serial.println(dataAsString);
}
