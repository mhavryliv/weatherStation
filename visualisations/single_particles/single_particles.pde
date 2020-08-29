// Particles, by Daniel Shiffman.

ParticleSystem ps;
PImage sprite;  
import websockets.*;

WebsocketClient wsc;

int mainFireX, mainFireY;
float windClickCounter = 0;
float windXComponent = 0.f;
float windYComponent = 0.f;

float[] impactArray;

void setup() {  
  size(500, 500, P2D);
  impactArray = new float[width*height];
  mainFireX = width/2;
  mainFireY = height/2;
  //orientation(LANDSCAPE);
  sprite = loadImage("sprite.png");
  ps = new ParticleSystem(1000);
  
  ps.setEmitter(mainFireX,mainFireY);
  
  // Writing to the depth buffer is disabled to avoid rendering
  // artifacts due to the fact that the particles are semi-transparent
  // but not z-sorted.
  hint(DISABLE_DEPTH_MASK);
  
  wsc = new WebsocketClient(this, "ws://realtimeweather-molly1.flyingaspidistra.net:8123");
} 

void draw () {
  background(0);
  
  ps.update();
  ps.updateImpactArray(impactArray);
  
  loadPixels();
  for(int x = 0; x < width; ++x) {
    for(int y = 0; y < height; ++y) {
      int loc = x + y * width;
      pixels[loc] = color(impactArray[loc]);
    }
  }
  updatePixels();
  
  ps.display();
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
  
  //println(windStrength);
  
  ps.setGravity(windStrength);
  
  ps.setEmitter(mainFireX, mainFireY);
  
  fill(255);
  textSize(12);
  text("Frame rate: " + int(frameRate), 10, 20); 
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
  JSONObject data = parseJSONObject(msg);
  //println(msg);
  boolean isWaterClick = data.getBoolean("waterclick", false);
  boolean isWindClick = data.getBoolean("windclick", false);
  String windDir = data.getString("wdir");
  //println(windDir);
  if(isWaterClick) {
    //println("Water!!!");
  }
  if(isWindClick) {
    handleWindInput(windDir);
  }
}
