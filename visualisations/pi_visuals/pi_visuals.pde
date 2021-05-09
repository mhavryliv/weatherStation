import http.requests.*;
import VLCJVideo.*;
import websockets.*;


WebsocketClient wsc;
VLCJVideo video;

WInfo winfo;

int UIState = 0; // states to determine what should be shown onscreen
final int TotalUIStates = 3;
// 0 is weather visuals; 1 is current weather info over video; 2 is just video 
boolean showButtons = false; 

PImage destination;

long numLoops = 0;
PFont plainFont;


void setup() {
  //size(800, 480, P2D);
  //fullScreen();
  size(800, 480, P3D);
  frameRate(30);
  pixelDensity(displayDensity());
  
  plainFont = createFont("BrandonGrotesque-Light", 96);
  textFont(plainFont);
  
  destination = createImage(width, height, ARGB);
  
  // Writing to the depth buffer is disabled to avoid rendering
  // artifacts due to the fact that the particles are semi-transparent
  // but not z-sorted.
//  hint(DISABLE_DEPTH_MASK);
  winfo = new WInfo();
  thread("updateHistoricalData");
  wsc = new WebsocketClient(this, "ws://realtimeweather-molly1.flyingaspidistra.net:8123");
  
  video = new VLCJVideo(this);
  video.openAndPlay("http://babypi.local/hls/index.m3u8");
} 

void draw () {
  background(0);
  if(UIState == 0) {
    drawAnimatedWeather();
  }
  else if(UIState == 1) {
    drawVideo(true);
    drawAnimatedWeather();
  }
  else if(UIState == 2) {
    drawVideo(false);
  }
  else if(UIState == 3) {
    drawQuitButton();
  }
 
}

void drawQuitButton() {
  fill(255);
}

void drawVideo(boolean withOverlay) {
  image(video, 0, 0, width, height);
  if(withOverlay) {
    fill(0, 0, 0, 255 * 0.5f);
    noStroke();
    rect(0, 0, width, height);
  }
}

void drawWeatherInfoText() {
  String tempStr = "Temperature: " + nf(lastTemp, 0, 1);
  String humStr = "Humidity: " + round(lastHum) + "%";
  String windStr = "Wind: " + nf(lastWindSpeed, 0, 1) + " km/h (" + lastWindDir + ")";  
  
  fill(255);
  textAlign(CENTER);
  textSize(48);
  text(tempStr, width/2, height/2 - 90);
  text(humStr, width/2, height/2);
  text(windStr,width/2, height/2 + 90);
}

void drawTimeText() {
  String timeStr = nf(hour(),2) + ":" + nf(minute(),2) + ":" + nf(second(), 2);
  
  fill(255);
  textAlign(LEFT);
  textSize(42);
  text(timeStr, width - 140, 40);
}

void drawAnimatedWeather() {
  fill(255);
  stroke(255);
  textSize(20);
  //text("Animated weather", 10, 30);
  drawWeatherInfoText();
  drawTimeText();
}

void updateHistoricalData() {
  winfo.updateHistoricalData();
}

void mouseClicked() {
  UIState = (UIState + 1) % TotalUIStates;
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
      winfo.handleWindInput(windDir);
    }
  }
}



void webSocketEvent(String msg){
  winfo.updateWithWSMsg(msg);
}
