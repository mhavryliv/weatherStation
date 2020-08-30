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
      part.setTint(color(240*0.75, 94*0.75, 27*0.75, lifespan)); // use orange-red colour      
    }
  }
}
