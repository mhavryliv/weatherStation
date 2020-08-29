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

  void update() {
    for (Particle p : particles) {
      p.update();      
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
  
  void setGravity(PVector newGravity) {
    currentGravity = newGravity;
    for(Particle p : particles) {
      p.setGravity(currentGravity);
    }
  }

  void display() {

    shape(particleShape);
  }
}
