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
// Timer set to 10 minutes (600000)
//unsigned long timerDelay = 600000;
// Set timer to 5 seconds (5000)
unsigned long timerDelay = 5000;

const bool isDoingWifi = false;
const int inputPin = 16;

void setup() {
  Serial.begin(115200);
  if(isDoingWifi) {
    setupWifi();
  }

  setupInputPins();

}

void loop() {
  if(isDoingWifi) {
    sendHttpReq();
  }
  // Read the input pin
  int pinVal = digitalRead(inputPin);
  Serial.print("Pin val ");
  Serial.println(pinVal);
  delay(500);
}

void setupInputPins() {
  pinMode(inputPin, INPUT_PULLUP);  
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

      String serverPath = serverName + "?speed=24.37";

      // Your Domain name with URL path or IP address with path
      http.begin(serverPath.c_str());

      // Send HTTP GET request
      int httpResponseCode = http.GET();

      if (httpResponseCode > 0) {
        Serial.print("HTTP Response code: ");
        Serial.println(httpResponseCode);
        String payload = http.getString();
        Serial.println(payload);
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
