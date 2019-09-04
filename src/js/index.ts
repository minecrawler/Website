/*
    Things which should be in JS (and which probably deserve an external lib
    - changing pages
    - setting the theme based on local time (light / dark)
    - some fancy effects for projects
 */

// bare minimum:
const bodyEle = document.querySelector('body');
bodyEle && bodyEle.classList.add('t-light');
