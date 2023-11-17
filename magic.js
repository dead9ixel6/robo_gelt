function generateTradingSignal({ rsi }) {
    if (rsi > 70) {
        return 'sell';
    } else if (rsi < 30) {
        return 'buy';
    } else {
        return 'hold'; // or 'neutral', indicating no action
    }
}
module.exports = {generateTradingSignal}