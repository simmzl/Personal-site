let list = document.getElementById('list');
let backMsg = document.getElementById("backMsg");
let more = document.getElementById('more');
let close = document.getElementById('close');
let mask = document.getElementById('mask');
let modal = document.getElementById('modal');
let detail = document.getElementById('detail');
let workshopTitle = document.getElementById('workshopTitle');
let workshop = document.getElementById('workshop');
let container = document.getElementById('container');

container.addEventListener('mouseover', e => {
    let el = e.target || e.srcElement;
    let name = el.innerHTML.toLowerCase();
    let backMsgInner;
    let change = () => {
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

let back = (obj) => {
    let clsName = document.body.className;
    !!clsName && document.body.classList.remove(clsName);
    backMsg.innerHTML = "";
    obj.style.color = "#999";
    let opacity = detail.style.opacity;
    if (opacity === "1" && obj.id === "workshop") {
        detail.style.opacity = "0";
    }
};

workshopTitle.addEventListener("mouseenter", () => {
    detail.style.opacity = "1";
});
workshopTitle.addEventListener("mouseleave", () => {
    workshopTitle.style.color = "#999";
});
workshop.addEventListener('mouseleave',() => {
    back(workshop);
});

list.addEventListener('mouseout', e => {
    let el = e.target || e.srcElement;
    el.className === 'list' && back(el);
});

let showModal = () => {
    back(workshop);
    mask.style.display = 'inline';
    modal.style.padding = '15px';
    modal.style.height = '278px';
    modal.style.borderRadius= "16px";
};
let closeModal = () =>{
    mask.style.display = 'none';
    modal.style.height = '0';
    modal.style.padding = '0';
    modal.style.borderRadius= "0";
};

close.addEventListener('click', closeModal);
mask.addEventListener('click',closeModal);

detail.addEventListener('click', e => {
    let el = e.target || e.srcElement;
    if(el.nodeName.toLowerCase() === 'a'){
        let opacity = detail.style.opacity;
        if(!opacity || opacity === '0'){
            el.className = 'cursorDef';
            e.preventDefault();
            more.removeEventListener('click',showModal);
        }else{
            el.className = '';
            el.id === 'more' && showModal();
        }
    }
});
detail.addEventListener('mouseover',e =>{
    let el = e.target || e.srcElement;
    if(el.nodeName.toLowerCase() === 'a'){
        let opacity = detail.style.opacity;
        !opacity || opacity === '0'? el.className = 'cursorDef' : el.className = '';
    }
});
