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
