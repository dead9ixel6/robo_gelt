// indicators.js

function calculateRSI(data) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < 14; i++) { // Calculating RSI for the last 14 periods
      const delta = data[i] - data[i - 1];
      if (delta >= 0) {
        gains += delta;
      } else {
        losses -= delta;
      }
    }
  
    const averageGain = gains / 14;
    const averageLoss = losses / 14;
  
    if (averageLoss === 0) {
      return 100; // RSI is 100 if there were no losses
    }
  
    const rs = averageGain / averageLoss;
    return 100 - (100 / (1 + rs));
  }
  
  function calculateFibonacciLevels(high, low) {
    const range = high - low;
    return {
        level236: high - range * 0.236,
        level382: high - range * 0.382,
        level618: high - range * 0.618,
        level100: low // Equivalent to 100% retracement
    };
}

module.exports = { calculateRSI, calculateFibonacciLevels };

  module.exports = { calculateRSI, calculateFibonacciLevels };
  