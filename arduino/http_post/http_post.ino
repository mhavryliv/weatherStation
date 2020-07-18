// Developing on the Wemos Pro ESP32esp32 
// Test input pin GPIO 16

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
// Simple moving average class
#include "movavg.h"

const char* ssid = "feeb";
const char* password = "unisux12";

//Your Domain name with URL path or IP address with path
String serverName = "http://192.168.86.121:9876/wind_and_water";

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

void setup() {
  Serial.begin(115200);

  // To let the serial warm up.
  delay(500);

  // Make sure the wifi send interval is an integer multiple of the data window size
  float numDPointsF = (float)WIFI_INTERVAL / (float)WIND_FRAME_SIZE;
  if((float)NUM_DATA_POINTS != numDPointsF) {
    Serial.println("Warning: Wifi send interval is not a multiple of the data frame size");
  }
  
  if(isDoingWifi) {
    setupWifi();
  }

  setupInputPins();
  setupData();

  // Calculate the json data size
  // 3*JSON_ARRAY_SIZE(10) + JSON_OBJECT_SIZE(3) but this doesn't work
  // from https://arduinojson.org/v6/assistant/

  // Setup counter for tracking when to send WIFI data
  dataSetCounter = 0;
  shortestWindClickInterval = WIND_FRAME_SIZE;
  waterClickCount = 0;
}

void loop() {
  // Do calculations on collected data
  calculateWindSpeed();
  calculateWindDir();

  // Reset data set counter if it about to rollover, and send wifi data
  // Also clear the water counter here - don't need to update it every wind frame
  if(dataSetCounter == (NUM_DATA_POINTS - 1)) {
    if(isDoingWifi) {
      sendHttpReq();
    }
    dataSetCounter = 0;
    waterClickCount = 0;
  }
  else {
    dataSetCounter++;
  }

  // Clear wind click params for this cycle before sleeping
  shortestWindClickInterval = WIND_FRAME_SIZE;
  delay(WIND_FRAME_SIZE);
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
  // Actually, this is not a big deal. Still usefful to compare the averaged and gust speeds
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

void setupData() {
  windSpeedAvg.reset();
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
  WiFi.begin(ssid, password);
  Serial.println("Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to WiFi network with IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.println("Timer set to 6 seconds (timerDelay variable),"
                 " it will take 6 seconds before publishing the first reading.");
}

// Creates a JSON object out of required data, and returns as serialised string.
String createJsonDoc() {
  StaticJsonDocument<1000> doc;
  doc["interval"] = WIND_FRAME_SIZE;
  doc["water_mm"] = waterClickCount * 0.2794;
  JsonArray windSpeedArr = doc.createNestedArray("wind_speed");
  JsonArray windDirArr = doc.createNestedArray("wind_dir");
  JsonArray maxGustArr = doc.createNestedArray("max_gust");
  for(int i = 0; i < NUM_DATA_POINTS; ++i) {
    windSpeedArr.add(windSpeedKMh[i]);
    windDirArr.add(windDir[i]);
    maxGustArr.add(maxGust[i]);
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
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    // Free resources
    http.end();
  }
  else {
    Serial.println("WiFi Disconnected");
  }
}
