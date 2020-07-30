// Developing on the Wemos Pro ESP32esp32 
// Test input pin GPIO 16
// Includes for BME 280 sensor
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
// Simple moving average class
#include "movavg.h"

const char* ssid = "feeb";
const char* password = "unisux12";

#define SEALEVELPRESSURE_HPA (1013.25)
Adafruit_BME280 bme; // I2C

//Your Domain name with URL path or IP address with path
String serverName = "http://192.168.86.121:9876/weather_data_up";

const bool isDoingWifi = true;
// Wifi sending interval (msec)
const int WIFI_INTERVAL = 6000;
int dataSetCounter = 0;
const int windSpeedInputPin = 16;
const int windDirInPin = A0;

const int WIND_DEBOUNCE_MSEC = 20;
const int WIND_FRAME_SIZE = 2000; // set this to 3 seconds to allow for very slow wind ( < 1kmh )
volatile unsigned long lastWindClick;
volatile unsigned long shortestWindClickInterval;
volatile MovAvg windSpeedAvg(5);

// The normalised values output by the wind direction vane, clockwise from North
const int WIND_DIR_LEN = 8;
const float windDirOutputVals[WIND_DIR_LEN] = {0.23, 0.53, 0.85, 0.78, 0.67, 0.38, 0.04, 0.13};
const String windDirNames[WIND_DIR_LEN] = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};

// Water
const int waterInputPin = 17;
const int WATER_DEBOUNCE_MSEC = 80;
volatile unsigned long waterClickCount = 0;
volatile unsigned long lastWaterClick = 0;

// Data to send over HTTP
const int NUM_DATA_POINTS = WIFI_INTERVAL / WIND_FRAME_SIZE;
double windSpeedKMh[NUM_DATA_POINTS];
double maxGust[NUM_DATA_POINTS];
String windDir[NUM_DATA_POINTS];
volatile unsigned long frameStartTime;
volatile unsigned long windClicks[WIND_FRAME_SIZE * NUM_DATA_POINTS];
volatile int windClickCount;
double temperature;
double pressure;
double humidity;
unsigned long lastBMERead;
const unsigned long bmeReadDelay = 60000;

void setup() {
  Serial.begin(115200);

  // To let the serial and I2C warm up.
  delay(1000);

  // Make sure the wifi send interval is an integer multiple of the data window size
  float numDPointsF = (float)WIFI_INTERVAL / (float)WIND_FRAME_SIZE;
  if((float)NUM_DATA_POINTS != numDPointsF) {
    Serial.println("Warning: Wifi send interval is not a multiple of the data frame size");
  }
  
  if(isDoingWifi) {
    setupWifi();
  }

  // Start the BME sensor
  unsigned status;
  // default settings
  status = bme.begin();
  if(!status) {
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

  setupInputPins();

  // Setup counter for tracking when to send WIFI data
  windSpeedAvg.reset();
  dataSetCounter = 0;
  shortestWindClickInterval = WIND_FRAME_SIZE;
  waterClickCount = 0;
  windClickCount = 0;
  frameStartTime = 0;
  lastBMERead = 0;
}

void loop() {
  if(isDoingWifi) {
    ArduinoOTA.handle();
  } 
  frameStartTime = millis();
  // Do calculations on collected data
  calculateWindSpeed();
  calculateWindDir();
  getTemperatureData();

  // Reset data set counter if it about to rollover, and send wifi data
  // Also clear the water counter here - don't need to update it every wind frame
  if(dataSetCounter == (NUM_DATA_POINTS - 1)) {
    if(isDoingWifi) {
      sendHttpReq();
    }
    dataSetCounter = 0;
    waterClickCount = 0;
    windClickCount = 0;
  }
  else {
    dataSetCounter++;
  }

  // Clear wind click params for this cycle before sleeping
  shortestWindClickInterval = WIND_FRAME_SIZE;
  delay(WIND_FRAME_SIZE);
}

void getTemperatureData() {
  // If it's been more than bmeReadDelay since the last temperature measurement, force a new one
  if(lastBMERead == 0 || ((millis() - lastBMERead) >= bmeReadDelay)) {
    bme.takeForcedMeasurement();
    lastBMERead = millis();
//    Serial.println("Forcing bme measurement");
    temperature = bme.readTemperature();
    pressure = bme.readPressure() / 100.f;
    humidity = bme.readHumidity();
  }
}

void calculateWindSpeed() {
  // Calculate the max gust
  const double invertedQuickestClick = 1.0/(shortestWindClickInterval / 1000.0);
  double curMaxGust = invertedQuickestClick * 2.4;
  if(shortestWindClickInterval == WIND_FRAME_SIZE) {
    curMaxGust = 0;
  }
  maxGust[dataSetCounter] = curMaxGust;
  
  // If there have been no clicks for the last window size, the speed is zero.
  double speed;
  if((millis() - lastWindClick) > WIND_FRAME_SIZE) {
    speed = 0; 
  }
  else  {
    const double windSpeedAvgVal = windSpeedAvg.getCurAvg();
    if(windSpeedAvgVal == 0.0) {
      speed = 0;
    }
    else {
      const double freq = 1.0/(windSpeedAvg.getCurAvg() / 1000.0);
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
  int aVal = analogRead(windDirInPin);
  float normalised = (float)aVal / 4095.f;

  // Find which is the closest value in the wind lookup table
  int closestIndex = 0;
  float closestDiff = 1;
  for(int i = 0; i < WIND_DIR_LEN; ++i) {
    const float diff = fabs(normalised - windDirOutputVals[i]);
    if(diff < closestDiff) {
      closestIndex = i;
      closestDiff = diff;
    }
  }
  windDir[dataSetCounter] = windDirNames[closestIndex];
//  Serial.println("Wind dir is: " + windDir);
}

// Interrupt handling
void handleWindClick() {
  // If less than 20 msec has passed since last click, don't count it
  const unsigned long thisTime = millis();
  const unsigned long diff = thisTime - lastWindClick;
  if(diff < WIND_DEBOUNCE_MSEC) {
    return;
  }
  lastWindClick = thisTime;
  if(diff < shortestWindClickInterval) {
    shortestWindClickInterval = diff;
  }
  // Add it to the array
  windClicks[windClickCount] = thisTime - frameStartTime;
  windClickCount++;
  // Add the diff to our moving average
  windSpeedAvg.addVal(diff);
}

void handleWaterClick() {
  const unsigned long thisTime = millis();
  const unsigned long diff = thisTime - lastWaterClick;
  if(diff < WATER_DEBOUNCE_MSEC) {
    return;
  }
  lastWaterClick = thisTime;
  waterClickCount++;
//  Serial.println("Water click: " + String(waterClickCount));
}

void setupInputPins() {
  pinMode(windSpeedInputPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(windSpeedInputPin), handleWindClick, FALLING);
  pinMode(waterInputPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(waterInputPin), handleWaterClick, FALLING);
}

void setupWifi() {
  if(!isDoingWifi) {
    return;
  }
  WiFi.mode(WIFI_STA);  
  WiFi.begin(ssid, password);
  Serial.println("Connecting to wifi: " + String(ssid));
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to WiFi network with IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.println("Setting up OTA");
  // Setup the OTA programming
   ArduinoOTA.setPort(3232);
   ArduinoOTA.setHostname("weather_station_arduino_1");
   ArduinoOTA.setPassword("unisux");

  ArduinoOTA
    .onStart([]() {
      String type;
      if (ArduinoOTA.getCommand() == U_FLASH)
        type = "sketch";
      else // U_SPIFFS
        type = "filesystem";

      // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
      Serial.println("Start updating " + type);
    })
    .onEnd([]() {
      Serial.println("\nEnd");
    })
    .onProgress([](unsigned int progress, unsigned int total) {
      Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
    })
    .onError([](ota_error_t error) {
      Serial.printf("Error[%u]: ", error);
      if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
      else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
      else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
      else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
      else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });

  ArduinoOTA.begin();

  Serial.println("OTA ready on port 3232");
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
  JsonArray windClickTimes = doc.createNestedArray("wind_click_times");
  for(int i = 0; i < NUM_DATA_POINTS; ++i) {
    windSpeedArr.add(windSpeedKMh[i]);
    windDirArr.add(windDir[i]);
    maxGustArr.add(maxGust[i]);
  }
  for(int i = 0; i < windClickCount; ++i) {
    windClickTimes.add(windClicks[i]);
  }

  return doc.as<String>();
}

void sendHttpReq() {  
  if(!isDoingWifi) {
    return;
  }
  //Check WiFi connection status
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    String serverPath = serverName;

    // Your Domain name with URL path or IP address with path
    http.begin(serverPath.c_str());

    http.addHeader("Content-Type", "application/json");
   
    String dataAsString = createJsonDoc();

    // Send HTTP POST request
    int httpResponseCode = http.POST(dataAsString);

    if (httpResponseCode > 0) {
//        Serial.print("HTTP Response code: ");
//        Serial.println(httpResponseCode);
//        String payload = http.getString();
//        Serial.println(payload);
    }
    else {
      // Don't bother printing if server is unreachable
//      if(httpResponseCode != -1) {
        Serial.print("Unexpected HTTP Error code: ");
        Serial.println(httpResponseCode);
//      }
    }
    // Free resources
    http.end();
  }
  else {
    Serial.println("WiFi Disconnected");
  }
}
