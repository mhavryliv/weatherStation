// Developing on the Wemos Pro ESP32esp32 
// Test input pin GPIO 16

#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "feeb";
const char* password = "unisux12";

//Your Domain name with URL path or IP address with path
String serverName = "http://192.168.86.121:9876/wind_speed";

// the following variables are unsigned longs because the time, measured in
// milliseconds, will quickly become a bigger number than can be stored in an int.
unsigned long lastTime = 0;
// Set timer to 5 seconds (5000)
unsigned long timerDelay = 1000;

const bool isDoingWifi = true;
const int inputPin = 16;

const int MAX_DATA = 5000;
const int WIND_DEBOUNCE_MSEC = 20;
const int WIND_FRAME_SIZE = 2000;
volatile unsigned long periodStartMsec;
volatile unsigned long windClicks[MAX_DATA];
volatile int windClickCount;


// Data to send over HTTP
double windSpeedKMh = 0.0;
String windSpeedHistory;

void setup() {
  Serial.begin(115200);
  if(isDoingWifi) {
    setupWifi();
  }

  setupInputPins();
  setupData();

  
}

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

void loop() {
  // Do calculations on collected data
  calculateWindSpeed();

  // Send info if doing so
  if(isDoingWifi) {
    sendHttpReq();
  }

  // Clear wind click params for this cycle before sleeping
  windClickCount = 0;
  periodStartMsec = millis();
  delay(WIND_FRAME_SIZE);
}

void calculateWindSpeed() {
  double speed = (double)windClickCount / ((double)WIND_FRAME_SIZE / 1000.0);
  windSpeedKMh = speed * 2.4;
  // And prepare the timestamp history
  windSpeedHistory = "";
  for(int i = 0; i < windClickCount; ++i) {
//    Serial.println(windClicks[i]);
    windSpeedHistory += String(windClicks[i]);
    if(i != (windClickCount - 1)) {
      windSpeedHistory += ",";
    }
  }
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

void sendHttpReq() {
  if(!isDoingWifi) {
    return;
  }
  //Send an HTTP POST request every 10 minutes
  if ((millis() - lastTime) > timerDelay) {
    //Check WiFi connection status
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;

      String serverPath = 
      serverName + "?speedkmh=" + String(windSpeedKMh, 2) +
      "&times=" + windSpeedHistory;

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
    lastTime = millis();
  }
}
