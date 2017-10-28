const subsectionBtns = document.querySelectorAll('.js-container-target')

// Listen for subsection button clicks
Array.prototype.forEach.call(subsectionBtns, function (btn) {
    btn.addEventListener('click', function (event) {
        const parent = event.target.parentElement

        // Toggles the "is-open" class on the subsection's parent element.
        parent.classList.toggle('is-open')
    })
})
