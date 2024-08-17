const inputs = document.getElementById("inputs");

inputs.addEventListener("input", fireInput);

inputs.addEventListener("keyup", function (e) {
    const target = e.target;
    const key = e.key.toLowerCase();
    if (key === 'arrowright') target.nextElementSibling.focus();
    if (key === 'arrowleft') target.previousElementSibling.focus();
    if (key == "backspace" || key == "delete") {
        target.value = "";
        const prev = target.previousElementSibling;
        if (prev) {
            prev.focus();
        }
        return;
    }
});
const digits = inputs.querySelectorAll('input');
const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const chars = text.split('').filter(c => /\d/.test(c));
    chars.forEach((char, index) => {
        const input = digits[index];
        input.value = char;
        // fireInput({
        //     target: input,
        // })
    });
    digits[chars.length-1].focus();
    if (chars.length === 6) window.submit.click();
}
digits.forEach(d => {
    d.addEventListener('paste', handlePaste)

})
function fireInput(e) {
    // console.log('wot');
    const target = e.target;
    if (target.value.length === 2)
        target.value = e.data;
    const val = target.value;
    if (isNaN(val)) {
        target.value = "";
        return;
    }

    if (val != "") {

        const next = target.nextElementSibling;
        if (next instanceof HTMLInputElement) {

            next.focus();
            return;

        } else window.submit.focus()
    }
}