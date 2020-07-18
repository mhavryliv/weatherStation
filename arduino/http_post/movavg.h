// Optionally include this header to access arduino functions and types
// #include <Arduino.h>

class MovAvg {
  private:
  double * data_;
  int size_;
  int counter_;

  public:
  MovAvg(int s) {
    size_ = s;
    data_ = new double[size_];
    counter_ = 0;
  }

  ~MovAvg() {
    delete[] data_;
  }

  // Adds a value and recalculates the moving average
  double addVal(double val) volatile {
    data_[counter_] = val;
    // Increment counter for next write
    counter_++;
    if(counter_ == size_) {
      counter_ = 0;
    }
    return getCurAvg();    
  }

  double getCurAvg() volatile {
    // Sum all current values
    double sum = 0.0;
    for(int i = 0; i < size_; ++i) {
      sum += data_[i];
    }
    return sum / (double)size_;
  }

  void reset() volatile {
    counter_ = 0;
    for(int i = 0; i < size_; ++i) {
      data_[i] = 0.0;
    }
  }

  
};
