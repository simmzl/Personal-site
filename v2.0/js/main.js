const list = document.getElementById("list");
const banner = document.getElementById("banner");
const slogans = {
    cqmovie: "FOR RECOMMENDING MOVIES I LIKE",
    github: "BE A WONDERFUL FRONT-END DEVELOPER",
    photos: "PHOTOGRAPH BY @SIMMZL",
    blog: "TO RECORD THE PROBLEMS,TECHNIQUES AND IDEAS",
    workshop: "CREATIVE & STYLISH"
};

const change = (el, slogan, clsName) => {
    el.style.color = "#fff";
    banner.innerHTML = slogan;
    document.body.classList.add(clsName);
};

const recover = el => {
    const clsName = document.body.className;
    !!clsName && document.body.classList.remove(clsName);
    banner.innerHTML = "";
    el.style.color = "#999";
};

list.addEventListener("mouseover", e => {
    const el = e.target || e.srcElement;
    const clsName = el.innerHTML.toLowerCase();
    const slogan = slogans[clsName];
    el.tagName.toLowerCase() === "a" && change(el, slogan, clsName);
});

list.addEventListener("mouseout", e => {
    const el = e.target || e.srcElement;
    el.tagName.toLowerCase() === "a" && recover(el);
});
