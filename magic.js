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

module.exports = {generateTradingSignal , detectCrossOver}