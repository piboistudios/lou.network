module.exports = function generatePasscode() {
    return ('' + Math.floor(Math.random() * 1000000)).padStart(6, '0').slice(0, 6);
}