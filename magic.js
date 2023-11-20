function generateTradingSignal({ rsi }) {
    if (rsi > 70) {
        return 'sell';
    } else if (rsi < 30) {
        return 'buy';
    } else {
        return 'hold'; // or 'neutral', indicating no action
    }
}

const detectCrossOver = (shortTermMAValues, longTermMAValues) => {
    const goldenCross = shortTermMAValues[0] > longTermMAValues[0] && shortTermMAValues[1] <= longTermMAValues[1];
    const deathCross = shortTermMAValues[0] < longTermMAValues[0] && shortTermMAValues[1] >= longTermMAValues[1];
    console.log(`Golden Cross Detected: ${goldenCross}`);
    console.log(`Death Cross Detected: ${deathCross}`);
};

function generateFibonacciSignal(currentPrice, fibonacciLevels) {
    // Define a threshold (e.g., 5%) for triggering a signal
    const signalThreshold = 5;

    // Loop through the Fibonacci levels in the object
    for (const levelName in fibonacciLevels) {
        if (fibonacciLevels.hasOwnProperty(levelName)) {
            const fibonacciLevel = fibonacciLevels[levelName];

            // Calculate the percentage difference between the current price and the Fibonacci level
            const percentageDifference = Math.abs((currentPrice - fibonacciLevel) / fibonacciLevel) * 100;
                console.log(`Percentage difference fibonnaci ${percentageDifference}`)
            if (percentageDifference >= signalThreshold) {
                // If the percentage difference is greater than or equal to the threshold, trigger a signal
                if (currentPrice > fibonacciLevel) {
                    return `Hit Resistance at ${levelName}`;
                } else {
                    return `Hit Support at ${levelName}`;
                }
            }
            return 'Fibbonacci don mare .'
        }
    }

    // If no signal was triggered for any level, return 'No Signal'
    return 'No Signal';
}



module.exports = {generateTradingSignal , detectCrossOver, generateFibonacciSignal}