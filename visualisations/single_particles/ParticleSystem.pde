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
