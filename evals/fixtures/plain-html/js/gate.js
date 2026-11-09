// super basic password gate for NDA pages. not secure, client asked for "something"
function unlock(){ var p = prompt('Password'); if (p === 'ochre2024') document.querySelector('.nda-body').hidden = false; }
