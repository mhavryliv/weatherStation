// Developing on the Wemos Pro ESP32esp32 
// Test input pin GPIO 16

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "feeb";
const char* password = "unisux12";

//Your Domain name with URL path or IP address with path
String serverName = "http://192.168.86.121:9876/wind_speed";

const bool isDoingWifi = true;
// Wifi sending interval (msec)
const int WIFI_INTERVAL = 5000;
int dataSetCounter = 0;
const int inputPin = 16;
const int windDirInPin = A0;

const int WIND_DEBOUNCE_MSEC = 20;
const int WIND_FRAME_SIZE = 1000;
const int MAX_DATA = WIND_FRAME_SIZE  ;
volatile unsigned long periodStartMsec;
volatile unsigned long windClicks[MAX_DATA];
volatile int windClickCount;

// The normalised values output by the wind direction vane, clockwise from North
const int WIND_DIR_LEN = 8;
const float windDirOutputVals[WIND_DIR_LEN] = {0.23, 0.53, 0.85, 0.78, 0.67, 0.38, 0.04, 0.13};
const String windDirNames[WIND_DIR_LEN] = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};

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
}

void loop() {
  // Do calculations on collected data
  calculateWindSpeed();
  calculateWindDir();

  // Reset data set counter if it about to rollover, and send wifi data
  if(dataSetCounter == (NUM_DATA_POINTS - 1)) {
    dataSetCounter = 0;
    createJsonDoc();
    if(isDoingWifi) {
      sendHttpReq();
    }
  }
  else {
    dataSetCounter++;
  }

  // Clear wind click params for this cycle before sleeping
  windClickCount = 0;
  periodStartMsec = millis();
  delay(WIND_FRAME_SIZE);
}

void calculateWindSpeed() {
  double speed = (double)windClickCount / ((double)WIND_FRAME_SIZE / 1000.0);
  windSpeedKMh[dataSetCounter] = speed * 2.4;
  int quickestClick = WIND_FRAME_SIZE;
  if(windClickCount > 1) {
    for(int i = 0; i < (windClickCount - 1); ++i) {
      int interval = windClicks[i+1] - windClicks[i];
      if(interval < quickestClick) {
        quickestClick = interval;
      }
    }
    const double quickestClickSec = (double)quickestClick / 1000.0;
    maxGust[dataSetCounter] = 2.4 * (1.0 / quickestClickSec);
  }
  else {
    maxGust[dataSetCounter] = 0.0;
  }
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
  // Get the last wind click time
  const unsigned long lastClick = (windClickCount == 0) ? 0 : windClicks[windClickCount - 1];
  // If less than 20 msec has passed, don't count it
  const unsigned long thisTime = millis() - periodStartMsec;
  const unsigned long diff = thisTime - lastClick;
  if((windClickCount != 0) && (diff < WIND_DEBOUNCE_MSEC)) {
    return;
  }
  windClicks[windClickCount] = thisTime;
  windClickCount++;
}


void setupData() {
  // Initialise the wind click array
  windClickCount = 0;
  for(int i = 0; i < MAX_DATA; ++i) {
    windClicks[i] = 0;
  }
}

void setupInputPins() {
  pinMode(inputPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(inputPin), handleWindClick, FALLING);
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

  Serial.println("Timer set to 5 seconds (timerDelay variable),"
                 " it will take 5 seconds before publishing the first reading.");
}

void createJsonDoc() {
  StaticJsonDocument<1000> doc;
  doc["interval"] = WIND_FRAME_SIZE;
  JsonArray windSpeedArr = doc.createNestedArray("wind_speed");
  JsonArray windDirArr = doc.createNestedArray("wind_dir");
  JsonArray maxGustArr = doc.createNestedArray("max_gust");
  for(int i = 0; i < NUM_DATA_POINTS; ++i) {
    windSpeedArr.add(windSpeedKMh[i]);
    windDirArr.add(windDir[i]);
    maxGustArr.add(maxGust[i]);
  }

  serializeJsonPretty(doc, Serial);
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

    // Send HTTP GET request
    int httpResponseCode = http.GET();

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
