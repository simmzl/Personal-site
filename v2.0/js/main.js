const list = document.getElementById('list');
const backMsg = document.getElementById("backMsg");
// const more = document.getElementById('more');
const close = document.getElementById('close');
const mask = document.getElementById('mask');
// const modal = document.getElementById('modal');
const detail = document.getElementById('detail');
const workshopTitle = document.getElementById('workshopTitle');
const workshop = document.getElementById('workshop');
const container = document.getElementById('container');

container.addEventListener('mouseover', e => {
    const el = e.target || e.srcElement;
    const name = el.innerHTML.toLowerCase();
    let backMsgInner;
    const change = _ => {
        el.style.color = "#fff";
        backMsg.innerHTML = backMsgInner;
        document.body.classList.add(name);
    };

    switch (name) {
        case 'cqmovie':
            backMsgInner = "FOR RECOMMENDING MOVIES I LIKE";
            change();
            break;
        case 'github':
            backMsgInner = "INTENDING WEB FRONT-END DEVELOPER";
            change();
            break;
        case 'photos':
            backMsgInner = "PHOTOGRAPH BY @SIMMZL";
            change();
            break;
        case 'blog':
            backMsgInner = "TO RECORD THE PROBLEMS,TECHNIQUES AND IDEAS";
            change();
            break;
        case 'workshop':
            backMsgInner = "SOME OF THE PROJECTS I'VE DONE";
            change();
            break;
    }
});

const back = obj => {
    const clsName = document.body.className;
    !!clsName && document.body.classList.remove(clsName);
    backMsg.innerHTML = "";
    obj.style.color = "#999";
    const opacity = detail.style.opacity;
    if (opacity === "1" && obj.id === "workshop") {
        detail.style.opacity = "0";
    }
};

workshopTitle.addEventListener("mouseenter", _ => {
    detail.style.opacity = "1";
});
workshopTitle.addEventListener("mouseleave", _ => {
    workshopTitle.style.color = "#999";
});
workshop.addEventListener('mouseleave', _ => {
    back(workshop);
});

list.addEventListener('mouseout', e => {
    const el = e.target || e.srcElement;
    el.className === 'list' && back(el);
});

// const showModal = _ => {
//     back(workshop);
//     mask.style.display = 'inline';
//     modal.style.padding = '15px';
//     modal.style.height = '278px';
//     modal.style.borderRadius= "16px";
// };
// const closeModal = _ =>{
//     mask.style.display = 'none';
//     modal.style.height = '0';
//     modal.style.padding = '0';
//     modal.style.borderRadius= "0";
// };

// close.addEventListener('click', closeModal);
// mask.addEventListener('click', closeModal);

detail.addEventListener('click', e => {
    const el = e.target || e.srcElement;
    if(el.nodeName.toLowerCase() === 'a') {
        const opacity = detail.style.opacity;
        if(!opacity || opacity === '0') {
            el.className = 'cursorDef';
            e.preventDefault();
            // more.removeEventListener('click', showModal);
        } else {
            el.className = '';
            // el.id === 'more' && showModal();
        }
    }
});
detail.addEventListener('mouseover', e =>{
    const el = e.target || e.srcElement;
    if(el.nodeName.toLowerCase() === 'a') {
        const opacity = detail.style.opacity;
        !opacity || opacity === '0'? el.className = 'cursorDef' : el.className = '';
    }
});
