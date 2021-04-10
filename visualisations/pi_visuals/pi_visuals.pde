import websockets.*;
import VLCJVideo.*;

VLCJVideo video;

WebsocketClient wsc;

int mainFireX, mainFireY;
float windClickCounter = 0;
float windXComponent = 0.f;
float windYComponent = 0.f;

float lastTemp = 20.0f;
float lastHum = 50.0f;
String lastWindDir = "(none)";
float lastWindSpeed = 0.f;


PImage destination;

long numLoops = 0;

void setup() {  
  //size(800, 480, P2D);
  //fullScreen();
  size(800, 480);
  frameRate(30);
//  pixelDensity(displayDensity());
//  smooth(2);

  destination = createImage(width, height, ARGB);
  
  // Writing to the depth buffer is disabled to avoid rendering
  // artifacts due to the fact that the particles are semi-transparent
  // but not z-sorted.
  hint(DISABLE_DEPTH_MASK);
  
  wsc = new WebsocketClient(this, "ws://realtimeweather-molly1.flyingaspidistra.net:8123");
  
  video = new VLCJVideo(this);
  video.openAndPlay("http://babypi.local/hls/index.m3u8");
} 

void draw () {
  background(11*0.35, 60*0.35, 10*0.35);
  //background(0);
  //image(paperBackground, 0, 0);
  
  // Do the wind calculations
  // Always decrement the windClickCounter
  windClickCounter = windClickCounter - 0.125;
  windClickCounter = Math.max(0, windClickCounter);
  
  // Update the gravity
  float windStrengthX = windXComponent * windClickCounter;
  float windStrengthY = windYComponent * windClickCounter;
  
  // Mediate these, a gravity of 1 is very very strong
  final float windStrengthWeight = 0.1;
  windStrengthX *= windStrengthWeight;
  windStrengthY *= windStrengthWeight;
  
  PVector windStrength = new PVector(windStrengthX, windStrengthY);

  //image(destination, 0, 0);
  
  image(video, 0, 0, width, height);
  
  fill(255, 0, 0, 1);
  rect(0, 0, width, height);
  
  textSize(12);
  text("Frame rate: " + int(frameRate), 10, 20); 
  
  String tempStr = "Temperature: " + nf(lastTemp, 0, 1);
  String humStr = "Humidity: " + round(lastHum) + "%";
  String windStr = "Wind: " + nf(lastWindSpeed, 0, 1) + " km/h (" + lastWindDir + ")";
  
  textSize(16);
  text(tempStr, 10, 50);
  text(humStr, 10, 80);
  text(windStr, 10, 110);
  
}


void keyPressed() {
  if (key == CODED) {
    String windDir = "";
    if (keyCode == UP) {
      windDir = "S";
    }
    else if (keyCode == DOWN) {
      windDir = "N";
    }
    else if(keyCode == LEFT) {
      windDir = "E";
    }
    else if(keyCode == RIGHT) {
      windDir = "W";
    }
    if(windDir.length() > 0) {
      handleWindInput(windDir);
    }
  }
}

void handleWindInput(String windDir) {
  windClickCounter++;
  if(windDir.equals("N")) {
    windXComponent = 0.f;
    windYComponent = 1.f;
  }
  else if(windDir.equals("NE")) {
    windXComponent = -0.5f;
    windYComponent = 0.5f;      
  }
  else if(windDir.equals("E")) {
    windXComponent = -1.f;
    windYComponent = 0.f;
  }
  else if(windDir.equals("SE")) {
    windXComponent = -0.5f;
    windYComponent = -0.5f;
  }
  else if(windDir.equals("S")) {
    windXComponent = 0.f;
    windYComponent = -1.f;
  }
  else if(windDir.equals("SW")) {
    windXComponent = 0.5f;
    windYComponent = -0.5f;
  }
  else if(windDir.equals("W")) {
    windXComponent = 1.f;
    windYComponent = 0.f;
  }
  else if(windDir.equals("NW")) {
    windXComponent = 0.5f;
    windYComponent = 0.5f;
  }
}

void webSocketEvent(String msg){
  //return;
  JSONObject data = parseJSONObject(msg);
  //println(msg);
  lastTemp = data.getFloat("temp", 20.f);
  lastHum = data.getFloat("humidity", 50.0f);
  lastWindDir = data.getString("wdir", "(n/a)");
  lastWindSpeed = data.getFloat("wspeed", 0.f);
  return;
  //boolean isWaterClick = data.getBoolean("waterclick", false);
  //boolean isWindClick = data.getBoolean("windclick", false);
  //String windDir = data.getString("wdir");
  ////println(windDir);
  //if(isWaterClick) {
  //  println("Water!!!");
  //  println(msg);
  //}
  //if(isWindClick) {
  //  handleWindInput(windDir);
  //}
}
