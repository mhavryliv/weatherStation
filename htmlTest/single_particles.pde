/* @pjs preload="sprite.png","paper_1000px.jpg"; */
class Particle {

  PVector velocity;
  int lifespanMax = 255;
  float lifespan = lifespanMax;
  
  PShape part;
  float partSize;
  
  PVector gravity;
  boolean stopMovingTillDeath;

  PVector currentPosition;

  Particle(PVector startGravity) {
    currentPosition = new PVector(0, 0);
    gravity = startGravity;
    stopMovingTillDeath = false;
    partSize = random(5,30);
    part = createShape();
    part.beginShape(QUAD);
    part.noStroke();
    part.texture(sprite);
    part.normal(0, 0, 1);
    part.vertex(-partSize/2, -partSize/2, 0, 0);
    part.vertex(+partSize/2, -partSize/2, sprite.width, 0);
    part.vertex(+partSize/2, +partSize/2, sprite.width, sprite.height);
    part.vertex(-partSize/2, +partSize/2, 0, sprite.height);
    part.endShape();
    
    rebirth(width/2,height/2);
    lifespan = random(lifespanMax);
  }
  
  PVector getPos() {
    return currentPosition;
  }
  
  void setMaxLifespan(int val) {
    lifespanMax = val;
  }
  
  float normalisedLifeSpan() {
    return (float)lifespan / (float)lifespanMax;
  }
  
  void setNormalisedLifeSpan(float newVal) {
    lifespan = constrain((int)(newVal * lifespanMax), 0, lifespanMax);
    //println("lifespan set to " + lifespan);
  }
  
  void setStopMovingTillDeath(boolean val) {
    stopMovingTillDeath = val;
  }

  PShape getShape() {
    return part;
  }
  
  void setGravity(PVector newGravity) {
    gravity = newGravity;
  }
  
  void rebirth(float x, float y) {
    float a = random(TWO_PI);
    float speed = random(0.5,0.5); // was 0.5, 4
    velocity = new PVector(cos(a), sin(a));
    velocity.mult(speed);
    //lifespan = 255;
    lifespan = random(lifespanMax);
    part.resetMatrix();
    part.translate(x, y); 
    currentPosition.x = x;
    currentPosition.y = y;
    stopMovingTillDeath = false;
  }
  
  boolean isDead() {
    if (lifespan == 0) {
     return true;
    } else {
     return false;
    } 
  }
  

  public void update() {
    float lifespanDecrement = stopMovingTillDeath ? 0.75 : 1;
    lifespan = lifespan - lifespanDecrement;
    if(lifespan < 0) {
      lifespan = 0;
    }
    velocity.add(gravity);
    
    //part.setTint(color(255,lifespan));
    part.setTint(color(240, 94, 27, lifespan)); // use orange-red colour      
    if(!stopMovingTillDeath) {
      part.translate(velocity.x, velocity.y);
      currentPosition.add(velocity);
      // If we're not attached to the edge of the texture, show nothing
      part.setTint(color(240, 94, 27, lifespan)); // use orange-red colour      
    }
    else {
      // do a bit of random colour fluctuation
      //float alpha = random(0-lifespan*0.5, lifespan*0.5) + lifespan*0.5;
      part.setTint(color(240*0.75, 94*0.75, 27*0.75, lifespan)); // use orange-red colour      
    }
  }
}

class ParticleSystem {
  ArrayList<Particle> particles;

  PShape particleShape;
  
  PVector currentGravity = new PVector(0,0.1);

  ParticleSystem(int n) {
    particles = new ArrayList<Particle>();
    particleShape = createShape(PShape.GROUP);

    for (int i = 0; i < n; i++) {
      Particle p = new Particle(currentGravity);
      particles.add(p);
      particleShape.addChild(p.getShape());
    }
  }
  
  void addParticlesToTotal(int total) {
    for(int i = particles.size(); i < total; ++i) {
      Particle p = new Particle(currentGravity);
      particles.add(p);
      particleShape.addChild(p.getShape());
    }
  }

  void update() {
    for (Particle p : particles) {
      p.update();      
    }
  }
  
  // Apply impacts when a collision between particle and arr location, but
  // also diminish the life of a particle when it hits an undamaged particle
  void processImpactArray(float[] arr) {
    for (Particle p : particles) {
      PVector pos = p.getPos();
      float lifespan = p.normalisedLifeSpan();
      //println("normalised lifespan " + lifespan);
      int loc = (int)((int)pos.x + (int)pos.y * width);
      if(pos.x < 0 || pos.y < 0) {
        continue;
      }
      if(pos.x >= width || pos.y >= height) {
        continue;
      }
      float currentArrVal = arr[loc];
      // If the array value has maximum damage, then the particle continues on as normal
      if(currentArrVal == 1.f) {
        continue;
      }
      // Otherwise, do some damage to the array value, and diminish
      // the particle's life
      float newArrVal = min(currentArrVal + 0.1f, 1.f);
      arr[loc] = newArrVal;
      //p.setNormalisedLifeSpan(lifespan * 0.05f);
      p.setStopMovingTillDeath(true);
      // And boost it's lifespan a bit
      p.setNormalisedLifeSpan(lifespan * 1.25f);
    }
  }
  
  void updateImpactArray(float[] arr) {
    //println("Updating impact array");
    final float adder = 50.f;
    for (Particle p : particles) {
      PVector pos = p.getPos();
      float lifespan = p.normalisedLifeSpan();
      int loc = (int)((int)pos.x + (int)pos.y * width);
      if(pos.x < 0 || pos.y < 0) {
        continue;
      }
      if(pos.x >= width || pos.y >= height) {
        continue;
      }
      //println("Loc " + pos.x + ", " + pos.y + " at " + loc);
      // increment the damage on that array location
      arr[loc] = arr[loc] + (adder * lifespan);
    }
  }

  void setEmitter(float x, float y) {
    for (Particle p : particles) {
      if (p.isDead()) {
        p.rebirth(x, y);
      }
    }
  }
  
  void setEmitter(PVector pos) {
    setEmitter(pos.x, pos.y);
  }
  
  void setGravity(PVector newGravity) {
    currentGravity = newGravity;
    for(Particle p : particles) {
      p.setGravity(currentGravity);
    }
  }
  
  void setMaxLifespan(int val) {
    for(Particle p : particles) {
      p.setMaxLifespan(val);
    }
  }

  void display() {

    shape(particleShape);
  }
}



ParticleSystem ps;
PImage sprite;  
import websockets.*;

WebsocketClient wsc;

int mainFireX, mainFireY;
float windClickCounter = 0;
float windXComponent = 0.f;
float windYComponent = 0.f;

float[] impactArray;
PImage paperBackground;

PImage destination;
ArrayList<PVector> hotspots;
ArrayList<ParticleSystem> hotspotSystems;

long numLoops = 0;

void setup() {  
  size(1000, 800, P2D);
  frameRate(30);
//  pixelDensity(displayDensity());

  destination = createImage(width, height, ARGB);

  impactArray = new float[width*height];
  mainFireX = width/2;
  mainFireY = height/2;
  //orientation(LANDSCAPE);
  sprite = loadImage("sprite.png");
  paperBackground = loadImage("paper_1000px.jpg");
  ps = new ParticleSystem(1000);
  
  ps.setEmitter(mainFireX,mainFireY);
  
  hotspots = new ArrayList<PVector>();
  hotspotSystems = new ArrayList<ParticleSystem>();
  int numHotspots = 4;
  for(int i = 0; i < numHotspots; ++i) {
    PVector newPos = new PVector(random(width), random(height)); 
    hotspots.add(newPos);
    ParticleSystem newPs = new ParticleSystem(50);
    newPs.setEmitter(newPos);
    newPs.setGravity(new PVector(0,0));
    newPs.setMaxLifespan(50);
    hotspotSystems.add(newPs);
  }
  
  // Writing to the depth buffer is disabled to avoid rendering
  // artifacts due to the fact that the particles are semi-transparent
  // but not z-sorted.
//  hint(DISABLE_DEPTH_MASK);
  
  wsc = new WebsocketClient(this, "ws://realtimeweather-molly1.flyingaspidistra.net:8123");
} 

void draw () {
  background(11*0.35, 60*0.35, 10*0.35);
  //background(0);
  //image(paperBackground, 0, 0);
  
  ps.update();
  //ps.updateImpactArray(impactArray);
  ps.processImpactArray(impactArray);
  
  ps.display();
  
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
  
  // Update the hotspots
  for(int i = 0; i < hotspotSystems.size(); ++i) {
    ParticleSystem p = hotspotSystems.get(i);
    PVector pos = hotspots.get(i);
    // Has it been touched?
    boolean isTouched = isPointTouched(pos, impactArray);
    if(isTouched) {
      p.addParticlesToTotal(1500);
      p.setMaxLifespan(255);
      p.setGravity(windStrength);
      p.processImpactArray(impactArray);
      p.setGravity(windStrength);
    }    
    p.update();
    if(numLoops > 255) {
      p.display();
    }
    p.setEmitter(pos);
  }

  // Update the main fire
  ps.setGravity(windStrength);  
  ps.setEmitter(mainFireX, mainFireY);
  
  paperBackground.loadPixels();
  destination.loadPixels();

  for(int x = 0; x < width; ++x) {
    for(int y = 0; y < height; ++y) {
      int loc = x + y * width;
      float val = impactArray[loc];
      int imageLoc = x + y * paperBackground.width;
      if(val == 0.f) {
        //destination.pixels[loc] = color(11*0.35, 60*0.35, 10*0.35);
        //destination.pixels[loc] = paperBackground.pixels[imageLoc];
        continue;
      }
      
      float r = red(paperBackground.pixels[imageLoc]);
      float g = green(paperBackground.pixels[imageLoc]);
      float b = blue(paperBackground.pixels[imageLoc]);
      // val == 0 is no damage, val == 1 is full damage
      // if not damaged, draw white. if full damaged, draw black
      float drawWeight = (1.f - val) * 255;
      // make it darker, but not fully black
      drawWeight = ((1.f - val) * 0.75 + 0.25) * 255;
      destination.pixels[loc] = color(r, g, b, drawWeight);
    }
  }
  destination.updatePixels();
  image(destination, 0, 0);
  

  numLoops++;
  
  //fill(255);
  //textSize(12);
  //text("Frame rate: " + int(frameRate), 10, 20); 
}

boolean isPointTouched(PVector point, float[] arr) {
  int loc = (int)((int)point.x + (int)point.y * width);
  if(arr[loc] != 0.f) {
    return true;
  }
  else {
    return false;
  }
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
    println("Water!!!");
    println(msg);
  }
  if(isWindClick) {
    handleWindInput(windDir);
  }
}
